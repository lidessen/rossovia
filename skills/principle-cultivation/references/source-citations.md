# Source Citation Discipline

Use this reference for research, interpretations, proposals, candidate records,
and reviews. A citation is an evidence edge: it lets the reader reopen the
source at the point where a claim depends on it.

## Put the link on the claim

Use a descriptive inline Markdown link on the source title or evidence-bearing
phrase:

```markdown
毛泽东的[《实践论》](https://www.marxists.org/reference/archive/mao/selected-works/volume-1/mswv1_16.htm)
把实践作为认识的来源和检验。

现有的[候补提名门槛](../SKILL.md#alternate-nomination-gate)把试验参与和
Sequence 采纳分开。
```

The surrounding sentence must say what the source contributes. Do not leave a
link unexplained, use a bare URL as prose, or make the reader map numbered
footnotes back to claims when an inline link can carry the relation directly.

## Choose the source

- Prefer a primary work, official document, paper DOI or publisher page, or the
  repository artifact that directly supports the claim. Do not cite a search
  result page when the underlying source is available.
- Link repository evidence to the most stable relative file and heading anchor
  available. When no durable link exists, retain the exact path plus line or
  section anchor rather than discarding provenance.
- Split compound claims when their sources differ. Put each link beside the
  clause it supports.
- Quote only when the exact wording matters. Otherwise paraphrase the decision
  consequence and keep the link.

## Preserve the edge

- A bibliography or `Sources` section may provide publication metadata, but it
  does not replace claim-level links.
- Preserve valid incoming citations when refactoring or compressing an artifact.
  If a source is superseded, replace the link deliberately and retain decision
  history where the change matters.
- Rich icons or previews are renderer behavior. Write normal Markdown links; do
  not embed favicons or screenshots to imitate them.

## Boundary

Do not add citations, examples, or explanation to `principles/SEQUENCE.md`.
Source-bearing derivatives carry provenance precisely so the Sequence can stay
compact.
