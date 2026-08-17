import { jsonSchema } from "ai";
import type { JSONSchema7 } from "@ai-sdk/provider";
import { compileOutputSchema } from "../../output-schema";
import type { OutputSchema } from "../../contracts";

/**
 * The AI SDK binding of the one public output definition. The core
 * `compileOutputSchema` remains the neutral mechanical validator shared by
 * run-cell verification and every non-SDK driver; this Integration module
 * adds only the `jsonSchema` transport form the SDK providers consume. The
 * same Zod validator backs both, so a provider cannot turn schema guidance
 * into an unchecked claim.
 */
export interface CompiledAiSdkOutputSchema {
  validate(value: unknown): { passed: boolean; errors: string[] };
  forAiSdk(): ReturnType<typeof jsonSchema>;
}

export function compileAiSdkOutputSchema(schema: OutputSchema): CompiledAiSdkOutputSchema {
  const validator = compileOutputSchema(schema);
  return {
    validate: validator.validate,
    forAiSdk: () => jsonSchema(schema as JSONSchema7, {
      validate(value) {
        const result = validator.validate(value);
        return result.passed
          ? { success: true, value }
          : { success: false, error: new Error(result.errors.join("; ")) };
      },
    }),
  };
}
