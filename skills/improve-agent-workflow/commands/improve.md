# Improve an Agent Workflow

Implement one evidence-backed improvement to the target project's agent-facing
work system. Preserve unrelated user changes and the project's existing
authority boundaries.

1. Establish the baseline: target agent and runtime, ordinary entry path,
   required action, observed failure, governing source, hard constraints, and
   a disconfirming observation.
2. Inspect the smallest relevant path from intent to action. Read
   `../references/agent-work-model.md` only when the owner is ambiguous or the
   failure crosses several surfaces.
3. Select the principal contradiction and its existing owner. Prefer changing
   that owner over adding a new skill, instruction, hook, wrapper, dashboard,
   or workflow.
4. If the owner is a project skill, read
   `../references/skill-surface.md` before editing. If the problem is context
   delivery, tools, verification, or handoff, change that surface directly and
   do not rewrite skill prose as a proxy.
5. Apply the smallest complete change, including directly affected callers,
   examples, schemas, or verification surfaces. Do not broaden into general
   project cleanup.
6. Re-run the representative task through the ordinary entry path when safe.
   Run one nearby task that should retain its behavior or remain outside the
   changed trigger. Use structural checks only as supporting evidence.
7. Inspect the diff for new concepts, duplicate sources, hidden vendor
   assumptions, and accidental authority transfer. Remove any surface that does
   not change the named agent action.

Report the changed owner and paths, action and boundary evidence, remaining
uncertainty, and any verification or acceptance reserved for a human. If safe
ordinary-path verification is unavailable, label the behavior claim
`inconclusive`; do not substitute confidence in the prompt.
