import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

export const EFFECT_JOURNAL_EVENT_VERSION = "rosso.effect-journal-event.v1" as const;

const IdSchema = z.string().min(1);
const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const GitObjectSchema = z.string().regex(/^[a-f0-9]{40,64}$/);
const EvidenceRefSchema = z.string().min(1);

const RelativeScopeSchema = z.string().min(1).refine(
  (value) => value === "." || isSafeRelativePath(value),
  "write scope must be a relative path without parent traversal",
);

const RelativeFileSchema = z.string().min(1).refine(
  (value) => value !== "." && isSafeRelativePath(value),
  "file path must be a relative path without parent traversal",
);

const UniqueScopesSchema = z.array(RelativeScopeSchema).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "write paths must be unique" });
  }
});

export const EffectPreparedDataSchema = z.object({
  missionId: IdSchema,
  turnId: IdSchema,
  cellId: IdSchema,
  worktree: z.object({
    root: z.string().min(1).refine(isAbsolute, "worktree root must be absolute"),
    baseHead: GitObjectSchema,
    baselineDigest: DigestSchema,
  }).strict(),
  writePaths: UniqueScopesSchema,
  allowedCommands: z.tuple([]),
  authority: z.literal("withheld"),
}).strict();

export const EffectStartedDataSchema = z.object({}).strict();

export const EffectRunObservedDataSchema = z.object({
  runId: IdSchema,
}).strict();

export const EffectToolStartedDataSchema = z.object({
  toolCallId: IdSchema,
  tool: z.literal("write_file"),
  path: RelativeFileSchema,
}).strict();

export const EffectToolFinishedDataSchema = z.object({
  toolCallId: IdSchema,
  tool: z.literal("write_file"),
  path: RelativeFileSchema,
  outcome: z.enum(["written", "failed", "cancelled"]),
}).strict();

export const EffectQuiescedDataSchema = z.object({
  reason: z.enum(["completed", "paused", "cancelled", "failed"]),
  activeToolCalls: z.tuple([]),
}).strict();

const OutsideScopeSchema = z.object({
  verdict: z.enum(["clear", "violated"]),
  paths: z.array(RelativeFileSchema),
}).strict().superRefine((value, context) => {
  if (value.verdict === "clear" && value.paths.length !== 0) {
    context.addIssue({ code: "custom", path: ["paths"], message: "clear outside-scope verdict cannot name paths" });
  }
  if (value.verdict === "violated" && value.paths.length === 0) {
    context.addIssue({ code: "custom", path: ["paths"], message: "violated outside-scope verdict must name paths" });
  }
});

const MechanicalAcceptanceSchema = z.object({
  verdict: z.enum(["passed", "failed"]),
  evidenceRefs: z.array(EvidenceRefSchema).min(1),
}).strict();

const IndependentAcceptanceSchema = z.object({
  verdict: z.enum(["not-run", "passed", "failed"]),
  evidenceRefs: z.array(EvidenceRefSchema),
}).strict().superRefine((value, context) => {
  if (value.verdict === "not-run" && value.evidenceRefs.length !== 0) {
    context.addIssue({ code: "custom", path: ["evidenceRefs"], message: "not-run acceptance cannot claim evidence" });
  }
  if (value.verdict !== "not-run" && value.evidenceRefs.length === 0) {
    context.addIssue({ code: "custom", path: ["evidenceRefs"], message: "completed acceptance requires evidence" });
  }
});

const PrincipalAcceptanceSchema = z.object({
  verdict: z.literal("withheld"),
  evidenceRefs: z.tuple([]),
}).strict();

export const EffectVerifiedDataSchema = z.object({
  verifierRef: EvidenceRefSchema,
  verdict: z.enum(["passed", "failed"]),
  checks: z.array(z.object({
    command: z.string().min(1),
    exitCode: z.number().int(),
    outputDigest: DigestSchema,
  }).strict()).min(1),
  evidenceRefs: z.array(EvidenceRefSchema).min(1),
  subject: z.object({
    gitHead: GitObjectSchema,
    files: z.array(z.object({
      path: RelativeFileSchema,
      sha256: DigestSchema.nullable(),
    }).strict()).min(1).superRefine((files, context) => {
      if (new Set(files.map((file) => file.path)).size !== files.length) {
        context.addIssue({ code: "custom", message: "verification subject paths must be unique" });
      }
    }),
  }).strict().optional(),
}).strict();

export const EffectSettledDataSchema = z.object({
  patch: z.object({
    ref: EvidenceRefSchema,
    digest: DigestSchema,
  }).strict(),
  changedPaths: z.array(RelativeFileSchema).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: "changed paths must be unique" });
    }
  }),
  outsideScope: OutsideScopeSchema,
  acceptance: z.object({
    mechanical: MechanicalAcceptanceSchema,
    independent: IndependentAcceptanceSchema,
    principal: PrincipalAcceptanceSchema,
  }).strict(),
}).strict();

export const EffectUncertainDataSchema = z.object({
  reason: z.enum([
    "process-crash",
    "settlement-missing",
    "effect-observation-incomplete",
  ]),
  evidenceRefs: z.array(EvidenceRefSchema),
}).strict();

const DraftCommonSchema = {
  effectId: IdSchema,
};

export const EffectJournalEventDraftSchema = z.discriminatedUnion("type", [
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-prepared"),
    data: EffectPreparedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-started"),
    data: EffectStartedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-run-observed"),
    data: EffectRunObservedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("tool-started"),
    data: EffectToolStartedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("tool-finished"),
    data: EffectToolFinishedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-quiesced"),
    data: EffectQuiescedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-settled"),
    data: EffectSettledDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-verified"),
    data: EffectVerifiedDataSchema,
  }).strict(),
  z.object({
    ...DraftCommonSchema,
    type: z.literal("effect-uncertain"),
    data: EffectUncertainDataSchema,
  }).strict(),
]);

const EventCommonSchema = {
  version: z.literal(EFFECT_JOURNAL_EVENT_VERSION),
  eventId: IdSchema,
  effectId: IdSchema,
  sequence: z.number().int().nonnegative(),
  at: z.string().datetime({ offset: true }),
};

export const EffectJournalEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-prepared"),
    data: EffectPreparedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-started"),
    data: EffectStartedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-run-observed"),
    data: EffectRunObservedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("tool-started"),
    data: EffectToolStartedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("tool-finished"),
    data: EffectToolFinishedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-quiesced"),
    data: EffectQuiescedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-settled"),
    data: EffectSettledDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-verified"),
    data: EffectVerifiedDataSchema,
  }).strict(),
  z.object({
    ...EventCommonSchema,
    type: z.literal("effect-uncertain"),
    data: EffectUncertainDataSchema,
  }).strict(),
]);

export type EffectPreparedData = z.infer<typeof EffectPreparedDataSchema>;
export type EffectToolStartedData = z.infer<typeof EffectToolStartedDataSchema>;
export type EffectToolFinishedData = z.infer<typeof EffectToolFinishedDataSchema>;
export type EffectQuiescedData = z.infer<typeof EffectQuiescedDataSchema>;
export type EffectSettledData = z.infer<typeof EffectSettledDataSchema>;
export type EffectVerifiedData = z.infer<typeof EffectVerifiedDataSchema>;
export type EffectUncertainData = z.infer<typeof EffectUncertainDataSchema>;
export type EffectJournalEventDraft = z.infer<typeof EffectJournalEventDraftSchema>;
export type EffectJournalEvent = z.infer<typeof EffectJournalEventSchema>;

export interface EffectToolActivity {
  readonly toolCallId: string;
  readonly tool: "write_file";
  readonly path: string;
  readonly status: "started" | "finished";
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly outcome?: "written" | "failed" | "cancelled";
}

export interface EffectActivity {
  readonly effectId: string;
  readonly state: "prepared" | "started" | "quiesced" | "settled" | "uncertain";
  readonly prepared: EffectPreparedData;
  readonly runId?: string;
  readonly tools: readonly EffectToolActivity[];
  readonly settlement?: EffectSettledData;
  readonly independentVerification?: EffectVerifiedData;
  readonly uncertainty?: EffectUncertainData;
  readonly lastEventId: string;
  readonly lastSequence: number;
}

/**
 * Rebuild the current effect activity from immutable journal facts. This is a
 * projection only: it does not grant execution or acceptance authority.
 */
export function projectEffectActivity(
  unparsedEvents: readonly unknown[],
): EffectActivity | undefined {
  if (unparsedEvents.length === 0) return undefined;
  const events = unparsedEvents.map((value) => EffectJournalEventSchema.parse(value));
  const first = events[0];
  if (first?.type !== "effect-prepared") {
    throw new Error("an effect journal must begin with effect-prepared");
  }

  const effectId = first.effectId;
  let state: EffectActivity["state"] = "prepared";
  const tools = new Map<string, EffectToolActivity>();
  let settlement: EffectSettledData | undefined;
  let uncertainty: EffectUncertainData | undefined;
  let runId: string | undefined;
  let independentVerification: EffectVerifiedData | undefined;

  for (const [index, event] of events.entries()) {
    if (event.effectId !== effectId) {
      throw new Error(`effect ${effectId} contains an event for ${event.effectId}`);
    }
    if (event.sequence !== index) {
      throw new Error(`effect ${effectId} has invalid sequence ${event.sequence} at event ${index}`);
    }
    if (index === 0) continue;
    if (state === "uncertain") {
      throw new Error(`effect ${effectId} cannot append ${event.type} after ${state}`);
    }
    if (state === "settled" && event.type !== "effect-verified") {
      throw new Error(`effect ${effectId} cannot append ${event.type} after ${state}`);
    }

    switch (event.type) {
      case "effect-prepared":
        throw new Error(`effect ${effectId} was prepared more than once`);
      case "effect-started":
        if (state !== "prepared") throw invalidTransition(effectId, event.type, state);
        state = "started";
        break;
      case "effect-run-observed":
        if (state !== "started") throw invalidTransition(effectId, event.type, state);
        if (runId !== undefined) throw new Error(`effect ${effectId} observed more than one run identity`);
        runId = event.data.runId;
        break;
      case "tool-started": {
        if (state !== "started") throw invalidTransition(effectId, event.type, state);
        if (runId === undefined) {
          throw new Error(`effect ${effectId} cannot observe a tool before its run identity`);
        }
        if (tools.has(event.data.toolCallId)) {
          throw new Error(`effect ${effectId} tool call ${event.data.toolCallId} was already observed`);
        }
        tools.set(event.data.toolCallId, {
          toolCallId: event.data.toolCallId,
          tool: event.data.tool,
          path: event.data.path,
          status: "started",
          startedAt: event.at,
        });
        break;
      }
      case "tool-finished": {
        if (state !== "started") throw invalidTransition(effectId, event.type, state);
        const started = tools.get(event.data.toolCallId);
        if (started === undefined || started.status !== "started") {
          throw new Error(`effect ${effectId} tool call ${event.data.toolCallId} has no active start`);
        }
        if (started.tool !== event.data.tool || started.path !== event.data.path) {
          throw new Error(`effect ${effectId} tool call ${event.data.toolCallId} changed its safe projection`);
        }
        tools.set(event.data.toolCallId, {
          ...started,
          status: "finished",
          finishedAt: event.at,
          outcome: event.data.outcome,
        });
        break;
      }
      case "effect-quiesced":
        if (state !== "started") throw invalidTransition(effectId, event.type, state);
        if ([...tools.values()].some((tool) => tool.status === "started")) {
          throw new Error(`effect ${effectId} cannot quiesce with active tool calls`);
        }
        state = "quiesced";
        break;
      case "effect-settled":
        if (state !== "quiesced") throw invalidTransition(effectId, event.type, state);
        assertOutsideScopeVerdict(effectId, first.data.writePaths, event.data);
        settlement = event.data;
        state = "settled";
        break;
      case "effect-verified":
        if (state !== "settled") throw invalidTransition(effectId, event.type, state);
        if (independentVerification !== undefined) {
          throw new Error(`effect ${effectId} already has independent verification`);
        }
        independentVerification = event.data;
        break;
      case "effect-uncertain":
        uncertainty = event.data;
        state = "uncertain";
        break;
    }
  }

  const last = events.at(-1)!;
  return {
    effectId,
    state,
    prepared: first.data,
    ...(runId === undefined ? {} : { runId }),
    tools: [...tools.values()],
    ...(settlement === undefined ? {} : { settlement }),
    ...(independentVerification === undefined ? {} : { independentVerification }),
    ...(uncertainty === undefined ? {} : { uncertainty }),
    lastEventId: last.eventId,
    lastSequence: last.sequence,
  };
}

/**
 * Local append-only effect journal. Writes are process-serialized and fsynced;
 * this does not claim cross-process writer coordination.
 */
export class FileEffectJournal {
  private readonly locks = new Map<string, Promise<void>>();
  private readonly root: string;

  constructor(
    root: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.root = resolve(root);
  }

  effectPath(effectId: string): string {
    const parsed = IdSchema.parse(effectId);
    const key = createHash("sha256").update(parsed).digest("hex");
    return join(this.root, "effects", key.slice(0, 2), `${key}.jsonl`);
  }

  async prepare(effectId: string, data: EffectPreparedData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-prepared", data });
  }

  async start(effectId: string): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-started", data: {} });
  }

  async observeRun(effectId: string, runId: string): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-run-observed", data: { runId } });
  }

  async toolStarted(effectId: string, data: EffectToolStartedData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "tool-started", data });
  }

  async toolFinished(effectId: string, data: EffectToolFinishedData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "tool-finished", data });
  }

  async quiesce(effectId: string, data: EffectQuiescedData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-quiesced", data });
  }

  async settle(effectId: string, data: EffectSettledData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-settled", data });
  }

  async verify(effectId: string, data: EffectVerifiedData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-verified", data });
  }

  async uncertain(effectId: string, data: EffectUncertainData): Promise<EffectJournalEvent> {
    return await this.append({ effectId, type: "effect-uncertain", data });
  }

  async append(unparsedDraft: EffectJournalEventDraft): Promise<EffectJournalEvent> {
    const draft = EffectJournalEventDraftSchema.parse(unparsedDraft);
    let appended!: EffectJournalEvent;
    await this.withLock(draft.effectId, async () => {
      const path = this.effectPath(draft.effectId);
      await repairIncompleteTail(path);
      const events = await this.read(draft.effectId);
      const event = EffectJournalEventSchema.parse({
        version: EFFECT_JOURNAL_EVENT_VERSION,
        eventId: randomUUID(),
        effectId: draft.effectId,
        sequence: events.length,
        at: this.now(),
        type: draft.type,
        data: draft.data,
      });
      projectEffectActivity([...events, event]);
      await mkdir(dirname(path), { recursive: true });
      const handle = await open(path, "a");
      try {
        await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      appended = event;
    });
    return appended;
  }

  async read(effectId: string): Promise<readonly EffectJournalEvent[]> {
    const parsedId = IdSchema.parse(effectId);
    let content: string;
    try {
      content = await readFile(this.effectPath(parsedId), "utf8");
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    const completeContent = content.endsWith("\n")
      ? content
      : content.slice(0, content.lastIndexOf("\n") + 1);
    const events = completeContent.split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new Error(`effect ${parsedId} contains invalid JSON at line ${index + 1}`, { cause: error });
      }
      const event = EffectJournalEventSchema.parse(value);
      if (event.effectId !== parsedId) {
        throw new Error(`effect ${parsedId} contains event for ${event.effectId}`);
      }
      if (event.sequence !== index) {
        throw new Error(`effect ${parsedId} has invalid sequence ${event.sequence} at line ${index + 1}`);
      }
      return event;
    });
    projectEffectActivity(events);
    return events;
  }

  async activity(effectId: string): Promise<EffectActivity | undefined> {
    return projectEffectActivity(await this.read(effectId));
  }

  private async withLock(effectId: string, action: () => Promise<void>): Promise<void> {
    const previous = this.locks.get(effectId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolvePromise) => { release = resolvePromise; });
    const tail = previous.then(() => current);
    this.locks.set(effectId, tail);
    await previous;
    try {
      await action();
    } finally {
      release();
      if (this.locks.get(effectId) === tail) this.locks.delete(effectId);
    }
  }
}

function invalidTransition(effectId: string, type: EffectJournalEvent["type"], state: EffectActivity["state"]): Error {
  return new Error(`effect ${effectId} cannot append ${type} while ${state}`);
}

function isSafeRelativePath(value: string): boolean {
  if (value.includes("\0") || isAbsolute(value) || value.includes("\\")) return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function assertOutsideScopeVerdict(
  effectId: string,
  writePaths: readonly string[],
  settlement: EffectSettledData,
): void {
  const actualOutside = settlement.changedPaths.filter((path) =>
    !writePaths.some((scope) => scope === "." || path === scope || path.startsWith(`${scope}/`))
  ).sort();
  const claimedOutside = [...settlement.outsideScope.paths].sort();
  if (
    actualOutside.length !== claimedOutside.length ||
    actualOutside.some((path, index) => path !== claimedOutside[index])
  ) {
    throw new Error(`effect ${effectId} outside-scope verdict does not match its changed paths`);
  }
  const expectedVerdict = actualOutside.length === 0 ? "clear" : "violated";
  if (settlement.outsideScope.verdict !== expectedVerdict) {
    throw new Error(`effect ${effectId} outside-scope verdict must be ${expectedVerdict}`);
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "ENOENT";
}

async function repairIncompleteTail(path: string): Promise<void> {
  let handle;
  try {
    handle = await open(path, "r+");
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  try {
    const content = await handle.readFile("utf8");
    if (content.length === 0 || content.endsWith("\n")) return;
    const lastNewline = content.lastIndexOf("\n");
    await handle.truncate(lastNewline < 0 ? 0 : Buffer.byteLength(content.slice(0, lastNewline + 1), "utf8"));
    await handle.sync();
  } finally {
    await handle.close();
  }
}
