# Document expression concepts

Read this reference when the writing relation or movement is unclear, several
sources must become one document, structural rewriting is required, “AI flavor”
survives an ordinary revision, or voice is disputed. Length alone does not
justify loading it. It explains the model behind the skill; it is not a
checklist to print.

## The object being shaped

A document is not information decorated with style. It is a situated relation:
someone who is accountable for a point of view addresses particular readers,
through a particular medium, because something should become understood,
decidable, memorable, or actionable.

AI prose often sounds strange when the task supplies a topic but not this
relation. The model then falls back to a generic assistant relation: helpful
professional speaking to an abstract user. That default naturally produces
context-free explanation, even emphasis, comprehensive-looking sections,
ceremonial transitions, and safe conclusions.

Recover these determinations only to the depth that changes the draft:

- **source:** what may be claimed, by whom, with what qualification;
- **writer:** accountable stance, knowledge, and relation to the subject;
- **reader:** prior knowledge, concern, power, and relation to the writer;
- **occasion:** why this text is needed now;
- **change:** what the reader should understand, decide, feel, or do;
- **medium:** the reading conditions and forms it affords;
- **history:** what earlier text, decision, or shared vocabulary this continues.

The resulting prose should make those determinations perceptible without
necessarily announcing them.

## Six causal layers

Diagnose the earliest layer that explains the defect. Later cleanup cannot
repair an earlier absence.

1. **Source boundary.** Missing or mixed facts cause plausible gap-filling,
   vague authorities, invented motives, and accidental changes of certainty.
2. **Writing relation.** Missing writer, reader, occasion, or intended change
   causes generic professional voice and prose that could fit any document.
3. **Meaning movement.** Missing controlling relation causes topic buckets,
   feature catalogs, repeated summaries, and sections that can be reordered
   without loss.
4. **Realization.** Weak paragraph and sentence relations cause announcement
   lines, fake transitions, hidden actors, abstract nouns, and uniform cadence.
5. **Harness and model defaults.** Broad instructions such as “be concise,”
   “lead with the answer,” or “make it scannable,” plus model-specific
   post-training, can amplify fragments, labels, lists, emphasis, or
   comprehensiveness.
6. **Surface residue.** Repeated wording and punctuation patterns remain after
   the document otherwise works. This is where a late “AI tell” audit belongs.

The order matters. Deleting `delve`, em dashes, or three-part lists at layer six
does not create a reader, a source, or an argument.

## Source boundary and claim ledger

For an edit, inventory information rather than preserving old sentences. Keep
the smallest internal ledger that prevents semantic drift:

```text
kind: publishable proposition | attributed judgment | constraint-only | unknown
reader question it can answer:
  source:
  scope and qualification:
  relation to adjacent claim:
  protected names, numbers, terms, or citation:
```

Do not output the ledger unless the user requests an audit. For short text,
hold it mentally. For a long or high-consequence document, externalize it near
the working artifact.

Source instructions such as “do not claim this guarantees an outcome” are not
publishable evidence that the outcome is absent, rejected, or unannounced.
They constrain what the document may say. Do not turn a test fixture's
prohibitions, an editor's warning, or a prompt's acceptance conditions into
reader-facing copy.

Transitions and completed metadata also make claims. “Therefore,” “this is
why,” “the project intends,” and “in practice” can introduce causality, motive,
or evidence that no source supports. Adding a year to a partial date, assigning
an unnamed actor, or turning two adjacent events into cause and effect does the
same. Compare implications and absences, not only nouns and numbers.

The requested document may itself demand an unsupported answer. A brief can ask
for “why the trial exists” while its sources state only an earlier observation,
a later action, and measurements. Do not make adjacency into motive. State the
observed sequence without the causal bridge, disclose that the source does not
establish the requested reason, or ask for the missing owning source.

## Movement before outline

An outline names containers. A movement explains why one part must follow
another. Choose the smallest movement the material warrants:

- **answer → reason → consequence** for decisions and task-oriented notes;
- **concrete observation → explanation → changed understanding** for
  explainers and reflective analysis;
- **problem → mechanism → constraint → decision** for design documents;
- **event → change → present state** for historical or incident narratives;
- **alternatives → decisive contrasts → choice** for comparisons;
- **prerequisite → action → observation → recovery** for procedures.

These are reasoning shapes, not templates. Combine or reorder them when the
actual relation requires it. A README may move from identity and boundary to
purpose, then to a credible first entry. A reference page may deliberately
avoid cumulative prose because each entry must be found independently.

## Voice as choices under conditions

Voice is not a stable adjective vector detached from situation. It appears in
recurring choices: what the writer notices, which relationships they make
explicit, how directly they claim, what they leave unresolved, how they move
between concrete detail and abstraction, and what rhythm the medium permits.

Use evidence in this order:

1. explicit user instructions and corrections;
2. samples by the same writer in the same or nearest medium and audience;
3. accepted project documents serving the same function;
4. a modest genre default.

Separate stable recurrence from topic, mood, one-off flourish, and copied
source language. Few-shot samples can help, but current models do not reliably
recover an everyday author's implicit style from a small set across all
genres; treat imitation as provisional and verify the output.

## Revision is ordered reconstruction

Read the draft several different ways rather than applying one large rewrite:

1. **As a verifier:** Does every material proposition, implication, and level
   of certainty survive comparison with the source?
2. **As the intended reader:** Can this reader place the document, follow its
   movement, and take the intended next action without hidden prerequisites?
3. **As an editor:** Which paragraph adds no new relation? Which transition
   merely announces? Which section is a catalog inherited from the source?
4. **Aloud:** Where does syntax become uniformly medium-length, artificially
   punchy, or too compressed to carry the thought?
5. **As a model observer:** Which visible move dominates by habit rather than
   function?

Change strong sentences only when an earlier layer requires it. Random
variation, slang, anecdotes, fake uncertainty, and deliberate errors do not
create humanity; they create another performance.

## Research basis

The causal model is deliberately narrower than any universal theory of model
style:

- OpenAI's public [model guidance](https://developers.openai.com/api/docs/guides/latest-model)
  warns that broad brevity instructions can make responses too brief and
  recommends specifying what a short answer must preserve.
- Anthropic's [prompting guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
  recommends positive format instructions and notes that prompt formatting can
  influence response formatting.
- The ACL 2025 study
  [From Lists to Emojis](https://aclanthology.org/2025.acl-long.1308/)
  found preference-model bias toward lists, links, bold, emojis, and verbosity,
  supporting separation of content quality from visible format.
- A large evaluation of
  [personal writing-style imitation](https://aclanthology.org/2025.findings-emnlp.532/)
  found stronger approximation in structured news and email than in nuanced
  blogs and forums.
- Community projects such as
  [Humanizer](https://github.com/blader/humanizer),
  [WRITING.md](https://github.com/Anbeeld/WRITING.md), and
  [write-like-me](https://github.com/Hiro-Inagawa/write-like-me) provide useful
  observed patterns, context questions, and corpus methods. Their surface bans,
  scores, and persistent voice machinery are evidence to test, not doctrine to
  copy wholesale.
