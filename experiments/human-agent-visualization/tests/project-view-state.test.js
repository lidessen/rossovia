import { describe, expect, test } from "bun:test";
import { projectEvidenceView } from "../lib/project-view-state.js";

describe("Project Lens evidence drawer state", () => {
  test("source-only mode clears a previously selected projection when no source step exists", () => {
    const view = projectEvidenceView(undefined, { sourceOnly: true });

    expect(view).toEqual({
      title: "当前没有来源证据",
      kind: "来源",
      details: [],
      sourceRefs: [],
      excerpt: "这个证据包没有 source-layer step；派生投影已从仅看来源视图移除。",
    });
  });

  test("a selected step projects its evidence into a complete drawer view", () => {
    const view = projectEvidenceView({
      title: "项目声明的用途",
      layer: "source",
      evidence: {
        authority: "仓库声明",
        standing: "source-declared",
        revision: "sha256:source",
        disconfirmingEvidence: "README 发生变化",
        sourceRefs: ["README.md"],
        excerpt: "Declared purpose",
      },
    });

    expect(view.kind).toBe("来源");
    expect(view.details).toHaveLength(4);
    expect(view.sourceRefs).toEqual(["README.md"]);
    expect(view.excerpt).toBe("Declared purpose");
  });
});
