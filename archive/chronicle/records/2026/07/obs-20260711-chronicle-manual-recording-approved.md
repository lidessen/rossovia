<!-- observation-record
{
  "id": "obs-20260711-chronicle-manual-recording-approved",
  "schema": "observation-record.v1",
  "kind": "review",
  "occurredAt": "2026-07-11T02:07:21Z",
  "recordedAt": "2026-07-11T02:07:21Z",
  "subject": { "type": "design-decision", "id": "observation-chronicle-record-form" },
  "observations": [
    { "name": "principal-approved-manual-record-form", "value": true }
  ],
  "method": {
    "kind": "human-observation",
    "name": "explicit principal response in authorized agent session",
    "limitations": ["The session is platform-bound; this repository record preserves only the approval and its stated scope."]
  },
  "provenance": {
    "sourceRole": "primary",
    "sources": [
      { "locator": "conversation://authorized-session/2026-07-11#manual-observation-form", "role": "raw" }
    ]
  },
  "quality": {
    "status": "raw",
    "limitations": ["This records approval of the pilot form, not approval of a permanent retention policy or a new decision authority."]
  },
  "observer": { "kind": "human", "id": "principal" },
  "recorder": { "kind": "agent", "id": "codex-root" },
  "classification": "internal"
}
-->

# Observation — Manual observation record form approved

## What was observed

The Principal explicitly approved the proposed form for observations without an automatically generated source: a human-readable Markdown source record with machine-validatable metadata, written by the observer or by a named agent recorder.

## How and where it was observed

The approval was given in the authorized project agent session on 2026-07-11. The exact response was `OK` after the form and recorder boundary were stated.

## Evidence and limitation

This preserves the scoped approval for the pilot. It does not establish a permanent project retention regime, authorize a persistent recorder role, or turn any future agent-generated summary into a human decision.
