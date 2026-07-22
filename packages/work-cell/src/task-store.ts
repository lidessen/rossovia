import {
  TaskSchema,
  TaskSeedSchema,
  type Task,
  type TaskSeed,
  type TaskStatus,
} from "./contracts";

/** Host-owned task state. Models can mutate it only through a projected tool surface. */
export class TaskStore {
  private readonly tasks = new Map<string, Task>();
  private nextId = 1;

  constructor(initial: readonly Task[] = []) {
    for (const candidate of initial) {
      const task = TaskSchema.parse(candidate);
      if (this.tasks.has(task.id)) throw new Error(`duplicate task id ${task.id}`);
      this.tasks.set(task.id, cloneTask(task));
      const numeric = /^task-(\d+)$/.exec(task.id)?.[1];
      if (numeric !== undefined) this.nextId = Math.max(this.nextId, Number(numeric) + 1);
    }
    this.assertState();
  }

  static fromSeeds(seeds: readonly TaskSeed[] = [], owner?: string): TaskStore {
    const store = new TaskStore();
    for (const unparsed of seeds) {
      const seed = TaskSeedSchema.parse(unparsed);
      store.create({ ...seed, ...(owner === undefined ? {} : { owner }) });
    }
    return store;
  }

  snapshot(): Task[] {
    return [...this.tasks.values()].map(cloneTask);
  }

  list(predicate: (task: Task) => boolean = () => true): Task[] {
    return this.snapshot().filter(predicate);
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (task === undefined) throw new Error(`unknown task ${id}`);
    return cloneTask(task);
  }

  create(input: {
    readonly subject: string;
    readonly description: string;
    readonly owner?: string;
    readonly blockedBy?: readonly string[];
  }): Task {
    const id = this.allocateId();
    const task = TaskSchema.parse({
      id,
      subject: input.subject,
      description: input.description,
      status: "pending",
      ...(input.owner === undefined ? {} : { owner: input.owner }),
      blockedBy: [...(input.blockedBy ?? [])],
    });
    this.tasks.set(id, task);
    try {
      this.assertState();
    } catch (error) {
      this.tasks.delete(id);
      throw error;
    }
    return cloneTask(task);
  }

  update(id: string, patch: {
    readonly subject?: string;
    readonly description?: string;
    readonly status?: TaskStatus;
    readonly owner?: string | null;
    readonly blockedBy?: readonly string[];
  }): Task {
    const previous = this.get(id);
    const candidate: Record<string, unknown> = {
      ...previous,
      ...(patch.subject === undefined ? {} : { subject: patch.subject }),
      ...(patch.description === undefined ? {} : { description: patch.description }),
      ...(patch.status === undefined ? {} : { status: patch.status }),
      ...(patch.blockedBy === undefined ? {} : { blockedBy: [...patch.blockedBy] }),
    };
    if (patch.owner === null) delete candidate.owner;
    else if (patch.owner !== undefined) candidate.owner = patch.owner;
    const next = TaskSchema.parse(candidate);
    this.tasks.set(id, next);
    try {
      this.assertState();
    } catch (error) {
      this.tasks.set(id, previous);
      throw error;
    }
    return cloneTask(next);
  }

  isBlocked(task: Task): boolean {
    return task.blockedBy.some((dependency) => this.get(dependency).status !== "completed");
  }

  private allocateId(): string {
    while (this.tasks.has(`task-${this.nextId}`)) this.nextId += 1;
    return `task-${this.nextId++}`;
  }

  private assertState(): void {
    for (const task of this.tasks.values()) {
      const unique = new Set(task.blockedBy);
      if (unique.size !== task.blockedBy.length) throw new Error(`task ${task.id} has duplicate dependencies`);
      if (unique.has(task.id)) throw new Error(`task ${task.id} cannot block itself`);
      for (const dependency of unique) {
        if (!this.tasks.has(dependency)) throw new Error(`task ${task.id} depends on unknown task ${dependency}`);
      }
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) throw new Error(`task dependency cycle includes ${id}`);
      if (visited.has(id)) return;
      visiting.add(id);
      for (const dependency of this.tasks.get(id)!.blockedBy) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.tasks.keys()) visit(id);
    for (const task of this.tasks.values()) {
      if (task.status !== "pending" && this.isBlocked(task)) {
        throw new Error(`task ${task.id} cannot remain ${task.status} while a dependency is incomplete`);
      }
    }
  }
}

function cloneTask(task: Task): Task {
  return { ...task, blockedBy: [...task.blockedBy] };
}
