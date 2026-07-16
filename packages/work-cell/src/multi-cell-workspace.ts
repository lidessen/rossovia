import { realpath } from "node:fs/promises";
import type { CellInput } from "./contracts";

interface WorkspaceGroup {
  allReadOnly: boolean;
  cellIds: string[];
}

/**
 * Incrementally rejects concurrent Cells that share one writable or
 * command-capable workspace root. It does not infer disjoint write safety.
 */
export class MultiCellWorkspaceGuard {
  private readonly roots = new Map<string, WorkspaceGroup>();

  constructor(private readonly carrier: string) {}

  async admit(cell: CellInput): Promise<void> {
    const root = await realpath(cell.workspace.root);
    const readOnly = isReadOnlyCell(cell);
    const group = this.roots.get(root);
    if (group !== undefined && (!group.allReadOnly || !readOnly)) {
      throw new Error(
        `${this.carrier} sharing workspace ${root} must all be read-only and command-free; conflicting cells: ${[...group.cellIds, cell.id].join(", ")}`,
      );
    }
    if (group === undefined) {
      this.roots.set(root, { allReadOnly: readOnly, cellIds: [cell.id] });
      return;
    }
    group.cellIds.push(cell.id);
  }
}

export async function assertMultiCellWorkspaceBoundary(
  cells: readonly CellInput[],
  carrier: string,
): Promise<void> {
  const guard = new MultiCellWorkspaceGuard(carrier);
  for (const cell of cells) await guard.admit(cell);
}

function isReadOnlyCell(cell: CellInput): boolean {
  return cell.workspace.writePaths.length === 0 && cell.workspace.allowedCommands.length === 0;
}
