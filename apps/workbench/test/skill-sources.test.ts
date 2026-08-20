import { expect, test } from "bun:test";
import { currentSkillSourceProjection } from "../src/skill-sources";

test("skill source projection separates Main Agent and worker audiences", () => {
  const projection = currentSkillSourceProjection();
  expect(projection.version).toBe("rossovia.skill-source-projection.v1");
  expect(projection.audiences.map((audience) => audience.audience)).toEqual([
    "main-agent",
    "worker",
  ]);
  expect(projection.audiences[0]?.sources.map((source) => source.kind)).toEqual([
    "picked",
    "builtin",
    "user-custom",
  ]);
  expect(projection.audiences[1]?.sources.map((source) => source.kind)).toEqual([
    "picked",
    "builtin",
    "user-custom",
  ]);
  expect(projection.audiences[1]?.sources[2]?.standing).toBe("not-granted");
  expect(projection.audiences[0]?.sources.map((source) => source.ownership)).toEqual([
    "host-package",
    "host-package",
    "user",
  ]);
  expect(projection.audiences[1]?.sources[0]?.ownership).toBe("worker-package");
  expect(projection.audiences[0]?.sources[0]?.sourceRef).toBe("host-skill-package:main-agent/picked");
  expect(projection.audiences[0]?.sources[2]?.sourceRef).toBe("ROSSO_HOME/skills/custom");
  expect(projection.audiences[0]?.sources.map((source) => source.visibility)).toEqual([
    "on-demand",
    "always-visible",
    "searchable",
  ]);
  expect(projection.boundaries.join(" ")).toContain("skills/");
  expect(projection.policySources).toContain("ROSSOVIA.md");
});
