import { createHash } from "node:crypto";
import { isAbsolute, join, normalize, relative } from "node:path";
import { z } from "zod";
import type { ExecutionAuthorizationReceipt } from "./execution-authorization";
import {
  WorkbenchTaskExecutionContextRefSchema,
  type WorkbenchTaskExecutionContextRef,
} from "./task-execution-context";

const nonempty = z.string().refine(
  (value) => value.trim().length > 0,
  "must be a non-empty string",
);
const missionId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const gitHead = z.string().regex(/^[0-9a-f]{40,64}$/);
const relativeEvidenceRef = nonempty.refine(
  (value) =>
    !isAbsolute(value)
    && value.split(/[\\/]/u).every((segment) =>
      segment.length > 0 && segment !== "." && segment !== ".."
    ),
  "must be a normalized relative evidence reference",
);
const canonicalAbsolutePath = nonempty
  .refine(isAbsolute, "must be an absolute path")
  .refine((value) => normalize(value) === value, "must be a normalized absolute path");

export const ExecutionAuthorizationClaimSchema = z.object({
  version: z.literal("rosso.execution-authorization-claim.v1"),
  authorizationId: z.string().uuid(),
  projectId: nonempty,
  missionId,
  proposalId: missionId,
  proposalDigest: digest,
  receipt: z.object({
    ref: relativeEvidenceRef,
    digest,
  }).strict(),
  localEvidence: z.object({
    worktree: canonicalAbsolutePath,
    gitHead,
  }).strict(),
  workbenchTaskContext: WorkbenchTaskExecutionContextRefSchema.optional(),
  claimedAt: z.string().datetime({ offset: true }),
}).strict();

export type ExecutionAuthorizationClaim = z.infer<
  typeof ExecutionAuthorizationClaimSchema
>;

export interface ExecutionAuthorizationClaimContext {
  readonly home: string;
  readonly claimPath: string;
  readonly receiptPath: string;
  readonly receipt: ExecutionAuthorizationReceipt;
  readonly projectId: string;
  readonly missionId: string;
  readonly proposalId: string;
  readonly proposalDigest: string;
}

export interface ExecutionAuthorizationClaimBinding {
  readonly workbenchTaskContext?: WorkbenchTaskExecutionContextRef;
}

export function executionAuthorizationClaimPath(
  home: string,
  authorizationId: string,
): string {
  const checkedAuthorizationId = z.string().uuid().parse(authorizationId);
  return join(
    home,
    "state",
    "execution-authorization-claims",
    `${checkedAuthorizationId}.json`,
  );
}

export function executionAuthorizationReceiptDigest(
  receipt: ExecutionAuthorizationReceipt,
): string {
  return createHash("sha256").update(stableStringify(receipt)).digest("hex");
}

export function validateExecutionAuthorizationClaim(
  unparsed: unknown,
  context: ExecutionAuthorizationClaimContext,
): ExecutionAuthorizationClaim {
  const claim = ExecutionAuthorizationClaimSchema.parse(unparsed);
  const receipt = context.receipt;
  const mismatches: string[] = [];

  if (claim.authorizationId !== receipt.authorizationId) {
    mismatches.push(
      `authorization ID mismatch: expected ${receipt.authorizationId}, observed ${claim.authorizationId}`,
    );
  }
  if (claim.projectId !== context.projectId || claim.projectId !== receipt.projectId) {
    mismatches.push(
      `project mismatch: expected ${context.projectId}, observed ${claim.projectId}`,
    );
  }
  if (claim.missionId !== context.missionId || claim.missionId !== receipt.missionId) {
    mismatches.push(
      `Mission mismatch: expected ${context.missionId}, observed ${claim.missionId}`,
    );
  }
  if (claim.proposalId !== context.proposalId || claim.proposalId !== receipt.proposalId) {
    mismatches.push(
      `proposal mismatch: expected ${context.proposalId}, observed ${claim.proposalId}`,
    );
  }
  if (
    claim.proposalDigest !== context.proposalDigest
    || claim.proposalDigest !== receipt.proposalDigest
  ) {
    mismatches.push(
      `proposal digest mismatch: expected ${context.proposalDigest}, observed ${claim.proposalDigest}`,
    );
  }

  const expectedClaimPath = executionAuthorizationClaimPath(
    context.home,
    receipt.authorizationId,
  );
  if (context.claimPath !== expectedClaimPath) {
    mismatches.push(
      `claim source mismatch: expected ${expectedClaimPath}, observed ${context.claimPath}`,
    );
  }

  const expectedReceiptRef = relative(context.home, context.receiptPath);
  if (claim.receipt.ref !== expectedReceiptRef) {
    mismatches.push(
      `receipt reference mismatch: expected ${expectedReceiptRef}, observed ${claim.receipt.ref}`,
    );
  }
  const expectedReceiptDigest = executionAuthorizationReceiptDigest(receipt);
  if (claim.receipt.digest !== expectedReceiptDigest) {
    mismatches.push(
      `receipt digest mismatch: expected ${expectedReceiptDigest}, observed ${claim.receipt.digest}`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      `execution authorization consumption claim is invalid: ${mismatches.join("; ")}`,
    );
  }
  return claim;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
