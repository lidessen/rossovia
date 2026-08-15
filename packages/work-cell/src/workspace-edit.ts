import { createEditTool } from "@earendil-works/pi-coding-agent";
import { isAbsolute, relative, sep } from "node:path";
import type { Workspace } from "./workspace";

/**
 * One Workspace-owned, scope-bound exact batch edit boundary backed by Pi's
 * native edit implementation (unique, non-overlapping exact oldText matches,
 * whole-batch validation before a single write, same-file mutation queue).
 * Pi owns the edit semantics; the Work Cell Workspace remains the only
 * read/write/scope authority. Every operation maps Pi's absolute path back
 * through the declared workspace policy, so a model-authored path cannot
 * reach outside the workspace even when Pi resolves it.
 */
export function createWorkspaceEditTool(
  workspace: Workspace,
): ReturnType<typeof createEditTool> {
  return createEditTool(workspace.root, {
    operations: {
      access: async (absolutePath) => {
        // Pi hands operations an absolute path resolved against the workspace
        // root; every boundary re-maps it through the declared workspace
        // policy, so a model-authored or resolved path cannot reach outside
        // the workspace even when Pi resolves it.
        await workspace.assertEditable(workspaceRelative(workspace.root, absolutePath));
      },
      readFile: async (absolutePath) => {
        const content = await workspace.readText(workspaceRelative(workspace.root, absolutePath));
        return Buffer.from(content, "utf8");
      },
      writeFile: async (absolutePath, content) => {
        await workspace.writeText(workspaceRelative(workspace.root, absolutePath), content);
      },
    },
  });
}

/** Pi hands operations an absolute path resolved against the workspace root. */
function workspaceRelative(root: string, path: string): string {
  const value = relative(root, path);
  if (value === "") return ".";
  if (value === ".." || value.startsWith(`..${sep}`) || isAbsolute(value)) {
    throw new Error(`path escapes workspace: ${path}`);
  }
  return value;
}
