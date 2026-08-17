# AI SDK Integration island (I1)

Concrete AI SDK / Harness-Pi / provider integration surface for the Work Cell.

## Moved here (no code duplication; old root paths are physically removed)

| Island module | Former root path | Concrete dependency |
| --- | --- | --- |
| `ai-sdk-driver.ts` | `src/ai-sdk-driver.ts` | `ai` (`ToolLoopAgent`, `Output`, `tool`) |
| `pi-harness-driver.ts` | `src/pi-harness-driver.ts` | `@ai-sdk/harness`, `@ai-sdk/harness-pi`, `@ai-sdk/sandbox-just-bash`, `just-bash`, `ai` |
| `ai-sdk-usage.ts` | `src/ai-sdk-usage.ts` | none (AI SDK usage-shape normalization) |
| `structured-settlement.ts` | `src/structured-settlement.ts` | `ai`, `@ai-sdk/provider` |
| `model-route.ts` | `src/model-route.ts` | `ai`, `@ai-sdk/provider` |
| `validation-model.ts` | `src/validation-model.ts` | provider SDKs via `providers/` |
| `provider-profile.ts` | `src/provider-profile.ts` | none (declared provider-route schema) |
| `host-tools.ts` | `src/host-tools.ts` | `ai` (`tool`) |
| `task-tools.ts` | `src/task-tools.ts` | `ai` (`tool`) |
| `workspace-edit.ts` | `src/workspace-edit.ts` | `@earendil-works/pi-coding-agent` |
| `driver-common.ts` | `src/driver-common.ts` | `ai` (`UserModelMessage` type) |
| `output-schema.ts` | AI SDK half of `src/output-schema.ts` | `ai` (`jsonSchema`), `@ai-sdk/provider` |
| `task-tool-set.ts` | (new minimal owner; was in `src/ai-sdk-driver.ts`) | none |
| `providers/deepseek.ts` | `src/providers/deepseek.ts` | `@ai-sdk/deepseek` |
| `providers/kimi-coding.ts` | `src/providers/kimi-coding.ts` | `@ai-sdk/moonshotai` |
| `providers/opencode-go.ts` | `src/providers/opencode-go.ts` | `@ai-sdk/openai-compatible` |

## Kept in the C1-C3 core (no `ai` / `@ai-sdk/*` / Pi imports)

- `contracts.ts` (CellInput, mechanical final contracts), `driver.ts` (CellDriver,
  StepAllowance), `host-port.ts` (HostWorkspace, CellHost), `output-schema.ts`
  (neutral Zod validator; the `jsonSchema` binding lives in this island),
  and `run-cell.ts`.

`task-store.ts`, `worker-catalog.ts`, `workspace.ts`, `fake-host.ts`,
`file-input.ts`, `live-trace-file.ts`, `multi-cell-workspace.ts`,
`concurrency.ts`, `swarm.ts`, and `orchestration.ts` are untouched pre-existing
adjacent or legacy mechanisms pending later Goal review. This island makes no
claim that they are C1-C3 core or about their eventual home.

The dependency boundary is enforced by `test/dependency-boundary.test.ts`,
which asserts the former core root paths are physically absent (no tombstones,
no compatibility shims) and that the C1-C3 core modules listed above carry no
concrete AI SDK/Pi/provider dependency.

## Caller-injected cell tools (C2 tool port)

The core owns one provider-neutral caller-injected tool port
(`src/tool-port.ts`): `RunCellOptions.tools` accepts a readonly name-keyed
`CellToolSet` whose values carry `description`, an object-root `inputSchema`,
and a caller-owned `execute` closure, so the set is never serializable into
`CellInput`. `runCell` admits every call through the same gate as host
effects: each execute promise covers the call's full effect and its settled
evidence, the caller implementation receives exactly the toolCallId plus the
Cell's combined execution signal, abort closes the gate and joins admitted
calls before the final, and unresolved quiescence leaves no final. The core
retains only the sorted authorized names (`cell.tools.projected`) and, per
invocation, `{ name, toolCallId, outcome }` — never input, result, or
implementation identity.

`host-tools.ts` owns the single AI SDK translation (`createCellToolDefinitions`)
used by both the AI SDK and the Pi harness drivers. Names colliding with the
active host/task/terminal surface and non-object-root schemas are rejected
before any provider dispatch; the Pi adapter additionally wraps injected tools
in the same causal tool-effect handoff and action closure as host tools.
Caller-supplied tools require a driver that declares `supportsCellTools: true`;
otherwise the run fails closed as `capability_mismatch` before dispatch.
Omitting tools leaves every driver surface and the final record unchanged.

## Still owned elsewhere (host/process adapters, I2 scope)

- `src/codex-cli-driver.ts`, `src/opencode-cli-driver.ts`,
  `src/codex-app-server-driver.ts` (spawn-based CLI drivers)
- `src/providers/kimi-coding-quota.ts`, `src/providers/codex-observer.ts`,
  `src/providers/claude-observer.ts` (provider observation carriers)
- `src/workspace.ts` local filesystem host and `src/fake-host.ts`
- `src/adapters/**` (sequence/experiment/model-evaluation/deliberation adapters
  stay outside the island; they import the declared Integration path)
