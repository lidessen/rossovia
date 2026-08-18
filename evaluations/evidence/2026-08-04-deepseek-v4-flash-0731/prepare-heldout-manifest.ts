import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const root = dirname(import.meta.path);
const fixture = join(root, "heldout-fixture");
const historicalCommit = "19d59df9a850f660f9a3f311314288e0143c9cd6";
const currentCommit = "f1733bba6c7d0a22a00a4e53222be71397eda139";

await rm(fixture, { recursive: true, force: true });

const snapshots = [
  [historicalCommit, "operations/workbench/src/migration.ts", "migration/src/migration.ts"],
  [historicalCommit, "operations/workbench/src/home.ts", "migration/src/home.ts"],
  [historicalCommit, "operations/workbench/test/migration.test.ts", "migration/test/migration.test.ts"],
  [historicalCommit, "design/decisions/044-rosso-identity-and-namespace-migration.md", "migration/decision-044.md"],
  [historicalCommit, "design/decisions/047-bun-workbench-runtime.md", "migration/decision-047.md"],
  [currentCommit, "operations/workbench/AGENTS.md", "task-runtime/AGENTS.md"],
  [currentCommit, "design/decisions/050-principal-workbench-supervised-mvp.md", "task-runtime/decision-050.md"],
  [currentCommit, "design/decisions/053-principal-created-task-workbench.md", "task-runtime/decision-053.md"],
] as const;

await Promise.all(snapshots.map(([commit, source, destination]) => (
  extract(commit, source, destination)
)));

const base = JSON.parse(await readFile(join(root, "model-evaluation.json"), "utf8"));
const outputSchema = base.cases[0].task.outputSchema;
const budget = {
  maxSteps: 10,
  estimatedTokens: 14_000,
  estimatedTokensTolerance: 0.75,
  maxDurationMs: 180_000,
  maxCommandOutputBytes: 10_000,
};
const manifest = {
  version: "work-cell.model-evaluation.v2",
  id: "deepseek-v4-flash-heldout-nonthinking-vs-low",
  evidenceRole: "confirmation",
  fixture: { root: "heldout-fixture", overlays: [] },
  outputDir: "heldout-results",
  profiles: [
    {
      id: "deepseek-direct-v4-flash-nonthinking-ai-sdk-v7-auto-tool-settlement-v3",
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-flash",
      }],
      contextPolicy: "frozen-heldout-repository-fixture-v1",
      toolSurface: "read-only-files-plus-verified-schema-tool-v3",
      declaredInferencePolicy: "thinking=disabled; temperature=0; transport=ai-sdk-v7-generate; structured-output=verified-tool-settlement; max-output-tokens=16000",
      adapterPolicy: { deepseek: { thinking: "disabled" } },
      priceRevision: "deepseek-public-api-2026-07-31",
    },
    {
      id: "deepseek-direct-v4-flash-thinking-low-ai-sdk-v7-auto-tool-settlement-v3",
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-flash",
      }],
      contextPolicy: "frozen-heldout-repository-fixture-v1",
      toolSurface: "read-only-files-plus-verified-schema-tool-v3",
      declaredInferencePolicy: "thinking=enabled; effort=low; temperature=ignored-by-provider; forced-tool-choice=lowered-to-auto; transport=ai-sdk-v7-generate; structured-output=verified-tool-settlement; max-output-tokens=16000",
      adapterPolicy: { deepseek: { thinking: "enabled", reasoningEffort: "low" } },
      priceRevision: "deepseek-public-api-2026-07-31",
    },
  ],
  repetitions: 2,
  cases: [
    {
      id: "restartable-namespace-migration-review",
      dimension: "held-out code review across failure and retry state",
      task: {
        intent: "Perform a bounded, read-only review of the proposed restartable in-home legacy namespace migration. Trace fresh-target, failure, retry, and refusal behavior through the supplied implementation, mandate, and tests. Report only decision-changing, source-backed findings with severity, reachable failure story, violated contract or consequence, smallest correction, residual risks, checks actually supported by the packet, and a verdict.",
        workspace: {
          readPaths: [
            "migration/src/migration.ts",
            "migration/src/home.ts",
            "migration/test/migration.test.ts",
            "migration/decision-044.md",
            "migration/decision-047.md",
          ],
          writePaths: [],
          excludePaths: [],
          allowedCommands: [],
        },
        instructions: [
          "Inspect only the supplied migration packet; no later history or corrected source is available.",
          "Trace relevant filesystem state across more than one invocation instead of reviewing one happy-path call in isolation.",
          "Cite exact repository-relative paths and line numbers for every material finding and reachable event sequence.",
          "Return a verdict of ready, ready_with_residual_risk, or changes_required. Do not edit.",
        ],
        capabilities: ["read", "code-review", "failure-sequence-reconstruction"],
        context: [],
        capabilitiesRequired: ["read"],
        acceptance: [
          "The implementation, mandate, and focused tests are inspected",
          "Any blocking finding includes a reachable multi-step failure story and contract consequence",
          "The correction is the smallest change consistent with restartability and refusal boundaries",
          "The verdict and residual risks remain bounded to the supplied packet",
        ],
        outputSchema,
        budget,
      },
      referenceCriteria: [
        "The review identifies the window where target directory creation succeeds but marker publication fails or is interrupted",
        "The review explains that the empty unmarked target remains because target preparation occurs before the cleanup try block",
        "The review explains that a retry then hits unconditional rejection of every existing unmarked target and remains blocked without manual deletion",
        "The consequence is loss of restartability rather than corruption of the preserved legacy source",
        "The bounded correction accepts only an empty unmarked target as recoverable, keeps nonempty or unrelated targets refused, and publishes the marker atomically with a temporary write and rename",
        "The verdict is changes_required or an equivalent merge-blocking judgment",
      ],
      rubric: "Prefer a reconstructable failure-and-retry sequence that reaches the restartability contract. Merely mentioning non-atomic writing without the persistent retry lockout is partial evidence only.",
      failureClasses: [
        { id: "missed-pre-marker-window", description: "Does not reconstruct the failure window before marker publication." },
        { id: "missed-retry-lockout", description: "Notices the initial failure but not the persistent rejection on retry." },
        { id: "overbroad-recovery", description: "Makes arbitrary nonempty or unrelated targets recoverable." },
      ],
    },
    {
      id: "task-recovery-authority-boundary",
      dimension: "held-out cross-layer state and authority judgment",
      task: {
        intent: "A locally Principal-attributed task has exact project, Mission, and Worktree context plus a latest execution link. Its one-use launch receipt has a matching canonical consumption claim. The linked current turn is interrupted, the same runner is live, and the runtime declares resume support. The UI proposes three actions together: recover that execution, immediately mark the local task accepted, and reuse the consumed receipt to launch a replacement runner if recovery stalls. Decide which actions are supportable, the final revalidation each supported action needs, what state each may change, and what each action does not prove.",
        workspace: {
          readPaths: [
            "task-runtime/AGENTS.md",
            "task-runtime/decision-050.md",
            "task-runtime/decision-053.md",
          ],
          writePaths: [],
          excludePaths: [],
          allowedCommands: [],
        },
        instructions: [
          "Inspect every supplied source and apply its ownership and authority boundaries to each proposed action.",
          "Separate retained evidence, launch authority, runtime recovery, local task lifecycle, and broader product or integration acceptance.",
          "Cite repository-relative paths and line numbers for every material permission, refusal, state transition, and non-proof.",
          "Return the smallest supported action sequence; do not invent missing authentication or runtime evidence.",
        ],
        capabilities: ["read", "architecture-judgment", "authority-boundary-reconstruction"],
        context: [],
        capabilitiesRequired: ["read"],
        acceptance: [
          "All three proposed actions receive a separate source-grounded judgment",
          "The exact recovery selector and final revalidation are explicit",
          "State ownership and non-proofs are separated across Workbench and runtime",
          "The recommendation withholds unsupported launch and acceptance authority",
        ],
        outputSchema,
        budget,
      },
      referenceCriteria: [
        "The execution link is retained evidence and routing context rather than launch authority",
        "The consumed one-use receipt cannot be reused to launch a replacement runner",
        "Recovery is supportable only for the exact current interrupted turn and live runner with runtime-declared resume capability after final revalidation of task source and revisions, authorization and proposal lineage, canonical claim and receipt, Worktree and candidate HEAD, turn, runner, and interrupted activity",
        "Recovery changes Autonomy runtime state only and does not move the local task lifecycle, verify the result, accept the task, or restore launch authority",
        "Immediate local acceptance is unsupported without a submitted result and revalidated exact runtime verification lineage; only an explicit locally Principal-attributed acceptance settles the task",
        "Local attribution is not identity authentication and local task settlement does not imply Mission, product, integration, merge, or publication acceptance",
      ],
      rubric: "Prefer a precise action-and-authority matrix that preserves source ownership, one-use launch semantics, exact recovery lineage, and explicit local settlement without broadening any action's proof.",
      failureClasses: [
        { id: "receipt-reuse", description: "Treats a consumed one-use receipt as reusable launch authority." },
        { id: "recovery-as-acceptance", description: "Lets runtime recovery settle or accept the local task." },
        { id: "link-as-authority", description: "Treats an execution link as launch or lifecycle authority." },
      ],
    },
  ],
  judge: {
    route: [{
      provider: "kimi-coding",
      credential: { source: "env", name: "KIMI_CODE_API_KEY" },
      model: "k3",
    }],
  },
};

const manifestPath = join(root, "heldout-model-evaluation.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const frozenPaths = [
  manifestPath,
  ...snapshots.map(([, , destination]) => join(fixture, destination)),
].sort();
const hashes = await Promise.all(frozenPaths.map(async (path) => (
  `${createHash("sha256").update(await readFile(path)).digest("hex")}  ${relative(root, path)}`
)));
await writeFile(join(root, "heldout-inputs.sha256"), `${hashes.join("\n")}\n`, "utf8");

async function extract(commit: string, source: string, destination: string): Promise<void> {
  const result = Bun.spawnSync(["git", "show", `${commit}:${source}`], { cwd: join(root, "../../../..") });
  if (result.exitCode !== 0) {
    throw new Error(`cannot extract ${commit}:${source}: ${result.stderr.toString()}`);
  }
  const target = join(fixture, destination);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, result.stdout);
}
