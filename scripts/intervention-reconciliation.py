#!/usr/bin/env python3
"""Portable, session-local state for intervention reconciliation bindings."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VERSION = "intervention-reconciliation.v1"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def state_root(value: str | None) -> Path:
    if value:
        return Path(value).expanduser()
    configured = os.environ.get("INTERVENTION_RECONCILIATION_STATE_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".cache" / "intervention-reconciliation"


def workspace_key(cwd: str) -> str:
    return hashlib.sha256(str(Path(cwd).resolve()).encode()).hexdigest()[:16]


def state_path(root: Path, cwd: str, session_id: str) -> Path:
    return root / workspace_key(cwd) / f"{session_id}.json"


def read_state(path: Path, *, cwd: str, session_id: str) -> dict[str, Any]:
    if not path.exists():
        return {
            "version": VERSION,
            "sessionId": session_id,
            "workspace": str(Path(cwd).resolve()),
            "observations": [],
            "receipts": [],
        }
    return json.loads(path.read_text())


def write_state(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)


def latest_state(root: Path, cwd: str) -> Path:
    directory = root / workspace_key(cwd)
    states = sorted(directory.glob("*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not states:
        raise ValueError("no observed intervention session for this workspace")
    return states[0]


def selected_state(args: argparse.Namespace) -> Path:
    if args.state_file:
        return Path(args.state_file).expanduser()
    return latest_state(state_root(args.state_root), args.cwd)


def command_observe(args: argparse.Namespace) -> int:
    payload = json.load(sys.stdin)
    cwd = str(payload["cwd"])
    session_id = str(payload["session_id"])
    prompt = str(payload.get("prompt", ""))
    root = state_root(args.state_root)
    path = state_path(root, cwd, session_id)
    state = read_state(path, cwd=cwd, session_id=session_id)
    observation = {
        "turnId": str(payload.get("turn_id", "unknown")),
        "at": utc_now(),
        "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "promptBytes": len(prompt.encode()),
    }
    state["observations"] = [*state["observations"], observation][-50:]
    write_state(path, state)
    print(json.dumps({"statePath": str(path), "observation": observation}))
    return 0


def command_anchor(args: argparse.Namespace) -> int:
    path = selected_state(args)
    state = json.loads(path.read_text())
    state["anchor"] = {"summary": args.summary, "at": utc_now()}
    write_state(path, state)
    print(json.dumps({"statePath": str(path), "anchor": state["anchor"]}))
    return 0


def command_reconcile(args: argparse.Namespace) -> int:
    path = selected_state(args)
    state = json.loads(path.read_text())
    receipt = {
        "at": utc_now(),
        "rejectedAssumption": args.rejected_assumption,
        "newInvariant": args.new_invariant,
        "affectedSurfaces": args.affected_surface,
        "nextProbe": args.next_probe,
    }
    state["receipts"] = [*state["receipts"], receipt]
    write_state(path, state)
    print(json.dumps({"statePath": str(path), "receipt": receipt}))
    return 0


def command_status(args: argparse.Namespace) -> int:
    path = selected_state(args)
    state = json.loads(path.read_text())
    print(json.dumps({
        "statePath": str(path),
        "sessionId": state["sessionId"],
        "observations": len(state["observations"]),
        "anchor": state.get("anchor"),
        "receipts": state["receipts"],
    }, indent=2))
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--state-root", help="session-local state directory")
    result.add_argument(
        "--state-file",
        help="exact state record supplied by a runtime binding; bypasses cwd discovery",
    )
    commands = result.add_subparsers(dest="command", required=True)

    observe = commands.add_parser("observe")
    observe.set_defaults(handler=command_observe)

    anchor = commands.add_parser("anchor")
    anchor.add_argument("--cwd", default=os.getcwd())
    anchor.add_argument("--summary", required=True)
    anchor.set_defaults(handler=command_anchor)

    reconcile = commands.add_parser("reconcile")
    reconcile.add_argument("--cwd", default=os.getcwd())
    reconcile.add_argument("--rejected-assumption", required=True)
    reconcile.add_argument("--new-invariant", required=True)
    reconcile.add_argument("--affected-surface", action="append", required=True)
    reconcile.add_argument("--next-probe", required=True)
    reconcile.set_defaults(handler=command_reconcile)

    status = commands.add_parser("status")
    status.add_argument("--cwd", default=os.getcwd())
    status.set_defaults(handler=command_status)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        return args.handler(args)
    except (KeyError, TypeError, ValueError, OSError, json.JSONDecodeError) as error:
        print(f"intervention reconciliation: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
