# Rossovia skill sources and loading

**Status:** host-agent design map. This is a source/ownership boundary, not a
loader implementation or a second skill catalog.

Directory ownership is defined separately in
[`ROSSOVIA-DIRECTORY-LAYOUT.md`](ROSSOVIA-DIRECTORY-LAYOUT.md). Do not infer a
filesystem root from a logical skill source until the current harness adapter
has supplied and verified it.

## Two instruction owners

There are two different readers at a project boundary:

| Surface | Reader | What it owns | What it must not become |
| --- | --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | an Agent working on the project | project rules, source authority, tests, and local development boundaries | Rossovia's host prompt or a worker skill catalog |
| `ROSSOVIA.md` | the Rossovia coordinating Agent | project-local pointers for resolving Workbench, design, dogfood, and skill-source decisions | project policy, a copied skill body, or a worker instruction file |

The host may read both surfaces for their distinct purposes. A worker receives
only the exact project facts and skills needed for its bounded task. It does
not inherit the host's complete configuration or the repository's full skill
collection by accident.

The same distinction applies to other harnesses: their global instructions,
project instructions, packaged skills, and user skills are separate surfaces.
The filename is a harness adapter choice; the ownership relation is the stable
part.

## Source families and audiences

The host policy exposes separate source lists for the Main Agent and workers.
Each list has two package-owned built-in tiers plus a separate user-custom
source. The worker list is deliberately smaller:

| Family | Main Agent | Worker | Meaning |
| --- | --- | --- | --- |
| **Pick skills** | host-package-owned | worker-package-owned | a curated subset of the corresponding built-in package; it is not a user source and cannot contain user-authored skills |
| **Built-in skills** | host-owned list | worker-owned compact list | stable capabilities supplied by the package; not every skill in this repository |
| **User-custom skills** | allowed and discoverable | not granted by default | user-authored procedures; a worker receives one only after an explicit capability policy grants it |

The root [`skills/`](../../skills/) directory is the installable methodology
collection for this repository. It is not automatically the Main Agent's
built-in directory, and it is never automatically the worker's complete list.
The host/runtime package owns both its `picked/` and `builtin/` exports; the
worker package owns its own two exports. User-custom is a separate source and
cannot be smuggled into either package directory. Until a harness adapter
supplies a concrete root, the Settings surface reports the logical source
locator and ownership rather than inventing a filesystem path.

The target home layout gives only the user-owned half of this mapping a
concrete place: `~/.rossovia/skills/custom` contains Main-Agent user-authored
skills. Picked and built-in skill bodies remain package-owned. A project or
user policy may choose which package export is active, but that selector cannot
add a custom body to `picked/` or `builtin/`.

The Rossovia host configuration is therefore a projection of policy, while the
active harness remains the authority for actual discovery, precedence, and
body loading.

## Visibility is a loading decision

Every exposed skill has one context-timing mode. These modes describe what the
agent can discover, not which source is authoritative:

| Mode | What enters the initial context | When the body is read |
| --- | --- | --- |
| **Always-visible** | a compact name/description entry in the relevant Agent catalog | only when the Agent activates it; full `SKILL.md` is not resident by default |
| **On-demand** | a pointer or explicit activation affordance | after the Agent or host selects the skill for this action |
| **Searchable** | bounded metadata in a searchable catalog | after a search match is selected, then the exact source is re-read |

`Always-visible` is not “always load the whole skill”. `Searchable` is not
permission to scan private directories. A source can be visible in a catalog
without granting its tools, effects, or user-specific data.

The context-engineering method supplies the timing judgment: name the action,
source, receiver, and moment the information changes action, then choose the
smallest native delivery path. The skill-engineering method supplies the
expression and behavior tests. Neither method turns a timing mode into a
universal directory convention.

## Precedence and worker delivery

For the Main Agent, the conceptual precedence is:

```text
host instructions (ROSSOVIA.md + host policy)
  → host-package picked skills for this task
  → host-package built-in skill catalog
  → explicitly granted user-custom skill search
```

For a worker:

```text
receiver-specific task contract
  → worker-package picked skills
  → worker-package built-in compact catalog
  → no user-custom skills unless capability policy says otherwise
```

This is a delivery order, not a second authority hierarchy. A project rule
still belongs to `AGENTS.md`/`CLAUDE.md`; a skill's method still belongs to its
own source; Workbench worker/provider/model selection still belongs to host
worker policy. The Main Agent composes the prompt and the adapter enforces the
actual eligible source set.

Before dispatch, a worker context should be reconstructible from:

1. the task object, effect boundary, non-goals, and return contract;
2. the exact picked skill IDs and source digests, if any;
3. the worker built-in catalog entries that were visible; and
4. the fact that user-custom sources were either granted or deliberately not
   granted.

Do not send a role title, “work cell” jargon, or an entire host history unless
it changes the worker's next action. Define any necessary term at first use by
the object, boundary, and immediate relevance.

## What the reference harnesses contribute

These references are supporting evidence, not imported policy:

- [Vercel Eve project layout](https://github.com/vercel/eve/blob/main/docs/reference/project-layout.md)
  gives the root agent and each subagent an explicit `agent/skills/` surface,
  with skills loaded on demand rather than mounting the whole authored tree.
- [Eve's default harness](https://github.com/vercel/eve/blob/main/docs/concepts/default-harness.md)
  separates a compact declared skill capability from the `load_skill` action;
  loading instructions does not itself add execution tools.
- [DeepSeek Harness skill subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)
  keeps a provider registry separate from the consumer catalog, exposes only
  name/description metadata initially, and rechecks policy before returning a
  full skill body.
- [DeepSeek filesystem provider](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md)
  demonstrates separate project, custom, and user roots rather than one
  undifferentiated directory.
- [Pi Skills](https://pi.dev/docs/latest/skills) and [Claude Code's skill
  guidance](https://code.claude.com/docs/en/features-overview) both keep
  specialized procedures available for explicit activation while retaining
  project instructions as a separate concern.
- [OpenAI's Codex skills catalog](https://github.com/openai/skills) shows a
  distinct system/bundled collection rather than treating every repository
  skill as automatically installed.
- [Hermes' skills guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md)
  separates bundled/optional skills from explicit activation and gives its
  catalog/install surface its own configuration boundary; its
  [configuration guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/configuration.md)
  keeps provider/model settings separate from skill declarations.
- Local adapter evidence lives in
  [`packages/work-cell/src/integrations/ai-sdk/`](../../packages/work-cell/src/integrations/ai-sdk/),
  [`apps/autonomy/src/worker-policy.ts`](../../apps/autonomy/src/worker-policy.ts),
  [`skills/context-engineering/SKILL.md`](../../skills/context-engineering/SKILL.md),
  and [`skills/agent-delegation/SKILL.md`](../../skills/agent-delegation/SKILL.md).

Hermes is an additional comparison target, not a Rossovia authority. Until
its exact local or pinned source is supplied, do not turn a remembered Hermes
convention into a Rossovia default.

## Settings projection

Settings shows, for both audiences:

- source family and logical source reference;
- visibility mode;
- whether the source is declared, unavailable, or not granted;
- the body-loading boundary; and
- the concise audience boundary.

It does not show full skill bodies, credentials, private paths, provider
sessions, or an invented filesystem root. Editing a source list is a future
host-policy operation, not a browser-side preference. A new editable source
must first have an owning config file, precedence, restart/reload semantics,
and an adapter test proving that the selected Agent actually receives the
intended projection.

## Reopen signals

Reopen this design when:

- a worker receives a project `AGENTS.md` as if it were a skill or receives a
  skill body with no activation evidence;
- Main Agent and worker catalogs are identical despite different audience
  boundaries;
- a user-custom skill reaches a worker without an explicit capability grant;
- a searchable catalog exposes private source paths or stale metadata;
- the Settings projection claims a source is available but the active harness
  cannot discover or re-read it; or
- a harness-specific config file (including Hermes) reveals a stronger
  source/precedence rule that this map has not incorporated.
