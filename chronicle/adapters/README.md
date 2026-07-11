# Observation adapters

An adapter creates an Observation Record from a source that already exists. It
does not replace that source, infer a conclusion, or make a check result a
semantic acceptance. A future executable adapter must preserve the same
boundary.

## Work Cell

**Source:** the completed `.cell.run.json` record and, where needed, its named
artifact/check output.

**May record:** run identifier, terminal status, measured token/duration/cost
fields, and a named mechanical check disposition.

**Must include:** source path, SHA-256 of the exact run record, adapter method,
and a limitation that measured execution does not prove semantic quality or
acceptance.

**Recorder:** an execution agent or a later thin adapter. Work Cell itself is
not a Chronicle runtime and no task needs a Cell merely to leave a record.

## Git and pull requests

**Source:** commit object, PR, review, and CI/check result in their native
systems.

**May record:** immutable revision/PR IDs, a named check state, a review
disposition, and a locator to the source.

**Must not infer:** green CI means product correctness; a merge means human
approval beyond the recorded merge decision; a changed file means a completed
mission.

**Recorder:** the task integration steward or a deliberately enabled adapter.
Git history remains the source; the Chronicle only retains a cross-domain
observation when it passes the recording trigger.

## Human and otherwise uninstrumented observation

**Source:** the Markdown record itself, its named field note, or a designated
conversation source.

**Writer:** the observer writes the record when practical. An agent may act as
recorder when explicitly named; it preserves a minimal exact statement or marks
its wording as a paraphrase. The observer and recorder are always separate
metadata fields, even when held by the same person.

**Admission:** a direct observation may be `raw`, `reviewed`, or `uncertain`.
Schema validation says only that the receipt is well formed. A preference,
approval, or strategy outcome still follows its own human/verification path.

## Common recording flow

1. The observer or task convener identifies a decision-changing, perishable,
   corrective, requested, or handoff-required observation.
2. Preserve the source first. If no automatic source exists, write the
   Markdown observation using the [manual template](../templates/manual-observation.md).
3. The recorder adds minimum metadata: observer, method, source locator,
   limitation, classification, and any digest.
4. Validate the record. Do not add an interpretation merely to make it sound
   useful.
5. A later incompatible observation appends a `correction` record; it states
   what interpretation/metadata is corrected and leaves the previous record
   readable.
