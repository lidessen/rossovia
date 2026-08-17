import { z } from "zod";
import type { OutputSchema } from "./contracts";

export interface OutputValidation {
  passed: boolean;
  errors: string[];
}

export interface CompiledOutputSchema {
  validate(value: unknown): OutputValidation;
}

/**
 * Compile the one public output definition once. The neutral Zod validator
 * backs run-cell final verification and every non-SDK driver; the AI SDK
 * `jsonSchema` transport form lives at the declared Integration boundary
 * (`integrations/ai-sdk/output-schema`) so this core module carries no
 * `ai` / `@ai-sdk` dependency.
 */
export function compileOutputSchema(schema: OutputSchema): CompiledOutputSchema {
  const validator = z.fromJSONSchema(schema as never);
  const check = (value: unknown): OutputValidation => {
    const result = validator.safeParse(value);
    return {
      passed: result.success,
      errors: result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".") || "/"} ${issue.message}`),
    };
  };
  return {
    validate: check,
  };
}
