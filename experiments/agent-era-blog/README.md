# Agent-Era Personal Blog Experiment

This directory is the product fixture used to test Rossovia's supervised
Workbench and Autonomy path against a real project. The intended product is a
Chinese-first personal blog for reflections, technical essays, and practical
engineering notes. Its canonical article remains author-owned while summaries,
source maps, and other agent-facing views remain traceable projections.

Read [DESIGN.md](DESIGN.md) for the product thesis and
[`operations/missions/principal-workbench-dogfood.json`](operations/missions/principal-workbench-dogfood.json)
for the retained experiment obligation.

## Current Status

The checked-in mainline is an intentionally pre-implementation vinext shell.
It proves the build and optional hosting-packaging surface but does not yet
implement the content model or final blog UI described in `DESIGN.md`. A
Mission proposal, Agent claim, or candidate worktree does not make that product
work part of this mainline until it is independently verified and integrated.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Current Shape

- edit site code under `app/`
- `.openai/hosting.json` declares portable D1 and R2 binding names without a
  Sites project identity
- `OPENAI_SITES_PROJECT_ID` may supply an environment-local Sites project
  identity during a build
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` remains intentionally empty until the first content-model
  candidate returns through the Mission
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Environment-local Sites identity

Portable source does not retain a Sites project identity. When a developer or
deployment environment already has an authorized Sites project, it may supply
that identity only to the build process:

```bash
OPENAI_SITES_PROJECT_ID=your-environment-local-project-id npm run build
```

The build combines that value with the tracked portable bindings in
`dist/.openai/hosting.json`. When the variable is absent, the build succeeds
with a projectless portable hosting config. Supplying the variable neither
creates a remote project nor grants deployment or publication authority; those
remain separate environment and human-controlled actions.

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
