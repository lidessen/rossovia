# Rossovia configuration and Settings surface

This document defines the first configuration boundary for the local
Workbench. It is a design map, not a second runtime policy and not a promise
that every setting is editable yet.

For the host Agent's project-local entry, read [`ROSSOVIA.md`](../../ROSSOVIA.md).
For the separate skill-source and loading model, read
[`ROSSOVIA-SKILL-SOURCES.md`](ROSSOVIA-SKILL-SOURCES.md). The project
[`AGENTS.md`](../../AGENTS.md) remains the instruction source for an Agent
working on this repository; it is not the Rossovia host prompt.
For user-home and project-local ownership, read
[`ROSSOVIA-DIRECTORY-LAYOUT.md`](ROSSOVIA-DIRECTORY-LAYOUT.md); the current
runtime still uses `~/.rosso` through `ROSSO_HOME`, while the public target
layout is `~/.rossovia` pending an explicit migration.

## What the user is trying to do

The Settings surface should answer three questions without opening a terminal:

1. Which workers and providers are usable right now?
2. Which model, reasoning policy, and credential availability will a new run
   actually use?
3. Which user preferences are currently in effect, and where do they apply?

The surface should not expose API keys, copy transient provider state into a
new preference file, or let a browser invent a worker card.

## Ownership map

| Concern | Current owner | Settings responsibility |
| --- | --- | --- |
| Worker id, provider, model, reasoning default, labels, availability | host worker policy (`apps/autonomy/src/worker-policy.ts`) | read and explain the effective projection |
| Credential value | host environment / provider adapter | show only configured or unavailable; never read the value into UI |
| User defaults and project-scoped defaults | Workbench preferences (`config/preferences.json` and `preferences.ts`) | read the applicable projection; future edits must use the preference command semantics |
| Provider routing and fallback order | owning host/runtime policy | display the current source and route an edit there; do not duplicate policy in the browser |
| Observer enablement and worker selection | UI server launch options | display current process setting; changing it belongs to the next local restart |
| Workflow review opinions | `state/workflow-reviews.jsonl` | read-only list; no inbox, queue, or review lifecycle |
| Main Agent and worker skill sources | host skill-source policy and harness adapter | project separate source families and visibility; never treat the root `skills/` collection as an automatic worker catalog |

This keeps mechanism, adapter, and policy separate: the UI explains the
policy that is already in effect, while the runtime remains the authority that
resolves a worker and provider.

## Information architecture

`对话` remains the only top-level daily entry. Observer records and Settings
are secondary system surfaces in the Workbench rail:

```text
对话
总览 / 任务 / 项目
系统
  观察记录
  设置
```

The observer surface is a read-only review ledger. Each record shows:

- standing: recorded, query gap, or runner failed;
- observer worker and recorded time;
- the exact Task/attempt subject and evidence references;
- the review opinion and its limitation;
- an explicit conversation relation when one was recorded;
- otherwise, “未记录直接对话关联”, never a guessed “最近对话”; and
- the processing standing from an existing ordinary Task when such a relation
  is available; otherwise “尚未处理” rather than a guessed disposition; and
- a draft-only action that opens the ordinary conversation with a proposed
  “process this review” Task prompt. It does not send, mark read, or mutate the
  original record.

Review processing remains an ordinary Task prompt: the user may ask Rossovia
to read recent observations, avoid duplicates, and record `read/commented`,
`routed`, `deferred`, or `no change`. These are decisions in the Task result,
not a new review database state machine.

## Configuration projection

The first Settings projection is deliberately read-only for execution policy:

```text
settings
  provider cards
    provider id
    worker ids
    model ids
    credential availability (configured / unavailable)
  applicable preferences
    id, scope, statement, reopen condition
  observer
    enabled, worker id, review source
  skill sources
    Main Agent: package Pick / package built-in / user-custom
    Worker: package Pick / package built-in / user-custom (not granted by default)
    visibility: always-visible / on-demand / searchable
  source and boundaries
```

The browser receives no key, token, provider session, raw environment dump, or
private config path. A missing credential is a visible unavailable state, not
an invitation to infer another provider or silently fall back.

Development mode is a separate host/runtime concern. The intended local
launcher contract is `--dogfood`: when the local Rossovia runtime is available
and this mode is enabled, the ordinary read-only observer is enabled as part of
the same mode. External harnesses should then observe or provide a bounded
fallback, not compete as a second producer. When dogfood is unavailable or
disabled, the active external harness follows the
[Rossovia Development Skill](../../skills/rossovia-development/SKILL.md) and
uses ordinary delegation with independent design, implementation, and
verification contributions where warranted. This paragraph is a design
projection; the active launcher help remains the command authority.

Future editable Settings should be added in this order:

1. edit a user preference by calling the existing preference owner, with
   explicit scope and receipt semantics;
2. edit a non-secret runtime provider reference through a versioned host config
   source, preserving worker-card validation and restart/reload semantics;
3. add credential setup only through the host environment/provider adapter,
   with presence checks and no secret round-trip through the browser.

Do not put provider order, model fallback, or API keys into
`preferences.json`. If a new provider config source is needed, it must first
become the owning runtime policy and expose a read-only projection that the UI
can verify.

Skill source settings follow the same rule, but have a separate audience
boundary. The host Agent has its own project entry (`ROSSOVIA.md`) and source
policy. A worker receives a compact, receiver-specific projection; it does not
inherit `AGENTS.md`, the host's complete skill list, or user-custom skills by
default. Pick is a curated package-owned subset of built-in skills, not a user
directory. Settings can show this distinction, but it does not edit skill
bodies or silently grant a worker a source.

## Review and reopening signals

Reopen this design when one of these is observed:

- a user cannot tell which worker/provider a new Task will select;
- the UI reports a provider as configured while the runtime rejects its
  credential or model;
- an observer review cannot identify its attempt or its conversation cause;
- a Settings edit changes a preference but not the next effective projection;
- a provider route requires secrets or a process restart that the UI does not
  explain.

The next implementation slice must be a source-owned change for the exact gap,
not a generic “settings framework”.
