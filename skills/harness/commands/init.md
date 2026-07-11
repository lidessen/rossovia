# Initialize a Harness

Create a project context architecture only after establishing the runtime that
will consume it.

1. Read the project instructions and source artifacts. Build the capability map
   from references/runtime-capability-map.md with observed behavior, host
   documentation, or a safe local probe. Record unknowns rather than assuming
   that a familiar instruction filename, skill directory, or hook mechanism is
   active.
2. State the concrete agent action the harness must enable. Inventory the
   durable project facts, current methods, volatile details, and handoff state
   that bear on that action.
3. Propose a layer map. Every L1 entry needs a named decision that becomes worse
   without it and evidence that the runtime loads it before that decision. Put
   activated method in L2 and raw or changing material in L3. Name one durable
   source for each fact; use pointers instead of duplicate summaries.
4. Present the compact review skeleton: runtime capability map, L1/L2/L3 map,
   unresolved assumptions, and the human decisions required. Obtain required
   approval before making a durable architecture choice.
5. Before verification, name a durable evaluation or state artifact and a
   discoverable pointer to it. After the approved setup, follow
   references/evaluation.md. Compare a safe first task that must use the
   harness with a controlled baseline, run a nearby non-scope task, and observe
   the context path. Retain the evidence or label attribution and verification
   gaps.

Do not install hooks, write configuration, or claim a file is always loaded
until the capability map establishes that the selected runtime supports it.
