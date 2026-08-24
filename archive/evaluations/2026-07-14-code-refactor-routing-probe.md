# Sparse multihead code-refactor probe

## Question

Can the sparse multihead mechanism that failed to solve open-ended creativity still improve a bounded structural task such as splitting a large source file?

This probe tests one narrower claim: independently shaped attention over a shared, machine-derived code graph may produce a more coherent refactor boundary than one whole-file model call. It does not test code generation or claim equivalence to a neural mixture-of-experts architecture.

## Concrete subject

- target: `packages/work-cell/src/research/candidate-field.ts`
- target digest: `cbc51fe3242e2c1b815f0293fc7ba126299cdace9090fd159d67e96abf1a4f9b`
- size at observation: 657 lines
- AST field: 38 top-level symbols and 66 intra-file dependency edges
- external surface: 16 exported symbols with observed package callers

The target was not edited. The experiment compared plans against the same source digest.

## Treatments

### Whole-file baseline

One `deepseek-v4-flash` call received the complete file and complete AST-derived graph, then produced a typed refactor plan.

### Sparse multihead

Six concurrent heads emphasized contract ownership, dependency topology, state and effects, public callers, verification, and preservation dissent. Each source declaration was visible with full code to exactly two heads. Heads could refer to one-hop dependency IDs as opaque boundary stubs, but did not receive their source. Mean pairwise source-assignment Jaccard was `0.11537`.

A final synthesizer received the complete graph plus all partial findings. The complete graph is important: sparsity divided attention, not truth. It did not make missing global context a virtue.

Both treatments used the same deterministic semantic gate. A plan had to:

- assign every real symbol exactly once and invent none;
- preserve exact caller-path coverage for the observed external surface;
- keep every declared `keepTogether` group in one module;
- contain no module dependency cycle;
- give a migration dependency list consistent with actual cross-module AST edges.

Schema-valid but semantically invalid results were returned to their originating loop with the gate errors. The same principle applied to specialist findings that misspelled or invented symbol IDs.

## Practice observations

The first executions were not admissible comparisons. They exposed four harness defects before they exposed a model difference:

1. A sparse head legitimately followed an edge to a symbol whose source was hidden. The representation was corrected to distinguish full source assignments from one-hop dependency stubs.
2. Naive identifier collection counted object keys such as `message:` as references to the local `message()` function. Reference extraction was narrowed to expression/type references.
3. JSON-schema validity did not catch plans that split their own `keepTogether` claims or omitted real migration dependencies. Those became deterministic contract checks.
4. A specialist misspelled two symbol IDs. Specialist loops now receive reference-gate errors and retry instead of aborting the whole field.

These are not incidental prompt tweaks. They show that multi-agent breadth is only useful after a shared evidence field and fail-closed projection exist.

## Admissible result

Record: `.work-cell/code-refactor/candidate-field-sparse-refactor-12e24b16-46e8-4a11-b354-09d3d476b50f.json`

| Measure | Whole-file | Sparse multihead | Observation |
| --- | ---: | ---: | --- |
| semantic gate | pass | pass | both plans executable at the declared structural level |
| modules | 3 | 2 | multihead made the smaller transition |
| cross-module edges | 31 / 66 | 21 / 66 | 10 fewer cuts |
| cross-module edge share | 46.97% | 31.82% | 15.15 percentage-point reduction |
| exact external-impact coverage | 100% | 100% | no caller context was traded away |
| high-risk symbol coverage | 20% | 30% | small improvement, still inadequate |
| module cycles | 0 | 0 | both preserved an acyclic dependency shape |
| largest module share | 44.74% | 57.89% | fewer cuts retained a larger cohesive core |
| tokens | 12,751 | 48,454 | multihead cost 3.80 times the baseline |

The baseline proposed schemas, interfaces, and runner modules. The sparse result proposed only a contract/types module and a runner module. The latter better reflects the preservation heads' repeated observation that schemas, inferred types, and public interfaces form one coupled contract surface, while private helpers remain local to the orchestration function.

The admissible run used 61,205 tokens in total against an 80,000-token estimate, a 23.49% relative error. Harness development required at least 200,911 observed tokens across three completed A/B runs, plus two aborted head-stage runs whose usage was not durably retained. That unmeasured failure cost is an observability gap: a reusable runtime should persist partial usage and failure evidence before propagating a failed field.

## Continued practice

### Failure evidence and usage retention

The probe now chooses its run record before model execution and persists a failed record at the baseline, specialist-head, or synthesis stage. The record retains completed findings, failure evidence, observed usage, duration, and estimate audit. A deterministic file-boundary test verifies that a failed head stage retains both token usage and already completed head evidence.

This immediately made a previously invisible failure measurable. Record `.work-cell/code-refactor/candidate-field-sparse-refactor-3-heads-1ba9da91-4253-4e2f-bdaf-ea924a561b67.json` retained 41,618 tokens consumed by three baseline schema retries, together with the final rejected response. The response contained a one-symbol `keepTogether` claim. The input contract was corrected to admit that structurally and let the semantic gate return the precise no-op relation instead of losing the entire plan at schema parsing.

### Three-head ablation

Record: `.work-cell/code-refactor/candidate-field-sparse-refactor-3-heads-5eebd5c3-e348-4b18-ba7f-885c22069318.json`

The six responsibilities were merged into three: contract/topology, effects/verification, and public preservation. Source copies per symbol remained two, so each head saw 25–26 of 38 declarations and mean pairwise assignment Jaccard rose from `0.11537` to `0.33333`.

| Measure | Six heads | Three heads | Observation |
| --- | ---: | ---: | --- |
| modules | 2 | 4 | merged roles restored over-splitting |
| cross-module edges | 21 / 66 | 37 / 66 | three heads lost the structural gain |
| high-risk coverage | 30% | 20% | no risk improvement |
| sparse-treatment tokens | 48,454 | 67,584 | three heads cost 39.5% more |
| synthesis correction | yes | yes | fewer calls did not prevent projection retry |

Reducing head count was not a cost reduction because total source replication remained two copies while each head became a broader, internally conflicting generalist. The three-head result falsifies “fewer heads are automatically cheaper” for this design.

### Required risk coverage

The complete graph now declares ten `highRiskSymbolIds`; every one must appear in a concrete risk with a verification action before a plan passes.

Record: `.work-cell/code-refactor/candidate-field-sparse-refactor-75aca40f-08ab-4f71-80c3-f958005772c9.json`

Under this stronger gate, the whole-file baseline recovered to a valid plan with 100% risk and external-impact coverage in 27,894 tokens. All six specialist heads completed and their combined risk findings covered nine of ten required symbols. The generative synthesis nevertheless exhausted three semantic retries. Its last plan fell to 60% risk coverage, omitted one real symbol, lost one caller impact, split its own cohesion claim, and formed a three-root module cycle. The failed run retained 116,488 observed tokens against an 80,000-token estimate.

The information was largely present before synthesis and was lost during projection. The principal bottleneck is therefore no longer sparse routing; it is asking one language-model generation to simultaneously reconcile findings, partition a graph, preserve exhaustive ledgers, and produce an acyclic migration plan.

The continued probes added 238,318 durably observed tokens, plus one baseline abort that occurred before failure persistence was installed. This cost is experiment-development evidence, not a reasonable per-refactor operating budget.

### Constrained projection

The failed comprehensive-risk synthesis preserved a useful last candidate. Applying a zero-model deterministic projection to that real failure:

- restored the missing `SeedMaterialRetriever` symbol;
- merged the driver and schema/type modules required by the declared co-location and real cycle;
- rebuilt all 16 caller impacts from the graph;
- restored all ten high-risk symbols;
- derived the actual migration dependency;
- produced a valid two-module, 21/66-cross-edge alternative.

This established that the failed candidate contained a recoverable architectural preference even though its exhaustive plan was invalid.

The live pipeline was then changed so the final language-model call emits only a boundary candidate: thesis, modules, co-location preferences, and uncertainty. Specialist risks flow directly into projection; symbol completeness, caller impacts, risk completeness, module cycles, and migration dependencies are reconstructed deterministically.

Record: `.work-cell/code-refactor/candidate-field-sparse-refactor-80654851-930a-4e23-9526-1c219a2f4b2a.json`

The baseline independently failed after exhausting its semantic retries, so the record correctly settled as `partial` rather than suppressing the sparse treatment. The sparse treatment completed without a synthesis retry:

| Measure | Free-form six-head synthesis | Boundary candidate + projection |
| --- | ---: | ---: |
| valid under complete gate | no in strict-risk run | yes |
| modules | 3 in last failed candidate | 2 |
| cross-module edges | 30 / 66 in last failed candidate | 21 / 66 |
| exact caller coverage | 93.75% | 100% |
| high-risk coverage | 60% | 100% |
| module cycles | 3 cyclic roots | 0 |
| sparse-treatment tokens | 48,454 in the earlier permissive valid run | 41,581 |
| synthesis recovery | required | none |

Against the earlier permissive six-head run, the constrained form reduced sparse-treatment usage by 14.18% while restoring the same two-module, 21-edge boundary under the stronger complete-risk gate.

Projection guarantees factual and graph consistency, not semantic wisdom. The boundary thesis said the driver should remain with orchestration while its own module assignment placed the driver with schemas and types. The projected module graph is valid, but that prose contradiction remains visible for human preference review. The risk ledger also reached its current 16-entry maximum after aggregating specialist findings. These observations keep projection below acceptance authority.

The experimental probe reached 1,152 lines because AST extraction, live-model orchestration, failure persistence, plan evaluation, and deterministic projection accumulated in one file. It was briefly separated into a deterministic core and a live adapter, which proved that the retained failed synthesis still projected to the same valid two-module result. The Principal then corrected the form: code refactoring is a Work Cell specialization, not a Work Cell runtime capability. The code-specific source modules, manifests, tests, and package command were therefore retired. This report and the ignored run records remain durable experiment evidence; they do not authorize or imply a built-in refactoring subsystem.

## Revised finding

Sparse specialist routing is useful as an evidence-generation layer for consequential structural decisions. It surfaced distinct ownership, preservation, state, caller, and verification observations, and one permissive run produced a materially better boundary candidate. It is **not yet a reliable planning authority**. Once complete risk and migration constraints are enforced, the current free-form synthesizer loses information that the heads already found.

Constrained projection resolves that fact-preservation failure: the latest sparse pipeline now produces an admissible structural alternative with lower cost than free-form synthesis. It still does not decide whether the alternative is desirable. Semantic contradictions, module purpose, and whether a split creates enough practical value remain preference and acceptance judgments.

The result does not justify running a swarm for routine refactors, nor does it justify executing the earlier two-module proposal. A whole-file pass plus deterministic graph remains the economical default. Sparse heads may advise a high-impact refactor, but their output must enter a projection that cannot forget graph facts or satisfy one constraint by silently breaking another.

## Next smallest probe

The constrained projection experiment passed as a scenario study. Any continuation must express the scenario through generic Work Cell inputs, prompts, skills, tools, and result contracts rather than restoring code-refactor-specific runtime modules:

1. present the projected two-module alternative, the no-split alternative, and the strongest valid competing partition without treatment identity;
2. ask a reviewer to choose whether any split creates enough practical value and resolve the driver-ownership contradiction;
3. execute only the selected alternative in a disposable worktree;
4. measure typecheck and focused-test stability at each migration checkpoint before considering it a reusable refactor method.

The reusable form is therefore not “256 agents refactor a file.” It is: build one authoritative structural field, sparsely route evidence to genuinely different responsibilities, preserve dissent, project through deterministic constraints, and keep language-model judgment at the preference boundary rather than the fact-preservation boundary.
