# Work Cell Expression Brief

**Status:** pilot companion protocol
**Authority:** [aesthetic practice pilot](../decisions/017-aesthetic-practice-pilot.md)

Use this brief only when a concrete Aesthetic Case needs bounded execution or
review. It maps the case into the existing Work Cell contract; it does not add a
visual runtime, hidden prompt authority, or automated aesthetic acceptance.

| Aesthetic Case field | Existing Work Cell carrier | Boundary |
|---|---|---|
| object, audience, relation, and negative boundary | `intent` plus `dna.baseInstructions` | do not turn a seed into a universal instruction |
| source files and references | `workspace.readPaths` and case links | cite only readable material; references remain evidence |
| actual production tools | `dna.capabilities` and `capabilitiesRequired` | declare a capability only if the driver/environment really supplies it |
| bounded output | `scope`, `workspace.writePaths`, and `acceptance` | a cell cannot expand to branding or unrelated UI |
| work control | `budget`, optional Work Estimate and Budget Envelope | no visual work receives an invented cost projection |
| study and human review | structured submission/evidence plus a case study | the cell's completion is proposed evidence, never aesthetic acceptance |

## Base-instruction shape

```text
Read the named Aesthetic Case and its sources. Distinguish observed artifact
facts from inferred preference. Make the smallest change or review that lets
the stated audience act. Preserve the case's negative boundary and report an
unavailable tool/capability rather than simulating it. Return sources,
unresolved observations, and a human review question.
```

For a visual asset, declare the real image-generation, browser, rendering, or
accessibility capability. If none exists, use the Cell for direction/review or
return a limitation. Never label a generated image as accepted merely because a
cell's mechanical checks pass.
