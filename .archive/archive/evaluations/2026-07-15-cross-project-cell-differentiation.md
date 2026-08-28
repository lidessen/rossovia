# Cross-Project Cell Differentiation Probe

**Date:** 2026-07-15

**Work Cell revision:** `2249831`

**Subject:** `agent-worker` at base revision
`594281210d856febc485d288188468d5d38ec3a8`, with the declared read-only
working-tree files frozen by SHA-256 in each Cell packet

**Model:** `deepseek-v4-flash`, non-thinking mode

**Status:** packet-led functional differentiation supported; task-matched
attention bias unsupported as a default

## Question

The earlier
[stability probe](2026-07-15-cell-stability-and-sparse-differentiation.md)
found that compact prompts can change investigation order but did not establish
whether ordinary Cell structure is enough to produce stable functional
differentiation on another project. This probe asks:

1. Can two naturally different semantic packets produce stable, distinct
   project models without role or personality instructions?
2. After that neutral baseline stabilizes, does one task-matched sentence
   improve its intended local behavior without reducing natural completion or
   grounding?

The subject worktree was already undergoing a large uncommitted refactor. The
experiment did not treat its Git revision as the complete source identity.
Every Cell instead received only declared read paths plus their content hashes,
used no commands, and had no write scope.

## Packets

Six neutral Cells and six treatment Cells were divided evenly between two
functional packets. Each packet had three independent repetitions.

| Packet | Local question | Declared evidence | Matched attention bias |
|---|---|---|---|
| acceptance authority | Which transition can turn claim/evidence into accepted fact? | top-level design, contract ADR, contract runtime, contract and finish MCP tools | `Resolve acceptance authority before interpreting lifecycle status.` |
| field and adaptation | How do demand, field, route, integration, settlement, and promotion relate? | top-level design, attention-field ADR, demand, field, settlement-reward, and orchestrator sources | `Trace state transitions before treating a projection as a decision authority.` |

The authority packet tested five claims about Contract settlement, WorkItem,
verdict-bearing clause fill, settlement idempotency, and
`finish_current_work`. The field packet tested five claims about projected
field views, transition versus acceptance authority, child integration,
terminal field events, and reviewable route-policy evidence. Both used the
same two generic instructions, terminal result shape, eight-step boundary, and
model. The treatment added only the one sentence shown above.

The source packet identities were:

| Path | SHA-256 |
|---|---|
| `design/DESIGN.md` | `3cc8e51943187565abddc679e14f301854266940fa890dab919ccc362e136c2b` |
| `design/decisions/022-contract-governed-swarm-kernel.md` | `424d1de4f2d9eca1863bd5fcf3693e97bbb495443050b891e5040e2275a9167e` |
| `internals/harness/src/state/contract-runtime.ts` | `7a2aee687fac09f9f2c765c004b82a0849c49367d0b8f5f295c8f478cd7e9567` |
| `internals/harness/src/context/mcp/contract.ts` | `67061a1b3739423e23172084dca81ee06de477a79d58ad33cd722782dfe2129a` |
| `internals/harness/src/context/mcp/finish.ts` | `ae3c62e9a2debe5e0e359fd4692c21f2bd9e9d910352eb8a079212ac498b2cb6` |
| `design/decisions/027-attention-field-dynamic-programming.md` | `dc14cc764ee2a5b2a49a851ca9b6352672b9557fec6e3c13edeb9922b8fd8f36` |
| `packages/agent-worker/src/swarm-demand.ts` | `58925416862a16b98455889ee0e996db56d035dc274f848cb23d01d3ff04cd03` |
| `packages/agent-worker/src/swarm-field.ts` | `c35acadd609c5cb467cdf303538590e9baed55361e62d0870822caceb464597f` |
| `packages/agent-worker/src/settlement-reward.ts` | `3ad9db6487cc7487c5575d41d02d795b4fd857abbbbde1bf81ce498a1d5dfad8` |
| `packages/agent-worker/src/orchestrator.ts` | `a0f0a6adbdfb55226cc8cd2f8c6ab2b3d2d88ba58cbdcbf2f79316600442ec36` |

## Neutral baseline

Run `5b611d0f-4a58-4219-a5ab-f352ad4f9518` passed all six Cells and
used 310,735 tokens. Every Cell called `submit_model`; none required terminal
recovery. Within each packet, all three Cells produced the same five
dispositions:

| Packet | Repetitions | Claim agreement | Natural submit | Median tokens |
|---|---:|---:|---:|---:|
| acceptance authority | 3 | 15/15 | 3/3 | 31,212 |
| field and adaptation | 3 | 15/15 | 3/3 | 33,264 |

The packets also differentiated without a role prompt. Authority Cells modeled
Contract settlement as the acceptance boundary and WorkItem/Wake/Handoff as
scheduling or evidence carriers. Field Cells modeled demand, pressure, and
route as projections and distinguished transition selection from settlement,
integration, and reviewable promotion evidence.

One field Cell returned only `agent-worker field/route/integration/adaptation
boundary` in the non-authoritative summary field while still returning all five
grounded claim judgments. The local result contract preserved the required
model components, but an unconstrained convenience summary did not inherit
their information density.

## Matched-bias treatment

Run `fafb4197-f900-4a13-9f6e-a34e84afa421` also passed all six Cells with
the same 30/30 claim dispositions. Correctness and packet distinction did not
improve.

| Packet | Natural submit | Median tokens, neutral | Median tokens, bias | Read calls, neutral | Read calls, bias |
|---|---:|---:|---:|---:|---:|
| acceptance authority | 3/3 | 31,212 | 30,810 | 18 | 15 |
| field and adaptation | 2/3 | 33,264 | 97,280 | 19 | 29 |

The authority bias was effectively inert. The field bias was not: every
treatment Cell reread sources, one reached all eight ordinary steps and needed
terminal recovery, and the packet's median token use rose by 192%. The most
expensive Cell repeatedly reread `swarm-field.ts` and
`settlement-reward.ts`. Its final judgments remained correct, so the additional
state-transition attention produced investigation churn rather than a
decision-relevant gain.

Semantic relevance was therefore not sufficient evidence that an attention
bias belonged in the Cell. The phrase matched the local topic, but the neutral
packet had no observed routing defect for it to repair.

## Estimate audit

The neutral phase estimated 1,020,000 tokens from the earlier, much broader
packet and used 310,735, a 69.5% overestimate. The treatment recalibrated to
360,000 and used 515,152, a 43.1% underestimate because the field treatment
changed the investigation loop. Work estimates must therefore be conditioned
on packet width and prepared shape; changing even one instruction invalidates
a point estimate derived from a neutral packet. The estimate remained an audit
surface, not a runtime stop.

## Revised conclusion

The first four differentiation surfaces remain sufficient as the default:

1. local question;
2. causally bounded semantic packet;
3. evidence and tool surface; and
4. acceptance and result contract.

They produced two distinct and repeatable cognitive models across a second
project without personality simulation. A fifth-layer attention bias is a
repair, not a decoration: first observe a repeatable local failure, name the
behavior the sentence should change, and compare repeated treatment Cells
against the neutral packet. “Task-matched” wording alone does not pass that
gate.

No new Cell input field, phenotype system, or runtime mechanism is warranted.
The next useful treatment should begin from a packet with a measured neutral
defect—for example a missed outgoing dependency or a repeated authority/code
confusion—rather than trying to improve a ceiling result.

## Limitations

The claim sets were deliberately bounded and mostly decidable from explicit
design and code. This supports stable local cognition, not arbitrary
whole-project comprehension. The field packet also exposed one claim whose
wording could be read as either goal-closure events or raw Contract settlement
events; all Cells grounded it in `buildSwarmFieldProjection`'s
`swarm.goal.closed` and `swarm.goal.blocked` branches, so the comparison is
internally consistent but should not be generalized to every settlement event.
