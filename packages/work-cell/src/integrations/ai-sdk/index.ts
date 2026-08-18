/**
 * Declared AI SDK Integration island (I1).
 *
 * Every concrete Vercel AI SDK, Harness/Pi, DeepSeek/Kimi/OpenCode-Go
 * provider, host-tool wiring, and structured-settlement implementation lives
 * here. The C1-C3 core (contracts, driver, host-port, run-cell, output-schema)
 * imports none of these modules; callers that need a concrete driver import
 * this declared Integration path instead of the removed core root paths.
 *
 * Host/process adapters (Codex CLI/app-server, OpenCode CLI, provider
 * observers, the local filesystem host) remain outside this island and are
 * handled separately.
 */
export * from "./ai-sdk-driver";
export * from "./pi-harness-driver";
export * from "./ai-sdk-usage";
export * from "./structured-settlement";
export * from "./model-route";
export * from "./validation-model";
export * from "./provider-profile";
export * from "./task-tool-set";
export * from "./host-tools";
export * from "./task-tools";
export * from "./workspace-edit";
export * from "./driver-common";
export * from "./output-schema";
export * from "./providers/deepseek";
export * from "./providers/kimi-coding";
export * from "./providers/opencode-go";
