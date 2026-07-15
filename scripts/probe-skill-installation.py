#!/usr/bin/env python3
"""Verify one packaged skill through a disposable installation.

The live repository is read-only input. The installer receives a copied source
snapshot and runs from a separate empty target project, both under one temporary
directory. This avoids self-installing through repository-local agent symlinks.

Usage:
  python3 scripts/probe-skill-installation.py visual-design
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILLS_ROOT = REPO_ROOT / "skills"


class UnsafePathOverlap(ValueError):
    """Raised when an installation source and target share filesystem state."""


def canonical(path: Path) -> Path:
    return path.expanduser().resolve(strict=False)


def paths_overlap(first: Path, second: Path) -> bool:
    """Return true for aliases, ancestors, descendants, and same inodes."""

    left = canonical(first)
    right = canonical(second)
    if left == right or left in right.parents or right in left.parents:
        return True
    try:
        return os.path.samefile(left, right)
    except (FileNotFoundError, OSError):
        return False


def require_disjoint(source: Path, target: Path) -> None:
    if paths_overlap(source, target):
        raise UnsafePathOverlap(
            f"refusing overlapping installation paths: source={canonical(source)} "
            f"target={canonical(target)}"
        )


def validate_skill_name(skill: str) -> str:
    if not skill or Path(skill).name != skill or skill in {".", ".."}:
        raise ValueError(f"skill must be one directory name, got {skill!r}")
    return skill


def tree_manifest(root: Path) -> dict[str, str]:
    """Hash file bytes and symlink destinations under a skill directory."""

    manifest: dict[str, str] = {}
    for directory, directories, files in os.walk(root, followlinks=False):
        base = Path(directory)
        for name in sorted(directories):
            path = base / name
            if path.is_symlink():
                relative = path.relative_to(root).as_posix()
                manifest[relative] = "symlink:" + os.readlink(path)
        for name in sorted(files):
            path = base / name
            relative = path.relative_to(root).as_posix()
            if path.is_symlink():
                manifest[relative] = "symlink:" + os.readlink(path)
            else:
                manifest[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return dict(sorted(manifest.items()))


def discover_installed_skill(project: Path, skill: str) -> Path:
    candidates: dict[Path, Path] = {}
    for directory, directories, files in os.walk(project, followlinks=False):
        current = Path(directory)
        if current.name == skill and "SKILL.md" in files:
            candidates.setdefault(canonical(current), current)
        for name in directories:
            candidate = current / name
            if (
                candidate.name == skill
                and candidate.is_symlink()
                and (candidate / "SKILL.md").is_file()
            ):
                candidates.setdefault(canonical(candidate), candidate)

    if not candidates:
        raise RuntimeError(f"installer produced no {skill}/SKILL.md under {project}")
    if len(candidates) != 1:
        rendered = ", ".join(str(path) for path in candidates)
        raise RuntimeError(f"installer produced multiple independent skill roots: {rendered}")

    installed = next(iter(candidates))
    project_root = canonical(project)
    if installed != project_root and project_root not in installed.parents:
        raise UnsafePathOverlap(
            f"installed skill resolves outside disposable target: {installed}"
        )
    return installed


def run_probe(skill: str, source_root: Path = SKILLS_ROOT) -> dict[str, object]:
    skill = validate_skill_name(skill)
    live_source = source_root / skill
    if not (live_source / "SKILL.md").is_file():
        raise FileNotFoundError(f"missing skill entrypoint: {live_source / 'SKILL.md'}")
    live_manifest = tree_manifest(live_source)

    with tempfile.TemporaryDirectory(prefix="skill-install-probe-") as temporary:
        temporary_root = Path(temporary)
        snapshot_repository = temporary_root / "source-snapshot"
        snapshot_skill = snapshot_repository / "skills" / skill
        target_project = temporary_root / "target-project"
        target_project.mkdir(parents=True)

        require_disjoint(live_source, snapshot_skill)
        require_disjoint(live_source, target_project)
        require_disjoint(snapshot_repository, target_project)
        snapshot_skill.parent.mkdir(parents=True)
        shutil.copytree(live_source, snapshot_skill, symlinks=True)
        if tree_manifest(snapshot_skill) != live_manifest:
            raise RuntimeError("disposable source snapshot differs from live source")

        command = [
            "npx",
            "-y",
            "skills",
            "add",
            str(snapshot_repository),
            "--skill",
            skill,
            "-a",
            "codex",
            "-y",
        ]
        try:
            completed = subprocess.run(
                command,
                cwd=target_project,
                text=True,
                capture_output=True,
                check=False,
                timeout=180,
            )
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("disposable installation timed out after 180 seconds") from error
        except OSError as error:
            raise RuntimeError(f"could not start npx: {error}") from error
        if completed.returncode != 0:
            raise RuntimeError(
                "disposable installation failed\n"
                f"stdout:\n{completed.stdout}\n"
                f"stderr:\n{completed.stderr}"
            )

        installed_skill = discover_installed_skill(target_project, skill)
        source_manifest = tree_manifest(snapshot_skill)
        installed_manifest = tree_manifest(installed_skill)
        if source_manifest != installed_manifest:
            missing = sorted(source_manifest.keys() - installed_manifest.keys())
            extra = sorted(installed_manifest.keys() - source_manifest.keys())
            changed = sorted(
                path
                for path in source_manifest.keys() & installed_manifest.keys()
                if source_manifest[path] != installed_manifest[path]
            )
            raise RuntimeError(
                "installed skill differs from disposable source snapshot: "
                f"missing={missing} extra={extra} changed={changed}"
            )
        if tree_manifest(live_source) != live_manifest:
            raise RuntimeError("live source changed during disposable installation")

        return {
            "status": "passed",
            "skill": skill,
            "files": len(source_manifest),
            "source": "disposable-snapshot",
            "target": "disposable-project",
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill", help="One directory name under skills/")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        result = run_probe(args.skill)
    except (FileNotFoundError, RuntimeError, UnsafePathOverlap, ValueError) as error:
        print(f"skill installation probe failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
