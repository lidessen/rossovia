# Audit a Harness

Audit the current context architecture read-only unless the user also requests
an implementation change.

1. Build or refresh the runtime capability map before assessing layers. Distinguish
   observed loading behavior, documented capability, and unsupported assumption.
2. Inventory the actual L1, L2, L3, and handoff artifacts that the mapped
   runtime can discover. For each L1 item, name the decision it changes; for
   each L2/L3 item, verify a shallow route from the activating artifact.
3. Find the highest-impact failure first: context that never reaches the agent,
   volatile detail occupying L1, a missing structural boundary, stale pointers,
   duplicated authority, or continuity that exists only in conversation.
4. Report the review skeleton before detail: capability map, layer map, the
   highest decision-changing gaps, their smallest corrections, and any human
   choice required. Keep file-by-file migration notes as supporting evidence.
5. Use references/evaluation.md to state whether the claimed improvement has an
   action probe, boundary probe, and context-path probe. Do not call an audit
   evidence of improved behavior merely because its report is plausible.

Route isolated prompt phrasing and vendor-command questions away from harness
unless they change the durable context architecture.
