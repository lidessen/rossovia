# Agent-Era Blog project guidance

Read [DESIGN.md](DESIGN.md) and the active record under
`operations/missions/` before changing product behavior.

## Product invariant

The author-owned article and its accepted claims are canonical. Agent-produced
summaries, lenses, answers, tags, and revision proposals are projections until
the author explicitly accepts a change into the article source.

Do not turn “agent-era” into a generic chat panel. Every agent-facing feature
must expose what source it used, what it derived, and whether a human has
accepted it.

## First-slice boundary

- Public reading remains anonymous.
- Authoring and publication changes require an authenticated author.
- Durable posts, claims, sources, and publication revisions belong in D1.
- Browser storage may hold display preferences or an unsaved local draft only;
  it is never publication authority.
- The first slice may use deterministic source-grounded projections. It must
  label them as such and must not pretend an LLM ran when none did.
- Do not add comments, followers, newsletters, media uploads, billing, or a
  general CMS before the declared author-to-reader path works.

## Supervised execution boundary

The active Mission may contain an `executionProposal`. It is a project-owned
description of one possible supervised run, not execution authority. Its
proposal ID, content digest, declared external disclosure and budget,
decisions, and withheld authorities must remain visible as separate facts.
A proposal's `runtimeDigest` binds the exact supervisor-owned task and
acceptance source. Changing that runtime requires a newly committed proposal
and fresh Principal review; a stable path name is not sufficient identity.
A Principal choice authorizes only the choice and immediate result it names;
it does not imply commit, merge, publication, or product acceptance.

Keep shared Mission sources device-neutral. The proposal may name an
environment-owned worktree reference, but the operator-selected absolute
worktree path belongs in local consumption or effect evidence after launch
preflight.

## Commands

```bash
npm run dev
npm run build
npm test
npm run db:generate
```

## Verification

Verify the canonical/projection distinction in both data and UI. A rendered
page or successful request is not evidence that an agent-derived claim is true.
The active Mission and the human Principal retain product acceptance.
