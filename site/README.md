# Project Site

This package builds the repository's public home page and documentation
projection. It is governed by [decision 028](../design/decisions/028-project-site-ui-method-pilot.md)
and the [site Aesthetic Case](../design/aesthetics/cases/2026-07-14-project-site-pilot.md).

## Authority boundary

- `content-manifest.json` declares which repository sources receive public
  routes and which active skills enter the generated catalog.
- `content/` owns only site-specific connective copy.
- `scripts/sync-content.mjs` rebuilds `src/content/docs/` and
  `src/data/skills.json`. Both generated paths are ignored and must not be
  edited.
- Source Markdown, the Principle Sequence, and each `SKILL.md` retain factual
  and editing authority. The site exposes their source URLs.
- Vercel hosts static output. The package does not require a Vercel runtime,
  account feature, analytics product, or remote content service.

## Local use

```bash
npm install
npm run dev
npm run build
```

The checked-in canonical origin is `https://skills.atthis.run`; set
`SITE_URL` only to override it for an alternate deployment. Vercel deploys from
the repository root so the build can read the authoritative sources outside
this package while publishing only `site/dist`. The projector uses
`SOURCE_REF`, `VERCEL_GIT_COMMIT_SHA`, or
`GITHUB_SHA` when present so a deployed page links to the exact source revision;
`SOURCE_EDIT_REF` can select an editable branch. Both fall back to the manifest's
declared repository ref. Run local package commands from this directory so the
content projector can resolve the repository root one level above it.
