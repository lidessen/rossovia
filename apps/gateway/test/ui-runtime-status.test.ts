import { describe, expect, test } from "bun:test";
import type { SelfCheckStartupGate } from "../../workbench/src/self-check";
import { runtimeStatusProjection } from "../src/ui-server";

const HEAD = "1".repeat(40);

/**
 * One full startup gate shaped like the production boot entry produces. A
 * gate without a mechanical source observation stands attention, mirroring
 * the gate's own aggregation; every field the projection copies is copied
 * verbatim, and every field it must not copy (cwd, root, statusLines) is
 * present in the fixture so the bounded projection is proven by absence.
 */
function gate(
  source: SelfCheckStartupGate["mechanical"]["source"],
  overrides: Partial<SelfCheckStartupGate> = {},
): SelfCheckStartupGate {
  return {
    version: "rossovia.self-check.v1",
    scope: "boot",
    mode: source === undefined ? "safe-diagnostic" : "normal",
    readiness: source === undefined ? "boot-attention" : "boot-ready",
    projection: "not-checked",
    startupStatus: source === undefined ? "attention" : "healthy",
    mechanical: {
      status: source === undefined ? "attention" : "healthy",
      checks: [],
      ...(source === undefined ? {} : { source }),
    },
    checkedAt: "2026-08-21T12:00:00Z",
    ...overrides,
  };
}

const PATHED_SOURCE: SelfCheckStartupGate["mechanical"]["source"] = {
  cwd: "/home/principal/rossovia",
  root: "/home/principal/rossovia",
  head: HEAD,
  dirty: false,
  changedAfterStart: false,
  freshness: "current",
  statusLines: [],
};

describe("gateway runtime status projection", () => {
  test("projects the bounded package version, startup gate, loopback endpoint, and source facts", () => {
    const projected = runtimeStatusProjection({ port: 4317 }, gate(PATHED_SOURCE));

    expect(projected).toEqual({
      version: "@rosso/workbench 0.1.0",
      startup: { mode: "normal", readiness: "boot-ready", status: "healthy" },
      endpoint: "http://127.0.0.1:4317",
      sourceHead: HEAD,
      sourceDirty: false,
      checkedAt: "2026-08-21T12:00:00Z",
    });
    // The gate's local paths and raw status lines never enter the projection.
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain("/home/principal");
    expect(serialized).not.toContain("statusLines");
    expect(serialized).not.toContain("changedAfterStart");
  });

  test("keeps source facts absent when the boot observation read no source", () => {
    const projected = runtimeStatusProjection({ port: 4399 }, gate(undefined));

    expect(projected).toEqual({
      version: "@rosso/workbench 0.1.0",
      startup: { mode: "safe-diagnostic", readiness: "boot-attention", status: "attention" },
      endpoint: "http://127.0.0.1:4399",
      checkedAt: "2026-08-21T12:00:00Z",
    });
    expect(projected).not.toHaveProperty("sourceHead");
    expect(projected).not.toHaveProperty("sourceDirty");
  });

  test("omits a non-hex source head instead of projecting a guessed identity", () => {
    const projected = runtimeStatusProjection({ port: 4317 }, gate({
      ...PATHED_SOURCE,
      head: "unreadable-head",
      dirty: true,
      statusLines: [" M apps/workbench/src/home.ts"],
    }));

    expect(projected).toMatchObject({
      startup: { mode: "normal", readiness: "boot-ready", status: "healthy" },
      sourceDirty: true,
      endpoint: "http://127.0.0.1:4317",
    });
    expect(projected).not.toHaveProperty("sourceHead");
    expect(JSON.stringify(projected)).not.toContain("unreadable-head");
  });
});
