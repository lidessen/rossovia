import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  PreferenceReceiptSchema,
  PreferencesSchema,
  type Preference,
  type PreferenceReceipt,
  type Preferences,
} from "./contracts";
import { loadHome, loadJson, validatePreferences } from "./home";
import { registeredProjectByQuery } from "./projects";

export interface PreferenceSetArguments {
  id: string;
  statement: string;
  project?: string;
  reopenWhen?: string;
}

export interface PreferenceRetireArguments {
  id: string;
  project?: string;
}

function nonempty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function preferencePath(home: string): string {
  return join(home, "config", "preferences.json");
}

function receiptPath(home: string): string {
  return join(home, "receipts", "preferences.jsonl");
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonical(entry)]));
  }
  return value;
}

function digest(preference: Preference): string {
  return createHash("sha256").update(JSON.stringify(canonical(preference))).digest("hex");
}

function validateReceiptStream(value: string): void {
  for (const [index, line] of value.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let receipt: unknown;
    try {
      receipt = JSON.parse(line);
    } catch (error: unknown) {
      throw new Error(`invalid preference receipt at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const result = PreferenceReceiptSchema.safeParse(receipt);
    if (!result.success) throw new Error(`preference receipt at line ${index + 1} is invalid`);
  }
}

function loadPreferences(home: string, projectIds: Set<string>): Preferences {
  const preferences = validatePreferences(
    loadJson(preferencePath(home), PreferencesSchema),
    "user preferences",
  );
  for (const preference of preferences.preferences) {
    if (preference.projectId && !projectIds.has(preference.projectId)) {
      throw new Error(`user preference ${preference.id} references unknown project id: ${preference.projectId}`);
    }
  }
  return preferences;
}

function commitPreferenceChange(
  home: string,
  source: Preferences,
  action: PreferenceReceipt["action"],
  preference: Preference,
): void {
  const sourcePath = preferencePath(home);
  const receiptsPath = receiptPath(home);
  const existingReceipts = existsSync(receiptsPath) ? readFileSync(receiptsPath, "utf8") : "";
  validateReceiptStream(existingReceipts);
  const receipt: PreferenceReceipt = {
    version: "rosso.preference-receipt.v2",
    at: now(),
    action,
    id: preference.id,
    projectId: preference.projectId ?? null,
    recordDigest: digest(preference),
  };
  const nextSource = `${JSON.stringify(source, null, 2)}\n`;
  const nextReceipts = `${existingReceipts}${JSON.stringify(canonical(receipt))}\n`;
  validateReceiptStream(nextReceipts);

  mkdirSync(dirname(receiptsPath), { recursive: true });
  const sourceTemporary = `${sourcePath}.preference-txn.tmp`;
  const receiptTemporary = `${receiptsPath}.preference-txn.tmp`;
  const previousSource = readFileSync(sourcePath, "utf8");
  writeFileSync(sourceTemporary, nextSource, "utf8");
  try {
    writeFileSync(receiptTemporary, nextReceipts, "utf8");
    renameSync(sourceTemporary, sourcePath);
    try {
      renameSync(receiptTemporary, receiptsPath);
    } catch (error: unknown) {
      const rollback = `${sourcePath}.preference-rollback.tmp`;
      writeFileSync(rollback, previousSource, "utf8");
      renameSync(rollback, sourcePath);
      throw error;
    }
  } finally {
    rmSync(sourceTemporary, { force: true });
    rmSync(receiptTemporary, { force: true });
  }
}

function projectIdFor(projects: ReturnType<typeof loadHome>["projects"], query?: string): string | undefined {
  return query ? registeredProjectByQuery(projects, query).id : undefined;
}

function scopeFor(projectId?: string): "user" | "project" {
  return projectId ? "project" : "user";
}

function foldedCompare(left: Preference, right: Preference): number {
  const leftKey = `${left.projectId ?? ""}\0${left.id.toLowerCase()}`;
  const rightKey = `${right.projectId ?? ""}\0${right.id.toLowerCase()}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function setPreference(homeArgument: string | undefined, arguments_: PreferenceSetArguments): {
  changed: boolean;
  scope: "user" | "project";
  preference: Preference;
} {
  const current = loadHome(homeArgument);
  const preferences = loadPreferences(current.home, new Set(current.projects.projects.map((project) => project.id)));
  const projectId = projectIdFor(current.projects, arguments_.project);
  const id = nonempty(arguments_.id, "preference id");
  const statement = nonempty(arguments_.statement, "preference statement");
  const reopenWhen = arguments_.reopenWhen === undefined
    ? undefined
    : nonempty(arguments_.reopenWhen, "reopen condition");
  const previous = preferences.preferences.find((preference) =>
    preference.id.toLowerCase() === id.toLowerCase() && preference.projectId === projectId);
  const timestamp = now();
  const preference: Preference = {
    id,
    statement,
    source: "user-explicit",
    recordedAt: previous?.recordedAt ?? timestamp,
    updatedAt: timestamp,
    ...(projectId ? { projectId } : {}),
    ...(reopenWhen ? { reopenWhen } : {}),
  };
  const withoutUpdatedAt = ({ updatedAt: _updatedAt, ...value }: Preference) => value;
  const changed = !previous || JSON.stringify(canonical(withoutUpdatedAt(preference))) !==
    JSON.stringify(canonical(withoutUpdatedAt(previous)));
  if (!changed) return { changed: false, scope: scopeFor(projectId), preference: previous };

  if (previous) preferences.preferences[preferences.preferences.indexOf(previous)] = preference;
  else preferences.preferences.push(preference);
  preferences.preferences.sort(foldedCompare);
  validatePreferences(preferences, "user preferences");
  commitPreferenceChange(current.home, preferences, "set", preference);
  return { changed: true, scope: scopeFor(projectId), preference };
}

export function listPreferences(homeArgument: string | undefined, projectQuery?: string): {
  version: "rosso.preference-projection.v2";
  projectId: string | null;
  preferences: Array<{
    id: string;
    statement: string;
    scope: "user" | "project";
    source: "user-explicit";
    projectId?: string;
    reopenWhen?: string;
  }>;
} {
  const current = loadHome(homeArgument);
  const preferences = loadPreferences(current.home, new Set(current.projects.projects.map((project) => project.id)));
  const projectId = projectIdFor(current.projects, projectQuery);
  const selected = new Map<string, Preference>();
  for (const preference of preferences.preferences) {
    if (preference.projectId && preference.projectId !== projectId) continue;
    const key = preference.id.toLowerCase();
    const prior = selected.get(key);
    if (!prior || (!prior.projectId && preference.projectId)) selected.set(key, preference);
  }
  const projection = [...selected.values()]
    .sort((left, right) => left.id.toLowerCase().localeCompare(right.id.toLowerCase()))
    .map((preference) => ({
      id: preference.id,
      statement: preference.statement,
      scope: scopeFor(preference.projectId),
      source: preference.source,
      ...(preference.projectId ? { projectId: preference.projectId } : {}),
      ...(preference.reopenWhen ? { reopenWhen: preference.reopenWhen } : {}),
    }));
  return {
    version: "rosso.preference-projection.v2",
    projectId: projectId ?? null,
    preferences: projection,
  };
}

export function retirePreference(homeArgument: string | undefined, arguments_: PreferenceRetireArguments): {
  retired: true;
  scope: "user" | "project";
  id: string;
  projectId: string | null;
} {
  const current = loadHome(homeArgument);
  const preferences = loadPreferences(current.home, new Set(current.projects.projects.map((project) => project.id)));
  const projectId = projectIdFor(current.projects, arguments_.project);
  const id = nonempty(arguments_.id, "preference id");
  const preference = preferences.preferences.find((entry) =>
    entry.id.toLowerCase() === id.toLowerCase() && entry.projectId === projectId);
  if (!preference) throw new Error(`no ${scopeFor(projectId)} preference matches '${id}' for ${projectId ?? "all projects"}`);
  preferences.preferences.splice(preferences.preferences.indexOf(preference), 1);
  validatePreferences(preferences, "user preferences");
  commitPreferenceChange(current.home, preferences, "retire", preference);
  return { retired: true, scope: scopeFor(projectId), id: preference.id, projectId: projectId ?? null };
}
