#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  admitCognitiveArtifact,
  captureSource,
  checkCognitionHome,
  findFormationDependents,
  findSourceDependents,
  getCognitiveArtifact,
  getFormationScheme,
  getSourceRecord,
  initializeCognitionHome,
  proposeCognitiveArtifact,
  queryCognition,
  querySources,
  recordCognitionUse,
  readSourceContent,
  rebuildCatalog,
  registerFormationScheme,
  supersedeCognitiveArtifact,
  traceFormation,
} from "./store";
import { SourceIngressSchema, type FormationInput } from "./contracts";

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(rawArgs: string[]): Promise<void> {
  const { args, home } = extractHome(rawArgs);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(usageText());
    return;
  }
  const [area, action, ...rest] = args;
  if (area === "init") return print({ home: await initializeCognitionHome(home) });
  if (area === "check") {
    const result = await checkCognitionHome(home);
    print(result);
    if (!result.healthy) process.exitCode = 1;
    return;
  }
  if (area === "scheme" && action === "add") {
    const parsed = parse(rest, ["by", "basis"]);
    const definition = JSON.parse(await readFile(resolve(requiredPositional(parsed, 0, "scheme add <file>")), "utf8"));
    return print(await registerFormationScheme(home, definition, parsed.required("by"), parsed.required("basis")));
  }
  if (area === "scheme" && action === "get") {
    const parsed = parse(rest, ["revision"]);
    return print(await getFormationScheme(home, requiredPositional(parsed, 0, "scheme get <id>"), parsed.required("revision")));
  }
  if (area === "source" && action === "add") {
    const parsed = parse(rest, ["kind", "locator", "metadata", "after", "actor"]);
    const file = requiredPositional(parsed, 0, "source add <file>");
    const predecessorId = parsed.one("after");
    return print(await captureSource(home, {
      kind: parsed.required("kind"),
      locator: parsed.one("locator") ?? file,
      content: await readFile(resolve(file)),
      metadata: parsed.one("metadata") ? JSON.parse(parsed.one("metadata")!) : {},
      ...(predecessorId ? { predecessorId } : {}),
      actor: parsed.one("actor") ?? "human:cli",
    }));
  }
  if (area === "source" && action === "ingest") {
    const parsed = parse(rest, []);
    if (parsed.positionals.length > 0) throw new Error("source ingest reads one JSON object from stdin");
    const ingress = SourceIngressSchema.parse(JSON.parse(await new Response(Bun.stdin.stream()).text()));
    return print(await captureSource(home, {
      kind: ingress.kind,
      locator: ingress.locator,
      content: new TextEncoder().encode(ingress.content),
      metadata: ingress.metadata ?? {},
      ...(ingress.predecessorId ? { predecessorId: ingress.predecessorId } : {}),
      actor: ingress.actor,
    }));
  }
  if (area === "source" && action === "get") {
    const parsed = parse(rest, []);
    return print(await getSourceRecord(home, requiredPositional(parsed, 0, "source get <id>")));
  }
  if (area === "source" && action === "read") {
    const parsed = parse(rest, []);
    process.stdout.write(await readSourceContent(home, requiredPositional(parsed, 0, "source read <id>")));
    return;
  }
  if (area === "source" && action === "query") {
    const parsed = parse(rest, ["kind", "limit"]);
    const kind = parsed.one("kind");
    const limit = parsed.one("limit");
    return print(await querySources(home, parsed.positionals.join(" "), {
      ...(kind ? { kind } : {}),
      ...(limit ? { limit: positiveInteger(limit, "--limit") } : {}),
    }));
  }
  if (area === "source" && action === "dependents") {
    const parsed = parse(rest, []);
    return print(await findSourceDependents(home, requiredPositional(parsed, 0, "source dependents <id>")));
  }
  if (area === "artifact" && action === "propose") {
    const parsed = parse(rest, ["scheme", "revision", "move", "title", "body-file", "rationale", "input", "limitation", "tag", "actor"]);
    return print(await proposeCognitiveArtifact(home, {
      scheme: { id: parsed.required("scheme"), revision: parsed.required("revision") },
      moveId: parsed.required("move"),
      title: parsed.required("title"),
      body: await readFile(resolve(parsed.required("body-file")), "utf8"),
      rationale: parsed.required("rationale"),
      inputs: parsed.many("input").map(parseFormationInput),
      limitations: parsed.many("limitation"),
      tags: parsed.many("tag"),
      actor: parsed.one("actor") ?? "agent:cli",
    }));
  }
  if (area === "artifact" && action === "admit") {
    const parsed = parse(rest, ["by", "basis"]);
    return print(await admitCognitiveArtifact(home, requiredPositional(parsed, 0, "artifact admit <id>"), parsed.required("by"), parsed.required("basis")));
  }
  if (area === "artifact" && action === "get") {
    const parsed = parse(rest, []);
    return print(await getCognitiveArtifact(home, requiredPositional(parsed, 0, "artifact get <id>")));
  }
  if (area === "artifact" && action === "trace") {
    const parsed = parse(rest, []);
    return print(await traceFormation(home, requiredPositional(parsed, 0, "artifact trace <id>")));
  }
  if (area === "artifact" && action === "dependents") {
    const parsed = parse(rest, []);
    return print(await findFormationDependents(home, requiredPositional(parsed, 0, "artifact dependents <id>")));
  }
  if (area === "artifact" && action === "use") {
    const parsed = parse(rest, ["by", "purpose"]);
    return print(await recordCognitionUse(home, requiredPositional(parsed, 0, "artifact use <id>"), parsed.required("by"), parsed.required("purpose")));
  }
  if (area === "artifact" && action === "supersede") {
    const parsed = parse(rest, ["with", "by", "basis"]);
    return print(await supersedeCognitiveArtifact(home, requiredPositional(parsed, 0, "artifact supersede <id>"), parsed.required("with"), parsed.required("by"), parsed.required("basis")));
  }
  if (area === "query") {
    const parsed = parse([action, ...rest].filter((value): value is string => Boolean(value)), ["scheme", "stage", "status", "limit"]);
    const schemeId = parsed.one("scheme");
    const stage = parsed.one("stage");
    const status = cognitionStatus(parsed.one("status"));
    const limit = parsed.one("limit");
    return print(await queryCognition(home, parsed.positionals.join(" "), {
      ...(schemeId ? { schemeId } : {}),
      ...(stage ? { stage } : {}),
      ...(status ? { status } : {}),
      ...(limit ? { limit: positiveInteger(limit, "--limit") } : {}),
    }));
  }
  if (area === "index" && action === "rebuild") return print({ entries: (await rebuildCatalog(home)).entries.length });
  usage();
}

function parseFormationInput(value: string): FormationInput {
  const separator = value.indexOf(":");
  if (separator < 1) throw new Error("--input must be source:<id> or artifact:<id>");
  const type = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!id) throw new Error("--input id must be non-empty");
  if (type === "source" || type === "artifact") return { type, id };
  throw new Error("--input must be source:<id> or artifact:<id>");
}

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)); }

function extractHome(args: string[]): { args: string[]; home: string } {
  const retained: string[] = [];
  let home = process.env.ATTHIS_COGNITION_HOME ?? resolve(homedir(), ".atthis/cognition");
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--home") { retained.push(args[index]!); continue; }
    const value = args[index + 1];
    if (!value) throw new Error("--home requires a path");
    home = value;
    index += 1;
  }
  return { args: retained, home: resolve(home) };
}

function parse(args: string[], allowedFlags: string[]) {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index]!;
    if (!item.startsWith("--")) { positionals.push(item); continue; }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${item} requires a value`);
    const name = item.slice(2);
    if (!allowedFlags.includes(name)) throw new Error(`unknown option: ${item}`);
    flags.set(name, [...(flags.get(name) ?? []), value]);
    index += 1;
  }
  return {
    positionals,
    many: (name: string) => flags.get(name) ?? [],
    one: (name: string) => { const values = flags.get(name); if (values && values.length > 1) throw new Error(`--${name} may be supplied only once`); return values?.[0]; },
    required(name: string) { const value = this.one(name); if (!value) throw new Error(`--${name} is required`); return value; },
  };
}

function requiredPositional(parsed: ReturnType<typeof parse>, index: number, usageText: string): string {
  const value = parsed.positionals[index];
  if (!value) throw new Error(`usage: cognition ${usageText}`);
  return value;
}

function positiveInteger(value: string, label: string): number { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`); return parsed; }
function cognitionStatus(value: string | undefined): "proposed" | "active" | "superseded" | undefined { if (value === undefined || value === "proposed" || value === "active" || value === "superseded") return value; throw new Error("--status must be proposed, active, or superseded"); }

function usage(): never {
  throw new Error(usageText());
}

function usageText(): string {
  return [
    "usage:",
    "  cognition init [--home path]",
    "  cognition scheme add <file> --by <actor> --basis <reason>",
    "  cognition scheme get <id> --revision <revision>",
    "  cognition source add <file> --kind <kind> [--locator <locator>] [--metadata <json>] [--after <source-id>] [--actor <actor>]",
    "  cognition source ingest < JSON",
    "  cognition source get|read <id>",
    "  cognition source query [text] [--kind <kind>] [--limit <n>]",
    "  cognition source dependents <id>",
    "  cognition artifact propose --scheme <id> --revision <revision> --move <id> --title <title> --body-file <path> --rationale <reason> --input <source:id|artifact:id>",
    "  cognition artifact admit <id> --by <actor> --basis <reason>",
    "  cognition artifact get|trace|dependents <id>",
    "  cognition artifact use <id> --by <actor> --purpose <decision>",
    "  cognition artifact supersede <id> --with <replacement-id> --by <actor> --basis <reason>",
    "  cognition query [text] [--scheme <id>] [--stage <id>] [--status <status>] [--limit <n>]",
    "  cognition index rebuild",
    "  cognition check",
  ].join("\n");
}
