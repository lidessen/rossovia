import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");

describe("project hook bindings", () => {
  test("keep three host projections thin behind the stable launcher", () => {
    const bindings = {
      codex: readJson(".codex/hooks.json"),
      claude: readJson(".claude/settings.json"),
      cursor: readJson(".cursor/hooks.json"),
    };
    const serialized = JSON.stringify(bindings);
    expect(serialized).not.toContain("bun ");
    expect(serialized).not.toContain("transcript_path");
    expect(serialized).not.toContain("jq ");

    expect(commands(bindings.codex)).toEqual([
      "./apps/workbench/rossovia hook intervention codex",
      "./apps/workbench/rossovia hook artifact codex post-tool-use",
      "./apps/workbench/rossovia hook artifact codex stop",
    ]);
    expect(commands(bindings.claude)).toEqual([
      "\"$(git rev-parse --show-toplevel)/apps/workbench/rossovia\" statusline claude",
      "./apps/workbench/rossovia hook intervention claude",
      "./apps/workbench/rossovia hook artifact claude post-tool-use",
      "./apps/workbench/rossovia hook artifact claude stop",
    ]);
    expect(commands(bindings.cursor)).toEqual([
      "./apps/workbench/rossovia hook artifact cursor after-file-edit",
      "./apps/workbench/rossovia hook artifact cursor stop",
    ]);
  });
});

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"));
}

function commands(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(commands);
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [
    ...(typeof record.command === "string" ? [record.command] : []),
    ...Object.values(record).flatMap(commands),
  ];
}
