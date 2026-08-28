# Evaluation tools

These are project-local, round-specific tools for producing or running evaluation artifacts. They are not
portable skills, general-purpose runners, or current evidence by themselves.

Each round directory owns the scripts whose fixed snapshots, hashes, payloads, output paths and runner
identity belong to that round. Generated inputs, runs, logs, blind mappings and reviews remain under their
existing `evals/skill-evaluation/` authorities.

The tool succeeds mechanically only when its source snapshot and output identity still match the associated
run record; that does not establish behavior, acceptance or a performance conclusion.
