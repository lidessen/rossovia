import { z } from "zod";
import {
  CellInputSchema,
  ExecutionProfileSchema,
  type CellInput,
  type ExecutionProfile,
} from "./contracts";
import type { CellDriver } from "./driver";

export const WORKER_CARD_VERSION = "work-cell.worker-card.v1" as const;

export const WorkerAvailabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available") }).strict(),
  z.object({ status: z.literal("unavailable"), reason: z.string().min(1) }).strict(),
]);

export const WorkerCardSchema = z.object({
  version: z.literal(WORKER_CARD_VERSION),
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  labels: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
  description: z.string().min(1),
  executionProfile: ExecutionProfileSchema,
  availability: WorkerAvailabilitySchema,
}).strict().superRefine((card, context) => {
  if (new Set(card.labels).size !== card.labels.length) {
    context.addIssue({ code: "custom", path: ["labels"], message: "worker labels must be unique" });
  }
});

export type WorkerAvailability = z.infer<typeof WorkerAvailabilitySchema>;
export type WorkerCard = z.infer<typeof WorkerCardSchema>;

export interface WorkerCatalogEntry {
  readonly card: WorkerCard;
  readonly createDriver: () => CellDriver;
}

/** Generic worker lookup and driver binding. Catalog contents remain host policy. */
export class WorkerCatalog {
  private readonly entries = new Map<string, WorkerCatalogEntry>();

  constructor(entries: readonly WorkerCatalogEntry[]) {
    if (entries.length === 0) throw new Error("worker catalog must contain at least one entry");
    for (const entry of entries) {
      const card = WorkerCardSchema.parse(entry.card);
      if (this.entries.has(card.id)) throw new Error(`duplicate worker id ${card.id}`);
      this.entries.set(card.id, { card, createDriver: entry.createDriver });
    }
  }

  /** Return runnable cards matching every hard factual label. */
  list(requiredLabels: readonly string[] = []): WorkerCard[] {
    const required = parseRequiredLabels(requiredLabels);
    return [...this.entries.values()]
      .map((entry) => entry.card)
      .filter((card) => card.availability.status === "available")
      .filter((card) => required.every((label) => card.labels.includes(label)))
      .map(cloneCard);
  }

  card(workerId: string): WorkerCard {
    return cloneCard(this.requireRunnable(workerId).card);
  }

  assertSupports(workerId: string, requiredLabels: readonly string[]): WorkerCard {
    const required = parseRequiredLabels(requiredLabels);
    const card = this.requireRunnable(workerId).card;
    const missing = required.filter((label) => !card.labels.includes(label));
    if (missing.length > 0) {
      throw new Error(`worker ${workerId} is missing required labels: ${missing.join(", ")}`);
    }
    return cloneCard(card);
  }

  /** Resolve one admitted Cell's explicit worker without changing its evidence profile. */
  createDriver(input: CellInput): CellDriver {
    const parsed = CellInputSchema.parse(input);
    if (parsed.workerId === undefined) {
      throw new Error("catalog-backed Cell must declare workerId");
    }
    if (parsed.executionProfile === undefined) {
      throw new Error(`catalog-backed Cell ${parsed.id} must retain an executionProfile`);
    }
    const entry = this.requireRunnable(parsed.workerId);
    this.assertSupports(entry.card.id, [
      ...parsed.capabilitiesRequired,
      ...(parsed.imagePaths?.length ? ["vision"] : []),
    ]);
    assertExecutionProfile(entry.card, parsed.executionProfile);
    const driver = entry.createDriver();
    if (
      driver.descriptor.provider !== entry.card.executionProfile.provider
      || driver.descriptor.model !== entry.card.executionProfile.model
    ) {
      throw new Error(
        `worker ${entry.card.id} driver identity ${driver.descriptor.provider}/${driver.descriptor.model} `
        + `does not match card ${entry.card.executionProfile.provider}/${entry.card.executionProfile.model}`,
      );
    }
    return driver;
  }

  private requireRunnable(workerId: string): WorkerCatalogEntry {
    const entry = this.entries.get(workerId);
    if (entry === undefined) throw new Error(`unknown workerId ${workerId}`);
    if (entry.card.availability.status !== "available") {
      throw new Error(`worker ${workerId} is unavailable: ${entry.card.availability.reason}`);
    }
    return entry;
  }
}

function parseRequiredLabels(labels: readonly string[]): string[] {
  const parsed = z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).parse(labels);
  if (new Set(parsed).size !== parsed.length) throw new Error("required worker labels must be unique");
  return parsed;
}

function assertExecutionProfile(card: WorkerCard, actual: ExecutionProfile): void {
  const expected = card.executionProfile;
  for (const field of ["id", "version", "provider", "model", "contextPolicy", "toolSurface", "parallelism", "priceRevision"] as const) {
    if (actual[field] !== expected[field]) {
      throw new Error(
        `worker ${card.id} requires execution profile ${expected.id}; field ${field} does not match catalog configuration`,
      );
    }
  }
}

function cloneCard(card: WorkerCard): WorkerCard {
  return structuredClone(card);
}
