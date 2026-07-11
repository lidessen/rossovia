#!/usr/bin/env python3
"""Validate the Observation Chronicle pilot without third-party dependencies."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import stat
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATHS = [ROOT / "chronicle" / "records", ROOT / "chronicle" / "examples"]
METADATA = re.compile(r"\A<!-- observation-record\n(?P<body>.*?)\n-->\n", re.DOTALL)
ID_PATTERN = re.compile(r"^obs-[a-z0-9][a-z0-9-]*$")
DIGEST_PATTERN = re.compile(r"^[a-f0-9]{64}$")
WINDOWS_ABSOLUTE_PATH = re.compile(r"^[A-Za-z]:[\\/]")
MAX_LOCAL_SOURCE_BYTES = 25 * 1024 * 1024

REQUIRED = {
    "id", "schema", "kind", "occurredAt", "recordedAt", "subject", "observations",
    "method", "provenance", "quality", "observer", "recorder", "classification",
}
ROOT_KEYS = REQUIRED | {"correctionOf"}
KINDS = {"observation", "measurement", "run", "review", "correction"}
METHOD_KINDS = {"human-observation", "instrument", "normalization", "calculation"}
QUALITY = {"raw", "reviewed", "uncertain", "retracted"}
ACTOR_KINDS = {"human", "agent", "system", "organization"}
RECORDER_KINDS = {"human", "agent", "tool"}
CLASSIFICATIONS = {"public", "internal", "restricted"}
SOURCE_ROLES = {"raw", "supporting", "derived-from"}


class ValidationError(Exception):
    pass


def fail(path: Path, message: str) -> None:
    raise ValidationError(f"{path}: {message}")


def as_object(value: Any, path: Path, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(path, f"{field} must be an object")
    return value


def as_nonempty_string(value: Any, path: Path, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(path, f"{field} must be a non-empty string")
    return value


def as_string_list(value: Any, path: Path, field: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        fail(path, f"{field} must be an array of non-empty strings")
    return value


def parse_timestamp(value: Any, path: Path, field: str) -> dt.datetime:
    raw = as_nonempty_string(value, path, field)
    try:
        parsed = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        fail(path, f"{field} must be an ISO-8601 timestamp")
    if parsed.tzinfo is None:
        fail(path, f"{field} must include a timezone")
    return parsed


def read_record(path: Path) -> dict[str, Any]:
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as error:
        fail(path, f"cannot read record: {error}")
    try:
        if path.suffix == ".json":
            value = json.loads(content)
        elif path.suffix == ".md":
            match = METADATA.match(content)
            if not match:
                fail(path, "Markdown observation must start with an observation-record JSON comment")
            value = json.loads(match.group("body"))
        else:
            fail(path, "record must use .json or .md")
    except json.JSONDecodeError as error:
        fail(path, f"invalid JSON metadata: {error.msg}")
    return as_object(value, path, "record")


def validate_actor(value: Any, path: Path, field: str, allowed_kinds: set[str]) -> None:
    actor = as_object(value, path, field)
    if set(actor) != {"kind", "id"}:
        fail(path, f"{field} must contain only kind and id")
    if actor["kind"] not in allowed_kinds:
        fail(path, f"{field}.kind is not allowed")
    as_nonempty_string(actor["id"], path, f"{field}.id")


def local_source_path(locator: str, record_path: Path, field: str) -> Path | None:
    """Return a safe repository-local source path, or None for a non-file locator."""
    if "://" in locator or locator.startswith("self:"):
        return None
    candidate = Path(locator)
    if candidate.is_absolute() or locator.startswith("\\") or WINDOWS_ABSOLUTE_PATH.match(locator):
        fail(record_path, f"{field} must be repository-relative or a URI-style locator")
    if ".." in candidate.parts:
        fail(record_path, f"{field} must not traverse outside the repository")
    resolved = (ROOT / candidate).resolve()
    try:
        resolved.relative_to(ROOT.resolve())
    except ValueError:
        fail(record_path, f"{field} resolves outside the repository")
    return resolved


def sha256_file(path: Path) -> str:
    metadata = path.stat()
    if not stat.S_ISREG(metadata.st_mode):
        raise ValidationError(f"{path}: local source must be a regular file")
    if metadata.st_size > MAX_LOCAL_SOURCE_BYTES:
        raise ValidationError(f"{path}: local source exceeds {MAX_LOCAL_SOURCE_BYTES} byte digest limit")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def validate_record(record: dict[str, Any], path: Path) -> dt.datetime:
    missing = REQUIRED - set(record)
    extra = set(record) - ROOT_KEYS
    if missing:
        fail(path, f"missing required fields: {', '.join(sorted(missing))}")
    if extra:
        fail(path, f"unknown fields: {', '.join(sorted(extra))}")

    record_id = as_nonempty_string(record["id"], path, "id")
    if not ID_PATTERN.fullmatch(record_id):
        fail(path, "id must match obs-<lowercase-hyphenated-name>")
    if record["schema"] != "observation-record.v1":
        fail(path, "schema must be observation-record.v1")
    if record["kind"] not in KINDS:
        fail(path, "kind is not allowed")
    occurred = parse_timestamp(record["occurredAt"], path, "occurredAt")
    recorded = parse_timestamp(record["recordedAt"], path, "recordedAt")

    subject = as_object(record["subject"], path, "subject")
    if set(subject) != {"type", "id"}:
        fail(path, "subject must contain only type and id")
    as_nonempty_string(subject["type"], path, "subject.type")
    as_nonempty_string(subject["id"], path, "subject.id")

    observations = record["observations"]
    if not isinstance(observations, list) or not observations:
        fail(path, "observations must be a non-empty array")
    for index, observation in enumerate(observations):
        item = as_object(observation, path, f"observations[{index}]")
        if set(item) - {"name", "value", "unit", "uncertainty"} or {"name", "value"} - set(item):
            fail(path, f"observations[{index}] has invalid fields")
        as_nonempty_string(item["name"], path, f"observations[{index}].name")
        if type(item["value"]) not in {str, int, float, bool, type(None)}:
            fail(path, f"observations[{index}].value must be a JSON scalar")
        for optional in ("unit", "uncertainty"):
            if optional in item:
                as_nonempty_string(item[optional], path, f"observations[{index}].{optional}")

    method = as_object(record["method"], path, "method")
    if set(method) - {"kind", "name", "version", "limitations"} or {"kind", "name", "limitations"} - set(method):
        fail(path, "method has invalid fields")
    if method["kind"] not in METHOD_KINDS:
        fail(path, "method.kind is not allowed")
    as_nonempty_string(method["name"], path, "method.name")
    if "version" in method:
        as_nonempty_string(method["version"], path, "method.version")
    as_string_list(method["limitations"], path, "method.limitations")

    provenance = as_object(record["provenance"], path, "provenance")
    if set(provenance) != {"sourceRole", "sources"}:
        fail(path, "provenance must contain only sourceRole and sources")
    source_role = provenance["sourceRole"]
    if source_role not in {"primary", "derived"}:
        fail(path, "provenance.sourceRole is not allowed")
    sources = provenance["sources"]
    if not isinstance(sources, list) or not sources:
        fail(path, "provenance.sources must be a non-empty array")
    actual_source_roles: set[str] = set()
    for index, source in enumerate(sources):
        item = as_object(source, path, f"provenance.sources[{index}]")
        if set(item) - {"locator", "role", "sha256"} or {"locator", "role"} - set(item):
            fail(path, f"provenance.sources[{index}] has invalid fields")
        as_nonempty_string(item["locator"], path, f"provenance.sources[{index}].locator")
        if item["role"] not in SOURCE_ROLES:
            fail(path, f"provenance.sources[{index}].role is not allowed")
        actual_source_roles.add(item["role"])
        if "sha256" in item and (not isinstance(item["sha256"], str) or not DIGEST_PATTERN.fullmatch(item["sha256"])):
            fail(path, f"provenance.sources[{index}].sha256 must be lowercase SHA-256")
        locator = item["locator"]
        local_source = local_source_path(locator, path, f"provenance.sources[{index}].locator")
        if local_source and local_source.exists():
            if "sha256" not in item:
                fail(path, f"provenance.sources[{index}] needs sha256 for local source {locator!r}")
            actual_digest = sha256_file(local_source)
            if item["sha256"] != actual_digest:
                fail(path, f"provenance.sources[{index}].sha256 does not match local source {locator!r}")
    if source_role == "primary" and "raw" not in actual_source_roles:
        fail(path, "a primary record needs a raw source")
    if source_role == "derived" and not actual_source_roles & {"raw", "derived-from"}:
        fail(path, "a derived record needs a raw or derived-from source")

    quality = as_object(record["quality"], path, "quality")
    if set(quality) != {"status", "limitations"}:
        fail(path, "quality must contain only status and limitations")
    if quality["status"] not in QUALITY:
        fail(path, "quality.status is not allowed")
    as_string_list(quality["limitations"], path, "quality.limitations")
    validate_actor(record["observer"], path, "observer", ACTOR_KINDS)
    validate_actor(record["recorder"], path, "recorder", RECORDER_KINDS)
    if record["classification"] not in CLASSIFICATIONS:
        fail(path, "classification is not allowed")

    if record["kind"] == "correction":
        if "correctionOf" not in record:
            fail(path, "a correction must declare correctionOf")
    elif "correctionOf" in record:
        fail(path, "only a correction may declare correctionOf")
    if "correctionOf" in record and (not isinstance(record["correctionOf"], str) or not ID_PATTERN.fullmatch(record["correctionOf"])):
        fail(path, "correctionOf must be a valid observation ID")
    return recorded


def record_paths(inputs: list[Path]) -> list[Path]:
    paths: list[Path] = []
    for input_path in inputs:
        if input_path.is_dir():
            paths.extend(path for path in input_path.rglob("*") if path.suffix in {".json", ".md"})
        elif input_path.suffix in {".json", ".md"}:
            paths.append(input_path)
        else:
            fail(input_path, "input must be a record file or directory")
    return sorted(paths)


def validate(inputs: list[Path]) -> int:
    records: dict[str, tuple[Path, dict[str, Any], dt.datetime]] = {}
    for path in record_paths(inputs):
        record = read_record(path)
        recorded = validate_record(record, path)
        record_id = record["id"]
        if record_id in records:
            fail(path, f"duplicate id also used by {records[record_id][0]}")
        records[record_id] = (path, record, recorded)
    if not records:
        raise ValidationError("no observation records found")
    for record_id, (path, record, recorded) in records.items():
        if "correctionOf" not in record:
            continue
        target_id = record["correctionOf"]
        if target_id not in records:
            fail(path, f"correctionOf references missing record {target_id}")
        if records[target_id][2] >= recorded:
            fail(path, f"correctionOf must reference a record with an earlier recordedAt than {record_id}")
    return len(records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path, help="record file or directory; defaults to committed pilot records")
    args = parser.parse_args()
    inputs = [path.resolve() for path in args.paths] if args.paths else DEFAULT_PATHS
    try:
        count = validate(inputs)
    except ValidationError as error:
        print(f"Observation Chronicle validation failed: {error}", file=sys.stderr)
        return 1
    print(f"Observation Chronicle validation passed: {count} records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
