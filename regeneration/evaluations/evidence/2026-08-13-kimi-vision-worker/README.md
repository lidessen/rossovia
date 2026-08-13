# Kimi vision worker local smoke

**Audience:** maintainers and reviewers deciding whether the current Work Cell
image-input path has enough evidence for bounded local use.

**Status:** two local synthetic-image smokes passed on 2026-08-13: one through
the ordinary CLI and provider profile, and one directly through the current
worker catalog helper. This is a minimal observation record; the temporary run
records, catalog probe script, and PNG were not promoted into the repository.

## Purpose

The first smoke asked whether the ordinary Work Cell AI SDK path could read one
local image from declared workspace scope, send it through the configured
provider route, and receive a correct answer to a simple spatial question. The
second asked the same question while obtaining the card and driver directly
from `createCurrentWorkerCatalog(process.env)`. Neither tested automatic
Rossovia CLI catalog integration.

## Synthetic input and equivalent construction

The input was a non-sensitive 960×540 PNG: a white background, one blue
rectangle on the left, and one red rectangle on the right. The following
ImageMagick command constructs an equivalent fixture; it is not a claim of
byte-for-byte identity with the discarded temporary PNG:

```bash
magick -size 960x540 xc:white \
  -fill '#2563eb' -draw 'rectangle 160,170 400,370' \
  -fill '#dc2626' -draw 'rectangle 560,170 800,370' \
  probe.png
```

The Cell declared `workspace.readPaths: ["probe.png"]`,
`imagePaths: ["probe.png"]`, a one-step budget, and acceptance requiring the
left-to-right color order. From `packages/work-cell`, the equivalent execution
surface is:

```bash
bun src/cli.ts run <cell.json>
```

The active provider profile placed Kimi Coding model `k3` first. The ordinary
CLI constructed its AI SDK driver from that profile; the `workerId` retained in
the Cell input was not resolved through `WorkerCatalog`.

## Ordinary CLI and provider-profile observation

| Field | Observed value |
|---|---|
| Date | 2026-08-13 |
| Run ID | `6aebf9cd-2742-48cf-b76c-4fea4f05067c` |
| Status | `passed` |
| Serving provider/model | `kimi-coding/k3` |
| Final text | `The blue rectangle is on the left, and the red rectangle is on the right.` |
| Input tokens | 1,638 |
| Output tokens | 45 |
| Total tokens | 1,683 |

The first attempt inside the restricted sandbox reached no provider: every
configured route ended in a transport failure caused by the sandbox network
boundary. Running the same probe outside that sandbox reached Kimi and produced
the passed observation above. The sandbox attempt is environment evidence, not
a model failure.

## Direct catalog-backed observation

A temporary `catalog-probe.ts` constructed the current host catalog with
`createCurrentWorkerCatalog(process.env)`, read
`catalog.card("kimi-coding")`, and used that card's execution profile on a Cell
with `capabilitiesRequired: ["vision"]` and
`imagePaths: ["probe.png"]`. It then supplied
`catalog.createDriver(input)` to the ordinary Cell runtime. The equivalent
temporary execution surface was:

```bash
bun catalog-probe.ts
```

The first catalog attempt exposed a duplicate `vision` requirement when the
Cell declared it explicitly and image input also implied it. After the current
catalog path stopped appending an already-declared `vision` label, the same
probe passed.

| Field | Observed value |
|---|---|
| Date | 2026-08-13 |
| Status | `passed` |
| Worker card provider/model | `kimi-coding/kimi-for-coding` |
| Driver provider/model | `kimi-coding/kimi-for-coding` |
| Input tokens | 1,360 |
| Output tokens | 136 |
| Total tokens | 1,496 |

The final text was:

```text
The blue rectangle is on the left and the red rectangle is on the right.

Left-to-right color order: **blue → red**
```

The temporary script and raw record were not retained, so
`bun catalog-probe.ts` documents the observed invocation rather than naming a
repository reproduction fixture.

## Deterministic contract checks

The live smokes establish two provider-backed observations. Two local tests
cover the deterministic transport boundaries independently:

- [`ai-sdk-driver.test.ts`](../../../../packages/work-cell/test/ai-sdk-driver.test.ts)
  checks workspace-scoped image reading, AI SDK file-part construction,
  terminal-recovery reuse, and absence of image bytes from retained trace and
  raw-step projections.
- [`validation-model.test.ts`](../../../../packages/work-cell/test/validation-model.test.ts)
  checks that the Kimi adapter encodes a PNG file part as an image data URL in
  its outbound request.

## Supported conclusion and limits

These runs support two bounded claims: the current Work Cell AI SDK path
transported one workspace-scoped synthetic PNG through a profile-selected Kimi
route, and the current host catalog directly resolved a vision-labeled Kimi
card and matching driver for the same kind of Cell. Both returned the correct
simple left-right relation.

It does not establish general visual accuracy, OCR, diagram or screenshot
quality, multi-image behavior, large-image limits, fallback-provider vision,
automatic Rossovia CLI catalog wiring, durable binary retention, or a
media-storage capability. The repository retains this summary and the
deterministic tests, not the probe script, raw runs, or image bytes.
