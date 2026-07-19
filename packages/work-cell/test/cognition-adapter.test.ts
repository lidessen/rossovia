import { describe, expect, test } from "bun:test";
import { CognitionFormationResultSchema } from "@atthis/cognition";
import { prepareCognitionFormation } from "../src/adapters/cognition/formation";

describe("cognition formation adapter", () => {
  test("lowers one prepared formation move without semantic or admission authority", () => {
    const input = prepareCognitionFormation({
      id: "form-model",
      workspaceRoot: "/tmp",
      scheme: { id: "project", revision: "1", title: "Project cognition" },
      move: {
        id: "synthesize-model",
        purpose: "Synthesize verified observations into one bounded local model.",
        outputStage: "model",
        inputs: [
          { type: "artifact", role: "boundary observation", stage: "observation" },
          { type: "artifact", role: "runtime observation", stage: "observation" },
        ],
      },
      inputs: [
        { type: "artifact", id: "artifact_one", title: "Boundary", locator: "cognition:artifact_one", content: "The source owns facts.", authority: "admitted project observation", status: "active" },
        { type: "artifact", id: "artifact_two", title: "Runtime", locator: "cognition:artifact_two", content: "The index is rebuildable.", authority: "admitted project observation", status: "active" },
      ],
    });
    expect(input.workspace.allowedCommands).toEqual([]);
    expect(input.context).toHaveLength(2);
    expect(input.instructions.join("\n")).toContain("cannot choose the scheme");
    expect(input.outputSchema).toBeDefined();
  });

  test("rejects inputs that do not match the prepared move", () => {
    expect(() => prepareCognitionFormation({
      id: "bad-move",
      workspaceRoot: "/tmp",
      scheme: { id: "project", revision: "1", title: "Project cognition" },
      move: { id: "observe", purpose: "Observe material", outputStage: "observation", inputs: [{ type: "source", role: "material" }] },
      inputs: [{ type: "artifact", id: "artifact_one", title: "Wrong", locator: "cognition:artifact_one", content: "Wrong type", authority: "unknown", status: "proposed" }],
    })).toThrow("expected source");
  });

  test("permits a justified no-proposal", () => {
    expect(CognitionFormationResultSchema.parse({
      version: "atthis.cognition-formation.v1",
      disposition: "no-proposal",
      rationale: "The supplied observations conflict and the move lacks a resolving source.",
      proposals: [],
    }).disposition).toBe("no-proposal");
  });
});
