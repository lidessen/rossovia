# Audit an Agent Workflow

Perform a read-only diagnosis of one named agent action. Do not edit project
files, install tooling, or redesign the surrounding process.

1. Read the target project's governing instructions, accepted design, relevant
   skills or prompts, and the actual runtime entry surface. Use logs, traces,
   diffs, review comments, or a safe reproduction when available.
2. State the required action and the observed behavior separately. Mark every
   proposed cause as inference until the delivery or execution path supports it.
3. Trace only the part of the action journey needed to localize the failure.
   Load `../references/agent-work-model.md` when multiple owners are plausible.
4. Rank findings by their effect on the required action. For the leading
   finding, name the source, owning surface, downstream effect, and evidence.
5. Compare keeping the current system with the smallest viable intervention.
   Reject a new artifact or mechanism when an existing owner can be corrected.
6. Propose an action probe, a nearby boundary probe, and the observation that
   would show the diagnosis wrong. Do not claim improvement before those probes
   run.

Return the leading finding first, then evidence, smallest recommendation,
verification plan, residual uncertainty, and the human decision required. If
the evidence points to product behavior, CI, organizational policy, or missing
domain truth rather than the agent-facing work system, route it and stop.
