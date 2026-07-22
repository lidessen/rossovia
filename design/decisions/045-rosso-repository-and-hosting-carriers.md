# Decision 045 — Rosso Repository and Hosting Carriers

**Status:** accepted
**Date:** 2026-07-22
**Approved by:** principal
**Supersedes:** only the repository-retention boundary in
[Decision 044](044-rosso-identity-and-namespace-migration.md)

## Decision

Rename the GitHub repository from `lidessen/skills` to
[`lidessen/rosso`](https://github.com/lidessen/rosso) and rename the existing
Vercel project from `lidessen-skills` to `rosso`. Keep the Vercel project ID
`prj_8WQXh6u0fZFHmck51pXFbT1OjhXu`, its production history, and the verified
`rosso.run` domain binding; this is a carrier rename, not a new project.

Current installation commands, canonical source links, generated Sequence
snapshots, and site links use `lidessen/rosso`. Historical records retain the
repository and deployment names that produced them. Local checkout directory
names remain machine-local paths and do not need to follow the remote slug.

The transitional `skills.atthis.run` custom-domain alias is a separate hosting
retirement decision. This carrier rename neither requires it as identity nor
silently authorizes deleting it.

## Verification

- GitHub resolves the repository as `lidessen/rosso`, and local `origin` uses
  that canonical URL.
- Vercel resolves the same project ID under the name `rosso`.
- The [clean-main production deployment](https://vercel.com/lidessen/rosso/31h4WNPpAwfij2fnbA5f1zg8scMd)
  reports project name `rosso`, repository `lidessen/rosso`, and the
  [merged commit](https://github.com/lidessen/rosso/commit/09ebb2bf737c57c779235568477414cc854e1b7a).
- [`rosso.run`](https://rosso.run) remains verified and serves the deployment
  over HTTPS.
