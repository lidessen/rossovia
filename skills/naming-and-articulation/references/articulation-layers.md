# Articulation Layers

Use only the layers that change an actor's decision or a successor's recovery.
They are not a mandatory documentation template.

| Layer | It must answer | Belongs where | It must not become |
|---|---|---|---|
| Name | What compact handle lets people refer to this relation? | the owning source and its immediate use sites | a claim to exhaust the object |
| Operative definition | What relation/boundary does it preserve, and what does it exclude? | the source that owns the affected future decision | a detached dictionary synonym |
| Explanation | Why does that boundary matter here, and what action changes? | beside the definition or a direct reader-facing reference | a second semantic source |
| Audience projection | How can a particular reader find or remember it? | README, index, diagram, or glossary when needed | canonical fact authority |

## Placement gate

| If the term changes... | Put the definition... | Keep other appearances... |
|---|---|---|
| a Sequence P-ID reading | in `principles/interpretations/P<id>.md` | as linked expressions only |
| an architectural or authority boundary | in `design/` or its accepted decision | as concise linked projections |
| an agent's repeatable method | in the owning Skill or a direct reference | in triggers/indexes as a short gloss |
| a local implementation decision | beside the code or local document | out of global indexes by default |
| cross-source discoverability only | nowhere new; generate an index from named sources | as a projection with source links |

## Candidate checks

For each candidate, ask:

1. **Relation:** What observation or decision would become unintelligible if the
   name disappeared?
2. **Contrast:** Which neighboring term or case does it rule out?
3. **Register:** Can the actual audience say, recall, and use it without a
   private explanation?
4. **Durability:** Would it still identify the relation after incidental code or
   file structure changes?
5. **Status:** Is it provisional, proposed, accepted, or verified? Does its
   wording falsely upgrade that status?
6. **Stop:** What future decision fails if this term or layer is omitted? If
   none, omit it.

## Examples of non-selection

- A one-off release-note sentence: write the sentence; do not add terminology.
- A generated alphabetical glossary: keep it a projection unless named source
  definitions cannot be discovered through existing paths.
- A new P-ID label: use principle cultivation; this method cannot give a new
  semantic rule authority.
