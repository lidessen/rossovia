#!/usr/bin/env python3
"""Maintain one small, Git-tracked operational record for a material mission.

This is deliberately not a task board.  It retains only active missions, their
open branches, and each branch's explicit return-to-mainline contract.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VERSION = "mission-record.v1"
DEFAULT_ROOT = Path("operations/missions")
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
BRANCH_KINDS = {"implementation", "investigation", "review", "correction"}
BRANCH_STATUSES = {"open", "integrating", "suspended", "closed"}
DISPOSITIONS = {"integrate", "no-change", "abandon"}


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fail(message: str) -> None:
    raise ValueError(message)


def nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a non-empty string")
    return value


def list_of_strings(value: Any, label: str, minimum: int = 0) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        fail(f"{label} must be a list of non-empty strings")
    if len(value) < minimum:
        fail(f"{label} must have at least {minimum} item(s)")
    return value


def valid_id(value: Any, label: str) -> str:
    value = nonempty(value, label)
    if not ID_RE.fullmatch(value):
        fail(f"{label} must use lowercase letters, digits, and hyphens")
    return value


def mission_path(root: Path, mission_id: str) -> Path:
    valid_id(mission_id, "mission id")
    return root / f"{mission_id}.json"


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        fail(f"mission record not found: {path}")
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"invalid JSON in {path}: {error}")
    validate(record)
    return record


def save(path: Path, record: dict[str, Any]) -> None:
    validate(record)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def validate(record: Any) -> None:
    if not isinstance(record, dict):
        fail("mission record must be a JSON object")
    if record.get("version") != VERSION:
        fail(f"version must be {VERSION}")
    valid_id(record.get("id"), "id")
    nonempty(record.get("title"), "title")
    sources = list_of_strings(record.get("sources"), "sources", 1)
    if len(set(sources)) != len(sources):
        fail("sources must be unique")
    for field in ("createdAt", "updatedAt"):
        nonempty(record.get(field), field)

    mainline = record.get("mainline")
    if not isinstance(mainline, dict):
        fail("mainline must be an object")
    nonempty(mainline.get("contradiction"), "mainline.contradiction")
    list_of_strings(mainline.get("acceptance"), "mainline.acceptance", 1)
    if mainline.get("status") not in {"active", "settled"}:
        fail("mainline.status must be active or settled")

    branches = record.get("branches")
    if not isinstance(branches, list):
        fail("branches must be a list")
    branch_ids: set[str] = set()
    by_id: dict[str, dict[str, Any]] = {}
    for branch in branches:
        if not isinstance(branch, dict):
            fail("each branch must be an object")
        branch_id = valid_id(branch.get("id"), "branch.id")
        if branch_id in branch_ids:
            fail("branch IDs must be unique")
        branch_ids.add(branch_id)
        by_id[branch_id] = branch
        if branch.get("kind") not in BRANCH_KINDS:
            fail(f"branch {branch_id} has an invalid kind")
        nonempty(branch.get("purpose"), f"branch {branch_id}.purpose")
        nonempty(branch.get("returnCondition"), f"branch {branch_id}.returnCondition")
        branch_sources = list_of_strings(branch.get("sources"), f"branch {branch_id}.sources", 1)
        if len(set(branch_sources)) != len(branch_sources):
            fail(f"branch {branch_id}.sources must be unique")
        if branch.get("status") not in BRANCH_STATUSES:
            fail(f"branch {branch_id} has an invalid status")
        parent = branch.get("parent", "mainline")
        if parent != "mainline" and not isinstance(parent, str):
            fail(f"branch {branch_id}.parent must be mainline or a branch ID")
        if branch.get("status") == "suspended":
            nonempty(branch.get("reactivationSignal"), f"branch {branch_id}.reactivationSignal")
        if branch.get("status") == "closed":
            if branch.get("disposition") not in DISPOSITIONS:
                fail(f"closed branch {branch_id} needs an allowed disposition")
            nonempty(branch.get("mainlineDelta"), f"closed branch {branch_id}.mainlineDelta")

    for branch_id, branch in by_id.items():
        parent = branch.get("parent", "mainline")
        if parent != "mainline" and parent not in by_id:
            fail(f"branch {branch_id} names an unknown parent {parent}")
        if parent == branch_id:
            fail(f"branch {branch_id} cannot parent itself")
        seen = {branch_id}
        while parent != "mainline":
            if parent in seen:
                fail(f"branch parent cycle includes {branch_id}")
            seen.add(parent)
            parent = by_id[parent].get("parent", "mainline")

    for branch_id, branch in by_id.items():
        if branch.get("status") == "closed":
            descendants = [item for item in branches if item.get("parent", "mainline") == branch_id]
            if any(item.get("status") != "closed" for item in descendants):
                fail(f"closed branch {branch_id} still has an active direct child")

    focus = record.get("currentFocus")
    if focus != "mainline" and focus not in by_id:
        fail("currentFocus must be mainline or a branch ID")
    if focus != "mainline" and by_id[focus].get("status") not in {"open", "integrating"}:
        fail("currentFocus may name only an open or integrating branch")

    active_branches = [branch for branch in branches if branch.get("status") != "closed"]
    if mainline.get("status") == "settled":
        list_of_strings(mainline.get("closureSources"), "mainline.closureSources", 1)
        if active_branches:
            fail("a settled mainline may not retain open, integrating, or suspended branches")


def git_state(path: Path, require_committed: bool) -> dict[str, str]:
    repository = run_git(["rev-parse", "--show-toplevel"], path.parent).strip()
    relative = str(path.resolve().relative_to(Path(repository).resolve()))
    tracked = subprocess.run(
        ["git", "-C", repository, "ls-files", "--error-unmatch", "--", relative],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode == 0
    if not tracked:
        fail(f"mission record is not Git-tracked: git add -- {relative}")
    if require_committed:
        clean = subprocess.run(
            ["git", "-C", repository, "diff", "--quiet", "HEAD", "--", relative],
            check=False,
        ).returncode == 0
        if not clean:
            fail(f"mission record is not committed at HEAD: {relative}")
    status = run_git(["status", "--short", "--", relative], Path(repository)).strip()
    return {"repository": repository, "path": relative, "status": status or "clean"}


def run_git(arguments: list[str], cwd: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(cwd), *arguments],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(result.stderr.strip() or "git command failed")
    return result.stdout


def command_init(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.id)
    if path.exists():
        fail(f"mission record already exists: {path}")
    timestamp = now()
    save(path, {
        "version": VERSION,
        "id": args.id,
        "title": args.title,
        "sources": args.source,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "mainline": {"contradiction": args.mainline, "acceptance": args.accept, "status": "active"},
        "branches": [],
        "currentFocus": "mainline",
    })
    print(path)


def command_add_branch(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    if record["mainline"]["status"] != "active":
        fail("cannot add a branch to a settled mission")
    if any(branch["id"] == args.branch for branch in record["branches"]):
        fail(f"branch already exists: {args.branch}")
    record["branches"].append({
        "id": valid_id(args.branch, "branch id"),
        "parent": args.parent,
        "kind": args.kind,
        "purpose": args.purpose,
        "returnCondition": args.return_condition,
        "sources": args.source,
        "status": "open",
    })
    record["currentFocus"] = args.branch
    record["updatedAt"] = now()
    save(path, record)


def branch_by_id(record: dict[str, Any], branch_id: str) -> dict[str, Any]:
    for branch in record["branches"]:
        if branch["id"] == branch_id:
            return branch
    fail(f"unknown branch: {branch_id}")


def command_focus(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    if args.target != "mainline":
        branch = branch_by_id(record, args.target)
        if branch["status"] not in {"open", "integrating"}:
            fail("focus target must be open or integrating")
    record["currentFocus"] = args.target
    record["updatedAt"] = now()
    save(path, record)


def command_suspend(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    branch = branch_by_id(record, args.branch)
    if branch["status"] == "closed":
        fail("cannot suspend a closed branch")
    branch["status"] = "suspended"
    branch["reactivationSignal"] = args.reactivation_signal
    if record["currentFocus"] == branch["id"]:
        record["currentFocus"] = branch.get("parent", "mainline")
    record["updatedAt"] = now()
    save(path, record)


def command_resume(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    branch = branch_by_id(record, args.branch)
    if branch["status"] != "suspended":
        fail("only a suspended branch may resume")
    branch["status"] = "open"
    branch.pop("reactivationSignal", None)
    record["currentFocus"] = branch["id"]
    record["updatedAt"] = now()
    save(path, record)


def command_settle(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    branch = branch_by_id(record, args.branch)
    if branch["status"] == "closed":
        fail("branch is already closed")
    if any(item.get("parent", "mainline") == branch["id"] and item["status"] != "closed" for item in record["branches"]):
        fail("settle child branches before settling their parent")
    branch["status"] = "closed"
    branch["disposition"] = args.disposition
    branch["mainlineDelta"] = args.mainline_delta
    branch.pop("reactivationSignal", None)
    if record["currentFocus"] == branch["id"]:
        record["currentFocus"] = branch.get("parent", "mainline")
    record["updatedAt"] = now()
    save(path, record)


def command_check(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    output: dict[str, Any] = {"id": record["id"], "valid": True}
    if args.git:
        output["git"] = git_state(path, args.require_committed)
    print(json.dumps(output, ensure_ascii=False, indent=2))


def command_status(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    branches = [
        {"id": branch["id"], "status": branch["status"], "parent": branch.get("parent", "mainline"), "returnCondition": branch["returnCondition"]}
        for branch in record["branches"]
        if branch["status"] != "closed"
    ]
    print(json.dumps({"id": record["id"], "mainline": record["mainline"]["status"], "currentFocus": record["currentFocus"], "openBranches": branches}, ensure_ascii=False, indent=2))


def command_close(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    if any(branch["status"] != "closed" for branch in record["branches"]):
        fail("close or resume every branch before settling the mission")
    record["mainline"]["status"] = "settled"
    record["mainline"]["closureSources"] = args.closure_source
    record["currentFocus"] = "mainline"
    record["updatedAt"] = now()
    save(path, record)


def command_prune(args: argparse.Namespace) -> None:
    path = mission_path(args.root, args.mission)
    record = load(path)
    if record["mainline"]["status"] != "settled":
        fail("only a settled mission may be pruned")
    git_state(path, require_committed=True)
    path.unlink()
    print(path)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="tracked mission-record directory")
    commands = result.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init", help="create one active mission record")
    init.add_argument("id")
    init.add_argument("--title", required=True)
    init.add_argument("--mainline", required=True, help="principal contradiction")
    init.add_argument("--accept", action="append", required=True)
    init.add_argument("--source", action="append", required=True)
    init.set_defaults(handler=command_init)

    add_branch = commands.add_parser("add-branch", help="open a side branch with a return contract")
    add_branch.add_argument("mission")
    add_branch.add_argument("branch")
    add_branch.add_argument("--parent", default="mainline")
    add_branch.add_argument("--kind", choices=sorted(BRANCH_KINDS), required=True)
    add_branch.add_argument("--purpose", required=True)
    add_branch.add_argument("--return-condition", required=True)
    add_branch.add_argument("--source", action="append", required=True)
    add_branch.set_defaults(handler=command_add_branch)

    focus = commands.add_parser("focus", help="name the one current focus")
    focus.add_argument("mission")
    focus.add_argument("target")
    focus.set_defaults(handler=command_focus)

    suspend = commands.add_parser("suspend", help="retain a branch with its reactivation signal")
    suspend.add_argument("mission")
    suspend.add_argument("branch")
    suspend.add_argument("--reactivation-signal", required=True)
    suspend.set_defaults(handler=command_suspend)

    resume = commands.add_parser("resume", help="return a suspended branch to the active set")
    resume.add_argument("mission")
    resume.add_argument("branch")
    resume.set_defaults(handler=command_resume)

    settle = commands.add_parser("settle", help="close a branch with its mainline delta")
    settle.add_argument("mission")
    settle.add_argument("branch")
    settle.add_argument("--disposition", choices=sorted(DISPOSITIONS), required=True)
    settle.add_argument("--mainline-delta", required=True)
    settle.set_defaults(handler=command_settle)

    check = commands.add_parser("check", help="validate the mission record")
    check.add_argument("mission")
    check.add_argument("--git", action="store_true", help="require a Git-tracked record")
    check.add_argument("--require-committed", action="store_true", help="require the record to match HEAD")
    check.set_defaults(handler=command_check)

    status = commands.add_parser("status", help="render the active mainline and side branches")
    status.add_argument("mission")
    status.set_defaults(handler=command_status)

    close = commands.add_parser("close", help="settle a mission after every branch returns")
    close.add_argument("mission")
    close.add_argument("--closure-source", action="append", required=True)
    close.set_defaults(handler=command_close)

    prune = commands.add_parser("prune", help="remove a committed settled record; Git history retains it")
    prune.add_argument("mission")
    prune.set_defaults(handler=command_prune)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        args.handler(args)
    except ValueError as error:
        print(f"mission-record: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
