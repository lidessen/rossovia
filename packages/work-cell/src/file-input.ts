import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { z, type ZodType } from "zod";

export const JsonFileInputRefSchema = z.object({
  inputFile: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();

export type JsonFileInputRef = z.infer<typeof JsonFileInputRefSchema>;

export interface FrozenJsonFileInput<T> {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly value: T;
}

/**
 * Resolve one caller-supplied JSON file inside a host-owned root, then freeze
 * its execution meaning as validated memory plus a content digest. Paths never
 * become part of the parsed runtime contract.
 */
export async function readJsonFileInput<T>(
  unparsedRef: unknown,
  root: string,
  schema: ZodType<T>,
): Promise<FrozenJsonFileInput<T>> {
  const ref = JsonFileInputRefSchema.parse(unparsedRef);
  if (isAbsolute(ref.inputFile)) throw new Error("inputFile must be relative to the host-owned input root");

  const canonicalRoot = await realpath(resolve(root));
  const canonicalPath = await realpath(resolve(canonicalRoot, ref.inputFile));
  const fromRoot = relative(canonicalRoot, canonicalPath);
  if (fromRoot === "" || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error(`inputFile escapes the host-owned input root: ${ref.inputFile}`);
  }

  const content = await readFile(canonicalPath);
  const sha256 = createHash("sha256").update(content).digest("hex");
  if (ref.sha256 !== undefined && ref.sha256 !== sha256) {
    throw new Error(`inputFile digest mismatch for ${ref.inputFile}`);
  }

  let unparsed: unknown;
  try {
    unparsed = JSON.parse(content.toString("utf8"));
  } catch (error) {
    throw new Error(`inputFile is not valid JSON: ${ref.inputFile}`, { cause: error });
  }
  return {
    path: canonicalPath,
    sha256,
    bytes: content.byteLength,
    value: schema.parse(unparsed),
  };
}
