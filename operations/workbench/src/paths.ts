import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export function expandPath(value: string): string {
  const expanded = value === "~"
    ? homedir()
    : value.startsWith("~/")
      ? join(homedir(), value.slice(2))
      : value;
  const unresolved: string[] = [];
  let existing = resolve(expanded);
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return resolve(expanded);
    unresolved.unshift(basename(existing));
    existing = parent;
  }
  return join(realpathSync(existing), ...unresolved);
}
