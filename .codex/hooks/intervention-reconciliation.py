#!/usr/bin/env python3
"""Codex UserPromptSubmit adapter for the portable reconciliation state CLI."""

from __future__ import annotations

import json
import shlex
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
STATE_ROOT = Path.home() / ".codex" / "intervention-reconciliation"
CLI = ROOT / "scripts" / "intervention-reconciliation.py"


def main() -> int:
    payload = json.load(sys.stdin)
    result = subprocess.run(
        [sys.executable, str(CLI), "--state-root", str(STATE_ROOT), "observe"],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr, end="")
        return result.returncode
    observed = json.loads(result.stdout)
    receipt_endpoint = " ".join([
        shlex.quote(sys.executable),
        shlex.quote(str(CLI)),
        "--state-file",
        shlex.quote(str(observed["statePath"])),
        "reconcile --help",
    ])
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": (
                "A Principal message has arrived. Before acting on it, compare it with the active task. "
                "If it changes a target, hard boundary, concept relation, authority, or acceptance condition, "
                "run practice-cycle continue and record a correction receipt through the available "
                "intervention-reconciliation binding. The exact session-local receipt endpoint is "
                f"`{receipt_endpoint}`. Otherwise proceed without ceremony. "
                "This binding is advisory, not a mutation or authorization gate. If the endpoint is unavailable "
                "or denied, do not request broader filesystem permission and do not block already-authorized work; "
                "retain the correction in the active task and report the receipt as unresolved."
            ),
        },
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
