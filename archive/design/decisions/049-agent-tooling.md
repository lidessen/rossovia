# Decision 049 — Agent Tooling as an independently usable operating method

**Status:** accepted first slice
**Date:** 2026-07-23
**Human mandate:** provide one skill that can operate and tune Codex, Claude
Code, Cursor, and similar coding-agent harnesses; include evidence-based
reduction of harmful tooling, headless CLI use, and a local documentation
capability cache without depending on Rossovia Workbench.

## Concrete need

Coding-agent environments accumulate instructions, skills, hooks, MCP servers,
plugins, memories, permissions, and tool choices. Their cost is not proportional
to installed count: an unused on-demand skill can be cheap, while one
always-loaded instruction, fragile tool description, or failing hook can distort
many tasks. Tool selection is itself sensitive to tool descriptions and model
behavior, as shown by the 2025 EMNLP study
[Tool Preferences in Agentic LLMs are Unreliable](https://aclanthology.org/2025.emnlp-main.1060/).

The same harnesses also expose valuable non-interactive agent loops:
[Codex uses `codex exec`](https://learn.chatgpt.com/docs/non-interactive-mode),
[Claude Code uses `claude -p`](https://code.claude.com/docs/en/headless), and
[Cursor Agent exposes print mode](https://docs.cursor.com/en/cli/reference/parameters).
These are not raw model calls: they retain harness-owned context, tools,
permissions, sessions, and output semantics. They can therefore execute bounded
work and form matched normal/lean comparisons, but their flags and guarantees
change faster than a stable methodology skill should.

## Decision

Add an independently installable `agent-tooling` skill. It owns one recurring
judgment: for a concrete task and installed coding-agent harness, select and
tune the execution surface that preserves sufficient capability with the least
avoidable burden.

The skill covers:

- interactive, fresh headless, resumed, clean/bare diagnostic, and isolated
  profile or workspace forms;
- current capability discovery for Codex, Claude Code, Cursor, and later
  harnesses;
- tool, permission, output, persistence, and context shaping;
- structured completion and runtime evidence capture; and
- evidence-based narrowing, disabling, or removal of net-negative instructions,
  skills, hooks, MCP servers, plugins, rules, memories, and tools.

It expresses P16 as Primary, with P02, P09, and P15 as Supporting principles.
P16 owns the fit between the real actor and operating form; P02 requires live
runtime and documentation evidence; P09 distinguishes always-present,
on-demand, and inactive tooling; P15 permits only the smallest transition that
preserves the task's hard constraints.

## Form and ownership

| Form | Owns | Does not own |
|---|---|---|
| `agent-tooling` skill | operating-form selection, burden judgment, safe invocation method, and tuning verification | user intent, vendor truth, execution authority, or semantic acceptance |
| `scripts/tooling-cache.mjs` | deterministic version/help probes, cache placement, structural validation, digests, and freshness projection | interpreting help text, deciding capability, or evaluating quality |
| current official documentation and installed CLI help | vendor-specific command, flag, output, permission, and configuration evidence | cross-tool doctrine |
| platform user cache | rebuildable machine-local observation and compact capability projection | portable setup, credentials, sessions, or fact authority |
| Agent or human verifier | whether an output or tuned environment is correct for the task | mechanical command completion |

The cache belongs to the standalone skill rather than Rossovia Workbench. It
uses an explicit override, XDG cache, or the operating system's user-cache
location. The script stores raw version/help evidence and a small
source-linked capability projection. It never stores credentials,
authentication material, sessions, transcripts, repository content, prompts,
or user data. A binary-version match does not promote unrevalidated
documentation to current fact.

## Boundaries

- `agent-environment` owns approved non-secret desired setup, reconciliation,
  and cross-device migration.
- `improve-agent-workflow` owns diagnosis while a project-level Agent failure
  has no known responsible surface.
- `context-engineering` owns the general information-delivery architecture.
- Work Cell or another orchestrator owns delegation and multi-agent
  composition.
- `model-evaluation` owns reusable capability claims across models or execution
  profiles.

`agent-tooling` enters when the installed coding-agent tool layer is the named
actor or owner. It must not grow into a universal vendor wrapper, configuration
manager, orchestrator, or model gateway.

## Alternatives rejected

| Alternative | Reason |
|---|---|
| Extend `agent-environment` | Portable desired state and day-to-day tool operation have different lifetimes and decisions. |
| Keep the name `harness-hygiene` | It makes one maintenance path appear to be the whole object and requires unexplained jargon. |
| Name it `simplify-agent-environment` | It overlaps the existing environment skill and excludes headless operation and capability shaping. |
| Name it `agent-tools` | It can be mistaken for a catalog of individual model-callable tools rather than the surrounding tool layer. |
| Put current vendor commands in `SKILL.md` | It makes a stable method track mutable documentation and spends context on irrelevant tools. |
| Put the cache in Rossovia Workbench | It breaks independent installation and creates an unrelated runtime dependency. |
| Build a universal harness CLI | No repeated mechanical invariant yet justifies another wrapper or protocol. |

## Verification and reconsideration

The first slice is supported only when:

1. the skill carries a valid Sequence snapshot and installs independently;
2. the zero-dependency script probes all three named harnesses without invoking
   a model, distinguishes an absent binary from a failed version probe, and
   writes only to an explicit or platform cache;
3. a valid capability projection round-trips through `put` and `show`, while an
   invalid projection fails closed;
4. an action probe chooses a faithful headless form for a bounded task;
5. a burden probe narrows or disables an evidenced net-negative surface rather
   than deleting by installed count; and
6. a boundary probe routes migration, project workflow diagnosis,
   orchestration, and reusable model evaluation to their owners.

Reconsider the script form only if several tools require the same failing
adapter logic, current CLI help cannot establish needed evidence, or repeated
operations require a supported machine interface. Add no daemon, database, or
cross-tool schema merely because another vendor field appears.
