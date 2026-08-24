# Principle Organization and Review Team Protocol

Use this protocol for every addition, revision, retirement, or coherence review
of a principle sequence.

## Organize the principles

- **Central committee** — Every entry in `principles/SEQUENCE.md`. Entries are
  semantically equal; this is only an organizational image.
- **Standing committee** — A compact, human-approved foundational cluster in
  `principles/COUNCIL.md`. It keeps the general line and supplies a liaison to
  ordinary reviews; it does not own a second explanation of any P-ID.
- **Working team** — A skill's `Primary` P-ID is its stable lineage; its
  `Supporting` P-IDs are habitual members. Each activation chooses one current
  lead for the actual principal contradiction, which may be the lineage or a
  supporting P-ID. Do not declare co-primary doctrine: if no one lead can be
  named, split the work or route to a higher-level dispatcher. This is the
  durable form of principle differentiation.
- **Alternate candidate** — A reviewed, human-nominated candidate may join one
  real working activation as an additional trial seat. It is not a central or
  standing member, cannot be Primary, Supporting, or current lead, and gains no
  semantic authority from participation.
- **Review team** — A temporary working team for a proposed sequence change.

If no standing committee is constituted, run a one-time founding review before
using ordinary review-team formation.

## Nominate and trial an alternate

Alternate nomination, sequence adoption, and standing-committee nomination are
independent human decisions. Record them separately.

1. Nominate only a reviewed candidate with a plausible decision delta, a safe
   boundary, and a task that can expose overlap or failure. Record the human
   decision in its candidate file and list active alternates in `COUNCIL.md` for
   discovery; neither record becomes a semantic source.
2. Keep the normal Sequence P-ID working team unchanged. Add at most one
   alternate as a separately labeled trial seat. It does not count toward a
   skill's Primary/Supporting lineage and cannot lead the task.
3. Before the work, record the baseline choice without the candidate, the
   different choice it proposes, and the observation that would disconfirm its
   value. Do not use the candidate alone to authorize an irreversible or
   authority-changing action.
4. After the work, append a source-linked outcome to the candidate record:
   `strengthened`, `overlap`, `boundary failure`, or `failed`. State whether an
   existing P-ID already explains the observed result.
5. Candidate trial evidence may inform a later review. The candidate cannot sit
   on its own or another sequence review team; those seats remain existing
   Sequence P-IDs.

## Found the standing committee

Use this exceptional full-central review only to constitute or materially renew
the standing committee. It is not the template for ordinary reviews.

1. Give every current P-ID a separate stewardship pass; batching execution is
   allowed, but do not merge two P-IDs into one report.
2. Ask each steward whether its principle belongs in the standing committee,
   considering five tests: it remains necessary across domains; it helps orient
   other working teams; its removal breaks the general method rather than one
   specialization; its presence does not merely duplicate another proposed
   standing member; and it has survived more than one independent downstream
   expression or real review cycle.
3. Ask each report to nominate a compact slate and to argue for at least one
   principle that should remain an ordinary committee member. Standing status is
   an organizational availability role, not semantic rank or veto power.
   A newly adopted P-ID is ordinarily ineligible until it passes the maturity
   test; do not promote it merely because its own steward can argue for it.
4. Synthesize a compact nomination, its disagreements, and the alternative of
   having no standing committee. Human approval alone writes the roster into
   `principles/COUNCIL.md`; no sequence line changes.
5. Re-run this full review only when the standing roster itself becomes the
   principal contradiction. Ordinary review teams remain selective.

## Form the review team

1. State the target and the default: retain the current sequence.
2. Classify the decision: addition, revision, retirement, or coherence check.
3. Select 3–5 existing P-IDs by role and the decision tensions they expose, not
   by numerical order or a fixed roster. Name one current lead, a standing
   liaison, one or more direct comparators, and a preservation seat. Record one
   sentence per seat explaining why it is needed.
4. Choose the preservation seat for its strongest unchanged-sequence argument.
   P01, P10, and P15 are common choices, but none is mandatory or permanently
   privileged. Do not activate every principle.
5. Assign one independent agent to each selected P-ID when delegation exists.
   If it does not, perform isolated passes and mark the result self-reviewed.

Nominated alternates do not occupy review-team seats. Their trial records are
evidence supplied to the existing P-ID stewards.

## Brief a team member

Give every steward:

- the complete one-line sequence;
- its assigned P-ID line and the review target;
- linked research evidence when one exists, plus candidate/review source paths;
- the required report shape below.

Do not give a steward the coordinator's conclusion or other steward reports.
It owns a perspective for this review only, not an interpretation to preserve.

Require this response:

```markdown
## P<id> team-member report

- **Verdict:** support | overlap | boundary issue | insufficient evidence
- **Decision delta:** <a concrete future choice that changes, or none>
- **Overlap:** <existing P-ID and why it does or does not subsume the target>
- **Boundary:** <counterexample or limiting condition>
- **Unchanged alternative:** <why retaining the sequence may be better>
- **Evidence:** <descriptive inline source links and stable artifact anchors>
```

## Synthesize without voting

- Do not average, count, or overrule reports by majority.
- Preserve the sequence when the candidate lacks recurrence, irreducibility, a
  meaningful boundary, two useful expression probes, or a justified permanent
  attention cost.
- If reports expose a repairable ambiguity, propose an exact revised one-line
  entry and keep it pending for human approval.
- Record dissent and the unchanged-sequence alternative. The committee provides
  evidence; only the human may adopt, revise, retire, or reject a sequence item.

## Write the record

Create `principles/reviews/YYYY-MM-DD-<slug>.md` from
`committee-review-template.md`. Link it from a candidate record when one
exists. A direct human decision made before review stays in force; label the
record retrospective and do not silently modify the sequence. Preserve source
links beside the claims they support; a detached evidence list is supplementary,
not a substitute for claim-level provenance.
