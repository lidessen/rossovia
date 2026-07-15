# Improve Agent Workflow Probe

## Claim

[`improve-agent-workflow`](../../skills/improve-agent-workflow/SKILL.md) should
let an agent installed into an existing project localize one observed failure
in agent work, change the smallest owning surface, and verify the named action
without requiring the target to install the rest of this collection or adopt
its internal vocabulary.

## Form and expression review

**Observed need:** the principal repeatedly wants to install one skill into an
existing or company project and ask Codex to improve a project skill, agent
workflow, tool interaction, or related agent experience.

**Strongest unchanged alternative:** install `skill-engineering`,
`context-engineering`, and `form-guidance` separately and select the correct
owner before invocation.

**Decision:** the alternative remains smaller when the failing surface is
already known. It does not close the external-entry gap because it makes the
user perform the cross-surface diagnosis. A standalone skill is warranted for
the recurring judgment of localizing and repairing that agent-facing owner; it
does not become a universal task or project coordinator.

**Expression:** Primary P04 with P02, P08, and P15. `SKILL.md` carries routing
and the short method; `commands/audit.md` and `commands/improve.md` load by
authorization; `references/agent-work-model.md` loads only for ambiguous or
cross-surface diagnosis; `references/skill-surface.md` loads only when the
existing project skill is the selected owner.

## Structural checks

- `init_skill.py` created the package and generated initial OpenAI interface
  metadata.
- `sync-sequence-snapshot.py improve-agent-workflow` packaged the full one-line
  Sequence and exactly P04, P02, P08, and P15 plus source metadata.
- `quick_validate.py`, run with an isolated PyYAML dependency, returned
  `Skill is valid!`; the final `SKILL.md` remains below the repository's
  500-line limit.
- `python3 scripts/probe-skill-installation.py improve-agent-workflow` copied
  the package to a disposable source snapshot, installed only that snapshot
  into a separate disposable project, and hash-matched all 12 package files:
  `SKILL.md`, OpenAI metadata, two commands, two domain references, and six
  generated Sequence snapshot files. This replaced direct source-to-checkout
  installation after the
  [self-install alias incident](../../chronicle/records/2026/07/obs-20260715-self-install-source-alias.md).
- The public site build projected six source pages and 13 skills with no Astro
  diagnostics. Its link scan returned 200 for all 17 internal links, including
  `/docs/skills/improve-agent-workflow/`.

## External action probe

**Fixture:** an external Git repository contained a committed
`.agents/skills/release-notes/SKILL.md`, a governing `docs/release-policy.md`, a
failed run that invented enterprise SSO, invitations, and account recovery,
and one actual uncommitted change to `src/message.ts` after tag `v1.0.0`. Only
`improve-agent-workflow` was installed from this collection.

**Task:** “Our release-note skill keeps inventing changes that are not in the
repository. Inspect what is actually happening, fix the smallest owning
surface, and verify the improvement through the normal project path. Do not
redesign the whole workflow.”

**Disconfirming observation:** the agent adds a new workflow or verifier,
rewrites project policy, changes product code, or merely polishes prose without
testing release-note behavior.

**Observed action:** a fresh agent identified the existing release-note skill's
action layer as the owner. It changed only that `SKILL.md`: the method now reads
the release policy, inspects the requested Git range, cites the commit or path
for every bullet, omits empty groups, refuses unsupported claims, and leaves
publication to the maintainer.

The agent then ran the ordinary command:

```text
codex exec --ephemeral -s read-only -C <fixture> \
  'Draft release notes for the changes since v1.0.0.'
```

The result contained only the clearer retry guidance supported by
`src/message.ts`; none of the three invented features remained. A neighboring
request to review `src/message.ts` without drafting release notes performed the
review and emitted no release note. `git diff --check` passed.

**Verdict:** supported for one external task. The fresh run is compatible
behavior, not a guarantee across all models and projects; maintainer acceptance
remains outside the agent's authority.

## Boundary probe

**Task:** explicitly invoke the installed skill for “Our GitHub Actions release
job should use Node 26 instead of Node 22. Update the CI workflow.”

**Disconfirming observation:** the skill treats generic CI maintenance as an
agent-workflow problem or invents a missing workflow file.

**Observed action:** the fresh agent declined ownership, routed the task to
ordinary CI maintenance, and noted that the fixture contained no
`.github/workflows` source from which a truthful change could be made. It made
no edits and preserved existing dirty state.

**Verdict:** supported.

## Context and authority probe

A separate Codex run used ordinary Chinese intent and did **not** mention the
skill name:

```text
这个项目的 release-notes skill 经常把仓库里没有的功能写进发布说明。
检查实际发生了什么，修正最小的责任面，并通过正常入口验证；不要重做整个流程。
```

Codex explicitly selected `improve-agent-workflow`, read its `SKILL.md`, then
loaded `commands/improve.md` and `references/skill-surface.md`. It did not load
`references/agent-work-model.md` because the existing release skill and failed
run made the owner unambiguous. This supports natural triggering and
conditional context disclosure.

The run read the packaged `SEQUENCE.md` but failed to read the four selected
interpretations before diagnosis. The result was therefore **revision
required** for the method-source contract even though its action diagnosis was
correct. `SKILL.md` now says to read `SEQUENCE.md` first and then exactly P04,
P02, P08, and P15 before diagnosing the owner.

A fresh read-only audit after the revision actually loaded the packaged
`SEQUENCE.md` and all four selected interpretation files. It loaded
`commands/audit.md`, `references/agent-work-model.md`, and
`references/skill-surface.md`: both the skill action layer and a possible
runtime-delivery omission remained plausible because the failed-run record had
no context-loading trace. The agent retained that uncertainty, proposed an
ordinary action probe that could distinguish the owners, and made no edits.
This supports the corrected source contract and shows that conditional detail
may expand when the evidence genuinely leaves two owners open.

The same run's write attempt was rejected before mutation because macOS
canonicalized the fixture's `/tmp` root to `/private/tmp`, which the Codex
workspace sandbox treated as outside its declared root. This is a fixture-path
failure rather than a permission requirement of the skill; the separate action
probe completed the identical change and verification without broadening
permissions.

The natural-trigger run consumed 207,035 input tokens, of which 182,016 were
reported as cached, and 2,718 output tokens. Much of the visible context came
from Codex also selecting its global `skill-creator` for the target-skill edit;
the measurement cannot attribute the full cost to this package. It does show
that overlapping globally installed methods can dominate an otherwise compact
project skill, so future matched probes should inspect loader attribution
rather than weakening this skill's source or verification contract.

## Coexistence boundary and verification cost

`improve-agent-workflow` and `skill-engineering` can be installed together, but
they must not both coordinate the same known skill edit. Their trigger and body
contracts now make the split explicit:

- use `improve-agent-workflow` when the owning agent-facing surface is unknown
  or several surfaces interact;
- enter `skill-engineering` directly when evidence already localizes the gap to
  a skill trigger, action prompt, context layer, or behavior evaluation; and
- after diagnosis selects a skill, hand off that domain judgment instead of
  retaining a parallel coordinator. The bundled `skill-surface.md` is labeled
  as the minimum standalone projection for installations that do not include a
  dedicated skill-engineering method.

This revision has structural and context-layer evidence but no new behavioral
attribution claim. Two initial read-only Codex routing attempts used the local
default `gpt-5.6-sol` before the cost boundary was corrected. One selected a
globally installed `task-convergence` method rather than either project method;
the other fixture was incomplete after an unsafe source-to-self installation
probe. Neither result can test the two-skill boundary, so no additional model
run was authorized. Future routing probes must first isolate global methods,
verify the fixture without installing back through the repository's
`.agents/skills -> ../skills` symlink, and explicitly select a low-cost model
with an estimated budget.

## Deployment decision

The form, external action, natural trigger, boundary, selected-interpretation
context path, installation, and site projection are supported. Deploy the
package as a first independently usable version, with two explicit residuals:
calibrate context cost and run the dual-install routing probe in a comparable
runtime where global skills are controlled. Do not claim universal behavior
improvement, dual-install model attribution, or token savings from this
evidence.
