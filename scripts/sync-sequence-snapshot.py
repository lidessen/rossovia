#!/usr/bin/env python3
"""Generate read-only sequence snapshots for portable skills.

Copies principles/SEQUENCE.md and selected interpretations from the collection
canonical source into skills/<name>/references/sequence-snapshot/. Never edit
snapshots by hand; re-run this script when the Sequence or interpretations change.

Usage:
  python3 scripts/sync-sequence-snapshot.py context-engineering principle-cultivation
  python3 scripts/sync-sequence-snapshot.py --all
  python3 scripts/sync-sequence-snapshot.py skill-engineering --full-interpretations
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = REPO_ROOT / "skills"
PRINCIPLES_DIR = REPO_ROOT / "principles"
SEQUENCE_PATH = PRINCIPLES_DIR / "SEQUENCE.md"
INTERPRETATIONS_DIR = PRINCIPLES_DIR / "interpretations"
CANONICAL_UPSTREAM = "https://github.com/lidessen/skills.git"
REFRESH_REF = "main"
SNAPSHOT_SKILLS = (
    "context-engineering",
    "principle-cultivation",
    "skill-engineering",
    "artifact-organization",
    "disciplined-development",
    "practice-cycle",
    "form-guidance",
    "naming-and-articulation",
    "work-estimation",
    "strategic-advisory",
    "structural-refactoring",
)
FULL_INTERPRETATION_SKILLS = frozenset({"skill-engineering"})

PRIMARY_RE = re.compile(r"^\*\*Primary:\*\*\s*(P\d+)\s*$", re.MULTILINE)
SUPPORTING_RE = re.compile(r"^\*\*Supporting:\*\*\s*([P\d,\s]+)\s*$", re.MULTILINE)
PID_LINE_RE = re.compile(r"^(P\d+)｜(.+)$")
SEQUENCE_SOURCE_RE = re.compile(
    r"^\*\*Sequence source:\*\*\s*(P\d+｜.+)\s*$", re.MULTILINE
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "skills",
        nargs="*",
        help="Skill directory names under skills/ (default: packaged snapshot skills)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help=f"Sync packaged skills: {', '.join(SNAPSHOT_SKILLS)}",
    )
    parser.add_argument(
        "--full-interpretations",
        action="store_true",
        help="Copy every principles/interpretations/P*.md file (skill-engineering mode)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without writing files",
    )
    return parser.parse_args()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_sequence_lines() -> dict[str, str]:
    if not SEQUENCE_PATH.is_file():
        raise SystemExit(f"Missing canonical sequence: {SEQUENCE_PATH}")
    lines: dict[str, str] = {}
    for raw in read_text(SEQUENCE_PATH).splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        match = PID_LINE_RE.match(line)
        if not match:
            raise SystemExit(f"Invalid sequence line: {raw!r}")
        lines[match.group(1)] = line
    return lines


def parse_expression_pids(skill_md: Path) -> list[str]:
    text = read_text(skill_md)
    primary = PRIMARY_RE.search(text)
    supporting = SUPPORTING_RE.search(text)
    if not primary:
        raise SystemExit(f"No **Primary:** found in {skill_md}")
    pids = [primary.group(1)]
    if supporting:
        for token in supporting.group(1).split(","):
            token = token.strip()
            if token:
                pids.append(token)
    return pids


def selected_pids(skill_name: str, skill_md: Path, full_interpretations: bool) -> list[str]:
    if full_interpretations or skill_name in FULL_INTERPRETATION_SKILLS:
        return sorted(
            path.stem
            for path in INTERPRETATIONS_DIR.glob("P*.md")
            if path.is_file()
        )
    return parse_expression_pids(skill_md)


def validate_interpretation(path: Path, sequence_lines: dict[str, str]) -> None:
    text = read_text(path)
    pid = path.stem
    if pid not in sequence_lines:
        raise SystemExit(f"{path}: P-ID {pid} not present in SEQUENCE.md")
    match = SEQUENCE_SOURCE_RE.search(text)
    if not match:
        raise SystemExit(f"{path}: missing **Sequence source:** line")
    if match.group(1) != sequence_lines[pid]:
        raise SystemExit(
            f"{path}: sequence source drift\n"
            f"  expected: {sequence_lines[pid]!r}\n"
            f"  found:    {match.group(1)!r}"
        )


def format_pid_list(pids: list[str]) -> str:
    if len(pids) == 1:
        return pids[0]
    if len(pids) == 2:
        return f"{pids[0]} and {pids[1]}"
    return ", ".join(pids[:-1]) + f", and {pids[-1]}"


def render_source_md(
    skill_name: str,
    pids: list[str],
    snapshot_date: str,
    sequence_hash: str,
    full_interpretations: bool,
) -> str:
    if full_interpretations:
        interpretations_note = (
            "interpretations/ contains the complete current interpretation set. "
            "Load only the P-IDs selected for the current expression team."
        )
    else:
        interpretations_note = (
            f"interpretations/ contains {format_pid_list(pids)}, the P-IDs "
            "selected by this skill."
        )

    return f"""# Portable Sequence Snapshot

**Role:** read-only standalone lineage baseline for {skill_name}.
**Canonical upstream:** {CANONICAL_UPSTREAM}
**Refresh ref:** {REFRESH_REF}
**Snapshot date:** {snapshot_date}
**Sequence SHA-256:** {sequence_hash}
**Generated by:** `scripts/sync-sequence-snapshot.py` — do not hand-edit.

## Authority boundary

This directory is a packaged projection, not an independent principle canon.
It allows a standalone installation to resolve lineage while offline. Do not
edit it from a target project or a task run.

When the host supplies its own Sequence and interpretations, that local source
governs the host task. When it does not, use this snapshot. A temporary remote
refresh may inform one task after verification, but may not replace this
baseline; re-run the sync script and release an updated skill package to refresh
the projection durably.

## Contents

- SEQUENCE.md contains the full one-line P-ID sequence.
- {interpretations_note}
"""


def sync_skill(
    skill_name: str,
    *,
    full_interpretations: bool,
    dry_run: bool,
    sequence_lines: dict[str, str],
    sequence_hash: str,
    snapshot_date: str,
) -> None:
    skill_dir = SKILLS_DIR / skill_name
    skill_md = skill_dir / "SKILL.md"
    snapshot_dir = skill_dir / "references" / "sequence-snapshot"
    interpretations_out = snapshot_dir / "interpretations"

    if not skill_md.is_file():
        raise SystemExit(f"Missing skill entrypoint: {skill_md}")

    use_full = full_interpretations or skill_name in FULL_INTERPRETATION_SKILLS
    pids = selected_pids(skill_name, skill_md, use_full)

    missing = [pid for pid in pids if not (INTERPRETATIONS_DIR / f"{pid}.md").is_file()]
    if missing:
        raise SystemExit(
            f"{skill_name}: missing canonical interpretations for {', '.join(missing)}"
        )

    for pid in pids:
        validate_interpretation(
            INTERPRETATIONS_DIR / f"{pid}.md",
            sequence_lines,
        )

    actions = [
        ("write", snapshot_dir / "SEQUENCE.md", read_text(SEQUENCE_PATH)),
        (
            "write",
            snapshot_dir / "SOURCE.md",
            render_source_md(skill_name, pids, snapshot_date, sequence_hash, use_full),
        ),
    ]
    for pid in pids:
        src = INTERPRETATIONS_DIR / f"{pid}.md"
        actions.append(("copy", interpretations_out / f"{pid}.md", src))

    if dry_run:
        print(f"[dry-run] {skill_name}: {len(pids)} interpretations ({', '.join(pids)})")
        return

    if snapshot_dir.exists():
        shutil.rmtree(snapshot_dir)
    interpretations_out.mkdir(parents=True, exist_ok=True)

    for kind, dest, payload in actions:
        if kind == "write":
            dest.write_text(payload, encoding="utf-8")
        else:
            shutil.copy2(payload, dest)

    print(f"synced {skill_name}: {len(pids)} interpretations -> {snapshot_dir}")


def main() -> int:
    args = parse_args()
    skill_names = list(SNAPSHOT_SKILLS) if args.all else args.skills
    if not skill_names:
        skill_names = list(SNAPSHOT_SKILLS)

    sequence_lines = load_sequence_lines()
    sequence_hash = sha256_file(SEQUENCE_PATH)
    snapshot_date = date.today().isoformat()

    for skill_name in skill_names:
        sync_skill(
            skill_name,
            full_interpretations=args.full_interpretations,
            dry_run=args.dry_run,
            sequence_lines=sequence_lines,
            sequence_hash=sequence_hash,
            snapshot_date=snapshot_date,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
