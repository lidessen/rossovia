import { randomUUID } from "node:crypto";
import { CellInputSchema, type CellInput, type CellRunRecord } from "./contracts";
import type { CellDriver } from "./driver";
import { MultiCellWorkspaceGuard } from "./multi-cell-workspace";
import { runCell } from "./run-cell";

export interface WorkItem {
  readonly itemId: string;
  readonly sequence: number;
  readonly input: CellInput;
}

export interface WorkLease {
  readonly leaseId: string;
  readonly item: WorkItem;
}

interface WorkSettlementBase {
  readonly lease: WorkLease;
  readonly attemptId: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
}

export interface SettledWork extends WorkSettlementBase {
  readonly kind: "settled";
  readonly record: CellRunRecord;
}

export interface WorkRunnerError extends WorkSettlementBase {
  readonly kind: "runner_error";
  readonly error: string;
}

export type WorkSettlement = SettledWork | WorkRunnerError;

/** Supplies already-defined Cells; it does not invent or accept work. */
export interface WorkSource {
  /** Returns null only after this source is closed and drained. */
  next(signal: AbortSignal): Promise<WorkLease | null>;
  /** Receives exactly one mechanical outcome for every lease returned by next. */
  settle(settlement: WorkSettlement): Promise<void>;
}

export interface OrchestrationEvent {
  readonly at: string;
  readonly type: string;
  readonly data: unknown;
}

export interface OrchestrationRun {
  readonly runId: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly durationMs: number;
  readonly concurrency: number;
  readonly status: "completed" | "cancelled";
  readonly settlements: readonly WorkSettlement[];
  readonly events: readonly OrchestrationEvent[];
}

/** Fatal source/kernel failure with every outcome and event observed before abort. */
export class OrchestrationRunError extends Error {
  readonly settlements: readonly WorkSettlement[];
  readonly events: readonly OrchestrationEvent[];

  constructor(message: string, settlements: readonly WorkSettlement[], events: readonly OrchestrationEvent[]) {
    super(message);
    this.name = "OrchestrationRunError";
    this.settlements = [...settlements];
    this.events = [...events];
  }
}

export async function runOrchestration(
  source: WorkSource,
  createDriver: () => CellDriver,
  options: { concurrency: number; signal?: AbortSignal },
): Promise<OrchestrationRun> {
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("orchestration concurrency must be a positive integer");
  }

  const runId = randomUUID();
  const startedAt = new Date();
  const settlements: WorkSettlement[] = [];
  const events: OrchestrationEvent[] = [];
  const activeLeases = new Set<string>();
  const finishedLeases = new Set<string>();
  const internalAbort = new AbortController();
  const executionSignal = options.signal === undefined
    ? internalAbort.signal
    : AbortSignal.any([options.signal, internalAbort.signal]);
  emit(events, "orchestration.started", { runId, concurrency: options.concurrency });

  const workers = Array.from({ length: options.concurrency }, async () => {
    while (!executionSignal.aborted) {
      let lease: WorkLease | null;
      try {
        lease = await source.next(executionSignal);
      } catch (error) {
        if (executionSignal.aborted) return;
        throw error;
      }
      if (lease === null) return;
      if (activeLeases.has(lease.leaseId) || finishedLeases.has(lease.leaseId)) {
        throw new Error(`work source returned duplicate lease ${lease.leaseId}`);
      }

      activeLeases.add(lease.leaseId);
      const attemptId = randomUUID();
      const attemptStartedAt = new Date();
      emit(events, "attempt.started", {
        attemptId,
        leaseId: lease.leaseId,
        itemId: lease.item.itemId,
        sequence: lease.item.sequence,
      });

      let settlement: WorkSettlement;
      try {
        const record = await runCell(
          lease.item.input,
          createDriver(),
          { signal: executionSignal },
        );
        settlement = {
          kind: "settled",
          lease,
          attemptId,
          startedAt: attemptStartedAt,
          finishedAt: new Date(),
          record,
        };
      } catch (error) {
        settlement = {
          kind: "runner_error",
          lease,
          attemptId,
          startedAt: attemptStartedAt,
          finishedAt: new Date(),
          error: message(error),
        };
      }

      settlements.push(settlement);
      activeLeases.delete(lease.leaseId);
      finishedLeases.add(lease.leaseId);
      emit(events, "attempt.settled", {
        attemptId,
        leaseId: lease.leaseId,
        itemId: lease.item.itemId,
        kind: settlement.kind,
        status: settlement.kind === "settled" ? settlement.record.status : "runner_error",
      });
      await source.settle(settlement);
    }
  });

  try {
    await Promise.all(workers);
  } catch (error) {
    internalAbort.abort(error);
    await Promise.allSettled(workers);
    emit(events, "orchestration.failed", {
      runId,
      error: message(error),
      settlements: settlements.length,
    });
    throw new OrchestrationRunError(message(error), settlements, events);
  }
  const finishedAt = new Date();
  const status = isAborted(options.signal) ? "cancelled" : "completed";
  emit(events, `orchestration.${status}`, { runId, settlements: settlements.length });
  return {
    runId,
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    concurrency: options.concurrency,
    status,
    settlements,
    events,
  };
}

interface QueueWaiter {
  readonly signal: AbortSignal;
  readonly onAbort: () => void;
  readonly resolve: (lease: WorkLease | null) => void;
  readonly reject: (error: unknown) => void;
}

/**
 * An open, in-process FIFO source. Producers may submit while an orchestration
 * run is waiting; close is explicit and final.
 */
export class InMemoryCellQueue implements WorkSource {
  private readonly guard: MultiCellWorkspaceGuard;
  private readonly pending: WorkItem[] = [];
  private readonly waiters: QueueWaiter[] = [];
  private readonly active = new Map<string, WorkLease>();
  private readonly seenItemIds = new Set<string>();
  private readonly observedSettlements: WorkSettlement[] = [];
  private nextSequence = 0;
  private closed = false;

  constructor(carrier = "Queue cells") {
    this.guard = new MultiCellWorkspaceGuard(carrier);
  }

  async submit(unparsedInput: unknown, itemId?: string): Promise<WorkItem> {
    if (this.closed) throw new Error("cannot submit to a closed Work Cell queue");
    const input = CellInputSchema.parse(unparsedInput);
    const stableItemId = itemId ?? input.id;
    if (this.seenItemIds.has(stableItemId)) {
      throw new Error(`Work Cell queue item IDs must be unique: ${stableItemId}`);
    }
    this.seenItemIds.add(stableItemId);
    try {
      await this.guard.admit(input);
    } catch (error) {
      this.seenItemIds.delete(stableItemId);
      throw error;
    }
    if (this.closed) throw new Error("cannot submit to a closed Work Cell queue");

    const item: WorkItem = {
      itemId: stableItemId,
      sequence: this.nextSequence,
      input,
    };
    this.nextSequence += 1;
    const waiter = this.waiters.shift();
    if (waiter === undefined) {
      this.pending.push(item);
    } else {
      this.deliver(waiter, item);
    }
    return item;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.pending.length === 0) this.finishWaiters();
  }

  async next(signal: AbortSignal): Promise<WorkLease | null> {
    signal.throwIfAborted();
    const item = this.pending.shift();
    if (item !== undefined) {
      const lease = createLease(item);
      this.active.set(lease.leaseId, lease);
      return lease;
    }
    if (this.closed) return null;

    return new Promise<WorkLease | null>((resolve, reject) => {
      const waiter: QueueWaiter = {
        signal,
        resolve,
        reject,
        onAbort: () => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(signal.reason ?? new Error("Work Cell queue wait cancelled"));
        },
      };
      signal.addEventListener("abort", waiter.onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  async settle(settlement: WorkSettlement): Promise<void> {
    const active = this.active.get(settlement.lease.leaseId);
    if (active === undefined || active.item.itemId !== settlement.lease.item.itemId) {
      throw new Error(`cannot settle inactive lease ${settlement.lease.leaseId}`);
    }
    this.active.delete(settlement.lease.leaseId);
    this.observedSettlements.push(settlement);
  }

  settlements(): readonly WorkSettlement[] {
    return [...this.observedSettlements].sort((left, right) =>
      left.lease.item.sequence - right.lease.item.sequence
    );
  }

  /** Undispatched work retained when a caller cancels an open or closed queue. */
  pendingItems(): readonly WorkItem[] {
    return [...this.pending].sort((left, right) => left.sequence - right.sequence);
  }

  private deliver(waiter: QueueWaiter, item: WorkItem): void {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
    const lease = createLease(item);
    this.active.set(lease.leaseId, lease);
    waiter.resolve(lease);
  }

  private finishWaiters(): void {
    for (const waiter of this.waiters.splice(0)) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
      waiter.resolve(null);
    }
  }
}

function createLease(item: WorkItem): WorkLease {
  return { leaseId: randomUUID(), item };
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function emit(events: OrchestrationEvent[], type: string, data: unknown): void {
  events.push({ at: new Date().toISOString(), type, data });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
