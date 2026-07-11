# Harness Evaluation Surface

Retain an evaluation that can show the harness does not reach the agent or does
not change the intended judgment.

| Probe | Question | Minimum evidence |
|---|---|---|
| Action comparison | Did the harness-enabled entry improve the intended project judgment over the same controlled baseline? | Raw task, shared acceptance condition, baseline and harness-enabled outputs, and attribution limits. |
| Boundary | Did a nearby one-off task avoid loading or applying project-wide harness work? | Boundary task, observed routing or omission, and reason. |
| Capability | Does the selected runtime document or expose the required loading mechanism? | Runtime version and official documentation or local capability observation; this does not prove one task loaded an artifact. |
| Context path | Did the evaluated task load the claimed artifact at the required moment? | Task-specific runtime trace or tool observation, or an explicit unknown. |
| Durable evidence | Can a future agent discover the evaluation and its current status without this session? | Named durable artifact and a pointer from the activating layer. |

For each probe record the claimed behavior, the result that would refute it,
the supplied artifacts, observed result, evidence path, and verdict. Run an
independent fresh agent when safely available; otherwise label the result
self-evaluated. Retain failures and unknowns in the named durable artifact
until a later probe resolves them.
