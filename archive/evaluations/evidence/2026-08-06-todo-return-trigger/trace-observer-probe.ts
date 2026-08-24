import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

interface ToolEvent {
  order: number;
  id: string;
  name: string;
  path?: string;
  outcome?: string;
}

interface ObservedTrace {
  version: "work-cell.run.v4.host-trace.v1";
  events: ToolEvent[];
  successfulReads: string[];
  successfulWrites: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const prior = join(
  here,
  "../2026-08-06-todo-obligation-carrier/results/todo-obligation-carrier-development-HDMuik",
);

const records = {
  passLike: join(
    prior,
    "r1-clinic-notice-return-obligation-arm-obligation/record.json",
  ),
  groupedSequence: join(
    prior,
    "r1-clinic-notice-return-obligation-arm-ceremony/record.json",
  ),
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(object: JsonObject, key: string, context: string): string {
  const value = object[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

export function observeHostTrace(record: unknown): ObservedTrace {
  if (!isObject(record) || record.version !== "work-cell.run.v4") {
    throw new Error("unsupported Work Cell record version");
  }
  if (!Array.isArray(record.trace)) {
    throw new Error("unsupported Work Cell record: trace[] is required");
  }

  const started = new Map<string, ToolEvent>();
  const successfulReads: string[] = [];
  const successfulWrites: string[] = [];
  for (const [order, entry] of record.trace.entries()) {
    if (!isObject(entry) || typeof entry.type !== "string") continue;
    if (entry.type === "tool.read_file" || entry.type === "tool.write_file") {
      if (!isObject(entry.data)) {
        throw new Error(`trace[${order}] ${entry.type} lacks data`);
      }
      const path = requiredString(entry.data, "path", `trace[${order}].data`);
      (entry.type === "tool.read_file" ? successfulReads : successfulWrites).push(path);
      continue;
    }
    if (entry.type === "agent.tool.started") {
      if (!isObject(entry.data)) {
        throw new Error(`trace[${order}] agent.tool.started lacks data`);
      }
      const id = requiredString(entry.data, "id", `trace[${order}].data`);
      const name = requiredString(entry.data, "name", `trace[${order}].data`);
      const target = isObject(entry.data.target) ? entry.data.target : undefined;
      const isFileTool = name === "read_file" || name === "write_file";
      if (isFileTool && (!target || target.kind !== "workspace-path")) {
        throw new Error(`trace[${order}] ${name} requires a workspace-path target`);
      }
      const path = target?.kind === "workspace-path"
        ? requiredString(target, "path", `trace[${order}].data.target`)
        : undefined;
      if (started.has(id)) throw new Error(`duplicate tool call id: ${id}`);
      started.set(id, { order, id, name, ...(path ? { path } : {}) });
      continue;
    }
    if (entry.type === "agent.tool.finished") {
      if (!isObject(entry.data)) {
        throw new Error(`trace[${order}] agent.tool.finished lacks data`);
      }
      const id = requiredString(entry.data, "id", `trace[${order}].data`);
      const event = started.get(id);
      if (!event) throw new Error(`tool finish without start: ${id}`);
      if (event.outcome) throw new Error(`duplicate tool finish: ${id}`);
      const name = requiredString(entry.data, "name", `trace[${order}].data`);
      if (name !== event.name) {
        throw new Error(`tool finish name mismatch for ${id}: ${event.name} -> ${name}`);
      }
      const outcome = requiredString(entry.data, "outcome", `trace[${order}].data`);
      if (outcome !== "tool-result" && outcome !== "tool-error") {
        throw new Error(`unsupported tool outcome for ${id}: ${outcome}`);
      }
      event.outcome = outcome;
    }
  }

  const events = [...started.values()].sort((left, right) => left.order - right.order);
  if (events.length === 0) {
    throw new Error("unsupported Work Cell trace: no agent.tool.started events");
  }
  const successful = events.filter((event) => event.outcome === "tool-result");
  const lifecycleReads = successful
    .filter((event) => event.name === "read_file")
    .map((event) => event.path!)
    .sort();
  const lifecycleWrites = successful
    .filter((event) => event.name === "write_file")
    .map((event) => event.path!)
    .sort();
  const observedReads = [...successfulReads].sort();
  const observedWrites = [...successfulWrites].sort();
  if (JSON.stringify(lifecycleReads) !== JSON.stringify(observedReads)
    || JSON.stringify(lifecycleWrites) !== JSON.stringify(observedWrites)) {
    throw new Error("host trace tool lifecycle and file-operation evidence diverge");
  }
  return {
    version: "work-cell.run.v4.host-trace.v1",
    events,
    successfulReads,
    successfulWrites,
  };
}

function hasWriteBetween(writes: string[], first: string, middle: string, last: string): boolean {
  const firstIndex = writes.indexOf(first);
  const lastIndex = writes.indexOf(last, firstIndex + 1);
  return firstIndex >= 0
    && lastIndex > firstIndex
    && writes.slice(firstIndex + 1, lastIndex).includes(middle);
}

function removeOneTerminalLf(value: string): string {
  return value.endsWith("\n") ? value.slice(0, -1) : value;
}

async function settlementObservation(recordPath: string, record: JsonObject) {
  if (!isObject(record.output)) throw new Error(`${recordPath}: output object is required`);
  const workspace = join(dirname(recordPath), "workspace");
  const notice = requiredString(record.output, "notice", `${recordPath}.output`);
  const index = requiredString(record.output, "indexSummary", `${recordPath}.output`);
  const [draft, companion] = await Promise.all([
    readFile(join(workspace, "draft.md"), "utf8"),
    readFile(join(workspace, "appointments-index.md"), "utf8"),
  ]);
  return {
    notice: {
      byteExact: notice === draft,
      oneTerminalLfNormalized: removeOneTerminalLf(notice) === removeOneTerminalLf(draft),
    },
    indexSummary: {
      byteExact: index === companion,
      oneTerminalLfNormalized: removeOneTerminalLf(index) === removeOneTerminalLf(companion),
    },
  };
}

async function loadRecord(path: string): Promise<JsonObject> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isObject(parsed)) throw new Error(`${path}: record must be an object`);
  return parsed;
}

function assertVisibleFailure(label: string, record: unknown) {
  try {
    observeHostTrace(record);
  } catch {
    return;
  }
  throw new Error(`${label} silently passed observation`);
}

function malformedTraceCases() {
  const baseStart = {
    at: "2026-08-06T00:00:00.000Z",
    type: "agent.tool.started",
    data: {
      id: "call-1",
      name: "write_file",
      target: { kind: "workspace-path", path: "primary.ts" },
    },
  };
  const baseFinish = {
    at: "2026-08-06T00:00:00.001Z",
    type: "agent.tool.finished",
    data: {
      id: "call-1",
      name: "write_file",
      outcome: "tool-result",
    },
  };
  const operation = {
    at: "2026-08-06T00:00:00.001Z",
    type: "tool.write_file",
    data: { path: "primary.ts", characters: 1 },
  };
  return {
    unknownTarget: {
      version: "work-cell.run.v4",
      trace: [{ ...baseStart, data: { ...baseStart.data, target: { kind: "future-path", path: "primary.ts" } } }],
    },
    unknownOutcome: {
      version: "work-cell.run.v4",
      trace: [baseStart, operation, {
        ...baseFinish,
        data: { ...baseFinish.data, outcome: "success" },
      }],
    },
    mismatchedFinish: {
      version: "work-cell.run.v4",
      trace: [baseStart, operation, {
        ...baseFinish,
        data: { ...baseFinish.data, name: "read_file" },
      }],
    },
    duplicateFinish: {
      version: "work-cell.run.v4",
      trace: [baseStart, operation, baseFinish, baseFinish],
    },
    mismatchedOperationPath: {
      version: "work-cell.run.v4",
      trace: [baseStart, {
        ...operation,
        data: { ...operation.data, path: "companion.ts" },
      }, baseFinish],
    },
  };
}

async function main() {
  const [passRecord, groupedRecord] = await Promise.all([
    loadRecord(records.passLike),
    loadRecord(records.groupedSequence),
  ]);
  const pass = observeHostTrace(passRecord);
  const grouped = observeHostTrace(groupedRecord);

  const passDiscriminator = hasWriteBetween(
    pass.successfulWrites,
    "draft.md",
    "todo.md",
    "appointments-index.md",
  );
  const groupedDiscriminator = hasWriteBetween(
    grouped.successfulWrites,
    "draft.md",
    "todo.md",
    "appointments-index.md",
  );
  if (!passDiscriminator) {
    throw new Error("known pass-like trace did not expose Todo return state between artifacts");
  }
  if (groupedDiscriminator) {
    throw new Error("known grouped trace unexpectedly exposed Todo return state between artifacts");
  }

  assertVisibleFailure("empty trace", { version: "work-cell.run.v4", trace: [] });
  const malformed = malformedTraceCases();
  for (const [label, record] of Object.entries(malformed)) {
    assertVisibleFailure(label, record);
  }

  const settlement = await settlementObservation(records.passLike, passRecord);
  if (settlement.notice.byteExact || settlement.indexSummary.byteExact) {
    throw new Error("retained settlement unexpectedly became byte-exact");
  }
  if (!settlement.notice.oneTerminalLfNormalized
    || !settlement.indexSummary.oneTerminalLfNormalized) {
    throw new Error("retained settlement differs by more than one terminal LF");
  }

  console.log(JSON.stringify({
    status: "passed",
    observer: pass.version,
    passLike: {
      record: records.passLike,
      successfulWrites: pass.successfulWrites,
      todoWriteBetweenPrimaryAndCompanion: passDiscriminator,
    },
    groupedSequence: {
      record: records.groupedSequence,
      successfulWrites: grouped.successfulWrites,
      todoWriteBetweenPrimaryAndCompanion: groupedDiscriminator,
    },
    malformedShapesFailedVisibly: ["emptyTrace", ...Object.keys(malformed)],
    settlement,
    semanticAcceptance: "not evaluated by this deterministic probe",
  }, null, 2));
}

await main();
