# Why AI-written documents sound wrong

**Status:** bounded research conclusion and skill-design basis
**Date:** 2026-07-23

## Question

Why does otherwise competent model output often sound unlike a real document,
why do models differ, and what can an agent skill improve beyond an expanding
list of “AI tells”?

The conclusion is not that style rules are useless. They are late diagnostic
evidence. The recurring upstream failure is that a model is asked to produce
text before the writing relation and source boundary have been reconstructed.
It then writes as a generic helpful assistant to an abstract user and fills
missing connective meaning with statistically plausible intent.

## What public evidence supports

### Assistant defaults shape prose

Public model guidance confirms that response style is actively shaped above
the user prompt. The OpenAI [Model Spec](https://model-spec.openai.com/2025-09-12.html)
uses concise, conversational, clear, professional, and efficient defaults.
OpenAI's current [model guidance](https://developers.openai.com/api/docs/guides/latest-model)
now cautions that broad “be concise” instructions may be unnecessary and can
make responses too brief; it recommends stating what must survive compression
and defining tone through concrete writing choices.

Google's [Gemini prompting guide](https://ai.google.dev/gemini-api/docs/prompting-strategies)
says current models default toward direct, efficient answers and asks
developers to specify when they want more conversational or detailed output.
Anthropic's [Claude prompting guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
recommends saying what form to produce rather than only what to avoid and notes
that the prompt's own Markdown style can influence the response.

These documents do not reveal every production system prompt, and they do not
prove that brevity causes all AI-sounding prose. They do support the user's
hypothesis in a bounded form: high-authority efficiency and formatting defaults
are real control inputs, and a document-writing method must counter or refine
them when the artifact needs a different relation.

### Alignment can reward visible helpfulness

The ACL 2025 paper
[From Lists to Emojis: How Format Bias Affects Model Alignment](https://aclanthology.org/2025.acl-long.1308/)
found that human and learned preference evaluators favor visible patterns such
as lists, links, bold text, emojis, and longer comprehensive-looking answers,
even when those forms do not improve content. This supplies a plausible
training-level reason for generic assistant formatting. It does not make every
list an alignment artifact.

### Personal style is not recovered by a few adjectives

A large multi-domain evaluation,
[Catch Me If You Can? Not Yet](https://aclanthology.org/2025.findings-emnlp.532/),
found that models approximate personal style more successfully in structured
news and email than in nuanced blogs and forums, even with in-context samples.
A 2026 preregistered study of
[post-editing model drafts](https://aclanthology.org/2026.acl-long.2030/)
found that editing moves text toward a participant's style while leaving it
closer to model text and less diverse than unassisted writing.

The practical consequence is modest: task-near samples and corrections are
valuable, but a small corpus does not justify a universal personality profile
or a claim of author-level imitation.

## What community methods contribute

Three current community approaches reveal complementary layers:

- [Humanizer](https://github.com/blader/humanizer) records recurring content,
  language, formatting, and communication patterns and has evolved beyond
  deletion toward voice calibration and meaning preservation. Its list is
  useful as late lint, but hard universal bans such as punctuation bans can
  mistake a community detector heuristic for writing quality.
- [WRITING.md](https://github.com/Anbeeld/WRITING.md) starts from medium,
  audience, reader knowledge, need, sources, and a through-line. It treats
  pattern checks as tripwires and explicitly warns against optimizing for
  them. This is closer to a generative method.
- [write-like-me](https://github.com/Hiro-Inagawa/write-like-me) combines
  author-only corpus extraction, register-specific stylometry, examples, and
  corrective rules. It has stronger evidence than adjective-only voice
  prompting, but its own methodology records missing features, unverified
  citations, and limits of a single-author corpus. It solves deliberate voice
  modeling, not ordinary document writing by default.

The archived Rossovia writing skills show the same split. The useful parts of
`technical-article-writing` and `article-refactor` are one controlling claim,
reasoning movement, audience specificity, information/expression separation,
and revision from whole to sentence. The archived `writing-profile` made a
seven-axis persistent assessment and mechanical anti-AI list carry too much
ordinary writing weight.

## Controlled Rossovia probe

The frozen input and manifests live under
[`regeneration/evaluations/fixtures/2026-07-23-document-expression/`](../../regeneration/evaluations/fixtures/2026-07-23-document-expression/).
Kimi Coding K3 wrote a Chinese Rossovia README opening from the same facts in
two repeated conditions. Raw Work Cell records remain in ignored local
`.work-cell` evidence.

### Efficiency wording did not explain the whole effect

Adding only “lead with the outcome, concise, scannable, clear headings or
bullets” did not create a clean between-condition split. Both neutral and
treated drafts used four section headings. Treated drafts used 11 and 7 list
items; neutral drafts used 7 and 9. One neutral run invented an anti-monopoly
motivation and appended a ceremonial README note, while the other did not.

This supports two narrower observations:

1. efficiency language can reinforce catalog form, but the K3 execution
   profile already strongly prefers that form without it;
2. within-profile variation is large enough that one draft cannot establish
   the treatment effect.

### A concrete writing relation changed structure

The treatment identified a skeptical open-source developer, the maintainer's
accountable stance, and the desired transition from “cannot place the project”
to “can place it and choose an entry.” Across both repetitions:

| Observation | Neutral | Situated |
|---|---:|---:|
| `##` headings | 4, 4 | 3, 0 |
| list items | 9, 9 | 3, 3 |

The situated drafts connected project identity, boundary, principles,
governance, and entry in prose instead of rendering every topic as a separate
answer bucket. This is compatible with the writing-relation hypothesis.

The same treatment also increased unsupported connective claims. Examples
included “the goal is only one,” “it was never intended to be packaged as an
agent framework,” “both parts are still being refined and far from settled,”
and “everything here is open to revision.” These sound natural because they
complete the rhetorical movement, not because the source supports them.

Therefore a writing relation is necessary but insufficient. It must operate
inside an explicit claim boundary, and revision must compare implications as
well as named facts.

### Model-specific behavior remains material

A smaller direct probe used the complete source, the same situated
instructions, temperature 1, and two repetitions per execution profile:

- `kimi-coding/k3`, provider-enabled thinking;
- `deepseek/deepseek-v4-flash`, thinking disabled.

This is a whole-profile observation, not a bare-model ranking. K3 produced
connected Chinese prose but one run reached the 2,000-token output boundary
mid-list; its other run added claims such as “the goal is only one” and “the
three ways are independent.” DeepSeek completed in about three seconds but
ignored the Chinese requirement in both runs and added claims such as “it is
not another framework,” “nothing here is finished,” and a recommended default
entry.

The stable skill therefore cannot encode one model's symptoms as universal
rules. It should inspect the actual draft for language compliance, truncation,
source drift, and dominant format before applying model-specific repair.

### Semantic judges need the source and still remain fallible

The first independent judge packet stated “source fidelity” but omitted the
source itself; it incorrectly passed an invented motivation. After the full
source was added, DeepSeek Flash caught that motivation and a ceremonial
closing. It still passed several situated drafts' invented intent and maturity
claims.

The result reinforces the project's work-proof boundary: schema, artifact,
task, and tool checks can establish that work exists; semantic correctness
remains agent judgment. Reliability comes from shaping that judgment into an
explicit claim comparison and retaining human acceptance for consequential
content, not from treating one judge call as fact.

### Held-out writing tasks support a bounded first version

The candidate skill was then frozen and exercised on two held-out English
documents with repeated `deepseek-v4-flash` runs. The fixtures and complete
decision record are retained in the
[document-writing probe](../../regeneration/evaluations/2026-07-23-document-writing-probe.md).

The incident-report task was already easy for the baseline, so a blind judge
found no broad quality difference. Manual source comparison did find one
repeated boundary difference: both baseline drafts supplied a year absent from
the source, while both skill-guided drafts preserved the missing year. A
separate mechanical YAML task correctly declined the skill and routed the work
as formatting rather than document writing.

The harder clinic-notice revision produced mixed evidence. After the method
distinguished publishable propositions from constraint-only instructions, one
valid comparison preferred the skill-guided notice and its causal attribution
was source-supported. Another skill-guided run still converted temporal
adjacency and measured outcomes into an invented trial purpose. The method
therefore reduces some source-completion errors but does not make semantic
fidelity deterministic. That residual belongs in later verification and
evaluation, not in another surface blacklist.

## Causal model

Use the earliest layer that explains the observed defect:

```text
source boundary
  → writer-reader-occasion-purpose relation
    → meaning movement
      → paragraph and sentence realization
        → harness/model defaults
          → surface residue
```

Negative rule lists work almost entirely at the final layer. They cannot
recover a missing source, writer, reader, occasion, intended change, or
controlling relation. They remain useful after those upstream relations exist.

## Skill decision

Create one active `document-writing` skill with:

- a model-independent core of source boundary, writing relation, document
  movement, positive drafting, and ordered revision;
- task-local voice evidence rather than a mandatory persistent profile;
- late pattern-cluster lint rather than global word or punctuation bans;
- observable model-specific repair based on the produced draft;
- explicit boundaries with naming, visual design, and semantic acceptance.

Do not restore the archived writing suite or add a runtime. The repeated
judgment is methodological, changes across genre and audience, and benefits
from agent interpretation. A script may later assist deterministic claim or
format inventories, but it cannot decide whether prose is true or fitting.

## Reopening observations

Revisit the method if held-out tasks show that:

- restoring the writing relation does not improve document movement across
  multiple media or models;
- a smaller source-preservation instruction performs equally well;
- the method systematically makes terse operational documents worse;
- task-local samples underperform a lighter stable user preference;
- or agents cannot apply the method without producing visible process
  ceremony.

Also revisit the claim-boundary step if repeated runs continue to turn adjacent
facts or measurement targets into purpose, cause, or intended benefit. One
current held-out run did so even after the relevant distinction was explicit.
