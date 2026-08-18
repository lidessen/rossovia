# Mechanism design concepts

Read this only when a review is mixing mechanism, policy, adapter, prompt
guidance, durable fact, projection, observation, review, acceptance, action,
reason, or owner-internal transition.

## In plain words

An agent system needs code when something must be made true despite judgment,
concurrency, process loss, or an untrusted boundary. It needs guidance when an
agent must make a better contextual choice. Confusing the two produces either
an unenforced invariant or unnecessary machinery.

## Vocabulary

### Mechanism

Software or an operative process that enforces, orders, retains, interrupts, or
recovers a property. A mechanism creates behavior and failure modes of its own.
Examples include a state machine, lock, queue, idempotency owner, durable
journal, authorization check, retry controller, or crash reconciler.

### Prompt or Skill guidance

Context that changes an agent's judgment. It can explain principles, selection
criteria, examples, and boundaries. It does not make an invariant true against
process loss, concurrent writers, or a caller that bypasses the guidance.

### Policy

Today's choice among capabilities already supported by a mechanism: provider,
model, default, ordering preference, budget, or retry decision. Policy may be
expressed in prompt, configuration, or code. Moving a choice into code does not
automatically make it a distinct mechanism.

### Adapter

Translation between an owned mechanism and one external protocol. An adapter
owns protocol-specific request, response, and error behavior. It does not gain
the core mechanism's fact or control authority.

### Durable fact

A non-reconstructible record whose meaning must survive the producing process.
Creating one requires a named writer, reader, lifetime, consistency boundary,
and retirement story. A convenient copy is not automatically a new fact.

### Projection

A rebuildable view of another source. It may optimize display or access but
must not become a second authority because it is easier to read.

### Mechanical observation

A directly reproducible fact about an existing subject: existence,
readability, digest, schema, declared format, command exit, or a deterministic
assertion. It may establish the behavior encoded by a check. It does not
establish usefulness, quality, semantic fitness, or acceptance. A purported
checker that can mutate source, workspace, database, or an external system is
an execution, not an observation.

### Semantic review

An independent judgment about whether evidence and output satisfy the intended
objective, quality, relevance, or design. The producer cannot supply its own
independent review. Review informs an authorized acceptance owner but does not
accept, repeat, or repair the result.

### Action, reason, and internal transition

An action crosses an owned effect boundary: for a Harness, normally starting
one new execution or controlling one live execution. A reason such as
continuation, rerun, or review belongs on the execution request. A state-owner
transition such as settlement or reconciliation remains internal to that
owner. A domain mutation such as correction or acceptance belongs to the
domain owner. Turning all of these into peer verbs creates an action vocabulary
that Agents must memorize and continually extend.

### Intentional imprecision

A decision to retain less attribution, history, or diagnostic completeness
because the missing detail is visible, reversible, or safely expressible as
unknown, while the heavier representation adds more failure and recovery paths
than it closes. It never relaxes destructive-effect ownership, security or
disclosure boundaries, irreversible acceptance, or causal identity required
for safe replay.

### Mechanism burden

The continuing system cost of a mechanism, not only its first implementation:
concepts, records, transitions, callers, tests, operations, failure modes,
recovery, migration, compatibility, and explanation. Removing or consolidating
existing burden counts in favor of a proposal.

## Boundary test

Ask what happens when the agent misunderstands the instruction or the process
dies:

- If ordinary review can observe and correct the result before material effects
  escape, guidance may be sufficient.
- If the property must remain true despite misunderstanding, concurrency,
  bypass, or process loss, the owning runtime may need a mechanism.
- If an existing mechanism already preserves it, repair or reuse that owner.

This test determines the kind of treatment. It does not approve a particular
schema, service, state machine, or workflow.
