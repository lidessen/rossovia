#!/usr/bin/env python3
"""Deterministic lifecycle test for scripts/mission-record.py."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "mission-record.py"


def run(cwd: Path, *arguments: str, expect: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["python3", str(SCRIPT), *arguments],
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != expect:
        raise AssertionError(
            f"expected {expect}, got {result.returncode}: {' '.join(arguments)}\nstdout={result.stdout}\nstderr={result.stderr}",
        )
    return result


def git(cwd: Path, *arguments: str) -> None:
    subprocess.run(["git", *arguments], cwd=cwd, check=True, stdout=subprocess.DEVNULL)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="mission-record-test-") as temporary:
        repo = Path(temporary)
        git(repo, "init")
        git(repo, "config", "user.name", "Mission Test")
        git(repo, "config", "user.email", "mission@example.test")

        run(
            repo,
            "init", "founding", "--title", "Founding baseline", "--mainline", "Return every founding branch to one reviewable baseline",
            "--accept", "Every branch has a return record", "--source", "design/FOUNDING-MANDATE.md",
        )
        listing = json.loads(run(repo, "list").stdout)
        assert [mission["id"] for mission in listing["activeMissions"]] == ["founding"]
        assert listing["activeMissions"][0]["title"] == "Founding baseline"
        assert listing["activeMissions"][0]["currentFocus"] == "mainline"
        run(repo, "check", "founding", "--git", expect=2)

        git(repo, "add", "operations/missions/founding.json")
        git(repo, "commit", "-m", "ops: open founding mission")
        run(repo, "check", "founding", "--git", "--require-committed")

        run(
            repo,
            "add-branch", "founding", "research", "--kind", "investigation", "--purpose", "Inspect the missing continuity carrier",
            "--return-condition", "State whether a Git-tracked source is needed", "--source", "design/operations/OPERATING-PROTOCOL.md",
        )
        status = json.loads(run(repo, "status", "founding").stdout)
        assert status["currentFocus"] == "research"
        assert status["openBranches"][0]["id"] == "research"
        listing = json.loads(run(repo, "list").stdout)
        assert listing["activeMissions"][0]["openBranches"][0]["id"] == "research"

        run(repo, "suspend", "founding", "research", "--reactivation-signal", "A material mission starts")
        run(repo, "close", "founding", "--closure-source", "https://example.test/pr/1", expect=2)
        run(repo, "resume", "founding", "research")
        run(repo, "settle", "founding", "research", "--disposition", "no-change", "--mainline-delta", "The mission record is the required carrier")
        run(repo, "close", "founding", "--closure-source", "https://example.test/pr/1")
        assert json.loads(run(repo, "list").stdout)["activeMissions"] == []

        git(repo, "add", "operations/missions/founding.json")
        git(repo, "commit", "-m", "ops: settle founding mission")
        run(repo, "check", "founding", "--git", "--require-committed")
        run(repo, "prune", "founding")
        assert not (repo / "operations/missions/founding.json").exists()

        invalid = repo / "operations" / "missions" / "broken.json"
        invalid.write_text("{}\n", encoding="utf-8")
        failed_listing = run(repo, "list", expect=2)
        assert "version must be mission-record.v1" in failed_listing.stderr

    print("mission-record tests passed")


if __name__ == "__main__":
    main()
