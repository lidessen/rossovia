# Decision 054 — Bun source Workbench runtime

**Status:** accepted and implemented
**Date:** 2026-08-10
**Approved by:** Principal-selected transition A
**Supersedes in part:** [Decision 048](048-portable-workbench-and-hook-bindings.md)'s
checked-in Node bundle, Node-only target runtime, and bundle build carriers

## Concrete pressure

Rossovia is still in a personal/development stage. Keeping a generated
`apps/workbench/dist/rossovia.mjs` in Git made the repository carry two
runtime identities: the TypeScript source that developers changed and a bundled
projection that hooks and some tests actually executed. Every source change then
needed a rebuild and a consistency gate before the stable launcher observed it.
The Docker fallback added another maintenance carrier solely to produce that
checked-in projection.

That cost is not justified by a real distribution contract. The current
checkout already declares Bun for Workbench development, dependency locking,
type checking, tests, and UI execution. A future npm or release artifact may
need a separately verified target runtime, but no such distribution system is
accepted yet.

Decision 048's other pressure remains real: Codex, Claude Code, and Cursor have
different hook capabilities, and their projections must stay thin rather than
inventing parity or duplicating Workbench behavior.

## Decision

During the current personal/development stage, the repository's runtime carrier
is the tracked TypeScript source at `apps/gateway/src/cli.ts`, executed
with Bun through the stable `apps/gateway/rossovia` launcher.

The launcher fails clearly when Bun is unavailable. It has no Node, stale
bundle, or Docker fallback. Package scripts and direct runtime tests execute the
source carrier. The generated `dist/rossovia.mjs`, its bundle-only builder and
Docker files, and the CI bundle-consistency step are removed from Git.

The stable launcher remains the hook command boundary. The Codex, Claude Code,
and Cursor configuration files continue to invoke it and do not duplicate the
Bun command or source path. When the intervention adapter emits a correction
endpoint, it binds the active Bun executable and tracked `src/cli.ts` entry so
the endpoint remains executable and source-relative across target-project
changes.

This decision does not define npm packaging, installation, a release build, or
another distribution mechanism. A future real distribution must choose and
verify its artifact outside this source-carrier decision rather than checking a
generated runtime projection into Git by default.

## Preserved hook design

Decision 048 continues to own the capability-honest multi-harness design:

- Workbench source normalizes host payloads and owns common hook behavior;
- vendor JSON files own only their documented event and command projections;
- missing host capabilities lower the guarantee rather than authorizing
  transcript parsing, prompt rewriting, or synthetic parity; and
- shared state remains evidence for Agent judgment, never semantic or
  acceptance authority.

Only the runtime carrier and its build machinery are superseded.

## Verification

- `./apps/gateway/rossovia --help` executes `src/cli.ts` with Bun;
- the same launcher returns a clear exit-127 error when Bun is absent from
  `PATH`, without attempting another runtime;
- correction context names an executable `bun` plus tracked `src/cli.ts`
  endpoint and remains bound to the exact session-state file;
- package type checking and the full Workbench test suite run without building
  a bundle;
- hook configuration tests preserve the stable launcher commands for all three
  hosts; and
- tracked files and active documentation contain no generated Workbench bundle
  or bundle-only build carrier.

## Reconsideration

Reopen the runtime-carrier choice when Workbench has a real consumer that
cannot use the Bun source checkout, or when an npm/release distribution is
accepted with its own build, compatibility, provenance, and verification
contract. Do not infer that system from a hypothetical target machine.
