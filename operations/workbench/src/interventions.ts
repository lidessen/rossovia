import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
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
type Observation = z.infer<typeof ObservationSchema>;
type Receipt = z.infer<typeof ReceiptSchema>;

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

function receiptWitnessDirectory(path: string): string {
  return `${path}.receipts`;
}

function observationWitnessDirectory(path: string): string {
  return `${path}.observations`;
}

function readStateSource(path: string): State {
  if (!existsSync(path)) throw new Error(`intervention state not found: ${path}`);
  return StateSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function readState(path: string): State {
  const state = readStateSource(path);
  const observationDirectory = observationWitnessDirectory(path);
  const observations = [...state.observations];
  if (existsSync(observationDirectory)) {
    const entries = readdirSync(observationDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      observations.push(ObservationSchema.parse(
        JSON.parse(readFileSync(join(observationDirectory, entry.name), "utf8")),
      ));
    }
  }

  const receiptDirectory = receiptWitnessDirectory(path);
  const receipts = [...state.receipts];
  if (existsSync(receiptDirectory)) {
    const entries = readdirSync(receiptDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      receipts.push(ReceiptSchema.parse(JSON.parse(readFileSync(join(receiptDirectory, entry.name), "utf8"))));
    }
  }
  return StateSchema.parse({ ...state, observations: observations.slice(-50), receipts });
}

function persistenceError(path: string, error: unknown): Error {
  return new Error(
    `cannot persist Rossovia state at ${path}: ${error instanceof Error ? error.message : String(error)}. `
    + "The current runtime must grant write access to this exact state location.",
  );
}

function witnessFilename(): string {
  return [
    Date.now().toString().padStart(13, "0"),
    process.hrtime.bigint().toString().padStart(20, "0"),
    process.pid,
    randomUUID(),
  ].join("-") + ".json";
}

function persistObservationWitness(path: string, observation: Observation): void {
  try {
    saveJson(
      join(observationWitnessDirectory(path), witnessFilename()),
      ObservationSchema.parse(observation),
    );
  } catch (error: unknown) {
    throw persistenceError(path, error);
  }
}

function persistReceiptWitness(path: string, receipt: Receipt): void {
  try {
    saveJson(join(receiptWitnessDirectory(path), witnessFilename()), ReceiptSchema.parse(receipt));
  } catch (error: unknown) {
    throw persistenceError(path, error);
  }
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
    if (existsSync(path)) {
      readStateSource(path);
    } else {
      saveJson(path, StateSchema.parse({
          version: "intervention-reconciliation.v2",
          sessionId: payload.session_id,
          workspace: resolve(payload.cwd),
          observations: [],
          receipts: [],
      }));
    }
    const observation = {
      turnId: payload.turn_id,
      at: now(),
      promptSha256: digest(payload.prompt),
      promptBytes: Buffer.byteLength(payload.prompt),
    };
    persistObservationWitness(path, observation);
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
  readState(path);
  const receipt = ReceiptSchema.parse({
    at: now(),
    rejectedAssumption: option(parsed, "--rejected-assumption"),
    newInvariant: option(parsed, "--new-invariant"),
    affectedSurfaces: repeatedOption(parsed, "--affected-surface"),
    nextProbe: option(parsed, "--next-probe"),
  });
  persistReceiptWitness(path, receipt);
  return { statePath: path, receipt };
}
