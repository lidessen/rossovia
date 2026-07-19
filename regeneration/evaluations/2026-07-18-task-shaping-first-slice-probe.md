# Task-shaping first-slice probe

**Date:** 2026-07-18

**Status:** structurally accepted; capability and transformation claims remain provisional

**Decision:** [Task Shaping as a Core Skill](../../design/decisions/040-task-shaping-core-skill.md)

**Treatment:** [`task-shaping`](../../skills/task-shaping/SKILL.md)

## Question

Can a portable Skill make an economical Flash-class execution profile more
conservative and useful when deciding whether a task should remain direct, be
guarded, be transformed into locally settleable units, or be escalated?

The probe tests behavior of the shaping judgment. It does not execute the 480-
report workload or establish that any proposed transformation improves final
incident analysis.

## Cases and fixed conditions

The action case asks for source-linked decision support over 480 incident
reports. It requires complete report disposition, preservation of rare high-
severity incidents and causal disagreement, and external acceptance. Retained
profile observations include:

- one-report extraction was materially correct in 47/50 checks, with three
  unsupported causal inferences;
- twelve-label classification with abstention was correct in 49/50 checks;
- synthesis over no more than twenty extracted reports was accepted in 9/10
  checks, with one flattened disagreement; and
- three whole-corpus attempts all lost a rare high-severity pattern.

The accepted final tolerance is zero unsupported causal claims, zero omitted
high-severity incidents, and zero flattened causal disagreements. Classification
errors may be caught or abstained before synthesis but may not silently enter
the final model.

The direct-boundary case asks for one five-label classification over one
400-character ticket with a quoted evidence span and abstention. The same
configured form met its explicit tolerance in 50/50 retained checks, including
eight correct abstentions.

All Cells were read-only, used the same structured terminal contract, and had
no authority to choose provider, concurrency, budget, execution, or semantic
acceptance. The development runs used the Work Cell AI SDK driver and a
DeepSeek V4 Flash-class model. The last gate used the configured local provider
preference/fallback chain ending in the same model identity; the retained record
does not expose which successful route settled the call.

## Runs

| Run | Cells | Result | Tokens | Duration observations |
|---|---:|---|---:|---|
| `465511a6-f9a3-4396-b10b-36fa7ef7e79c` | baseline action, treatment action, treatment direct boundary | 3 mechanically passed | 45,429 | 17–30 s per Cell |
| `14add11c-659a-445c-bbcf-7b9681f87ea7` | revised treatment action and direct boundary | 2 mechanically passed | 34,484 | 14–34 s per Cell |
| `2275bf95-e614-4d76-9771-21378fde2928` | treatment promotion gate | mechanically passed | 17,980 | 171 s |
| `da7c8d81-b4dd-4373-981b-3f797dc217ca` | held-out mixed-review baseline and treatment | 2 mechanically passed | 45,976 | 42–49 s per Cell |
| `99b339ed-3773-4728-9336-58c93c15e303` | held-out ownership correction | mechanically passed | 24,716 | 33 s |
| `c504c94f-0cda-4373-8394-4611a0ff8f9c` | five code-review-owned semantic packets | 5 mechanically passed | 2,188,860 | 54–94 s per Cell |
| `f88f5f4b-5e35-49ac-9cfb-56c1b99593dc` | cross-packet synthesis and finding disposition | mechanically passed | 383,038 | 73 s |

The corresponding ignored raw records remain under
`.work-cell/task-shaping-probe/` in this checkout. A credential-free attempt,
`063b2de4-87dc-481b-8a11-c78bce63773f`, failed before model use with zero
tokens and is not behavioral evidence. The later review and synthesis records
remain under `.work-cell/stage-review/`.

## Observations

### The first treatment was too confident

The untreated baseline already produced a plausible partition and retained the
main obligations in 5,209 tokens. This prevents attributing generic
decomposition quality to the Skill.

The first treatment made coverage, reconstruction, integrability, and authority
more explicit, but it called 47/50 extraction a `reliable-primitive` despite
three known errors violating a zero-error causal-claim tolerance. It also loaded
all conceptual and transformation references for the direct case. Mechanical
terminal success therefore concealed two decision defects.

### Progressive disclosure was corrected

After adding an explicit reference-loading gate, the revised direct-boundary
Cell read only the case and `SKILL.md`. It retained one direct unit and assigned
`reliable-primitive` from matched 50/50 evidence. It did not manufacture a
ledger, partition, provider choice, or runtime policy.

The revised action Cell loaded transformation detail conditionally and returned
a transformed whole, but still promoted extraction and classification by
assuming proposed abstention/schema guards would contain historical failures.
This disconfirmed the initial promotion language.

### Promotion now fails closed

The final correction requires evidence from the same configured guarded form;
a proposed schema, abstention rule, verifier, or smaller batch cannot be
subtracted from old failures. In the promotion-gate run:

- deterministic source queuing and ledger mechanics were the only
  `reliable-primitive`;
- one-report source-span extraction was `guarded`;
- finite classification with abstention was `guarded` because the nature of
  the historical error was unresolved;
- bounded synthesis, the high-severity semantic path, and reconstruction were
  all `guarded`; and
- the result explicitly marked source-span containment, reducer capacity, and
  cross-batch relation preservation as unverified hypotheses.

The proposed resolution also became adaptive rather than merely smaller: one
report for semantic extraction, at most twenty extracted reports for the only
observed synthesis neighborhood, and a guarded reconstruction unit with a
repartition/escalation signal. This is the useful part of the differential
analogy: local solvability, step size, boundary conditions, and integration are
separate obligations.

### The held-out review case exposed an ownership defect

A different case used a staged mixed change of 44 files and about 4,681 changed
lines. Its governing `code-review` method explicitly owned semantic review
partitions. The reference profile reported 18/20 complete defect-finding runs
for coherent packets, 9/10 downstream-impact runs with a changed-symbol/caller
map, and 3/3 failures for comparable whole-change prompts.

The ordinary baseline returned a plausible transformation but made two
decision errors: it promoted local review to `reliable-primitive` despite a
zero-silent-omission tolerance, and it claimed task shaping owned packet-boundary
invention. The first treatment kept all semantic operations guarded and named
the correct domain owner, but still instantiated seven example family units.
The artifact therefore crossed the boundary that its routing prose disclaimed.

After correction, Task Shaping returned one non-semantic handoff unit. It
preserved the observed envelope, global obligations, reconstruction contract,
and overload/escalation signals, while leaving all actual file, family, claim,
and subsystem packets absent until `code-review` forms them. It also retained
the original 18/20 and 9/10 outcome definitions instead of relabeling them as
successful executions.

This held-out case supports a general boundary: when another method owns the
semantic differential, Task Shaping may specify the admissible neighborhood and
integration constraints but may not choose the coordinates.

### Provider availability was separated from behavior

One initial held-out run selected Kimi K3 from the local preference route. Both
Cells timed out at 240 seconds without terminal settlement; the treatment Cell
spent 4,243 reasoning tokens in one 140-second step. This run changed the
execution profile and is excluded from the Flash-class behavioral comparison.

Two OpenCode Go attempts with `deepseek-v4-flash`, first concurrent and then
serial, returned provider-internal errors before any token was produced. The
successful comparison therefore used the direct DeepSeek API with the same
model identity. These observations are provider availability evidence, not
model-capability or Skill-quality evidence.

### The domain handoff changed the inspected defects

The corrected handoff was then exercised on the actual staged change through
the `code-review` domain method rather than by asking Task Shaping to invent
review packets. Source and caller inspection found four contract-level defects:

- content-addressed cognition sources collapsed a later `A -> B -> A` revision
  into the first capture;
- a cognitive artifact could retain a source locator that disagreed with its
  source record, and admission did not recheck source bytes after proposal;
- the rebuildable Atthis workspace cache was required before `scan` could
  rebuild it; and
- a project registered through HTTPS rejected an SSH clone of the same host and
  repository path during cross-device attachment.

The corrections preserve predecessor identity in source IDs, reject unchanged
immediate revisions and forged locators, check source hashes at admission,
allow cache-free scan reconstruction, and normalize common Git transports for
identity comparison. Eight cognition tests and the Atthis integration probe
passed after correction. This supports the ownership handoff: the general
shape preserved scale and reconstruction constraints, while the domain method
found the actual state, provenance, and migration failures.

### Independent review Cells exposed a failed reconstruction form

The domain-owned packets were then released as five independent DeepSeek V4
Flash Cells followed by one structured synthesis Cell. All six terminal
contracts settled, but mechanical settlement again concealed semantic and
economic failure.

The local reports repeatedly converted packet-local absence into whole-change
absence. One claimed that `retainFormationProposals` was missing because its
packet did not include the sibling implementation file. Another claimed the
cognition README was absent because that file belonged to another packet. The
synthesis contract required a disposition for every finding and explicitly
warned against this inference, yet the synthesis still promoted the existing,
staged README to a blocking defect and repeated several other packet-boundary
errors. Host inspection, not report agreement, disproved them.

One material finding survived host verification: `queryCognition` performed a
full source, scheme, artifact, event, and catalog integrity check before every
catalog query. That made the lookup projection pay an O(n) full-home scan on
each use. The query path was corrected to read the catalog directly while the
explicit `check` operation retains full integrity and freshness verification.

The execution form was also uneconomical. The five packets estimated 350,000
tokens but used 2,188,860, including 2,155,437 input tokens. Injected packet
diffs and broad rereading repeated large context over many loop steps. The
synthesis added 383,038 tokens against a 120,000-token estimate. Together the
review used 2,571,898 tokens, about 5.47 times the combined estimate, at an
observed model cost of about USD 0.115. Cache discounts reduced money, not
attention volume or estimator error.

This run does execute independent Flash review and reconstruction, but it
disconfirms this concrete form. Domain ownership alone is insufficient: local
absence must remain local until resolved against the declared whole, evidence
delivery must avoid injecting and rereading the same field, and cumulative
input across model steps must be estimated. The result does not yet establish
that Swarm review is more complete or economical than the current-agent domain
review.

## Verdict

**Supported for the first-slice behavioral boundary across two contexts:** the
Skill can keep a matched simple task direct, refuse promotion when known errors
exceed tolerance, prepare a semantic transformation without taking runtime or
acceptance authority, stop before a domain-owned semantic partition, and load
transformation doctrine only when the observed mismatch requires it.

**Still inconclusive as a reusable transformation-stability claim:** both
baselines were plausible, correction cases taught part of the final expression,
and the executed review/reconstruction form failed its locality and economic
gates. The seed primitive map must therefore remain candidate/guarded.
Promotion requires a different evidence-delivery and reconstruction treatment,
then repeated matched evidence of final correctness and coordination cost.

## Reopening observations

Reopen this first slice if later probes show any of the following:

- agents again treat a proposed guard as proof of reliability;
- direct tasks routinely load transformation references or grow extra units;
- a reducer must reread all raw sources or redo local judgments;
- a local packet again treats evidence outside its boundary as globally absent;
- cumulative loop input materially exceeds the estimate because injected
  evidence is reread or repeated;
- global obligations disappear at partition boundaries;
- a domain Skill already owns a better semantic partition; or
- shaping and verification cost more than the instability removed.
