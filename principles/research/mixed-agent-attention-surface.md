# Research — Mixed-Agent Attention Surface

**Disposition:** open
**Scope:** 研究一种用于 Rossovia runtime method-expression layer 的混合 Agent：
由一个保持任务、证据和最终回答权威的专注主 Agent，配合若干短生命周期、彼此隔离的发散思考区块；判断它是否能在不污染主循环的前提下扩大问题覆盖面，并决定是否值得进入后续 POC 或正式 Skill 表达。
**Source limitations:** 公开资料只支持事件流、转向、中断和多路径协作等外部行为；没有公开证据证明 GPT Live/Realtime 内部存在可直接调用的“不同脑区”，也没有证据保证多 Agent 在 Rossovia 的开发任务上普遍有效。

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

当主 Agent 需要同时保持深度专注和问题发散时，是否应在同一任务表达中引入若干独立思考区块，让它们产生可丢弃的“念头候选”，再由主 Agent 依据当前对象、约束、证据和接受关系选择性插入？

本研究要改变的具体决策是：对于开放设计、研究和复杂排错，Rossovia 是否应提供一种可选的多路径方法表达；还是继续只用单一主 Agent 的多轮实践与普通并行探索。

## Why the human notices the gap first

The recurring observation behind this research is not simply that the human is
“more intelligent” than the Agent. The human and the Agent receive different
evidence and optimize different next actions:

- **Longitudinal contact:** the human has felt the product across launches,
  reconnects, delays, and failed attempts. A single task prompt usually shows
  the Agent only the current explicit request and a bounded source projection.
- **Embodied friction:** the human notices hesitation, crowding, misplaced
  emphasis, repeated navigation, and the difference between “technically
  available” and “easy to use.” These are often absent from the acceptance
  condition and from a source-only review.
- **Negative space:** the human can ask “what should be here but is not?” or
  “why does this feel like a duplicate?” The ordinary Agent loop is rewarded for
  answering the stated question, so an omitted operation is easy to leave
  unexamined.
- **Local optimization:** code, tests, and the current task encourage a model
  to preserve contracts and close the named contradiction. That is useful, but
  it makes unrequested usability, expectation, and cross-screen coherence look
  like out-of-scope work unless the method explicitly presents them as evidence.
- **Taste and responsibility:** the human owns the product's lived meaning and
  can recognize a mismatch before it has a crisp bug report. The Agent may
  generate a plausible explanation without having authority to declare that the
  experience is acceptable.

This is therefore primarily a **context, attention, and practice-expression
gap**, not a request to pretend that the model contains human experience. A
stronger model can still miss a signal that was never delivered, never asked
for, or never represented in a form it can act on.

### Post-training consequence

The harness base should remain responsible for tools, effects, Task/Run/Cell
lifecycle, evidence, and authority. The post-training layer—Skills, system
prompts, receiver-specific context, and practice choices—should teach the
Agent to look at the missing evidence before it closes a task:

1. complete the ordinary mainline pass against the explicit request;
2. run a short, read-only **blind-spot pass** when the task involves UI,
   workflow, interaction, a user correction, a regression, or an observer query
   gap;
3. return only source-linked observations and the smallest next probe;
4. let Main decide whether the observation changes the next practice.

The blind-spot pass asks four concrete questions, not a generic “be more
creative” request:

- **User reality:** what would a first-time or returning user notice while
  trying the actual task?
- **Negative space:** what needed action, explanation, recovery path, or state
  is absent, duplicated, or visually misplaced?
- **Boundary mismatch:** what is mechanically true but operationally hard to
  understand, reach, or trust?
- **Recovery and continuity:** what happens after a slow load, stale snapshot,
  reconnect, failure, restart, or handoff?

The pass is an optional method expression, not a resident reviewer. It is
activated by the named conditions above, can be skipped for routine mechanical
work, and never edits, accepts, scores, or recursively dispatches another pass.
It may produce one bounded `perspective.aside` with minimal provenance
(`id`, `kind`, `origin`, source turn/step, `content`); authority, visibility,
and ordering are derived by the existing context assembly. An aside cannot call
tools, mutate a Task, or create another aside.

### Turning a correction into reusable post-training

When the human supplies a missed point, do not merely append it to a prompt.
Record the smallest causal lesson for future practice:

```text
observed miss -> evidence the Agent did not use -> why the mainline skipped it
-> one receiver-facing question or source pointer -> next disconfirming probe
```

The useful unit is a changed question or delivery path, not a personality label
or a numeric quality score. A later skill/research revision may generalize the
lesson only when the same relation appears in more than one concrete practice;
otherwise retain it as local evidence. This is how post-training grows without
turning the base runtime into an accumulation of special cases.

## Distinctions

- **专注主 Agent** 是当前任务的唯一综合者、证据重建者和最终返回者；它不是一个投票者，也不把子 Agent 的文字直接拼入最终答案。
- **发散区块** 是一次 bounded read-only contribution：接收同一任务的最小必要上下文，沿一个明确角度提出候选、反例或问题，返回结构化结果和未知项。
- **插入** 指主 Agent 在下一次上下文重建时选择性吸收候选；不是把异步 token 直接写进正在生成的最终文本，也不是新的 Task/Run/Cell 生命周期。
- **混合 Agent** 是方法表达或提示编排的候选名，不是新的角色枚举、队列、脑区注册表、常驻 daemon 或后训练引擎。
- **GPT Live/Realtime 的可借鉴部分** 目前只能是外部交互边界：流式事件、回合结束判断和中断；不能把产品行为倒推成内部认知架构。

### Working styles and principle lenses

The first probe treated the advisory surface as three temporary thought blocks.
That is too weak a test: it varies the requested angle, but not a stable way of
working. The revised probe treats a style as a durable prompt-level method
expression with a recognizable question, evidence preference, and return shape.
MBTI-like labels are only mnemonics for contrast; they are not psychological
claims, model identities, or runtime authority.

All styles share `principles/SEQUENCE.md`, which remains the only semantic canon.
A style may foreground one existing P-ID and at most two supporting P-IDs for a
particular task. This is a lens selection, not a new principle, a vote, or a
permission to override evidence. The Main style reconciles the lenses against
the shared sequence and remains the sole task, evidence, and final-answer
authority.

The initial candidate set is intentionally small and deliberately contrasted:

| style | mnemonic | task contribution | example principle lens |
| --- | --- | --- | --- |
| coordinating judge (Main) | `xNTJ` | defines the current contradiction, orders work, and makes the final bounded choice | P04, P15, P11 |
| model explorer | `xNTP` | proposes alternatives, hidden assumptions, and disconfirming probes without closing the decision | P07, P08, P09 |
| evidence auditor | `xSTJ` | checks claims against traceable sources and rejects unsupported completion | P02, P13, P14 |
| user-reality observer | `xSFP`/`xSFJ` | tests concrete usability, human bandwidth, and whether the form enables action | P05, P10, P16 |

`xNTJ` is used rather than `ENTJ` or `INTJ` because the experiment needs the
observable combination of systems framing and decision closure, not a claim
about introversion or extraversion. The styles are not ranked personalities;
the advisory styles never vote and never write effects directly.

## Evidence

- [OpenAI Realtime API reference](https://platform.openai.com/docs/api-reference/realtime) exposes turn detection, response interruption, and event-oriented session behavior. This supports treating partial thoughts as interruptible, bounded events; it does **not** support a claim about internal model regions or spontaneous thought insertion.
- [Anthropic's Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) describes parallelization for multiple perspectives and an orchestrator-workers pattern in which a central model delegates and then synthesizes. This supports the external topology, not an automatic merge of worker text into the main stream.
- [Tree of Thoughts](https://arxiv.org/abs/2305.10601) and [Self-Consistency](https://arxiv.org/abs/2203.11171) provide prior art for generating multiple reasoning paths and selecting or aggregating them. They support candidate-path evaluation, not token-level interleaving or a permanent cognitive-region abstraction.
- [OpenAI's low-latency voice engineering account](https://openai.com/index/delivering-low-latency-voice-ai-at-scale/) and the Realtime API together show why event boundaries, interruption, and latency budgets are useful analogies. Public material still does not disclose an internal “brain regions” implementation, so the analogy must remain explicitly provisional.
- [Improving Factuality and Reasoning in Language Models through Multiagent Debate](https://arxiv.org/abs/2305.14325) reports that independent model instances followed by debate can improve selected reasoning tasks. Its task-specific multi-round debate is evidence for testing independent proposals, not for adopting debate or consensus as Rossovia's default.
- [Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate](https://arxiv.org/abs/2305.19118) identifies degeneration-of-thought under repeated self-reflection and motivates differentiated paths. It also reports that a judge may be unfair across different models, which supports keeping source evidence and Main reconstruction above agent agreement.
- [Should we be going MAD?](https://proceedings.mlr.press/v235/smit24a.html) finds that multi-agent debate does not reliably outperform simpler alternatives and is sensitive to protocol choices. This is a direct warning against adding a permanent debate mechanism merely because it sounds cognitively plausible.
- [Can LLM Agents Really Debate?](https://arxiv.org/abs/2511.07784) reports that intrinsic reasoning strength and diversity matter more than several structural debate parameters, while majority pressure can suppress independent correction. This supports differentiated, non-voting candidate returns and a falsifiable POC rather than a swarm score.
- The project's [Agent harness theory](../../design/harness/THEORY.md#harness-base-and-runtime-method-expression) already separates stable Task/Run/Cell contracts from Skills, prompts, plans, and practice choices. The proposed mixed surface therefore belongs provisionally to the method-expression line unless a hard lifecycle, evidence, permission, or recovery property fails.

## Existing-sequence coverage

- **P09 — 注意力分层:** already covers preserving the relation that matters at the current decision. A separate divergent surface may be an expression of attention allocation, but P09 does not decide how many candidates to create or when to insert them.
- **P15 — 最小有效跃迁:** constrains the POC to the smallest useful carrier and rejects a new orchestration mechanism when a prompt/context composition is sufficient.
- **P16 — 表达形式须使实践主体能够行动:** requires the returned thought candidates to be understandable, bounded, and usable by the Main Agent rather than an opaque stream of internal fragments.
- **P13/P14:** require candidate claims to remain distinguishable from verified facts and rebuildable from source-linked evidence. A thought candidate cannot become evidence merely because another Agent generated it.

No new Principle is currently justified. The open question is expression selection and task shaping within existing coverage.

## Working hypothesis

**H1 — Selective divergent reactivation.** For tasks with an explicitly open design or research uncertainty, a small number of differentiated, read-only thought surfaces may increase coverage of relevant alternatives and counterexamples compared with a single focused pass at comparable total budget. The gain will occur only when the Main Agent filters candidates against the current object and evidence; unfiltered insertion will increase noise and attention cost.

**H2 — Bounded provenance beats raw interleaving.** A short, source-linked note
with a clear question and next probe should be more reconstructible and less
disruptive than raw partial text injected into the Main stream. Any headings
used to help a prompt writer are presentation only; the runtime carrier should
retain only the minimal provenance fields already named above.

**H3 — Event-triggered use beats always-on use.** Activating the surface only at a named uncertainty or phase boundary will preserve latency and attention better than generating divergent fragments for every turn.

These are hypotheses, not accepted design claims.

## First POC observation — 2026-08-21

The first Rossovia-run probe used the project task
`c09d50aa-9db9-4663-ad8f-c3a19c3f3b89` with three pending Task todos. The worker
finished without a workspace diff, but the Work Cell settled
`verification_failed` because the task cycle still had three pending items.
This is a task-shaping/protocol observation, not evidence about mixed thinking;
the experiment was not treated as a semantic result.

The corrected no-todo probe used task
`f418af68-e62f-4ece-a8bb-3f4573a2ba72`, attempt
`62f745b8-86fc-4e98-863d-1d5cc0b3a8fb`, and DeepSeek Flash with `reasoning=max`.
The standard run result was `cellStatus=passed`, with an empty workspace diff,
6,574 output tokens, and a 3,408-character final report. The read-only observer
review `review-62f745b8-86fc-4e98-863d-1d5cc0b3a8fb-a57d97dc-7605-47b1-8360-c2fae0bd6bab`
confirmed the lifecycle and effect boundaries, but reported that the standard
observer context omitted the result payload, source content, and step-level
evidence. It therefore could not verify whether A/B/C actually differed or
whether any candidate improved coverage.

**POC standing:** `uncertain`. The run proves that a read-only concept probe can
complete through the existing Task/Run/Cell path, and that the observer can
record a precise query gap. It does not prove H1, H2, or H3. A second probe
needs a bounded, reviewable result projection (for example a deliberately
structured note or content digest plus criterion-linked summary)
without exposing raw chain-of-thought or private payloads. Until that surface
exists, do not claim semantic POC success or add a production mixed-agent
mechanism.

## Evidence-surface follow-up — 2026-08-21

The smallest safe observer improvement was tested and added at the generic
Workbench evidence boundary. When a Cell input explicitly declares
`outputSchema`, the observer now receives only `structuredOutput` metadata:
declaration/presence, mechanical validity, schema and value digests, and a
bounded shape summary. The summary has node/collection budgets, does not copy
output field names, and the digests use bounded canonical JSON. It does not
receive structured values, `finalText`, raw provider steps, original input, or
trace data. A no-schema result does not invent this surface. The focused
observer suite is green (9/9), and the Workbench typecheck is green.

This closes the first half of the query gap—reviewers can distinguish “no
structured candidate was declared” from “a structured result existed but its
content is not visible”—but it does not yet make semantic candidate review
possible. `outputSchema` is a validation contract, not a visibility grant; a
future content projection would need an explicit caller-owned allowlist and
field bounds. Therefore the mixed-agent POC remains `uncertain`, no runtime
thought-surface mechanism is admitted, and the next probe should either use a
deliberately permitted projection or end in `no-proposal` if the additional
visibility cost is not justified.

## Revised smallest POC — stable styles and principle lenses

Use an existing ordinary task carrier or an offline fixture; do not add a runtime
lifecycle, durable queue, role enum, persona registry, or UI path.

1. Select a small fixture set with three kinds of work: a routine repair where divergence should be unnecessary, an open design question with at least two plausible directions, and a diagnosis containing a misleading local hypothesis.
2. Compare matched expressions under a bounded budget: focused Main only; Main plus all three advisory styles; and three ablations that remove one advisory style at a time. Keep task sources, acceptance, tools, and final authority identical.
3. Give each style its stable method prompt and one current lead P-ID plus at most two supporting P-IDs. Do not let a style create or select a new principle. Do not give identical prompts and call the results independent.
4. Require each aside to carry only the minimal provenance fields already
   supported by the context surface (`id`, `kind`, `origin`, source turn/step,
   `content`). The `content` is a short bounded note that may use these
   receiver-facing questions as prose headings, but they are not new runtime
   fields:

   ```text
   angle:
   candidate:
   why-relevant:
   evidence:
   unknown:
   contradiction-or-boundary:
   next-probe:
   ```

5. Let Main use, defer, or ignore each note while reconstructing the next
   practice. Do not record an accept/reject/impact status for the thought and do
   not turn it into a proposal lifecycle. A note may influence the next task
   expression only through Main's ordinary plan/practice decision; it may never
   directly alter code, Task state, acceptance, or the final answer.

6. Record per fixture: relevant alternative coverage, counterexamples found,
   unsupported/noisy returns, duplicated reasoning, whether a source-linked
   disconfirming probe was produced (`yes`, `no`, or `uncertain`), total
   token/cost delta, final-answer reconstruction, and whether a style caused an
   obsolete-anchor or authority error.

## Falsifiers and stopping conditions

The POC is **no** for production expression if the mixed surface does not improve relevant alternative or counterexample coverage, if gains come only from extra tokens, if raw fragments outperform only by making evaluation impossible, if Main cannot reconstruct the note's source and relevance, or if candidates cause authority/evidence contamination. It is also **no** when routine tasks pay a persistent latency/cost penalty without a decision-changing benefit.

The result remains **uncertain** when the fixture set is too small, the candidate angles are not genuinely differentiated, or the evaluator cannot separate semantic usefulness from additional thinking time. A positive result is only a reason to run a second, blinded matched probe; it is not permission to add a production mechanism.

## Possible decision delta

If H1–H3 survive a matched POC, add a small optional method-expression reference or Skill command describing provenance-bearing notes and Main use. Keep the existing Plan semantic and keep the carrier replaceable. If they fail, retain this note as `no-proposal` evidence and continue using ordinary practice-cycle or independent parallel exploration.

The following would require a separate mechanism inquiry rather than a direct implementation: live cross-stream token insertion, durable candidate history, automatic candidate scheduling, cross-run cancellation, or any path in which a thought fragment can acquire effect or acceptance authority.

## Strongest no-proposal case

The current `practice-cycle` and `agent-delegation` methods already support changed rounds and differentiated read-only exploration. A mixed surface may be only a new metaphor for those methods. Existing multi-agent evidence is sensitive to task, diversity, judge quality, and budget; adding a “brain regions” abstraction could create ceremony, correlated noise, and an attractive but false impression of cognitive breadth. The default should therefore remain the current method set until a POC demonstrates a decision-changing advantage.

## Disposition and next evidence

**Disposition:** `open`

Next evidence is the bounded offline POC above, followed by an independent
review of the fixture, note form, and Main-use rule. Do not modify
`principles/SEQUENCE.md`, add a Principle ID, or change production Task/Run/Cell
behavior before the POC and review produce a source-linked decision.
