#!/usr/bin/env python3
"""Generate read-only Sequence packages for portable skills.

Renders the canonical Sequence and selected interpretations into each skill's
direct references. Ordinary skills receive one compact sequence.md; a skill
that selects arbitrary P-ID teams keeps interpretations split for selective
loading. Never edit generated package files by hand.

Usage:
  python3 scripts/sync-sequence-snapshot.py context-engineering principle-cultivation
  python3 scripts/sync-sequence-snapshot.py --all
  python3 scripts/sync-sequence-snapshot.py --all --check
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
    "improve-agent-workflow",
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
    "visual-design",
)
FULL_INTERPRETATION_SKILLS = frozenset({"skill-engineering"})

PRIMARY_RE = re.compile(r"^\*\*Primary:\*\*\s*(P\d+)\s*$", re.MULTILINE)
SUPPORTING_RE = re.compile(r"^\*\*Supporting:\*\*\s*([P\d,\s]+)\s*$", re.MULTILINE)
PID_LINE_RE = re.compile(r"^(P\d+)｜(.+)$")
SEQUENCE_SOURCE_RE = re.compile(
    r"^\*\*Sequence source:\*\*\s*(P\d+｜.+)\s*$", re.MULTILINE
)
SNAPSHOT_DATE_RE = re.compile(
    r"^\*\*Snapshot date:\*\*\s*(\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE
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
        help="Package every principles/interpretations/P*.md file (team-selector mode)",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without writing files",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="Fail when generated package files differ from the canonical source",
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


def fence_marker(line: str) -> tuple[str, int, str] | None:
    stripped = line.lstrip(" ")
    if len(line) - len(stripped) > 3 or not stripped or stripped[0] not in {"`", "~"}:
        return None
    marker = stripped[0]
    length = len(stripped) - len(stripped.lstrip(marker))
    if length < 3:
        return None
    return marker, length, stripped[length:]


def demote_headings(text: str, levels: int) -> str:
    rendered: list[str] = []
    active_fence: tuple[str, int] | None = None
    for line in text.rstrip().splitlines():
        fence = fence_marker(line)
        if fence is not None:
            marker, length, remainder = fence
            if active_fence is None:
                active_fence = (marker, length)
            elif (
                marker == active_fence[0]
                and length >= active_fence[1]
                and not remainder.strip()
            ):
                active_fence = None
        elif active_fence is None:
            match = re.match(r"^(#{1,6})(\s+.*)$", line)
            if match:
                depth = min(6, len(match.group(1)) + levels)
                line = "#" * depth + match.group(2)
        rendered.append(line)
    return "\n".join(rendered)


def sequence_body() -> str:
    text = read_text(SEQUENCE_PATH).strip()
    if text.startswith("# "):
        _, _, text = text.partition("\n")
    return text.strip()


def interpretation_body(path: Path) -> str:
    lines = read_text(path).splitlines()
    if lines and lines[0] == "---":
        try:
            end = lines.index("---", 1)
        except ValueError as error:
            raise SystemExit(f"{path}: unterminated frontmatter") from error
        lines = lines[end + 1 :]
    while lines and not lines[0].strip():
        lines.pop(0)
    return demote_headings("\n".join(lines), 2)


def render_sequence_md(
    skill_name: str,
    pids: list[str],
    snapshot_date: str,
    sequence_hash: str,
    full_interpretations: bool,
) -> str:
    if full_interpretations:
        interpretation_section = (
            "## Interpretation index\n\n"
            "The complete fallback set is stored beside this file under "
            "`sequence-interpretations/`. After selecting the current expression "
            "team, load only its P-ID files.\n\n"
            + "\n".join(f"- `{pid}`" for pid in pids)
        )
    else:
        interpretations = "\n\n".join(
            interpretation_body(INTERPRETATIONS_DIR / f"{pid}.md")
            for pid in pids
        )
        interpretation_section = (
            "## Included interpretations\n\n"
            f"This skill's packaged fallback includes {format_pid_list(pids)}. "
            "The sections below are projections of the canonical interpretations, "
            "not a second source.\n\n"
            f"{interpretations}"
        )

    return f"""# Portable Sequence

**Role:** read-only standalone lineage baseline for {skill_name}.
**Canonical upstream:** {CANONICAL_UPSTREAM}
**Refresh ref:** {REFRESH_REF}
**Snapshot date:** {snapshot_date}
**Sequence SHA-256:** {sequence_hash}
**Generated by:** `scripts/sync-sequence-snapshot.py` — do not hand-edit.

## Authority boundary

This file and any adjacent generated interpretation files are a packaged
projection, not an independent principle canon. They allow a standalone
installation to resolve lineage while offline. Do not edit them from a target
project or a task run.

When the host supplies its own Sequence and interpretations, that local source
governs the host task. When it does not, use this snapshot. A temporary remote
refresh may inform one task after verification, but may not replace this
baseline; re-run the sync script and release an updated skill package to
refresh the projection durably.

## Sequence

{sequence_body()}

{interpretation_section}
"""


def retained_snapshot_date(snapshot_path: Path, fallback: str) -> str:
    if not snapshot_path.is_file():
        return fallback
    match = SNAPSHOT_DATE_RE.search(read_text(snapshot_path))
    return match.group(1) if match else fallback


def split_interpretations_match(path: Path, pids: list[str]) -> bool:
    if not path.is_dir():
        return False
    actual = {item.name for item in path.iterdir() if item.is_file()}
    expected = {f"{pid}.md" for pid in pids}
    if actual != expected:
        return False
    return all(
        read_text(path / f"{pid}.md") == read_text(INTERPRETATIONS_DIR / f"{pid}.md")
        for pid in pids
    )


def sync_skill(
    skill_name: str,
    *,
    full_interpretations: bool,
    dry_run: bool,
    check: bool,
    sequence_lines: dict[str, str],
    sequence_hash: str,
    snapshot_date: str,
) -> None:
    skill_dir = SKILLS_DIR / skill_name
    skill_md = skill_dir / "SKILL.md"
    references_dir = skill_dir / "references"
    snapshot_path = references_dir / "sequence.md"
    interpretations_out = references_dir / "sequence-interpretations"
    legacy_snapshot_dir = references_dir / "sequence-snapshot"

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
        validate_interpretation(INTERPRETATIONS_DIR / f"{pid}.md", sequence_lines)

    existing_date = retained_snapshot_date(snapshot_path, snapshot_date)
    existing_render = render_sequence_md(
        skill_name, pids, existing_date, sequence_hash, use_full
    )
    current_interpretations = (
        split_interpretations_match(interpretations_out, pids)
        if use_full
        else not interpretations_out.exists()
    )
    package_is_current = (
        snapshot_path.is_file()
        and read_text(snapshot_path) == existing_render
        and current_interpretations
        and not legacy_snapshot_dir.exists()
    )
    effective_date = existing_date if package_is_current else snapshot_date
    expected_snapshot = render_sequence_md(
        skill_name, pids, effective_date, sequence_hash, use_full
    )

    if dry_run:
        shape = "split" if use_full else "single-file"
        print(
            f"[dry-run] {skill_name}: {shape}, {len(pids)} interpretations "
            f"({', '.join(pids)})"
        )
        return

    if check:
        check_date = retained_snapshot_date(snapshot_path, snapshot_date)
        check_snapshot = render_sequence_md(
            skill_name, pids, check_date, sequence_hash, use_full
        )
        errors: list[str] = []
        if legacy_snapshot_dir.exists():
            errors.append(f"legacy path remains: {legacy_snapshot_dir}")
        if not snapshot_path.is_file() or read_text(snapshot_path) != check_snapshot:
            errors.append(f"generated file drift: {snapshot_path}")
        if use_full and not split_interpretations_match(interpretations_out, pids):
            errors.append(f"interpretation set drift: {interpretations_out}")
        if not use_full and interpretations_out.exists():
            errors.append(f"unexpected split interpretations: {interpretations_out}")
        if errors:
            raise SystemExit("\n".join(errors))
        print(f"checked {skill_name}: {len(pids)} interpretations")
        return

    if legacy_snapshot_dir.exists():
        shutil.rmtree(legacy_snapshot_dir)
    if interpretations_out.exists():
        shutil.rmtree(interpretations_out)
    references_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path.write_text(expected_snapshot, encoding="utf-8")
    if use_full:
        interpretations_out.mkdir(parents=True, exist_ok=True)
        for pid in pids:
            shutil.copy2(
                INTERPRETATIONS_DIR / f"{pid}.md",
                interpretations_out / f"{pid}.md",
            )

    print(f"synced {skill_name}: {len(pids)} interpretations -> {snapshot_path}")


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
            check=args.check,
            sequence_lines=sequence_lines,
            sequence_hash=sequence_hash,
            snapshot_date=snapshot_date,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
