import { expect, test } from "bun:test";
import {
  AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF,
  PROJECT_LENS_DOGFOOD_RUNTIME_REF,
  trustedTaskExecutionRuntimeAdapterFor,
} from "../src/ui/task-execution-runtime-adapter";

test("the closed resolver recognizes exactly the Blog and Project Lens runtimes", () => {
  const blog = trustedTaskExecutionRuntimeAdapterFor(
    AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF,
  );
  const lens = trustedTaskExecutionRuntimeAdapterFor(
    PROJECT_LENS_DOGFOOD_RUNTIME_REF,
  );

  expect(blog?.id).toBe("agent-era-blog-publication-v1");
  expect(lens).toMatchObject({
    id: "project-lens-dogfood-v1",
    runtimeRef: PROJECT_LENS_DOGFOOD_RUNTIME_REF,
  });
  expect(lens?.runtimeModule).toEndWith(
    "/experiments/human-agent-visualization/project-lens-runtime.ts",
  );
  expect(lens?.environment({
    worktreePath: "/candidate",
    receiptPath: "/receipt.json",
  })).toEqual({
    ROSSO_PROJECT_LENS_EFFECT_ROOT: "/candidate",
    ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT: "/receipt.json",
  });
  expect(trustedTaskExecutionRuntimeAdapterFor("source-project:unknown.ts"))
    .toBeNull();
});
