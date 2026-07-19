#!/usr/bin/env python3
"""Resolve an Atthis project alias to a verified local Git workspace.

The portable project registry and machine-local workspace mapping are separate
sources.  Generated resolution output is only a read-only projection over them
and the current Git state.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


HOME_VERSION = "atthis.home.v1"
PROJECTS_VERSION = "atthis.projects.v1"
WORKSPACES_VERSION = "atthis.workspaces.v1"
ROOTS_VERSION = "atthis.roots.v1"
INDEX_VERSION = "atthis.workspace-index.v1"
RESOLUTION_VERSION = "atthis.resolution.v1"
DEFAULT_HOME = Path("~/.atthis")
HOME_DIRECTORIES = ("config", "state", "missions", "memory", "cognition", "receipts", "cache")


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fail(message: str) -> None:
    raise ValueError(message)


def nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a non-empty string")
    return value.strip()


def string_list(value: Any, label: str, minimum: int = 0) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        fail(f"{label} must be a list of non-empty strings")
    if len(value) < minimum:
        fail(f"{label} must have at least {minimum} item(s)")
    return [item.strip() for item in value]


def home_path(argument: str | None) -> Path:
    raw = argument or os.environ.get("ATTHIS_HOME") or str(DEFAULT_HOME)
    return Path(raw).expanduser().resolve()


def manifest_path(home: Path) -> Path:
    return home / "manifest.json"


def projects_path(home: Path) -> Path:
    return home / "config" / "projects.json"


def workspaces_path(home: Path) -> Path:
    return home / "state" / "workspaces.json"


def roots_path(home: Path) -> Path:
    return home / "state" / "roots.json"


def index_path(home: Path) -> Path:
    return home / "cache" / "workspaces.json"


def load_json(path: Path) -> Any:
    if not path.is_file():
        fail(f"required Atthis source not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"invalid JSON in {path}: {error}")


def save_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def validate_manifest(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != HOME_VERSION:
        fail(f"manifest version must be {HOME_VERSION}")
    if value.get("namespace") != "atthis":
        fail("manifest namespace must be atthis")
    nonempty(value.get("createdAt"), "manifest.createdAt")
    return value


def validate_projects(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != PROJECTS_VERSION:
        fail(f"projects version must be {PROJECTS_VERSION}")
    projects = value.get("projects")
    if not isinstance(projects, list):
        fail("projects must be a list")
    project_ids: set[str] = set()
    lookup_keys: dict[str, str] = {}
    for project in projects:
        if not isinstance(project, dict):
            fail("each project must be an object")
        project_id = nonempty(project.get("id"), "project.id")
        folded_id = project_id.casefold()
        if folded_id in project_ids:
            fail(f"duplicate project id: {project_id}")
        project_ids.add(folded_id)
        id_owner = lookup_keys.get(folded_id)
        if id_owner and id_owner != project_id:
            fail(f"project lookup key {project_id!r} belongs to both {id_owner} and {project_id}")
        lookup_keys[folded_id] = project_id
        nonempty(project.get("repository"), f"project {project_id}.repository")
        project_aliases = string_list(project.get("aliases"), f"project {project_id}.aliases", 1)
        folded = [alias.casefold() for alias in project_aliases]
        if len(set(folded)) != len(folded):
            fail(f"project {project_id} aliases must be unique")
        for alias in folded:
            owner = lookup_keys.get(alias)
            if owner and owner != project_id:
                fail(f"project lookup key {alias!r} belongs to both {owner} and {project_id}")
            lookup_keys[alias] = project_id
    return value


def validate_workspaces(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != WORKSPACES_VERSION:
        fail(f"workspaces version must be {WORKSPACES_VERSION}")
    workspaces = value.get("workspaces")
    if not isinstance(workspaces, list):
        fail("workspaces must be a list")
    ids: set[str] = set()
    for workspace in workspaces:
        if not isinstance(workspace, dict):
            fail("each workspace must be an object")
        project_id = nonempty(workspace.get("projectId"), "workspace.projectId")
        if project_id in ids:
            fail(f"duplicate workspace mapping: {project_id}")
        ids.add(project_id)
        nonempty(workspace.get("path"), f"workspace {project_id}.path")
    return value


def validate_roots(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != ROOTS_VERSION:
        fail(f"roots version must be {ROOTS_VERSION}")
    roots = string_list(value.get("roots"), "roots")
    if len(set(roots)) != len(roots):
        fail("workspace roots must be unique")
    return value


def validate_index(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != INDEX_VERSION:
        fail(f"workspace index version must be {INDEX_VERSION}")
    nonempty(value.get("generatedAt"), "workspace index.generatedAt")
    entries = value.get("entries")
    if not isinstance(entries, list):
        fail("workspace index entries must be a list")
    paths: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            fail("each workspace index entry must be an object")
        path = nonempty(entry.get("path"), "workspace index entry.path")
        if path in paths:
            fail(f"duplicate indexed workspace path: {path}")
        paths.add(path)
        repository = entry.get("repository")
        if repository is not None:
            nonempty(repository, f"indexed workspace {path}.repository")
        string_list(entry.get("aliases"), f"indexed workspace {path}.aliases", 1)
    return value


def require_home(home: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    validate_manifest(load_json(manifest_path(home)))
    projects = validate_projects(load_json(projects_path(home)))
    workspaces = validate_workspaces(load_json(workspaces_path(home)))
    validate_roots(load_json(roots_path(home)))
    return projects, workspaces


def run_git(arguments: list[str], cwd: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(cwd), *arguments],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(result.stderr.strip() or f"git {' '.join(arguments)} failed in {cwd}")
    return result.stdout.strip()


def optional_git(arguments: list[str], cwd: Path) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(cwd), *arguments],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    value = result.stdout.strip()
    return value if result.returncode == 0 and value else None


def git_root(path: Path) -> Path:
    if not path.exists():
        fail(f"workspace path does not exist: {path}")
    return Path(run_git(["rev-parse", "--show-toplevel"], path)).resolve()


def normalized_repository(value: str) -> str:
    normalized = value.strip().removesuffix("/")
    if "://" not in normalized and "@" in normalized and ":" in normalized:
        authority, path = normalized.split(":", 1)
        normalized = f"ssh://{authority}/{path}"
    parsed = urlparse(normalized)
    if parsed.hostname:
        path = parsed.path.strip("/").removesuffix(".git")
        return f"{parsed.hostname}/{path}".casefold()
    return normalized.removesuffix(".git").casefold()


def repository_basename(repository: str) -> str:
    normalized = repository.rstrip("/").removesuffix(".git")
    return normalized.rsplit("/", 1)[-1].rsplit(":", 1)[-1]


def project_by_query(projects: dict[str, Any], query: str) -> dict[str, Any]:
    folded = nonempty(query, "query").casefold()
    matches = [
        project
        for project in projects["projects"]
        if project["id"].casefold() == folded
        or folded in {alias.casefold() for alias in project["aliases"]}
    ]
    if not matches:
        fail(f"no project matches {query!r}")
    if len(matches) != 1:
        fail(f"project query is ambiguous: {query!r}")
    return matches[0]


def workspace_for(workspaces: dict[str, Any], project_id: str) -> dict[str, Any]:
    matches = [workspace for workspace in workspaces["workspaces"] if workspace["projectId"] == project_id]
    if not matches:
        fail(f"no local workspace is attached for {project_id}")
    return matches[0]


def indexed_by_query(index: dict[str, Any], query: str) -> dict[str, Any]:
    folded = nonempty(query, "query").casefold()
    matches = [entry for entry in index["entries"] if folded in {alias.casefold() for alias in entry["aliases"]}]
    if not matches:
        fail(f"no registered or indexed project matches {query!r}; add a workspace root or refresh the index")
    if len(matches) != 1:
        paths = ", ".join(entry["path"] for entry in matches)
        fail(f"indexed project query is ambiguous: {query!r} matches {paths}")
    return matches[0]


def observe_workspace(project: dict[str, Any], workspace: dict[str, Any]) -> dict[str, Any]:
    configured_path = Path(workspace["path"]).expanduser().resolve()
    root = git_root(configured_path)
    if root != configured_path:
        fail(f"workspace mapping is not the Git root: configured {configured_path}, observed {root}")
    origin = optional_git(["remote", "get-url", "origin"], root)
    expected_repository = project.get("repository")
    if expected_repository and origin is None:
        fail(f"workspace origin missing for {project['id']}: expected {expected_repository}")
    if expected_repository and origin and normalized_repository(origin) != normalized_repository(expected_repository):
        fail(
            f"workspace origin mismatch for {project['id']}: "
            f"expected {expected_repository}, observed {origin}",
        )
    status_lines = run_git(["status", "--short", "--branch"], root).splitlines()
    branch = run_git(["branch", "--show-current"], root)
    instructions = [name for name in ("AGENTS.md", "CLAUDE.md") if (root / name).is_file()]
    orientation = [name for name in ("DESIGN.md", "README.md") if (root / name).is_file()]
    return {
        "path": str(root),
        "origin": origin,
        "head": optional_git(["rev-parse", "HEAD"], root),
        "branch": branch or None,
        "dirty": len(status_lines) > 1,
        "status": status_lines,
        "instructionFiles": instructions,
        "orientationFiles": orientation,
    }


def discover_git_roots(root: Path, maximum_depth: int = 2) -> list[Path]:
    discovered: list[Path] = []
    pending: list[tuple[Path, int]] = [(root, 0)]
    skipped_names = {"node_modules", "vendor", "dist", "build"}
    while pending:
        current, depth = pending.pop(0)
        if (current / ".git").exists():
            discovered.append(git_root(current))
            continue
        if depth >= maximum_depth:
            continue
        try:
            children = sorted(
                (
                    child
                    for child in current.iterdir()
                    if child.is_dir()
                    and not child.is_symlink()
                    and not child.name.startswith(".")
                    and child.name not in skipped_names
                ),
                key=lambda child: child.name.casefold(),
            )
        except OSError as error:
            fail(f"cannot scan workspace root {current}: {error}")
        pending.extend((child, depth + 1) for child in children)
    return sorted(set(discovered), key=lambda path: str(path).casefold())


def scan_roots(home: Path, roots: dict[str, Any]) -> dict[str, Any]:
    entries_by_path: dict[str, dict[str, Any]] = {}
    for raw_root in roots["roots"]:
        root = Path(raw_root).expanduser().resolve()
        if not root.is_dir():
            fail(f"workspace root does not exist or is not a directory: {root}")
        for repository_root in discover_git_roots(root):
            repository = optional_git(["remote", "get-url", "origin"], repository_root)
            aliases = {repository_root.name}
            if repository:
                aliases.add(repository_basename(repository))
            entries_by_path[str(repository_root)] = {
                "path": str(repository_root),
                "repository": repository,
                "aliases": sorted(aliases, key=str.casefold),
            }
    value = {
        "version": INDEX_VERSION,
        "generatedAt": now(),
        "entries": sorted(entries_by_path.values(), key=lambda entry: entry["path"].casefold()),
    }
    validate_index(value)
    save_json(index_path(home), value)
    return value


def add_roots(home: Path, paths: list[str]) -> dict[str, Any]:
    roots = validate_roots(load_json(roots_path(home)))
    resolved = []
    for raw_path in paths:
        path = Path(raw_path).expanduser().resolve()
        if not path.is_dir():
            fail(f"workspace root does not exist or is not a directory: {path}")
        resolved.append(str(path))
    roots["roots"] = sorted({*roots["roots"], *resolved}, key=str.casefold)
    validate_roots(roots)
    save_json(roots_path(home), roots)
    return roots


def command_init(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    for directory in HOME_DIRECTORIES:
        (home / directory).mkdir(parents=True, exist_ok=True)
    if manifest_path(home).exists():
        validate_manifest(load_json(manifest_path(home)))
    else:
        save_json(manifest_path(home), {"version": HOME_VERSION, "namespace": "atthis", "createdAt": now()})
    if projects_path(home).exists():
        validate_projects(load_json(projects_path(home)))
    else:
        save_json(projects_path(home), {"version": PROJECTS_VERSION, "projects": []})
    if workspaces_path(home).exists():
        validate_workspaces(load_json(workspaces_path(home)))
    else:
        save_json(workspaces_path(home), {"version": WORKSPACES_VERSION, "workspaces": []})
    if roots_path(home).exists():
        validate_roots(load_json(roots_path(home)))
    else:
        save_json(roots_path(home), {"version": ROOTS_VERSION, "roots": []})
    if index_path(home).exists():
        validate_index(load_json(index_path(home)))
    else:
        save_json(index_path(home), {"version": INDEX_VERSION, "generatedAt": now(), "entries": []})
    roots = add_roots(home, args.workspace_root) if args.workspace_root else validate_roots(load_json(roots_path(home)))
    index = scan_roots(home, roots) if args.workspace_root else validate_index(load_json(index_path(home)))
    print(json.dumps({
        "home": str(home),
        "initialized": True,
        "workspaceRoots": roots["roots"],
        "indexedWorkspaces": len(index["entries"]),
    }, ensure_ascii=False, indent=2))


def command_register(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, workspaces = require_home(home)
    root = git_root(Path(args.path).expanduser())
    repository = run_git(["remote", "get-url", "origin"], root)
    aliases = {root.name, repository_basename(repository), *args.alias}
    aliases = {nonempty(alias, "alias") for alias in aliases}
    project = next((item for item in projects["projects"] if item["id"] == args.id), None)
    if project is None:
        project = {"id": nonempty(args.id, "project id"), "repository": repository, "aliases": []}
        projects["projects"].append(project)
    elif normalized_repository(project["repository"]) != normalized_repository(repository):
        fail(
            f"refusing to rebind stable project id {args.id}: "
            f"expected {project['repository']}, observed {repository}",
        )
    project["repository"] = repository
    project["aliases"] = sorted({*project["aliases"], *aliases}, key=str.casefold)
    workspace = next((item for item in workspaces["workspaces"] if item["projectId"] == args.id), None)
    if workspace is None:
        workspace = {"projectId": args.id, "path": str(root)}
        workspaces["workspaces"].append(workspace)
    else:
        workspace["path"] = str(root)
    validate_projects(projects)
    validate_workspaces(workspaces)
    save_json(projects_path(home), projects)
    save_json(workspaces_path(home), workspaces)
    print(json.dumps({"project": project, "workspace": workspace}, ensure_ascii=False, indent=2))


def command_attach(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, workspaces = require_home(home)
    project = project_by_query(projects, args.query)
    root = git_root(Path(args.path).expanduser())
    origin = run_git(["remote", "get-url", "origin"], root)
    if normalized_repository(origin) != normalized_repository(project["repository"]):
        fail(f"refusing to attach a different repository: expected {project['repository']}, observed {origin}")
    workspace = next((item for item in workspaces["workspaces"] if item["projectId"] == project["id"]), None)
    if workspace is None:
        workspaces["workspaces"].append({"projectId": project["id"], "path": str(root)})
    else:
        workspace["path"] = str(root)
    validate_workspaces(workspaces)
    save_json(workspaces_path(home), workspaces)
    print(json.dumps({"projectId": project["id"], "path": str(root)}, ensure_ascii=False, indent=2))


def command_resolve(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, workspaces = require_home(home)
    matches = [
        project
        for project in projects["projects"]
        if project["id"].casefold() == args.query.casefold()
        or args.query.casefold() in {alias.casefold() for alias in project["aliases"]}
    ]
    if len(matches) > 1:
        fail(f"project query is ambiguous: {args.query!r}")
    if matches:
        project = matches[0]
        workspace = workspace_for(workspaces, project["id"])
        registration = "registered"
    else:
        candidate = indexed_by_query(validate_index(load_json(index_path(home))), args.query)
        project = {"id": None, "repository": candidate["repository"], "aliases": candidate["aliases"]}
        workspace = {"path": candidate["path"]}
        registration = "discovered"
    observation = observe_workspace(project, workspace)
    print(json.dumps({
        "version": RESOLUTION_VERSION,
        "query": args.query,
        "registration": registration,
        "project": project,
        "workspace": observation,
    }, ensure_ascii=False, indent=2))


def command_root_add(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    require_home(home)
    roots = add_roots(home, args.path)
    index = scan_roots(home, roots)
    print(json.dumps({
        "workspaceRoots": roots["roots"],
        "indexedWorkspaces": len(index["entries"]),
    }, ensure_ascii=False, indent=2))


def command_root_list(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    require_home(home)
    print(json.dumps(validate_roots(load_json(roots_path(home))), ensure_ascii=False, indent=2))


def command_scan(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    require_home(home)
    index = scan_roots(home, validate_roots(load_json(roots_path(home))))
    print(json.dumps({"indexedWorkspaces": len(index["entries"]), "index": str(index_path(home))}, indent=2))


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--home", help="Atthis home; defaults to ATTHIS_HOME or ~/.atthis")
    commands = result.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init", help="initialize the relocatable Atthis home")
    init.add_argument("--workspace-root", action="append", default=[], help="machine-local root to index; repeatable")
    init.set_defaults(run=command_init)

    register = commands.add_parser("register", help="register one project and its current local Git root")
    register.add_argument("path")
    register.add_argument("--id", required=True, help="stable project identity, not a display or repository name")
    register.add_argument("--alias", action="append", default=[], help="spoken lookup alias; repeatable")
    register.set_defaults(run=command_register)

    attach = commands.add_parser("attach", help="move an existing project mapping to a verified local Git root")
    attach.add_argument("query")
    attach.add_argument("path")
    attach.set_defaults(run=command_attach)

    resolve = commands.add_parser("resolve", help="resolve an alias and report verified current Git state")
    resolve.add_argument("query")
    resolve.set_defaults(run=command_resolve)

    root = commands.add_parser("root", help="manage machine-local workspace roots")
    root_commands = root.add_subparsers(dest="root_command", required=True)
    root_add = root_commands.add_parser("add", help="add and immediately scan one or more roots")
    root_add.add_argument("path", nargs="+")
    root_add.set_defaults(run=command_root_add)
    root_list = root_commands.add_parser("list", help="list configured roots")
    root_list.set_defaults(run=command_root_list)

    scan = commands.add_parser("scan", help="rebuild the workspace index from configured roots")
    scan.set_defaults(run=command_scan)
    return result


def main() -> None:
    args = parser().parse_args()
    try:
        args.run(args)
    except ValueError as error:
        print(f"atthis: {error}", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
