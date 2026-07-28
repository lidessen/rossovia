import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CurrentEffectProjectionSchema,
  LocalCorrectionProjectionSchema,
  WorkbenchRunnerActivityProjectionSchema,
} from "../src/ui/projection";

const currentEffect = CurrentEffectProjectionSchema.parse({
  effectId: "effect-blog-1",
  phase: "writing",
  writer: {
    cellId: "blog-writer",
    runId: "run-blog-1",
  },
  workspace: {
    root: "/workspace/blog",
    baseHead: "abc123",
    baselineClean: true,
  },
  scope: {
    writePaths: ["content/blog/post.md"],
    allowedCommands: ["git diff -- content/blog/post.md"],
  },
  currentTool: {
    name: "write_file",
    state: "running",
    path: "content/blog/post.md",
  },
  recentTools: [{
    name: "read_file",
    state: "finished",
    path: "content/blog/source.md",
  }],
  diff: {
    changed: ["content/blog/post.md"],
    added: [],
    removed: [],
    patchRef: "/tmp/effect-blog-1.patch",
    patchDigest: "digest-1",
    outsideScope: [],
  },
  verification: {
    mechanical: { status: "pending" },
    independent: { status: "not-run" },
    principal: { status: "not-accepted" },
  },
  authority: {
    commit: "withheld",
    merge: "withheld",
    publish: "withheld",
  },
  stale: false,
  uncertain: false,
});

const currentCorrection = LocalCorrectionProjectionSchema.parse({
  correctionId: "blog-index-import-v1",
  inputId: "blog-index-import-v1",
  inputEventId: "event-correction-1",
  recordedAt: "2026-07-27T08:38:40.111Z",
  actorRef: "principal:lidessen",
  sourceRef: "conversation:2026-07-27-option-a",
  cause: {
    effectId: "effect-blog-1",
    failedReportRef: "file:effect-artifacts/failed.json",
    failedReportDigest: "a".repeat(64),
  },
  scope: {
    writePaths: ["db/schema.ts"],
    externalDisclosure: "none",
  },
  state: "verification-passed",
  execution: null,
  verification: {
    verifierRef: "supervisor:agent-era-blog-content-contract-v2",
    verdict: "passed",
    reportRef: "file:correction-artifacts/passed.json",
    reportDigest: "b".repeat(64),
  },
  changedFromFailedSubject: ["db/schema.ts"],
  authority: {
    commit: "withheld",
    merge: "withheld",
    publish: "withheld",
    productAcceptance: "withheld",
  },
  stale: false,
});

const authorizedIntentLineage = {
  standing: "seeded" as const,
  activeAnchor: {
    id: "anchor:blog",
    revision: "r1",
    reconciledWatermark: 0,
  },
};

describe("Principal Workbench current writable effect projection", () => {
  test("accepts the bounded writable effect without closing verification or authority", () => {
    expect(CurrentEffectProjectionSchema.parse(currentEffect)).toEqual(currentEffect);
  });

  test("keeps activity without currentEffect backward compatible and rejects invented commit authority", () => {
    expect(WorkbenchRunnerActivityProjectionSchema.parse({
      intentLineage: authorizedIntentLineage,
      source: "mission-timeline",
      recentEvents: [],
    })).toEqual({
      intentLineage: authorizedIntentLineage,
      source: "mission-timeline",
      recentEvents: [],
    });
    expect(CurrentEffectProjectionSchema.safeParse({
      ...currentEffect,
      authority: {
        commit: "granted",
        merge: "withheld",
        publish: "withheld",
      },
    }).success).toBe(false);
  });

  test("accepts only a complete, internally consistent correction evidence boundary", () => {
    expect(LocalCorrectionProjectionSchema.parse(currentCorrection)).toEqual(currentCorrection);
    expect(WorkbenchRunnerActivityProjectionSchema.parse({
      intentLineage: authorizedIntentLineage,
      source: "mission-timeline",
      currentCorrection,
      recentCorrections: [currentCorrection],
    })).toMatchObject({ currentCorrection });

    const { authority: _authority, ...missingAuthority } = currentCorrection;
    expect(LocalCorrectionProjectionSchema.safeParse(missingAuthority).success).toBe(false);
    expect(LocalCorrectionProjectionSchema.safeParse({
      ...currentCorrection,
      scope: { writePaths: ["db/schema.ts"] },
    }).success).toBe(false);
    expect(LocalCorrectionProjectionSchema.safeParse({
      ...currentCorrection,
      state: "recorded",
    }).success).toBe(false);
    expect(LocalCorrectionProjectionSchema.safeParse({
      ...currentCorrection,
      state: "recorded",
      verification: {
        ...currentCorrection.verification,
        verdict: "pending",
        reportRef: null,
      },
    }).success).toBe(false);
    const controlledExecution = {
      executorRef: "agent:bounded-applier",
      patchRef: "file:correction.patch",
      patchDigest: "c".repeat(64),
      manifestRef: "file:correction.manifest.json",
      manifestDigest: "d".repeat(64),
    };
    expect(LocalCorrectionProjectionSchema.safeParse({
      ...currentCorrection,
      state: "applied-unverified",
      execution: controlledExecution,
      verification: {
        ...currentCorrection.verification,
        verdict: "pending",
        reportRef: null,
        reportDigest: null,
      },
      changedFromFailedSubject: [],
    }).success).toBe(true);
    expect(LocalCorrectionProjectionSchema.safeParse({
      ...currentCorrection,
      state: "apply-uncertain",
      execution: controlledExecution,
      verification: {
        ...currentCorrection.verification,
        verdict: "pending",
        reportRef: null,
        reportDigest: null,
      },
      stale: false,
    }).success).toBe(false);
    expect(WorkbenchRunnerActivityProjectionSchema.safeParse({
      currentCorrection: {
        ...currentCorrection,
        authority: {
          ...currentCorrection.authority,
          commit: "granted",
        },
      },
    }).success).toBe(false);
  });

  test("keeps effect presentation observational and exposes no integration action", () => {
    const root = join(import.meta.dir, "..", "ui");
    const html = readFileSync(join(root, "index.html"), "utf8");
    const app = readFileSync(join(root, "app.js"), "utf8");

    expect(html).toContain("写入权限不等于提交权限");
    expect(html).toContain("Pause 只阻止后续生产");
    expect(app).toContain("currentEffect");
    expect(app).toContain("currentCorrection");
    expect(app).toContain("correctionPresentation");
    expect(html).toContain("原失败");
    expect(html).toContain("本地修正");
    expect(html).toContain("新验证");
    expect(app).toContain("commit withheld · merge withheld · publish withheld");
    expect(app).toContain('normalizedState === "passed"');
    expect(app).not.toContain('first(cause, ["verdict"], "failed")');
    expect(html).not.toMatch(/data-(?:control|recovery)="(?:approve-effect|commit|push|merge|publish)"/);
  });
});
