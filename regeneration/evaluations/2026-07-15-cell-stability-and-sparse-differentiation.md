# Cell Stability and Sparse Differentiation Probe

**Date:** 2026-07-15

**Source revisions:** `fcfd7bc` plus the terminal-recovery corrections observed
during this probe

**Model:** `deepseek-v4-flash`, non-thinking mode

**Status:** prepared-shape stability and attention-routing effects supported;
generic rigor/deliberation quality gains unsupported

## Question

When a Swarm divides a medium-project cognition task into locally bounded
Cells, can a prepared cognitive shape such as rigorous or deliberative improve
one Cell's judgment without destabilizing completion? What should own that
differentiation: a long role prompt, one compact attention bias, or the Cell's
task/evidence/acceptance structure?

The comparison must separate four claims:

1. the Cell settles mechanically;
2. it settles naturally rather than through recovery;
3. it preserves the intended evidence and claim meanings; and
4. its treatment improves a decision-relevant behavior over repeated neutral
   runs.

Vocabulary, report length, token use, and nominal pass count cannot substitute
for those observations.

## Controlled packet

Twelve read-only Cells received the same source revision, model, six candidate
claims, fourteen declared source files, acceptance conditions, terminal schema,
eight-step boundary, and shared workspace. Each of four treatments had three
repetitions in a fixed interleaved order behind blind Cell IDs:

- **neutral:** no additional shape;
- **label:** only `You are the rigorous reviewer for this packet.`;
- **rigor:** one evidence-threshold and counterevidence bias; and
- **deliberative:** one competing-explanation bias.

The claims covered semantic acceptance, independent completion contracts,
Swarm partition/synthesis ownership, shared-workspace safety, P14 authority
versus reconstructibility, and `CellInput` impact. The source-supported
dispositions were C1 refuted, C2 supported, C3 refuted, C4 supported, C5
qualified or refuted, and C6 refuted.

## Rejected first treatment

Run `5816e272-ec80-4bf4-b783-584a1fdfe95d` used expanded rigor and deliberation
instructions. It consumed 2,068,068 tokens and approximately `$0.07807`.
Neutral settled naturally 3/3, label 2/3, rigor 0/3, and deliberative 1/3.

That comparison was invalid for phenotype attribution. The long treatments
added a second workflow and consumed active attention. They also exposed that
the packet omitted `packages/work-cell/src/multi-cell-workspace.ts`: rigorous
and deliberative Cells followed `swarm.ts` to that undeclared enforcement edge,
while neutral Cells accepted the higher-level account. Finally, terminal
recovery received only the last response message and returned all claims as
`unknown` while falsely reporting that no files had been read.

The Principal rejected complex instructions because agent attention, like human
attention, is finite. The next treatment reduced each shape to one sentence and
added the missing source edge. The failed run remains evidence that instruction
load, packet closure, and phenotype cannot be changed together and then
attributed to one cause.

## Sparse-treatment observation

Run `2a841f45-627e-4b11-be4e-8c8808f8e595` used the compact treatments. It
consumed 1,955,968 tokens against a 1,080,000 estimate and approximately
`$0.09559`.

| Treatment | Passed | Natural submit | Tokens | C1 correct | C5 bounded | C6 bounded |
|---|---:|---:|---:|---:|---:|---:|
| neutral | 3/3 | 3/3 | 370,582 | 3/3 | 3/3 | 3/3 |
| label | 3/3 | 3/3 | 432,379 | 1/3 | 3/3 | 3/3 |
| rigor | 3/3 | 1/3 | 597,670 | 2/3 | 3/3 | 3/3 |
| deliberative | 2/3 | 2/3 | 555,337 | 2/3 | 2/3 | 2/3 |

`C5 bounded` accepts `qualified` or `refuted` because the claim combines a true
downstream-authority premise with a false reconstructibility conclusion. `C6
bounded` accepts `qualified` or `refuted`; the material test is whether the Cell
rejects the claim that only two files are affected. A protocol-error Cell has no
semantic score.

Neutral was the only treatment with three natural completions and no material
claim error. The rigor bias required recovery in two of three runs and did not
improve correctness. The deliberative bias produced one protocol error and no
quality gain. The label-only control was not inert: it made the wrong C1
semantic-acceptance judgment in two of three runs.

## Attention-routing observation

The short prompts changed investigation order before they changed prose:

- neutral began from `SEQUENCE.md`, P14, and `design/DESIGN.md` in 3/3 runs;
- the label-only treatment began from `run-cell.ts`, `contracts.ts`, `swarm.ts`,
  and `multi-cell-workspace.ts` in 3/3 runs;
- rigor began design-first once and code-first twice; and
- deliberative began code-first twice and design-first once.

This is material cognitive differentiation. On an authority question, however,
the generic "rigorous" label redirected attention toward implementation and
away from the explicit semantic-acceptance boundary. Two label Cells then read
mechanical verification as semantic judgment. A shape can therefore be real and
still be harmful because it does not fit the packet's principal contradiction.

The result does not show that source-first or code-first is universally better.
It shows that generic personality labels are an uncontrolled router. The local
question should determine which evidence relation leads.

## Terminal-recovery defects and repair

The experiment reopened the
[terminal contract](../../design/decisions/033-work-cell-terminal-contract.md)
twice:

1. terminal-only `activeTools` did not prevent DeepSeek from repeating a
   previously visible ordinary tool name; the tool handler blocked execution,
   but repeated full-context turns were wasted; and
2. AI SDK's final `response.messages` contained only the last response, not the
   complete step history assumed by the implementation.

Recovery now receives the original prepared instruction/context plus a compact
projection of every successful tool result from all execution steps. It exposes
only the caller-declared terminal tools and does not replay old tool-call
messages. The raw Cell input and trace remain sources; recovery context is a
rebuildable action projection.

A first live repair run, `41a2d393-9bdd-4c39-a87c-738fc3826493`, proved why
evidence alone is insufficient: it mechanically passed but invented new
meanings for C1-C6 because the prepared task context was absent. After restoring
that context, deterministic provider probes passed. A forced two-step live run,
`efeaf681-7202-40c1-830a-731bc0d34d29`, entered recovery, retained the available
sources, returned C2 supported and C5 refuted, and bounded C1/C3/C4/C6 as
`unknown`. That `insufficient` result is correct for its deliberately truncated
investigation and used 25,030 tokens.

## Revised method

Cell differentiation should proceed in this order:

1. **Local question:** one decision the Cell can actually settle.
2. **Semantic packet:** the smallest causally closed subject plus named outgoing
   relations.
3. **Evidence and tools:** sources capable of settling that local question.
4. **Acceptance and result contract:** the observable local completion and
   compact handoff.
5. **One attention bias, only if needed:** a short, falsifiable tendency tied to
   the packet's principal contradiction.

The first four create functional differentiation without asking the model to
simulate a personality. A fifth-layer treatment must earn its context cost by
changing a measured behavior across more than one packet. Long phenotype prose,
generic "think harder" instructions, and runtime-owned personality taxonomies
are rejected.

Stable performance is a property of the complete tuple: task, packet, model,
prepared instruction, context, tools, completion contract, and step policy. It
cannot be inherited from the model name or predicted from token count alone.
Recovery is a valid bounded settlement mechanism, but a treatment that requires
it more often has changed the supported working envelope and must be compared on
that basis.

## Disposition

Keep the generic Work Cell and Swarm contracts unchanged. Record this method in
Work Cell guidance and scale-controlled review partitioning. Do not add
`rigorous`, `deliberative`, personality, or phenotype fields to `CellInput`.

The next useful differentiation test should use two naturally different
functional packets from another medium project—for example one authority model
and one runtime causal model. Give both neutral Cells first-class task/evidence
boundaries, then apply one task-matched attention bias. The hypothesis is
supported only if the bias improves its intended local behavior without
reducing natural completion or grounding on the other packet.
