# Workspace Skill Corpus Inventory

**Stage:** cross-project concrete inventory.
**Scope:** every discoverable `SKILL.md` under `/Users/lidessen/workspaces`,
excluding the collection's own entries already listed in
`regeneration/skill-inventory.md`.
**Rule:** project-local operations are evidence for possible methods, not
automatic additions to the collection or the sequence.

## Classification vocabulary

- **Shared expression source** — a cross-context method worth comparing during
  regeneration; this is not yet a decision to retain it as a skill.
- **Project-local method source** — a useful method whose current evidence is
  limited to one product or operating environment.
- **Runbook / adapter** — binds commands, vendors, tools, credentials, or
  release surfaces; it belongs with its project unless a separate cross-context
  function is demonstrated.
- **Historical duplicate** — a parallel or divergent copy that must be used as
  source evidence, not maintained by copying changes between repositories.

## Agent Worker

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `agent-run` | Runbook / adapter | Exposes direct and local-session calls to a particular agent runtime. | The distinction between one-shot execution and durable coordination; not a collection methodology. |
| `article-refactor` | Historical duplicate | Reconstitutes source text through inventory, skeleton, and inline work. | Compare with this repository's version as evidence for the P07 probe. |
| `attention-driven` | Shared expression source | Keeps a main agent on load-bearing direction while bounded workers handle detailed execution and return evidence. | Preserve the context stratification, delegation envelope, and slow/fast loop observations; discard its claim to be a universal entrypoint. |
| `development-delegate` | Runbook / adapter | Operates `aw delegate` and judges a durable worker result by evidence handles. | Separates decision ownership from delegated execution and evidence acceptance; tool syntax stays project-local. |
| `technical-article-writing` | Historical duplicate | Builds an argumentative article from claim through revision. | Compare its divergence from this repository's version before writing a regenerated writing skill. |
| `writing-profile` | Historical duplicate | Maintains an individual writing-preference model across sessions. | Compare construct choices and consumer contract; do not copy state formats by default. |

## Agent Workspace

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `agent-leader` | Project-local method source | Assigns independent work to agents, integrates results, and verifies claims. | Multi-agent coordination is real; the absolute “leader never acts” rule is a contingent and often harmful form. |
| `ai-news-daily` | Runbook / adapter | Repeats a bounded daily research and editorial routine. | A domain workflow, not a general principle. |
| `doc-review` | Project-local method source | Uses independent product, technical, and UX reviews before synthesis. | A concrete committee expression; retain the need for selective perspectives, not fixed roles/models. |
| `fix-proxy` | Runbook / adapter | Repairs a version-sensitive OpenClaw proxy configuration. | None for the shared canon; preserve in the owning environment. |
| `todo` | Runbook / adapter | Stores and updates a task list. | Basic task tracking does not earn a general methodology skill boundary. |
| `vercel` | Runbook / adapter | Runs vendor deployment commands. | Vendor operations belong to deployment documentation or a Vercel-specific skill. |

## AgentParty

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `agentparty` | Runbook / adapter | Operates a particular cross-organization communication channel and wake model. | The difference between role, residency, and wakeability may inform coordination design; CLI protocol remains local. |
| `verify-agentparty-change` | Project-local method source | Requires behavior-level verification against each changed delivery surface. | Strong evidence for end-to-end acceptance: editing and unit tests are insufficient where the user path crosses deployment and release boundaries. |

## Lidessen

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `setup-my-mac` | Runbook / adapter | Installs a personal macOS development environment. | No shared-method candidate; it is an environment bootstrap script guide. |

## Moniro

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `agent-e2e` | Project-local method source | Discovers risk-led user flows, records semantic intent, and verifies them in a browser. | Risk-driven test selection and user-visible semantic contracts; selector syntax and YAML are local mechanisms. |
| `agent-worker` | Runbook / adapter | Creates and operates sessions across several agent backends. | May provide historical coordination evidence, but is a product guide. |
| `authoring-skills` | Shared expression source | Designs skill content for progressive disclosure, discoverability, and appropriate degrees of freedom. | Strong historical source for authoring form; its principles must be mapped to the sequence rather than made a parallel canon. |
| `dive` | Shared expression source | Turns questions into cited findings through layered investigation and explicit uncertainty. | A distinct research/understanding function that must be compared with execution verification before selection. |
| `engineering` | Shared expression source | Reframes technology choices as problem, constraints, reversibility, and trade-offs. | Problem-first analysis and reversible-versus-irreversible attention; likely expressions of existing P04/P05/P15. |
| `frontend-init` | Runbook / adapter | Initializes a prescribed frontend toolchain. | Toolchain choice is not a cross-context methodology. |
| `housekeeping` | Project-local method source | Reduces accumulated structural friction by targeted maintenance. | Entropy, discoverability, and dependency cost may be expression probes for P15, not yet a new skill boundary. |
| `memory` | Shared expression source | Preserves only future-decision-relevant learning across sessions. | Direct cross-project expression of P12 and a useful filter against memory noise. |
| `orientation` | Shared expression source | Establishes local context and unknowns before action without pretending to finish investigation. | A possible read-only reconnaissance mode; compare with harness and research before granting an independent boundary. |
| `prompt-lab` | Project-local method source | Treats agent instructions as hypotheses subject to compliance, decay, and adversarial experiments. | A useful empirical test method for skills and harnesses, likely an expression of P03/P08 rather than a new general principle. |
| `refining` | Shared expression source | Shapes a change so a bounded human reviewer can understand, verify, and risk-assess it. | Strong expression of finite human attention and action-enabling form; compare with P10/P16. |
| `setup` | Runbook / adapter | Bootstraps Moniro's agent system. | Setup sequence is project-local; compare only its minimal persistent artifacts. |
| `validation` | Shared expression source | Chooses the smallest sufficient evidence loop for a change and remembers results. | The clearest precursor to an evidence/verification skill family; compare overlap with `dive`, `evidence-driven`, and end-to-end verification. |

## Sikong (historical)

| Skill | Classification | Functional reading | Extraction value |
|---|---|---|---|
| `sikong` | Runbook / adapter | Operates a durable task-coordination CLI and its acceptance checks. | Evidence for task-state and verifier interfaces; commands and workflow names remain Sikong-local. |

## Cross-project observations, not decisions

1. **Evidence work recurs in two different forms.** `dive` asks “what is true
   here?”; `validation`, `agent-e2e`, and AgentParty verification ask “has a
   change met its user-visible acceptance?” Both reject assertion without
   evidence, but their artifacts and stopping conditions may justify separate
   expressions.
2. **Coordination repeatedly separates steering from execution.**
   `attention-driven`, `development-delegate`, `agent-leader`, and document
   review all distinguish task direction, independent work, synthesis, and
   acceptance. The enduring function must be separated from any single
   daemon, CLI, model roster, or mandatory-main-agent rule.
3. **Continuity has three distinct moves.** `orientation` establishes present
   context, `memory` preserves learning over time, and `harness` shapes what
   is loaded for action. Similar vocabulary does not prove that they should be
   one skill.
4. **Many specialized workflows are not universal methods.** Deployment,
   browser YAML, frontend toolchain, proxy repair, task lists, and operating
   a specific runtime should be rehomed as local documentation, commands, or
   product skills unless future evidence shows a cross-context decision gate.
