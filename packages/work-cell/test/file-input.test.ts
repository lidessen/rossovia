import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { readJsonFileInput } from "../src/file-input";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("file input validates an optional digest and returns an immutable execution value", async () => {
  const root = await fixture();
  const path = join(root, "task.json");
  const content = Buffer.from('{"task":"original"}\n');
  await writeFile(path, content);
  const sha256 = createHash("sha256").update(content).digest("hex");

  const frozen = await readJsonFileInput(
    { inputFile: "task.json", sha256 },
    root,
    z.object({ task: z.string() }).strict(),
  );
  await writeFile(path, '{"task":"replacement"}\n', "utf8");
  expect(frozen).toMatchObject({ sha256, bytes: content.byteLength, value: { task: "original" } });

  await expect(readJsonFileInput(
    { inputFile: "task.json", sha256 },
    root,
    z.object({ task: z.string() }).strict(),
  )).rejects.toThrow("digest mismatch");
});

test("file input rejects absolute paths, traversal, and symlink escapes", async () => {
  const root = await fixture();
  const outside = await fixture();
  const outsidePath = join(outside, "outside.json");
  await writeFile(outsidePath, '{"ok":true}\n', "utf8");
  await symlink(outsidePath, join(root, "escape.json"));
  const schema = z.object({ ok: z.boolean() }).strict();

  await expect(readJsonFileInput({ inputFile: outsidePath }, root, schema)).rejects.toThrow("must be relative");
  await expect(readJsonFileInput({ inputFile: "../outside.json" }, root, schema)).rejects.toThrow();
  await expect(readJsonFileInput({ inputFile: "escape.json" }, root, schema)).rejects.toThrow("escapes");
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-file-input-"));
  roots.push(root);
  return root;
}
