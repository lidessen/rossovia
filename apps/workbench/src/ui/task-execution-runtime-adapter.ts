import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../../..");

export const AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID =
  "agent-era-blog-publication-v1" as const;

export const AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF =
  "source-project:apps/autonomy/experiments/agent-era-blog-publication-runtime.ts" as const;

export const PROJECT_LENS_DOGFOOD_ADAPTER_ID =
  "project-lens-dogfood-v1" as const;

export const PROJECT_LENS_DOGFOOD_RUNTIME_REF =
  "source-project:experiments/human-agent-visualization/project-lens-runtime.ts" as const;

export type TaskExecutionRuntimeAdapterId =
  | typeof AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID
  | typeof PROJECT_LENS_DOGFOOD_ADAPTER_ID;

export interface TrustedTaskExecutionRuntimeAdapter {
  readonly id: TaskExecutionRuntimeAdapterId;
  readonly runtimeRef:
    | typeof AGENT_ERA_BLOG_PUBLICATION_RUNTIME_REF
    | typeof PROJECT_LENS_DOGFOOD_RUNTIME_REF;
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
    "apps/autonomy/experiments/agent-era-blog-publication-runtime.ts",
  ),
  environment: ({ worktreePath, receiptPath }) => ({
    ROSSO_BLOG_EFFECT_ROOT: worktreePath,
    ROSSO_BLOG_AUTHORIZATION_RECEIPT: receiptPath,
  }),
};

const projectLensDogfoodAdapter: TrustedTaskExecutionRuntimeAdapter = {
  id: PROJECT_LENS_DOGFOOD_ADAPTER_ID,
  runtimeRef: PROJECT_LENS_DOGFOOD_RUNTIME_REF,
  runtimeModule: resolve(
    repositoryRoot,
    "experiments/human-agent-visualization/project-lens-runtime.ts",
  ),
  environment: ({ worktreePath, receiptPath }) => ({
    ROSSO_PROJECT_LENS_EFFECT_ROOT: worktreePath,
    ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT: receiptPath,
  }),
};

export function trustedTaskExecutionRuntimeAdapterFor(
  runtimeRef: string,
): TrustedTaskExecutionRuntimeAdapter | null {
  if (runtimeRef === blogPublicationAdapter.runtimeRef) {
    return blogPublicationAdapter;
  }
  if (runtimeRef === projectLensDogfoodAdapter.runtimeRef) {
    return projectLensDogfoodAdapter;
  }
  return null;
}
