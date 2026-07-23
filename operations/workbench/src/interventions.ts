import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { resolveHome, saveJson } from "./home";
import { expandPath } from "./paths";

const ObservationSchema = z.object({
  turnId: z.string().min(1),
  at: z.string().min(1),
  promptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  promptBytes: z.number().int().nonnegative(),
});

const ReceiptSchema = z.object({
  at: z.string().min(1),
  rejectedAssumption: z.string().min(1),
  newInvariant: z.string().min(1),
  affectedSurfaces: z.array(z.string().min(1)).min(1),
  nextProbe: z.string().min(1),
});

const StateSchema = z.object({
  version: z.literal("intervention-reconciliation.v2"),
  sessionId: z.string().min(1),
  workspace: z.string().min(1),
  observations: z.array(ObservationSchema),
  receipts: z.array(ReceiptSchema),
});

const HookPayloadSchema = z.object({
  session_id: z.union([z.string(), z.number()]).transform(String),
  turn_id: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined ? "unknown" : String(value)),
  cwd: z.string().min(1),
  prompt: z.string().optional().default(""),
}).passthrough();

type State = z.infer<typeof StateSchema>;

interface ParsedOptions {
  positionals: string[];
  values: Map<string, string[]>;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stateRoot(value?: string, homeArgument?: string): string {
  return value
    ? expandPath(value)
    : join(resolveHome(homeArgument), "state", "interventions");
}

function workspaceKey(cwd: string): string {
  return digest(resolve(cwd)).slice(0, 24);
}

function statePath(root: string, cwd: string, sessionId: string): string {
  return join(root, workspaceKey(cwd), `${digest(sessionId).slice(0, 32)}.json`);
}

function readState(path: string): State {
  if (!existsSync(path)) throw new Error(`intervention state not found: ${path}`);
  return StateSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function stateForSession(root: string, sessionId: string): string {
  if (!existsSync(root)) throw new Error(`no observed intervention session: ${sessionId}`);
  const filename = `${digest(sessionId).slice(0, 32)}.json`;
  const states = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, filename))
    .filter(existsSync);
  if (states.length === 0) throw new Error(`no observed intervention session: ${sessionId}`);
  if (states.length > 1) throw new Error(`intervention session is ambiguous: ${sessionId}`);
  return states[0]!;
}

function parseOptions(raw: string[], repeated: Set<string> = new Set()): ParsedOptions {
  const positionals: string[] = [];
  const values = new Map<string, string[]>();
  for (let index = 0; index < raw.length; index += 1) {
    const argument = raw[index]!;
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const value = raw[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    if (values.has(argument) && !repeated.has(argument)) throw new Error(`duplicate option: ${argument}`);
    values.set(argument, [...(values.get(argument) ?? []), value]);
    index += 1;
  }
  return { positionals, values };
}

function option(parsed: ParsedOptions, name: string, fallback?: string): string {
  const value = parsed.values.get(name)?.[0] ?? fallback;
  if (value === undefined) throw new Error(`missing required option: ${name}`);
  return value;
}

function repeatedOption(parsed: ParsedOptions, name: string): string[] {
  const values = parsed.values.get(name);
  if (!values?.length) throw new Error(`missing required option: ${name}`);
  return values;
}

function rejectUnknown(parsed: ParsedOptions, allowed: Set<string>): void {
  if (parsed.positionals.length > 0) throw new Error(`unexpected argument: ${parsed.positionals[0]}`);
  for (const name of parsed.values.keys()) {
    if (!allowed.has(name)) throw new Error(`invalid option: ${name}`);
  }
}

function selectedState(parsed: ParsedOptions, homeArgument?: string): string {
  const explicit = parsed.values.get("--state-file")?.[0];
  const sessionId = parsed.values.get("--session-id")?.[0];
  const explicitRoot = parsed.values.get("--state-root")?.[0];
  if (explicit) {
    if (sessionId || explicitRoot) throw new Error("--state-file cannot be combined with --session-id or --state-root");
    return expandPath(explicit);
  }
  if (!sessionId) throw new Error("intervention status requires --state-file or --session-id");
  return stateForSession(stateRoot(explicitRoot, homeArgument), sessionId);
}

export function runInterventionCommand(raw: string[], stdin = "", homeArgument?: string): unknown {
  const command = raw[0];
  if (!command) throw new Error("intervention requires observe or status");
  const parsed = parseOptions(raw.slice(1));

  if (command === "observe") {
    rejectUnknown(parsed, new Set(["--state-root"]));
    const payload = HookPayloadSchema.parse(JSON.parse(stdin || readFileSync(0, "utf8")));
    const root = stateRoot(parsed.values.get("--state-root")?.[0], homeArgument);
    const path = statePath(root, payload.cwd, payload.session_id);
    const state: State = existsSync(path)
      ? readState(path)
      : {
          version: "intervention-reconciliation.v2",
          sessionId: payload.session_id,
          workspace: resolve(payload.cwd),
          observations: [],
          receipts: [],
        };
    const observation = {
      turnId: payload.turn_id,
      at: now(),
      promptSha256: digest(payload.prompt),
      promptBytes: Buffer.byteLength(payload.prompt),
    };
    state.observations = [...state.observations, observation].slice(-50);
    saveJson(path, StateSchema.parse(state));
    return { statePath: path, observation };
  }

  if (command === "status") {
    rejectUnknown(parsed, new Set(["--state-root", "--state-file", "--session-id"]));
    const path = selectedState(parsed, homeArgument);
    const state = readState(path);
    const requestedSession = parsed.values.get("--session-id")?.[0];
    if (requestedSession && state.sessionId !== requestedSession) {
      throw new Error(`intervention state does not belong to session: ${requestedSession}`);
    }
    return {
      statePath: path,
      sessionId: state.sessionId,
      observations: state.observations.length,
      receipts: state.receipts,
    };
  }

  throw new Error(`unknown intervention command: ${command}`);
}

export function runCorrectionCommand(raw: string[]): unknown {
  const parsed = parseOptions(raw, new Set(["--affected-surface"]));
  rejectUnknown(parsed, new Set([
    "--state-file",
    "--rejected-assumption",
    "--new-invariant",
    "--affected-surface",
    "--next-probe",
  ]));
  const path = expandPath(option(parsed, "--state-file"));
  const state = readState(path);
  const receipt = ReceiptSchema.parse({
    at: now(),
    rejectedAssumption: option(parsed, "--rejected-assumption"),
    newInvariant: option(parsed, "--new-invariant"),
    affectedSurfaces: repeatedOption(parsed, "--affected-surface"),
    nextProbe: option(parsed, "--next-probe"),
  });
  state.receipts.push(receipt);
  saveJson(path, StateSchema.parse(state));
  return { statePath: path, receipt };
}
