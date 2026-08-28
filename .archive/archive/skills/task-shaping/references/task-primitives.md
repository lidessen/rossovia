# Task primitive map

This is a conservative seed for classifying work, not a universal benchmark or
an accepted capability profile. A host profile and its admitted evaluation
evidence override these hypotheses. Keep model/provider/harness revision and
task conditions attached when promoting any row.

## Evidence states

- **candidate:** structurally plausible; requires representative repeated tests;
- **guarded:** useful but material variance or failure remains, so the harness
  must detect or verify it;
- **supported:** admitted evidence justifies direct allocation within the stated
  boundary; and
- **rejected:** evidence defeated the proposed primitive or transformation.

This standalone snapshot intentionally promotes no row to `supported` without
a host capability record.

## Candidate primitive families

| Candidate operation | Conditions that make it primitive-shaped | Required observable boundary | Common escape from the envelope | Seed state |
|---|---|---|---|---|
| finite-label classification | short bounded input, explicit mutually distinguishable labels, representative examples, allowed abstention, and an accepted error tolerance | label schema, invalid-label rejection, confusion cases, wrong-valid-label consequence | vague or overlapping labels; open-world classes; unknown residual error | candidate |
| schema-constrained information extraction | source fits context or bounded retrieval, fields are explicitly defined, missing/ambiguous values allowed | schema validation plus source spans for material fields | inferring absent values; cross-document identity resolution | candidate |
| deterministic reformat or projection | transformation is mechanically specified and meaning preservation is checkable | parser/schema/hash or direct comparison | semantic rewriting hidden inside “formatting” | candidate |
| one claim against bounded evidence | atomic candidate claim, authoritative evidence slice, `supported/contradicted/unverifiable` contract | claim path, evidence reference, disposition | asking one loop to notice every claim in a long candidate | guarded candidate |
| pairwise choice under one criterion | two explicit alternatives, one operational criterion, order balancing, tie/abstain allowed | repeated consistency and mechanically retained comparisons | converting preference into universal scalar quality | candidate |
| local edit with executable acceptance | bounded code/config surface, explicit intended behavior, relevant checks available, reversible change | diff plus targeted test or deterministic validator | hidden downstream impact or unsettled architecture | guarded candidate |
| bounded source summary for a named later decision | source scope and later decision are fixed; every material statement remains traceable | coverage ledger and source links | “summarize everything important” without a decision field | guarded candidate |
| declared tool call and structured settlement | tool schema is explicit and runtime validates the terminal contract | required tool call and output schema | treating protocol success as semantic correctness | guarded candidate |

## Examples of transformation

### Free scalar scoring → repeated pairwise judgments

Original request: “Score twenty designs from 0–100 for overall quality.”

Why the form is unstable: scale calibration drifts, “overall” blends several
criteria, adjacent scores have no observable meaning, and one run can create a
false precision hierarchy.

Possible shaping:

1. separate the decision-changing criteria, such as task clarity, visual
   hierarchy, and implementation fit;
2. compare two designs at a time under exactly one criterion;
3. balance presentation order and repeat only comparisons whose variance can
   change the decision;
4. allow `A`, `B`, `tie`, and `unverifiable`, retaining one short reason and
   evidence anchor;
5. aggregate comparisons mechanically per criterion; and
6. send close or contradictory finalists to human review.

This changes an uncalibrated scalar generation task into bounded choices. It
does not prove that pairwise model preferences equal human taste; correlated
bias and aggregation effects remain evaluation targets.

### “Review all claims” → addressable claim audit

Original request: “Read this long proposal and all sources; report any false
claim.”

Possible shaping: parse candidate paths deterministically, create one audit
entry per atomic decision-changing claim, retrieve bounded evidence per entry,
require `supported/contradicted/unverifiable`, reject missing entries, then
reconstruct a report from the complete ledger. Open-ended noticing becomes a
finite classification task plus source-linked extraction.

### Large project review → semantic packets

Original request: “Review this 100-file change for every regression.”

Possible shaping: recover the whole change at low resolution, map changed
contracts and caller/consumer relations, form packets around causal paths or
state/effect owners, give each a bounded failure class and source scope, retain
outgoing relations, then reconcile through a coverage ledger. “Every
regression” remains an overclaim; the final report states inspected fields and
residual risk.

### Open-ended creative ranking → generation, filters, and human choice

Original request: “Generate the best product name and rank every option.”

Possible shaping: separate diverse candidate generation from deterministic
constraint filters, use pairwise judgments for named contrasts, preserve
dissenting clusters, and leave final aesthetic/identity acceptance to a human.
The harness can improve search coverage and decision visibility; it cannot
guarantee originality or the uniquely best name.

### Irreversible execution → prepare, verify, authorize, commit

Original request: “Choose and run the production migration autonomously.”

Possible shaping: prepare a source-linked migration and rollback plan, execute
reversible dry runs, independently verify preconditions and observed effects,
request explicit authority, then let a bounded commit tool apply the approved
operation. If rollback or effect verification is unavailable, retain
`unsupported-escalate`.

## Promotion discipline

Promote a candidate only from a named reference profile, repeated
representative cases, material correctness and failure evidence, and an
admitted capability claim. Record the boundary under which it works and the
observation that reopens it. A Skill update packages the revised map; an agent
task run never rewrites its installed snapshot as fact.

A proposed guard is a treatment hypothesis, not promotion evidence. If known
material errors remain, keep the operation `guarded` until matched runs show
that the guard detects or contains them within the accepted task-specific
tolerance. When tolerance or consequence is unspecified, do not infer that a
headline success rate is reliable enough.
