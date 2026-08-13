# Kimi vision worker local smoke

**Audience:** maintainers and reviewers deciding whether the current Work Cell
image-input path has enough evidence for bounded local use.

**Status:** one local synthetic-image smoke passed on 2026-08-13. This is a
minimal observation record; the temporary run record and PNG were not promoted
into the repository.

## Purpose

The smoke asked whether the ordinary Work Cell AI SDK path could read one local
image from declared workspace scope, send it through the configured provider
route, and receive a correct answer to a simple spatial question. It did not
test `WorkerCatalog` resolution or Rossovia CLI integration.

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

## Observation

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

## Deterministic contract checks

The live smoke establishes only one provider-backed observation. Two local
tests cover the deterministic transport boundaries independently:

- [`ai-sdk-driver.test.ts`](../../../../packages/work-cell/test/ai-sdk-driver.test.ts)
  checks workspace-scoped image reading, AI SDK file-part construction,
  terminal-recovery reuse, and absence of image bytes from retained trace and
  raw-step projections.
- [`validation-model.test.ts`](../../../../packages/work-cell/test/validation-model.test.ts)
  checks that the Kimi adapter encodes a PNG file part as an image data URL in
  its outbound request.

## Supported conclusion and limits

This run supports one bounded claim: with Kimi Coding `k3` first in the active
provider profile, the current Work Cell AI SDK path transported one
workspace-scoped synthetic PNG to the serving provider and returned the correct
simple left-right relation.

It does not establish general visual accuracy, OCR, diagram or screenshot
quality, multi-image behavior, large-image limits, fallback-provider vision,
catalog selection, Rossovia CLI catalog wiring, durable binary retention, or a
media-storage capability. The repository retains this summary and the
deterministic tests, not the raw run or image bytes.
