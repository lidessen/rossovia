<!-- observation-record
{
  "id": "obs-yyyymmdd-short-subject",
  "schema": "observation-record.v1",
  "kind": "observation",
  "occurredAt": "YYYY-MM-DDTHH:MM:SSZ",
  "recordedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "subject": { "type": "subject-type", "id": "stable-subject-id" },
  "observations": [
    { "name": "what-was-observed", "value": "state the observation" }
  ],
  "method": {
    "kind": "human-observation",
    "name": "direct statement or field observation",
    "limitations": ["state what this record cannot establish"]
  },
  "provenance": {
    "sourceRole": "primary",
    "sources": [
      { "locator": "self: this Markdown source record", "role": "raw" }
    ]
  },
  "quality": {
    "status": "raw",
    "limitations": ["record validity is not independent acceptance"]
  },
  "observer": { "kind": "human", "id": "observer identity or role" },
  "recorder": { "kind": "human", "id": "writer identity or role" },
  "classification": "internal"
}
-->

# Observation — <short subject>

## What was observed

Write the observation in plain language. Keep an exact quotation where the
wording itself matters; otherwise label a paraphrase as a paraphrase.

## How and where it was observed

State the conversation, field condition, artifact, or other source context.
If that source is private, volatile, or cannot be linked, say so rather than
inventing a stable locator.

## Evidence and limitation

Link a durable supporting source when available. State what this observation
does not prove, and what later observation could correct or narrow it.
