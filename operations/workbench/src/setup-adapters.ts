import { join } from "node:path";
import type { SetupSelectionEntry } from "./contracts";
import { expandPath } from "./paths";
import type { SetupModule } from "./setup-modules";

export interface SetupAdapter {
  harness: SetupSelectionEntry["harness"];
  projectionPath(targetRoot?: string): string;
  render(module: SetupModule): {
    content: string;
    startMarker: string;
    endMarker: string;
  };
}

const codexAdapter: SetupAdapter = {
  harness: "codex",
  projectionPath(targetRoot?: string): string {
    const root = expandPath(targetRoot ?? process.env.CODEX_HOME ?? "~/.codex");
    return join(root, "AGENTS.md");
  },
  render(module: SetupModule) {
    const startMarker = `<!-- rossovia:workbench.setup.${module.id}:start -->`;
    const endMarker = `<!-- rossovia:workbench.setup.${module.id}:end -->`;
    return {
      content: `${startMarker}\n${module.guidance}\n${endMarker}`,
      startMarker,
      endMarker,
    };
  },
};

export function setupAdapter(harness: SetupSelectionEntry["harness"]): SetupAdapter {
  if (harness === codexAdapter.harness) return codexAdapter;
  throw new Error(`unsupported setup harness: ${harness}`);
}
