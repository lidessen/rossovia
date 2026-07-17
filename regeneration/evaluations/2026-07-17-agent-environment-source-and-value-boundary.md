# Agent Environment Source and Value Boundary

**Status:** supported by an isolated classifier repair probe, two neighboring
behavior probes, and structural checks; cross-harness live application remains
deferred
**Date:** 2026-07-17
**Target:** [agent-environment](../../skills/agent-environment/SKILL.md)

## Claim and disconfirming observations

User-level setup is a thin projection of already selected capability and intent.
It does not choose capabilities through a marketplace, install an unselected
runtime, or create cross-tool configuration merely for symmetry. Every applied
projection must improve one named recurring action through the harness's
ordinary path with a burden small enough to retain.

The claim is defeated if a missing skill source triggers marketplace search,
an installed skill's body is loaded merely to plan installation, a skill-only
request expands into runtime/provider setup, or Codex, Claude Code, and Cursor
receive always-on copies of methodology that their on-demand skill surfaces can
carry.

## Why the projection can be valuable without becoming heavy

- [Codex skills](https://learn.chatgpt.com/docs/build-skills) provide a native
  reusable workflow surface, so a selected method can be available without
  being copied into every project instruction file.
- [Claude Code skills](https://code.claude.com/docs/en/skills) expose skill
  metadata for discovery and load the body when used, avoiding the cost of
  placing a procedure in always-on `CLAUDE.md` context.
- [Cursor's dynamic context model](https://cursor.com/blog/dynamic-context-discovery)
  distinguishes dynamically discovered skills from persistent rules, allowing
  reusable procedures without turning user rules into a methodology dump.

The material benefit is therefore not “three tools have matching files.” It is
that a recurring method becomes discoverable and invocable in each selected
harness while retaining one declared source and no extra global control plane.
For an infrequent or already-sufficient action, the correct result is a no-op.

## Baseline observation

The installed pre-change skill was invoked through Kimi Code CLI with a fresh-
device request for selected `code-review` but no source. It correctly noticed
that the source was absent, then proposed searching skills.sh/vendor material
and inspecting installed skill provenance. It also loaded the target
`code-review` skill even though the request was only to plan its installation.
This reproduced the user's other-device report: setup converted missing intent
into capability discovery and spent context on the setup object.

## Treatment observations

The changed skill was loaded through Kimi Code CLI using `--skills-dir`:

1. With selected `code-review` and no source, the result was
   `blocked-pending-source`, `marketplaceDiscovery: false`, and a request for a
   source locator instead of searching for a candidate. A later wording change
   classifies vendor paths, installed versions, and flags as read-only lookup
   evidence rather than human input.
2. With an explicit request to find and compare unknown third-party refactoring
   skills, the result classified the work as marketplace discovery and proposed
   comparison without installation. This preserves the neighboring action
   rather than banning discovery outright.
3. With a declared source, the result kept marketplace discovery false and
   selected a user-level skill projection. The probe also exposed two secondary
   expansion risks—treating the named skill as an invocable task and treating a
   missing target runtime as installation scope—which are now closed in the
   [setup command](../../skills/agent-environment/commands/setup.md).

A combined three-harness Kimi probe returned no final record in two attempts, so
the claim that one activation will correctly plan all three projections remains
inconclusive. The completion gate therefore requires an ordinary-path benefit
probe for every actually selected harness rather than inferring success from
shared format or path presence.

## Classifier and target-isolation regression

A later raw setup probe used the actual installed skill set without naming the
expected owner or forbidding search. It selected `agent-environment`, but before
returning the missing-source result it inventoried the active Mac and consulted
Kimi surfaces even though the request named a fresh device. A second probe with
only `agent-environment` available and an empty target working directory still
listed available skills and read setup references before returning a
conditional plan. The model treated a runtime prohibition on an interactive
question tool as permission to continue rather than returning a plain
`NEEDS_INPUT` response.

The source gate is therefore now present at the start of trigger metadata and
before command dispatch, and distinguishes a final-response request from an
interactive tool call. Repeating the same raw prompt then selected
`agent-environment`, loaded its method, and returned `NEEDS_INPUT` without
inventory, vendor lookup, marketplace discovery, or a conditional plan. This
supports the first-action boundary in Kimi Code CLI; it does not establish the
same metadata timing in other harnesses.

## Expression and structural evidence

The target's stable lineage remains Primary P12 with P14, P16, and P15 support;
P16 led this repair because the failing transition was “missing source becomes
marketplace selection.” No Sequence change was needed. The smallest owning
surface was the existing setup action plus its verification, tool-routing, and
profile consumers.

- `git diff --check` passed.
- `python3 scripts/sync-sequence-snapshot.py --check agent-environment` passed
  with four interpretations.
- `npx --yes skills add . --list --full-depth` discovered `agent-environment`
  and exposed the revised trigger description.

## Remaining deployment observation

After review and merge, install the accepted revision on a fresh or isolated
user environment and run one real selected-skill task in each desired harness.
Record whether the skill was discovered, whether its distinctive method changed
the result, what persistent context or maintenance was added, and whether an
unchanged/no-op setup would have been sufficient. A harness that cannot show a
material action improvement should not retain the projection.
