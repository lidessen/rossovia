# Agent harness

Agent harness engineering turns a human task into work that an Agent can
execute reliably. Its primary objects are not prompts, tools, or role labels in
isolation, but the relation among a task description, the environment in which
the Agent receives it, the effects that environment permits, and the evidence
by which the result can be judged.

Rossovia uses one general Agent execution model. Agents become temporarily
different because they receive different tasks, context, capabilities,
workspaces, budgets, dependencies, and return obligations. Those differences
form a flexible Agent organization. The software does not encode a permanent
org chart; generic sidecar systems preserve only the discipline that must
survive misunderstanding, concurrency, interruption, or process loss.

## Read this area

| Question | Source |
|---|---|
| What is Agent harness engineering, and how do task transformation, attention, evidence, effects, and temporary organization fit together? | [Harness theory](THEORY.md) |
| Which runtime module owns Project/Task state, Runs, Worktree writer exclusion, Cell execution, external protocols, and presentation? | [Runtime ownership Decision 055](../decisions/055-rossovia-runtime-module-ownership.md) |
| How is the current implementation moving toward that ownership model without a big-bang rewrite? | [Runtime ownership migration](../organization/rossovia-runtime-ownership-migration.md) |
| How should an Agent review a proposed harness mechanism without creating another admission system? | [`mechanism-design-review`](../../skills/mechanism-design-review/SKILL.md) |
| How should a requested task be transformed into a stable Agent-executable unit? | [`task-shaping`](../../skills/task-shaping/SKILL.md) |
| How should decision-relevant knowledge reach an Agent under bounded context? | [`context-engineering`](../../skills/context-engineering/SKILL.md) |
| When should work remain direct or become several coordinated Agent Runs? | [`agent-delegation`](../../skills/agent-delegation/SKILL.md) |

## Authority

This area is a project-level theory and navigation surface. It explains how
the Principle Sequence and accepted architecture apply to harness engineering;
it does not replace either source, create a second principle canon, authorize a
runtime effect, or make one Skill a mandatory preflight.

The [Principle Sequence](../../principles/SEQUENCE.md) remains the sole semantic
root of cross-context core principles. Accepted Decisions own stable Rossovia
architecture. Skills express reusable methods. Research and evaluations retain
source-bound evidence and counterexamples without becoming design merely by
being collected here.

## Document boundary

Keep the coherent theory in `THEORY.md`. Put stable Rossovia ownership changes
in Decisions, staged implementation movement in the migration plan, reusable
Agent judgment in Skills, and empirical probes in research or evaluation
records. Add another document here only when it has a distinct reader decision
that the theory, architecture, method, or evidence owner cannot already serve.
