# Runtime Capability Map

Build this map before assigning a project artifact to a context layer. Do not
transfer an answer from one agent product to another.

| Capability | Evidence type | Observed or documented result | Unknown or boundary |
|---|---|---|---|
| Always-present instruction surface | runtime observation or official host documentation | Which exact path is loaded, at what moment, and for which agent? | Does a similarly named file load elsewhere? |
| Activated skill discovery | runtime observation or official host documentation | Which metadata is visible and how is an entrypoint selected? | Does a local skill directory take precedence? |
| On-demand resource loading | runtime observation or official host documentation | Which referenced files can be reached after activation? | What nesting or path rules apply? |
| Hooks or mechanical guards | runtime observation or official host documentation | Which events and actions are actually supported? | Are hooks prompt-only, blocking, or unavailable? |
| Durable handoff or memory | project artifact and runtime observation | Where can a future agent discover current state and decisions? | What is merely a UI or session projection? |

Use only evidence that identifies the actual runtime and version. A missing row
is an unknown capability, not a default affirmative answer.
