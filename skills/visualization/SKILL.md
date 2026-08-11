---
name: visualization
description: >-
  Use a source-linked Project Lens to introduce the current state of a real
  repository or explain change impact against an explicit base revision. Use
  when asked to "visualize/explain this repo", "show current project state",
  "show what changed by responsibility", "用可视化介绍这个项目", "展示项目现状",
  or "按责任解释这次变更" and the host provides the
  human-agent-visualization Project Lens capability. Do not use for generic UI
  design, a decorative dependency graph, durable project cognition, or a claim
  that directory structure is accepted architecture.
argument-hint: "[current | change] [repo path] [question]"
---

# Visualization

## Principle expression

**Primary:** P16
**Supporting:** P09, P13, P14

## Scope

Own one recurring Agent judgment: **which source-backed Project Lens mode and
inspection scope will let a person understand a real repository now, and what
must remain unavailable?**

This Skill selects sources, an explicit comparison base, responsibility scopes,
and the question to present. It then calls and inspects the host's Project Lens.
It does not extract Git state, generate or validate bundles, implement browser
interaction, own repository facts, or accept a responsibility change. Those
mechanics remain in `experiments/human-agent-visualization`.

Use the host Sequence and matching interpretations when available; otherwise
use this package's read-only [Sequence projection](references/sequence.md).
Read only P16, P09, P13, and P14.

## Start

```text
Repository and current revision:
Audience and question:
Mode: current | change
Accepted design or architecture sources:
Exact responsibility section and explicit implementation/test scope, if change:
Explicit base revision, if change:
Available Project Lens root and browser capability:
```

If the host does not provide the Project Lens feature, report the missing
capability. Do not simulate a visualization in prose or copy its extraction
logic into this Skill.

## Method

1. **Choose the mode from the user's decision.** Use `current` to restore what
   the project is now; it is the Lens default. Use `change` only when the user
   needs impact against a named base. Change remains a second mode inside the
   same Project Lens, never a new top-level page or control plane.
2. **Investigate before invoking.** Read the repository's purpose and governing
   instructions, then only the accepted design, implementation, and verification
   sources needed for the question. Pass exact repository-relative paths as
   focus sources. A filename, directory, import, or visual position cannot
   establish architectural ownership.
3. **Keep the responsibility boundary source-linked.** For change mode, identify
   an exact heading in an authoritative design source plus explicit code scopes
   and verification files. If no authoritative section exists, omit the
   responsibility input and require the Lens to show `unavailable`.
4. **Require an explicit base for change.** Use a base revision selected by the
   user, task, or owning integration record. Never infer acceptance from “last
   run,” wall-clock recency, or a nearby branch name. An absent or incompatible
   base remains visible as comparison unavailable.
5. **Call the feature, not a duplicate implementation.** From the Project Lens
   root, run its declared `introduce` command. A responsibility is supplied as
   JSON; the first item is the Agent-selected inspection priority, not a fact
   ranking:

   ```sh
   bun run introduce -- \
     --repo /absolute/path/to/repo \
     --intent understand \
     --question "这个项目现在是什么？" \
     --focus "README.md,DESIGN.md"

   bun run introduce -- \
     --repo /absolute/path/to/repo \
     --intent change \
     --question "这个责任相对基线发生了什么？" \
     --base <explicit-commit> \
     --responsibility '{"id":"lens","title":"Project Lens","design":{"sourceRef":"DESIGN.md","heading":"Project Lens"},"implementationScopes":["src/lens"],"verificationRefs":["tests/lens.test.js"]}'
   ```

   Multiple `--responsibility` arguments are allowed. Keep deterministic Git
   extraction, section location, comparison, bundle generation, validation, and
   UI rendering inside the feature.
6. **Inspect the rendered result.** Confirm the Lens opens in current-state mode.
   For change mode, switch using the adjacent in-Lens control and check the
   order: current/base/dirty/generated/compatibility, then changed or disputed
   responsibility, then unresolved. At 390px it must remain one readable column
   without horizontal canvas dragging.
7. **Judge each layer separately.** `design says` quotes the exact retained
   section; `code observation` reports deterministic paths inside the explicit
   scope; `reconciliation standing` is a rebuildable projection that may remain
   disputed. Trace at least one boundary to source path, line range, and
   revision. Do not turn a successful render into behavior proof or architecture
   acceptance.
8. **Return the usable handoff.** Provide the generated URL, current and base
   identities, dirty state, comparison compatibility, highlighted and unresolved
   responsibilities, exact sources inspected, browser viewport checked, and the
   event that requires regeneration.

## Routing boundaries

- Form or review an interface's visual direction with `visual-design`.
- Build reusable, persistent cross-task project understanding with
  `project-cognition`.
- Review a proposed code change with `code-review`.
- Do not create a backend, watcher, graph database, security gate, Workbench
  mutation, or second architecture source for this action.

## Completion standard

The result is ready for human inspection only when the generated bundle passes
the feature's checks, the default current-state mode remains intact, the change
mode uses an explicit or visibly unavailable base, the 390px reading order is
verified, and every highlighted responsibility can be traced to exact source or
honestly remains unavailable. This run demonstrates compatible use; it does not
by itself prove that the Skill caused better comprehension.
