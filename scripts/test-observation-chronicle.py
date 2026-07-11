#!/usr/bin/env python3
"""Exercise success and rejection boundaries of the Chronicle validator."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate-observation-chronicle.py"


def primary(record_id: str, recorded_at: str = "2026-07-01T10:01:00Z") -> dict:
    return {
        "id": record_id,
        "schema": "observation-record.v1",
        "kind": "observation",
        "occurredAt": "2026-07-01T10:00:00Z",
        "recordedAt": recorded_at,
        "subject": {"type": "test", "id": "subject"},
        "observations": [{"name": "value", "value": True}],
        "method": {"kind": "human-observation", "name": "test", "limitations": ["test only"]},
        "provenance": {"sourceRole": "primary", "sources": [{"locator": "self: test", "role": "raw"}]},
        "quality": {"status": "raw", "limitations": ["test only"]},
        "observer": {"kind": "human", "id": "tester"},
        "recorder": {"kind": "tool", "id": "test"},
        "classification": "internal",
    }


def run_case(name: str, files: dict[str, str], expected: int, needle: str = "") -> None:
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        for filename, content in files.items():
            (base / filename).write_text(content, encoding="utf-8")
        completed = subprocess.run(["python3", str(VALIDATOR), str(base)], text=True, capture_output=True, check=False)
        output = completed.stdout + completed.stderr
        if completed.returncode != expected or needle and needle not in output:
            raise AssertionError(f"{name}: expected {expected}/{needle!r}, got {completed.returncode}: {output}")


def encoded(value: dict) -> str:
    return json.dumps(value, indent=2)


def main() -> None:
    valid = primary("obs-20260701-valid")
    run_case("valid", {"valid.json": encoded(valid)}, 0, "passed")

    run_case("malformed", {"bad.json": "not JSON"}, 1, "invalid JSON")
    run_case("duplicate", {"one.json": encoded(valid), "two.json": encoded(valid)}, 1, "duplicate id")
    ungrounded = primary("obs-20260701-derived")
    ungrounded["provenance"] = {"sourceRole": "derived", "sources": []}
    run_case("ungrounded derived", {"derived.json": encoded(ungrounded)}, 1, "sources must be a non-empty array")
    mismatch = primary("obs-20260701-digest-mismatch")
    mismatch["provenance"] = {
        "sourceRole": "derived",
        "sources": [{
            "locator": "chronicle/records/2026/07/obs-20260711-workcell-readme-review-6k-budget-exceeded.json",
            "role": "raw",
            "sha256": "0" * 64,
        }],
    }
    run_case("local digest mismatch", {"mismatch.json": encoded(mismatch)}, 1, "does not match local source")
    missing = primary("obs-20260702-missing-correction", "2026-07-02T10:01:00Z")
    missing["kind"] = "correction"
    missing["correctionOf"] = "obs-20260701-does-not-exist"
    run_case("missing correction", {"missing.json": encoded(missing)}, 1, "references missing")
    later = primary("obs-20260703-later", "2026-07-03T10:01:00Z")
    forward = primary("obs-20260702-forward-correction", "2026-07-02T10:01:00Z")
    forward["kind"] = "correction"
    forward["correctionOf"] = "obs-20260703-later"
    run_case("forward correction", {"later.json": encoded(later), "forward.json": encoded(forward)}, 1, "earlier recordedAt")

    absolute = primary("obs-20260704-absolute")
    absolute["provenance"] = {
        "sourceRole": "derived",
        "sources": [{"locator": "/etc/passwd", "role": "raw", "sha256": "0" * 64}],
    }
    run_case("absolute locator rejected", {"absolute.json": encoded(absolute)}, 1, "must be repository-relative")

    traverse = primary("obs-20260705-traverse")
    traverse["provenance"] = {
        "sourceRole": "derived",
        "sources": [{"locator": "../../etc/passwd", "role": "raw", "sha256": "0" * 64}],
    }
    run_case("traversing locator rejected", {"traverse.json": encoded(traverse)}, 1, "must not traverse")

    uri = primary("obs-20260706-uri")
    uri["provenance"] = {
        "sourceRole": "derived",
        "sources": [{"locator": "file:///etc/passwd", "role": "raw", "sha256": "0" * 64}],
    }
    run_case("URI locator not opened", {"uri.json": encoded(uri)}, 0, "passed")

    self_loc = primary("obs-20260707-self")
    self_loc["provenance"] = {
        "sourceRole": "derived",
        "sources": [{"locator": "self: observation", "role": "raw", "sha256": "0" * 64}],
    }
    run_case("self locator not opened", {"self.json": encoded(self_loc)}, 0, "passed")

    safe = primary("obs-20260708-safe-relative")
    safe["provenance"] = {
        "sourceRole": "derived",
        "sources": [{
            "locator": "chronicle/records/2026/07/obs-20260711-workcell-readme-review-6k-budget-exceeded.json",
            "role": "raw",
            "sha256": "0" * 64,
        }],
    }
    run_case("safe relative with digest mismatch", {"safe.json": encoded(safe)}, 1, "does not match local source")

    print("Observation Chronicle validator tests passed")


if __name__ == "__main__":
    main()
