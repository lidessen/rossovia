import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";

export const ValidationProviderIdSchema = z.enum([
  "opencode-go",
  "kimi-coding",
  "deepseek",
]);

export type ValidationProviderId = z.infer<typeof ValidationProviderIdSchema>;

export const ProviderRouteTargetSchema = z.object({
  provider: ValidationProviderIdSchema,
  credential: z.object({
    source: z.literal("env"),
    name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  }).strict(),
  model: z.string().min(1).optional(),
  baseURL: z.url().optional(),
}).strict();

export const ValidationRouteSchema = z.array(ProviderRouteTargetSchema).min(1);

export const ProviderProfileSchema = z.object({
  version: z.literal("work-cell.provider-profile.v1"),
  routes: z.object({
    validation: ValidationRouteSchema,
  }).strict(),
}).strict();

export type ProviderRouteTarget = z.infer<typeof ProviderRouteTargetSchema>;
export type ProviderProfile = z.infer<typeof ProviderProfileSchema>;

export interface ProviderCredentialCandidate {
  provider: ValidationProviderId;
  label: string;
  credential: { source: "env"; name: string };
  present: boolean;
}

const validationProviderCatalog: ReadonlyArray<Omit<ProviderCredentialCandidate, "present">> = [
  {
    provider: "opencode-go",
    label: "OpenCode Go",
    credential: { source: "env", name: "OPENCODE_API_KEY" },
  },
  {
    provider: "kimi-coding",
    label: "Kimi Coding Plan",
    credential: { source: "env", name: "KIMI_CODE_API_KEY" },
  },
  {
    provider: "deepseek",
    label: "DeepSeek API",
    credential: { source: "env", name: "DEEPSEEK_API_KEY" },
  },
];

export function discoverProviderCredentials(
  environment: NodeJS.ProcessEnv = process.env,
): ProviderCredentialCandidate[] {
  return validationProviderCatalog.map((candidate) => ({
    ...candidate,
    credential: { ...candidate.credential },
    present: Boolean(environment[candidate.credential.name]),
  }));
}

export function defaultProviderProfilePath(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const configured = environment.WORK_CELL_PROVIDER_PROFILE?.trim();
  if (configured) return resolve(configured);
  const configHome = environment.XDG_CONFIG_HOME?.trim() || resolve(homedir(), ".config");
  return resolve(configHome, "work-cell", "providers.json");
}

export function loadProviderProfile(path = defaultProviderProfilePath()): ProviderProfile {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    if (code === "ENOENT") {
      throw new Error(
        `provider profile not found at ${path}; discover credentials and explicitly configure a route before model execution`,
      );
    }
    throw error;
  }
  return ProviderProfileSchema.parse(JSON.parse(raw));
}
