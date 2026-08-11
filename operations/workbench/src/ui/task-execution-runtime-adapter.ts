import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../../..");

export const AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID =
  "agent-era-blog-publication-v1" as const;

export const AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts" as const;

export type TaskExecutionRuntimeAdapterId =
  typeof AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID;

export interface TrustedTaskExecutionRuntimeAdapter {
  readonly id: TaskExecutionRuntimeAdapterId;
  readonly runtimeRef: typeof AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF;
  readonly runtimeModule: string;
  readonly environment: (input: {
    readonly worktreePath: string;
    readonly receiptPath: string;
  }) => Readonly<Record<string, string>>;
}

const blogPublicationAdapter: TrustedTaskExecutionRuntimeAdapter = {
  id: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
  runtimeRef: AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF,
  runtimeModule: resolve(
    repositoryRoot,
    "operations/autonomy/experiments/agent-era-blog-publication-runtime.ts",
  ),
  environment: ({ worktreePath, receiptPath }) => ({
    ROSSO_BLOG_EFFECT_ROOT: worktreePath,
    ROSSO_BLOG_AUTHORIZATION_RECEIPT: receiptPath,
  }),
};

export function trustedTaskExecutionRuntimeAdapterFor(
  runtimeRef: string,
): TrustedTaskExecutionRuntimeAdapter | null {
  return runtimeRef === blogPublicationAdapter.runtimeRef
    ? blogPublicationAdapter
    : null;
}
