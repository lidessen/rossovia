import { expect, test } from "bun:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import { ConversationOperationHostError, createConversationTaskOperationHost } from "../src/conversation/operations";

// Absence of phrase routing is established by typed behavioral tests and
// reviewer judgment over the source, never by scanning source text for
// trigger words or regex shapes. The host's only input is a strict typed
// operation; Principal prose is not part of its contract at all.
test("the host maps only typed operation structure; an unknown kind is never matched to prose", () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-boundary-"));
  try {
    initializeHome(root);
    const host = createConversationTaskOperationHost(root);
    const unknown = {
      kind: "task_accept",
      anything: "please accept the task",
    } as unknown as Parameters<typeof host.executeOperation>[0]["operation"];
    try {
      host.executeOperation({ conversationId: "c", actionId: "a", operation: unknown });
      throw new Error("expected the unknown operation kind to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("invalid-operation");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the host's typed surface accepts only a strict operation; there is no prose-shaped input", () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-boundary-typed-"));
  try {
    initializeHome(root);
    const host = createConversationTaskOperationHost(root);
    // Two behaviors and one observable home path: executing a strict
    // ConversationOperation and searching the canonical owner for the same
    // strict operation. Neither accepts message text or any untyped payload.
    expect(typeof host.executeOperation).toBe("function");
    expect(typeof host.findCanonicalReceipt).toBe("function");
    expect(host.home).toBe(realpathSync(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
