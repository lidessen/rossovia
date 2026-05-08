# Concept document template

Copy the content below into `concepts/<slug>.md` when starting a new
reframe. Fill in target/paradigm in the frontmatter; leave section
bodies empty until each phase is reached.

The slug is a short kebab-case identifier (e.g. `ai-native-crm`,
`agent-first-ide`, `voice-ticketing`). One slug per concept; never
reuse.

---

```markdown
---
target: <human-readable name, e.g. AI-native CRM>
paradigm: <new paradigm name, e.g. AI-native>
status: active
opened: YYYY-MM-DD
---

# Concept: <target>

One-paragraph framing. What domain are we redefining, and which
paradigm are we redefining it under? Why does the traditional
reference design not serve this case?

## Essence

3-5 abstract functions the target domain performs under any paradigm.
Each followed by one sentence of justification ("why is this essence
rather than artifact?").

- **<function 1>** — <justification>
- **<function 2>** — <justification>
- ...

## Paradigm Primitives

The operationally concrete building blocks the new paradigm offers.
Each must be specific enough that a skeleton can be expressed in it.

- <primitive 1>
- <primitive 2>
- ...

## Skeleton (current: vN)

Current load-bearing model, expressed using only the primitives above.
For each load-bearing piece, link back to the essence function it
serves and the primitive(s) it rests on.

<details>
<summary>Earlier versions (v1 … v(N-1))</summary>

Prior versions stay here, collapsed. Don't delete — the evolution
trail is part of the value.

### v1
<original draft>

### v2
<second draft>

</details>

## Stress Tests

Append-only log. Each entry: which traditional crutch was removed,
what happened, and the resolution.

- **<crutch removed>** (YYYY-MM-DD) — <held | bent | collapsed>.
  <what happened, what changed in the skeleton, or which boundary
  this revealed>

## Transfer Log

Mature domains mined for analogical patterns. For each: source
pattern, the abstract problem it solved, the translation.

- **<source domain> → <here>** — <source pattern>; abstract problem:
  <X>; translated form: <Y>.
- **<source domain> — considered, not taken** — <reason>.

## Flesh Plan

User-facing surface as projection of the skeleton. For each flesh
element, name the skeleton state it projects and the user need it
serves.

- **<UI element>** — projects: <skeleton state>; serves: <user need>.

## Comprehension Tests

Append-only log. Each entry: artifact tested (narration / wireframe /
mock / prototype), users involved, what was observed, diagnosis
(flesh / skeleton / essence problem), feedback path taken.

- **<artifact>** (YYYY-MM-DD) — users: <who>; observation:
  <what happened>; diagnosis: <flesh | skeleton | essence>;
  feedback: <revised Phase N>.

## Open Tensions

Unresolved questions worth surfacing rather than papering over.

- <tension 1>
- <tension 2>

## Session Log

Date-stamped chronological log of significant moves. A new agent
should be able to read this and infer the current state.

- YYYY-MM-DD — <what changed in this session>
- YYYY-MM-DD — <what changed>
```
