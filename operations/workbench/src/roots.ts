import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { Roots, WorkspaceIndex } from "./contracts";
import { saveJson, validateIndex, validateRoots } from "./home";
import { expandPath } from "./paths";
import { gitRoot, optionalGit, repositoryBasename, repositoryLocator } from "./workspace";

function foldedCompare(left: string, right: string): number {
  const leftFolded = left.toLowerCase();
  const rightFolded = right.toLowerCase();
  return leftFolded < rightFolded ? -1 : leftFolded > rightFolded ? 1 : 0;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function addRoots(home: string, current: Roots, paths: string[]): Roots {
  const additions = paths.map(expandPath);
  for (const path of additions) {
    if (!isDirectory(path)) throw new Error(`workspace root does not exist or is not a directory: ${path}`);
  }
  const roots = validateRoots({
    version: "rosso.roots.v1",
    roots: [...new Set([...current.roots, ...additions])].sort(foldedCompare),
  });
  saveJson(join(home, "state", "roots.json"), roots);
  return roots;
}

function discoverGitRoots(root: string, maximumDepth = 2): string[] {
  const discovered = new Set<string>();
  const pending: Array<{ path: string; depth: number }> = [{ path: root, depth: 0 }];
  const skipped = new Set(["node_modules", "vendor", "dist", "build"]);

  while (pending.length > 0) {
    const current = pending.shift()!;
    if (existsSync(join(current.path, ".git"))) {
      discovered.add(gitRoot(current.path));
      continue;
    }
    if (current.depth >= maximumDepth) continue;
    let children;
    try {
      children = readdirSync(current.path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !entry.name.startsWith(".") && !skipped.has(entry.name))
        .sort((left, right) => foldedCompare(left.name, right.name));
    } catch (error: unknown) {
      throw new Error(`cannot scan workspace root ${current.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    pending.push(...children.map((entry) => ({ path: join(current.path, entry.name), depth: current.depth + 1 })));
  }
  return [...discovered].sort(foldedCompare);
}

export function scanRoots(home: string, roots: Roots): WorkspaceIndex {
  const entries = new Map<string, WorkspaceIndex["entries"][number]>();
  for (const rawRoot of roots.roots) {
    const root = expandPath(rawRoot);
    if (!isDirectory(root)) throw new Error(`workspace root does not exist or is not a directory: ${root}`);
    for (const repositoryRoot of discoverGitRoots(root)) {
      const rawRepository = optionalGit(["remote", "get-url", "origin"], repositoryRoot);
      const repository = rawRepository === null ? null : repositoryLocator(rawRepository);
      const aliases = new Set([basename(repositoryRoot)]);
      if (repository) aliases.add(repositoryBasename(repository));
      entries.set(realpathSync(repositoryRoot), {
        path: realpathSync(repositoryRoot),
        repository,
        aliases: [...aliases].sort(foldedCompare),
      });
    }
  }
  const index = validateIndex({
    version: "rosso.workspace-index.v1",
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    entries: [...entries.values()].sort((left, right) => foldedCompare(left.path, right.path)),
  });
  saveJson(join(home, "cache", "workspaces.json"), index);
  return index;
}
