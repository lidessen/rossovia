import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome } from "../src/home";
import {
  createLocalTaskControlPlane,
  LocalTaskControlError,
  type LocalTaskCommand,
  type LocalTaskControlPlane,
} from "../src/local-task-control-plane";
import {
  executeTaskCreateAction,
  executeTaskMutationAction,
  TaskActionError,
} from "../src/ui/task-actions";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function home(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-task-control-"));
  temporaryRoots.push(root);
  const taskHome = join(root, "home");
  initializeHome(taskHome);
  return taskHome;
}

describe("local task control plane", () => {
  test("preserves the local lifecycle result shape while returning typed failures", () => {
    const taskHome = home();
    const controlPlane = createLocalTaskControlPlane(taskHome);
    const created = controlPlane.execute({
      kind: "create",
      arguments: {
        title: "Typed task service",
        objective: "Keep task truth behind one control-plane port",
        acceptance: ["CLI and HTTP adapters receive the same result"],
        nextActor: "agent",
        sourceRef: "test:local-task-control-plane",
        expectedSourceRevision: 0,
      },
    });
    expect(created).toMatchObject({
      sourceRevision: 1,
      task: {
        lifecycle: "open",
        nextActor: "agent",
        revision: 1,
      },
    });
    expect(controlPlane.show(created.task.id)).toEqual({
      sourceRevision: 1,
      task: created.task,
    });
    expect(controlPlane.list()).toEqual({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 1,
      tasks: [created.task],
    });

    expectControlError(
      () => controlPlane.execute({
        kind: "assign",
        arguments: {
          id: created.task.id,
          nextActor: "principal",
          expectedSourceRevision: 0,
          expectedRevision: 1,
        },
      }),
      "task-drift",
    );
    expectControlError(
      () => controlPlane.show("missing-task"),
      "task-not-found",
    );
  });

  test("lets the HTTP adapter depend on the port and maps opaque typed errors", () => {
    const taskHome = home();
    const delegate = createLocalTaskControlPlane(taskHome);
    const observed: LocalTaskCommand[] = [];
    const port: LocalTaskControlPlane = {
      list: () => delegate.list(),
      show: (id) => delegate.show(id),
      execute(command) {
        observed.push(command);
        return delegate.execute(command);
      },
    };

    const created = executeTaskCreateAction(taskHome, {
      title: "HTTP adapter task",
      objective: "Submit one typed command through the human adapter",
      acceptance: ["The port receives UI attribution"],
      nextActor: "agent",
      expectedSourceRevision: 0,
    }, port);
    expect(observed).toEqual([{
      kind: "create",
      arguments: expect.objectContaining({
        sourceRef: "workbench-ui:unverified-local-interaction",
      }),
    }]);
    expect(created.sourceRevision).toBe(1);

    const opaqueFailure: LocalTaskControlPlane = {
      ...port,
      execute() {
        throw new LocalTaskControlError(
          "task-drift",
          "opaque typed conflict without classification phrases",
        );
      },
    };
    try {
      executeTaskMutationAction(taskHome, created.task.id, {
        kind: "assign",
        nextActor: "principal",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, opaqueFailure);
      throw new Error("expected typed HTTP task failure");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(TaskActionError);
      expect(error).toMatchObject({
        status: 409,
        code: "task-drift",
        message: "opaque typed conflict without classification phrases",
      });
    }
  });
});

function expectControlError(
  operation: () => unknown,
  code: LocalTaskControlError["code"],
): void {
  try {
    operation();
    throw new Error(`expected local task control error ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(LocalTaskControlError);
    expect(error).toMatchObject({ code });
  }
}
