#!/usr/bin/env python3
"""Resolve an Atthis project alias to a verified local Git workspace.

The portable project registry and machine-local workspace mapping are separate
sources.  Generated resolution output is only a read-only projection over them
and the current Git state.
"""

from __future__ import annotations

import argparse
import hashlib
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
PREFERENCES_VERSION = "atthis.preferences.v1"
PREFERENCE_PROJECTION_VERSION = "atthis.preference-projection.v1"
PREFERENCE_RECEIPT_VERSION = "atthis.preference-receipt.v1"
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


def user_preferences_path(home: Path) -> Path:
    return home / "config" / "preferences.json"


def machine_preferences_path(home: Path) -> Path:
    return home / "state" / "preferences.json"


def preference_receipts_path(home: Path) -> Path:
    return home / "receipts" / "preferences.jsonl"


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
        repository = nonempty(project.get("repository"), f"project {project_id}.repository")
        if repository_locator(repository) != repository:
            fail(f"project {project_id}.repository must be a credential-free canonical locator")
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


def validate_preferences(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != PREFERENCES_VERSION:
        fail(f"{label} version must be {PREFERENCES_VERSION}")
    preferences = value.get("preferences")
    if not isinstance(preferences, list):
        fail(f"{label}.preferences must be a list")
    identities: set[tuple[str, str | None]] = set()
    required = {"id", "statement", "source", "recordedAt", "updatedAt"}
    optional = {"projectId", "reopenWhen"}
    for preference in preferences:
        if not isinstance(preference, dict):
            fail(f"each {label} preference must be an object")
        unknown = set(preference) - required - optional
        missing = required - set(preference)
        if unknown or missing:
            fail(f"{label} preference fields are invalid: missing={sorted(missing)}, unknown={sorted(unknown)}")
        preference_id = nonempty(preference.get("id"), f"{label} preference.id")
        nonempty(preference.get("statement"), f"{label} preference {preference_id}.statement")
        if preference.get("source") != "user-explicit":
            fail(f"{label} preference {preference_id}.source must be user-explicit")
        nonempty(preference.get("recordedAt"), f"{label} preference {preference_id}.recordedAt")
        nonempty(preference.get("updatedAt"), f"{label} preference {preference_id}.updatedAt")
        project_id = preference.get("projectId")
        if project_id is not None:
            project_id = nonempty(project_id, f"{label} preference {preference_id}.projectId")
        reopen_when = preference.get("reopenWhen")
        if reopen_when is not None:
            nonempty(reopen_when, f"{label} preference {preference_id}.reopenWhen")
        identity = (preference_id.casefold(), project_id.casefold() if project_id else None)
        if identity in identities:
            fail(f"duplicate {label} preference: {preference_id} for {project_id or 'all projects'}")
        identities.add(identity)
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
            repository = nonempty(repository, f"indexed workspace {path}.repository")
            if repository_locator(repository) != repository:
                fail(f"indexed workspace {path}.repository must be a credential-free canonical locator")
        string_list(entry.get("aliases"), f"indexed workspace {path}.aliases", 1)
    return value


def require_home(home: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    validate_manifest(load_json(manifest_path(home)))
    projects = validate_projects(load_json(projects_path(home)))
    workspaces = validate_workspaces(load_json(workspaces_path(home)))
    validate_roots(load_json(roots_path(home)))
    return projects, workspaces


def require_preference_sources(home: Path, projects: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    user = validate_preferences(load_json(user_preferences_path(home)), "user preferences")
    machine = validate_preferences(load_json(machine_preferences_path(home)), "machine preferences")
    project_ids = {project["id"] for project in projects["projects"]}
    for label, source in (("user", user), ("machine", machine)):
        for preference in source["preferences"]:
            project_id = preference.get("projectId")
            if project_id is not None and project_id not in project_ids:
                fail(f"{label} preference {preference['id']} references unknown project id: {project_id}")
    return user, machine


def preference_path(home: Path, scope: str) -> Path:
    return user_preferences_path(home) if scope == "user" else machine_preferences_path(home)


def preference_project_id(projects: dict[str, Any], query: str | None) -> str | None:
    return project_by_query(projects, query)["id"] if query else None


def preference_digest(preference: dict[str, Any]) -> str:
    payload = json.dumps(preference, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validate_preference_receipts(value: str) -> None:
    fields = {"version", "at", "action", "scope", "id", "projectId", "recordDigest"}
    hex_characters = set("0123456789abcdef")
    for line_number, line in enumerate(value.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            receipt = json.loads(line)
        except json.JSONDecodeError as error:
            fail(f"invalid preference receipt at line {line_number}: {error}")
        if not isinstance(receipt, dict) or set(receipt) != fields:
            fail(f"preference receipt at line {line_number} has invalid fields")
        if receipt.get("version") != PREFERENCE_RECEIPT_VERSION:
            fail(f"preference receipt at line {line_number} has an invalid version")
        nonempty(receipt.get("at"), f"preference receipt {line_number}.at")
        if receipt.get("action") not in {"set", "retire"}:
            fail(f"preference receipt at line {line_number} has an invalid action")
        if receipt.get("scope") not in {"user", "machine"}:
            fail(f"preference receipt at line {line_number} has an invalid scope")
        nonempty(receipt.get("id"), f"preference receipt {line_number}.id")
        project_id = receipt.get("projectId")
        if project_id is not None:
            nonempty(project_id, f"preference receipt {line_number}.projectId")
        digest = nonempty(receipt.get("recordDigest"), f"preference receipt {line_number}.recordDigest")
        if len(digest) != 64 or any(character not in hex_characters for character in digest):
            fail(f"preference receipt at line {line_number} has an invalid record digest")


def commit_preference_change(
    home: Path,
    scope: str,
    source: dict[str, Any],
    action: str,
    preference: dict[str, Any],
) -> None:
    source_path = preference_path(home, scope)
    path = preference_receipts_path(home)
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    validate_preference_receipts(existing)
    receipt = {
        "version": PREFERENCE_RECEIPT_VERSION,
        "at": now(),
        "action": action,
        "scope": scope,
        "id": preference["id"],
        "projectId": preference.get("projectId"),
        "recordDigest": preference_digest(preference),
    }
    next_source = json.dumps(source, ensure_ascii=False, indent=2) + "\n"
    next_receipts = existing + json.dumps(receipt, ensure_ascii=False, sort_keys=True) + "\n"
    validate_preference_receipts(next_receipts)
    previous_source = source_path.read_text(encoding="utf-8")
    source_temporary = source_path.with_suffix(source_path.suffix + ".preference-txn.tmp")
    receipt_temporary = path.with_suffix(path.suffix + ".preference-txn.tmp")
    source_temporary.write_text(next_source, encoding="utf-8")
    try:
        receipt_temporary.write_text(next_receipts, encoding="utf-8")
        source_temporary.replace(source_path)
        try:
            receipt_temporary.replace(path)
        except OSError:
            rollback = source_path.with_suffix(source_path.suffix + ".preference-rollback.tmp")
            rollback.write_text(previous_source, encoding="utf-8")
            rollback.replace(source_path)
            raise
    finally:
        source_temporary.unlink(missing_ok=True)
        receipt_temporary.unlink(missing_ok=True)


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


def repository_locator(value: str) -> str:
    normalized = value.strip().removesuffix("/")
    if "://" not in normalized and "@" in normalized and ":" in normalized:
        authority, path = normalized.split(":", 1)
        normalized = f"ssh://{authority.rsplit('@', 1)[-1]}/{path}"
    parsed = urlparse(normalized)
    if parsed.hostname:
        hostname = f"[{parsed.hostname}]" if ":" in parsed.hostname else parsed.hostname
        authority = f"{hostname}:{parsed.port}" if parsed.port is not None else hostname
        return parsed._replace(netloc=authority, params="", query="", fragment="").geturl().removesuffix("/")
    if parsed.scheme:
        return parsed._replace(params="", query="", fragment="").geturl().removesuffix("/")
    return normalized


def normalized_repository(value: str) -> str:
    locator = repository_locator(value)
    parsed = urlparse(locator)
    if parsed.hostname:
        path = parsed.path.strip("/").removesuffix(".git")
        return f"{parsed.hostname}/{path}".casefold()
    return locator.removesuffix(".git").casefold()


def repository_basename(repository: str) -> str:
    normalized = repository_locator(repository).rstrip("/").removesuffix(".git")
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
    if not root.samefile(configured_path):
        fail(f"workspace mapping is not the Git root: configured {configured_path}, observed {root}")
    raw_origin = optional_git(["remote", "get-url", "origin"], root)
    origin = repository_locator(raw_origin) if raw_origin else None
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
            raw_repository = optional_git(["remote", "get-url", "origin"], repository_root)
            repository = repository_locator(raw_repository) if raw_repository else None
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
    if user_preferences_path(home).exists():
        validate_preferences(load_json(user_preferences_path(home)), "user preferences")
    else:
        save_json(user_preferences_path(home), {"version": PREFERENCES_VERSION, "preferences": []})
    if machine_preferences_path(home).exists():
        validate_preferences(load_json(machine_preferences_path(home)), "machine preferences")
    else:
        save_json(machine_preferences_path(home), {"version": PREFERENCES_VERSION, "preferences": []})
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
    repository = repository_locator(run_git(["remote", "get-url", "origin"], root))
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
    origin = repository_locator(run_git(["remote", "get-url", "origin"], root))
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


def command_preference_set(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, _ = require_home(home)
    user, machine = require_preference_sources(home, projects)
    source = user if args.scope == "user" else machine
    project_id = preference_project_id(projects, args.project)
    preference_id = nonempty(args.id, "preference id")
    statement = nonempty(args.statement, "preference statement")
    reopen_when = nonempty(args.reopen_when, "reopen condition") if args.reopen_when else None
    previous = next(
        (
            preference
            for preference in source["preferences"]
            if preference["id"].casefold() == preference_id.casefold()
            and preference.get("projectId") == project_id
        ),
        None,
    )
    timestamp = now()
    preference = {
        "id": preference_id,
        "statement": statement,
        "source": "user-explicit",
        "recordedAt": previous["recordedAt"] if previous else timestamp,
        "updatedAt": timestamp,
    }
    if project_id is not None:
        preference["projectId"] = project_id
    if reopen_when is not None:
        preference["reopenWhen"] = reopen_when
    comparable = {key: value for key, value in preference.items() if key != "updatedAt"}
    previous_comparable = {key: value for key, value in previous.items() if key != "updatedAt"} if previous else None
    changed = comparable != previous_comparable
    if changed:
        if previous is None:
            source["preferences"].append(preference)
        else:
            source["preferences"][source["preferences"].index(previous)] = preference
        source["preferences"].sort(key=lambda item: (item.get("projectId") or "", item["id"].casefold()))
        validate_preferences(source, f"{args.scope} preferences")
        commit_preference_change(home, args.scope, source, "set", preference)
    else:
        preference = previous
    print(json.dumps({"changed": changed, "scope": args.scope, "preference": preference}, ensure_ascii=False, indent=2))


def command_preference_list(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, _ = require_home(home)
    user, machine = require_preference_sources(home, projects)
    project_id = preference_project_id(projects, args.project)
    selected: dict[str, tuple[tuple[int, int], str, dict[str, Any]]] = {}
    for scope, source in (("user", user), ("machine", machine)):
        for preference in source["preferences"]:
            preference_project = preference.get("projectId")
            if preference_project is not None and preference_project != project_id:
                continue
            rank = (1 if preference_project is not None else 0, 1 if scope == "machine" else 0)
            key = preference["id"].casefold()
            current = selected.get(key)
            if current is None or rank > current[0]:
                selected[key] = (rank, scope, preference)
    projection = []
    for _, scope, preference in sorted(selected.values(), key=lambda item: item[2]["id"].casefold()):
        item = {
            "id": preference["id"],
            "statement": preference["statement"],
            "scope": scope,
            "source": preference["source"],
        }
        if preference.get("projectId") is not None:
            item["projectId"] = preference["projectId"]
        if preference.get("reopenWhen") is not None:
            item["reopenWhen"] = preference["reopenWhen"]
        projection.append(item)
    print(json.dumps({
        "version": PREFERENCE_PROJECTION_VERSION,
        "projectId": project_id,
        "preferences": projection,
    }, ensure_ascii=False, indent=2))


def command_preference_retire(args: argparse.Namespace) -> None:
    home = home_path(args.home)
    projects, _ = require_home(home)
    user, machine = require_preference_sources(home, projects)
    source = user if args.scope == "user" else machine
    project_id = preference_project_id(projects, args.project)
    matches = [
        preference
        for preference in source["preferences"]
        if preference["id"].casefold() == args.id.casefold()
        and preference.get("projectId") == project_id
    ]
    if not matches:
        fail(f"no {args.scope} preference matches {args.id!r} for {project_id or 'all projects'}")
    preference = matches[0]
    source["preferences"].remove(preference)
    validate_preferences(source, f"{args.scope} preferences")
    commit_preference_change(home, args.scope, source, "retire", preference)
    print(json.dumps({
        "retired": True,
        "scope": args.scope,
        "id": preference["id"],
        "projectId": project_id,
    }, ensure_ascii=False, indent=2))


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

    preference = commands.add_parser("preference", help="manage explicit personal defaults")
    preference_commands = preference.add_subparsers(dest="preference_command", required=True)
    preference_set = preference_commands.add_parser("set", help="set one explicit user or machine preference")
    preference_set.add_argument("id")
    preference_set.add_argument("--statement", required=True)
    preference_set.add_argument("--scope", choices=("user", "machine"), required=True)
    preference_set.add_argument("--project", help="registered project ID or alias")
    preference_set.add_argument("--reopen-when", help="condition that should cause the preference to be reconsidered")
    preference_set.set_defaults(run=command_preference_set)
    preference_list = preference_commands.add_parser("list", help="project applicable explicit preferences")
    preference_list.add_argument("--project", help="registered project ID or alias")
    preference_list.set_defaults(run=command_preference_list)
    preference_retire = preference_commands.add_parser("retire", help="retire one exact preference")
    preference_retire.add_argument("id")
    preference_retire.add_argument("--scope", choices=("user", "machine"), required=True)
    preference_retire.add_argument("--project", help="registered project ID or alias")
    preference_retire.set_defaults(run=command_preference_retire)
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
