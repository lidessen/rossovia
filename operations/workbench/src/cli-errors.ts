/**
 * The single typed error contract of the Workbench CLI. Every parser owner
 * and dispatch boundary classifies a failure by error type, never by error
 * message text or a message pattern: a `UsageError` is a malformed
 * invocation (unknown command, invalid option, wrong arity, unknown help
 * path), everything else is a state/runtime failure. The CLI catch maps
 * `UsageError` to exit 2 with a nearest-help pointer and every other error
 * to `STATE_FAILURE_EXIT_CODE` with the specific error only.
 */

export const USAGE_EXIT_CODE = 2;

export const STATE_FAILURE_EXIT_CODE = 1;

export class UsageError extends Error {
  readonly kind = "usage";

  constructor(
    message: string,
    readonly helpPath: readonly string[],
    options: ErrorOptions = {},
  ) {
    super(message, options);
  }
}

/**
 * A parse-layer failure that does not yet know its help path. The parser
 * owner wraps it into a `UsageError` with the nearest help path at its
 * dispatch boundary; it never reaches the CLI catch directly.
 */
export class ParseUsageError extends Error {
  readonly kind = "parse-usage";

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }
}

/**
 * An explicit state/runtime failure raised at a dispatch boundary that
 * still needs to preserve machine output on stdout (for example the
 * incomplete `project list` projection). Domain layers keep throwing
 * their own typed errors, which the CLI catch classifies the same way.
 */
export class CliStateError extends Error {
  readonly kind = "state";

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
  }
}
