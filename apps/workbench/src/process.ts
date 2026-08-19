import { spawnSync } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  arguments_: string[],
  options: { cwd?: string; quiet?: boolean } = {},
): CommandResult {
  const result = spawnSync(command, arguments_, {
    ...(options.cwd ? { cwd: options.cwd } : {}),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: options.quiet ? "ignore" : ["ignore", "pipe", "pipe"],
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: options.quiet ? "" : result.stdout ?? "",
    stderr: options.quiet ? "" : result.stderr || result.error?.message || "",
  };
}
