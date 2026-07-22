import { expect, test } from "bun:test";
import { TaskStore } from "../src/task-store";
import { createTaskTools } from "../src/task-tools";

test("a worker reads shared task context but can update only its assigned task", async () => {
  const store = new TaskStore([
    {
      id: "task-1",
      subject: "Assigned task",
      description: "Complete the assigned task.",
      status: "pending",
      owner: "worker-1",
      blockedBy: [],
    },
    {
      id: "task-2",
      subject: "Peer task",
      description: "Provide context owned by another worker.",
      status: "pending",
      owner: "worker-2",
      blockedBy: [],
    },
  ]);
  const tools = createTaskTools(store, {
    projection: {
      read: "all",
      create: false,
      update: "status",
      updateScope: "owned",
      principal: "worker-1",
    },
  });

  expect(Object.keys(tools)).toEqual(["task_list", "task_get", "task_update"]);
  const listed = await execute(tools.task_list, {});
  expect((listed as { tasks: unknown[] }).tasks).toHaveLength(2);
  await expect(execute(tools.task_update, { taskId: "task-2", status: "completed" }))
    .rejects.toThrow("not assigned to worker-1");
  await execute(tools.task_update, { taskId: "task-1", status: "completed" });
  expect(store.get("task-1").status).toBe("completed");
});

test("reopening a dependency cannot leave its completed dependent in a contradictory state", () => {
  const store = new TaskStore([
    {
      id: "task-1",
      subject: "Foundation",
      description: "Complete the foundation.",
      status: "completed",
      blockedBy: [],
    },
    {
      id: "task-2",
      subject: "Dependent",
      description: "Complete the dependent work.",
      status: "completed",
      blockedBy: ["task-1"],
    },
  ]);

  expect(() => store.update("task-1", { status: "pending" }))
    .toThrow("task task-2 cannot remain completed while a dependency is incomplete");
  expect(store.get("task-1").status).toBe("completed");
});

async function execute(
  candidate: unknown,
  input: unknown,
): Promise<unknown> {
  const executable = candidate as {
    execute?: (value: unknown, options: unknown) => Promise<unknown> | unknown;
  };
  if (executable.execute === undefined) throw new Error("expected an executable task tool");
  return executable.execute(input, {});
}
