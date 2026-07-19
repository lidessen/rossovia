import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  ArtifactVersion,
  CatalogSchema,
  CatalogVersion,
  CognitiveArtifactSchema,
  CognitionEventSchema,
  CognitionManifestSchema,
  FormationSchemeDefinitionSchema,
  FormationSchemeSchema,
  ManifestVersion,
  SchemeVersion,
  SourceRecordSchema,
  SourceVersion,
  type ArtifactProposal,
  type Catalog,
  type CatalogEntry,
  type CognitiveArtifact,
  type FormationInput,
  type FormationScheme,
  type FormationSchemeDefinition,
  type SourceInput,
  type SourceRecord,
} from "./contracts";

type EventType = "scheme.registered" | "source.captured" | "artifact.proposed" | "artifact.admitted" | "artifact.used" | "artifact.superseded";

export async function initializeCognitionHome(home: string): Promise<string> {
  const root = resolve(home);
  for (const path of ["sources/raw", "sources/records", "schemes", "artifacts", "state", "indexes"]) {
    await mkdir(resolve(root, path), { recursive: true });
  }
  const manifestPath = resolve(root, "manifest.json");
  if (!(await exists(manifestPath))) await writeJson(manifestPath, { version: ManifestVersion, createdAt: now() });
  else CognitionManifestSchema.parse(await readJson(manifestPath));
  const catalogPath = resolve(root, "indexes/catalog.json");
  if (!(await exists(catalogPath))) await writeJson(catalogPath, emptyCatalog());
  return root;
}

export async function registerFormationScheme(
  home: string,
  unparsedDefinition: unknown,
  actor: string,
  basis: string,
): Promise<FormationScheme> {
  const root = await requireHome(home);
  const definition = FormationSchemeDefinitionSchema.parse(unparsedDefinition);
  const path = schemePath(root, definition.id, definition.revision);
  if (await exists(path)) throw new Error(`formation scheme already exists: ${definition.id}@${definition.revision}`);
  const scheme = FormationSchemeSchema.parse({
    version: SchemeVersion,
    definition,
    registeredAt: now(),
    registration: { actor: nonempty(actor, "actor"), basis: nonempty(basis, "registration basis") },
  });
  await writeJson(path, scheme);
  await appendEvent(root, "scheme.registered", actor, `${definition.id}@${definition.revision}`, { basis });
  return scheme;
}

export async function getFormationScheme(home: string, id: string, revision: string): Promise<FormationScheme> {
  return readScheme(await requireHome(home), id, revision);
}

export async function captureSource(home: string, input: SourceInput): Promise<SourceRecord> {
  const root = await requireHome(home);
  const kind = nonempty(input.kind, "source kind");
  const locator = nonempty(input.locator, "source locator");
  const actor = nonempty(input.actor, "actor");
  const contentSha256 = sha256(input.content);
  let predecessor: SourceRecord | undefined;
  if (input.predecessorId) {
    predecessor = await readSource(root, input.predecessorId);
    if (predecessor.kind !== kind || predecessor.locator !== locator) {
      throw new Error("a source revision must retain its predecessor kind and locator");
    }
    if (predecessor.contentSha256 === contentSha256) {
      throw new Error("a source revision must change the captured content");
    }
  }
  const idMaterial = `${kind}\0${locator}\0${contentSha256}\0${predecessor?.id ?? "root"}`;
  const id = `source_${sha256(new TextEncoder().encode(idMaterial)).slice(0, 20)}`;
  const contentPath = `sources/raw/${id}.bin`;
  const recordPath = resolve(root, `sources/records/${id}.json`);
  if (await exists(recordPath)) {
    const existing = SourceRecordSchema.parse(await readJson(recordPath));
    if (existing.predecessorId !== input.predecessorId) throw new Error(`source ${id} was already captured with a different predecessor`);
    return existing;
  }
  const record = SourceRecordSchema.parse({
    version: SourceVersion,
    id,
    kind,
    locator,
    capturedAt: now(),
    contentPath,
    contentSha256,
    predecessorId: predecessor?.id,
    metadata: input.metadata ?? {},
  });
  await writeBytes(resolve(root, contentPath), input.content);
  await writeJson(recordPath, record);
  await appendEvent(root, "source.captured", actor, id, { kind, locator, contentSha256, predecessorId: predecessor?.id ?? null });
  return record;
}

export async function proposeCognitiveArtifact(home: string, proposal: ArtifactProposal): Promise<CognitiveArtifact> {
  const root = await requireHome(home);
  const scheme = await readScheme(root, proposal.scheme.id, proposal.scheme.revision);
  const move = scheme.definition.moves.find((candidate) => candidate.id === proposal.moveId);
  if (!move) throw new Error(`unknown formation move: ${proposal.moveId}`);
  if (proposal.inputs.length !== move.inputs.length) {
    throw new Error(`formation move ${move.id} requires ${move.inputs.length} inputs, received ${proposal.inputs.length}`);
  }
  for (let index = 0; index < move.inputs.length; index += 1) {
    await validateInput(root, scheme.definition, move.inputs[index]!, proposal.inputs[index]!, index);
  }
  const timestamp = now();
  const artifact = CognitiveArtifactSchema.parse({
    version: ArtifactVersion,
    id: `artifact_${randomUUID()}`,
    scheme: proposal.scheme,
    stage: move.outputStage,
    title: proposal.title,
    body: proposal.body,
    limitations: proposal.limitations ?? [],
    tags: [...new Set(proposal.tags ?? [])],
    status: "proposed",
    formation: { moveId: move.id, rationale: proposal.rationale, inputs: proposal.inputs },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await validateArtifactFormation(root, artifact);
  await writeJson(artifactPath(root, artifact.id), artifact);
  await appendEvent(root, "artifact.proposed", nonempty(proposal.actor, "actor"), artifact.id, {
    scheme: artifact.scheme,
    stage: artifact.stage,
    moveId: move.id,
  });
  await rebuildCatalog(root);
  return artifact;
}

export async function admitCognitiveArtifact(home: string, id: string, actor: string, basis: string): Promise<CognitiveArtifact> {
  const root = await requireHome(home);
  const artifact = await readArtifact(root, id);
  if (artifact.status !== "proposed") throw new Error(`only proposed cognition can be admitted: ${id} is ${artifact.status}`);
  await validateAdmissionLineage(root, artifact);
  const admitted = CognitiveArtifactSchema.parse({
    ...artifact,
    status: "active",
    updatedAt: now(),
    admission: { actor: nonempty(actor, "actor"), admittedAt: now(), basis: nonempty(basis, "admission basis") },
  });
  await writeJson(artifactPath(root, id), admitted);
  await appendEvent(root, "artifact.admitted", actor, id, { basis });
  await rebuildCatalog(root);
  return admitted;
}

export async function supersedeCognitiveArtifact(
  home: string,
  id: string,
  replacementId: string,
  actor: string,
  basis: string,
): Promise<CognitiveArtifact> {
  const root = await requireHome(home);
  if (id === replacementId) throw new Error("cognition cannot supersede itself");
  const current = await readArtifact(root, id);
  const replacement = await readArtifact(root, replacementId);
  if (current.status !== "active") throw new Error(`only active cognition can be superseded: ${id} is ${current.status}`);
  if (replacement.status !== "active") throw new Error(`replacement cognition must be active: ${replacementId} is ${replacement.status}`);
  if (current.scheme.id !== replacement.scheme.id || current.stage !== replacement.stage) {
    throw new Error("replacement cognition must retain the scheme identity and stage");
  }
  const superseded = CognitiveArtifactSchema.parse({
    ...current,
    status: "superseded",
    updatedAt: now(),
    supersession: {
      replacementId,
      actor: nonempty(actor, "actor"),
      at: now(),
      basis: nonempty(basis, "supersession basis"),
    },
  });
  await writeJson(artifactPath(root, id), superseded);
  await appendEvent(root, "artifact.superseded", actor, id, { replacementId, basis });
  await rebuildCatalog(root);
  return superseded;
}

export async function getCognitiveArtifact(home: string, id: string): Promise<CognitiveArtifact> {
  return readArtifact(await requireHome(home), id);
}

export async function recordCognitionUse(home: string, id: string, actor: string, purpose: string) {
  const root = await requireHome(home);
  const artifact = await readArtifact(root, id);
  if (artifact.status !== "active") throw new Error(`only active cognition can be used: ${id} is ${artifact.status}`);
  const event = {
    artifactId: id,
    actor: nonempty(actor, "actor"),
    purpose: nonempty(purpose, "use purpose"),
    at: now(),
  };
  await appendEvent(root, "artifact.used", event.actor, id, { purpose: event.purpose });
  return event;
}

export async function traceFormation(home: string, id: string) {
  const root = await requireHome(home);
  const seen = new Set<string>();
  const artifacts: ReturnType<typeof summarizeArtifact>[] = [];
  const sources: ReturnType<typeof summarizeSource>[] = [];
  const sourceIds = new Set<string>();
  async function visit(artifactId: string): Promise<void> {
    if (seen.has(artifactId)) return;
    seen.add(artifactId);
    const artifact = await readArtifact(root, artifactId);
    artifacts.push(summarizeArtifact(artifact));
    for (const input of artifact.formation.inputs) {
      if (input.type === "artifact") await visit(input.id);
      else if (!sourceIds.has(input.id)) {
        sourceIds.add(input.id);
        sources.push(summarizeSource(await readSource(root, input.id)));
      }
    }
  }
  await visit(id);
  return { rootId: id, artifacts, sources };
}

export async function findFormationDependents(home: string, id: string) {
  const root = await requireHome(home);
  await readArtifact(root, id);
  const artifacts = await readAllArtifacts(root);
  const direct = new Map<string, CognitiveArtifact[]>();
  for (const artifact of artifacts) {
    for (const input of artifact.formation.inputs) {
      if (input.type !== "artifact") continue;
      direct.set(input.id, [...(direct.get(input.id) ?? []), artifact]);
    }
  }
  const queue = [id];
  const seen = new Set([id]);
  const dependents: CognitiveArtifact[] = [];
  while (queue.length > 0) {
    for (const artifact of direct.get(queue.shift()!) ?? []) {
      if (seen.has(artifact.id)) continue;
      seen.add(artifact.id);
      dependents.push(artifact);
      queue.push(artifact.id);
    }
  }
  return { rootId: id, dependents: dependents.map(summarizeArtifact) };
}

export async function findSourceDependents(home: string, id: string) {
  const root = await requireHome(home);
  const sourceLineage = new Set<string>();
  let source: SourceRecord | undefined = await readSource(root, id);
  while (source) {
    if (sourceLineage.has(source.id)) throw new Error(`source predecessor cycle detected: ${source.id}`);
    sourceLineage.add(source.id);
    source = source.predecessorId ? await readSource(root, source.predecessorId) : undefined;
  }
  const artifacts = await readAllArtifacts(root);
  const directlyAffected = artifacts.filter((artifact) => artifact.formation.inputs.some(
    (input) => input.type === "source" && sourceLineage.has(input.id),
  ));
  const directByArtifact = new Map<string, CognitiveArtifact[]>();
  for (const artifact of artifacts) {
    for (const input of artifact.formation.inputs) {
      if (input.type !== "artifact") continue;
      directByArtifact.set(input.id, [...(directByArtifact.get(input.id) ?? []), artifact]);
    }
  }
  const queue = directlyAffected.map((artifact) => artifact.id);
  const seen = new Set(queue);
  const affected = [...directlyAffected];
  while (queue.length > 0) {
    for (const artifact of directByArtifact.get(queue.shift()!) ?? []) {
      if (seen.has(artifact.id)) continue;
      seen.add(artifact.id);
      affected.push(artifact);
      queue.push(artifact.id);
    }
  }
  return { sourceId: id, affected: affected.map(summarizeArtifact) };
}

export async function getSourceRecord(home: string, id: string): Promise<SourceRecord> {
  return readSource(await requireHome(home), id);
}

export async function readSourceContent(home: string, id: string): Promise<Uint8Array> {
  const root = await requireHome(home);
  const source = await readSource(root, id);
  const content = await readFile(resolveContained(root, source.contentPath, `source ${id}`));
  if (sha256(content) !== source.contentSha256) throw new Error(`source content hash mismatch: ${id}`);
  return content;
}

export async function querySources(home: string, query: string, options: { kind?: string; limit?: number } = {}) {
  const root = await requireHome(home);
  const files = (await readdir(resolve(root, "sources/records"))).filter((name) => name.endsWith(".json")).sort();
  const terms = searchTerms(query);
  const results = [];
  for (const file of files) {
    const source = await readSource(root, file.slice(0, -5));
    if (options.kind && source.kind !== options.kind) continue;
    const content = new TextDecoder().decode(await readSourceContent(root, source.id));
    const searchable = `${source.kind}\n${source.locator}\n${JSON.stringify(source.metadata)}\n${content}`.toLocaleLowerCase();
    const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
    if (terms.length > 0 && score === 0) continue;
    results.push({ id: source.id, kind: source.kind, locator: source.locator, metadata: source.metadata, score, preview: preview(content) });
  }
  return { query, filters: { kind: options.kind ?? null }, results: results.sort((a, b) => b.score - a.score || a.locator.localeCompare(b.locator)).slice(0, options.limit ?? 20) };
}

export async function queryCognition(
  home: string,
  query: string,
  options: { schemeId?: string; stage?: string; status?: CognitiveArtifact["status"]; limit?: number } = {},
) {
  const root = await requireHome(home);
  const catalog = CatalogSchema.parse(await readJson(resolve(root, "indexes/catalog.json")));
  const terms = searchTerms(query);
  const results = catalog.entries
    .filter((entry) => !options.schemeId || entry.schemeId === options.schemeId)
    .filter((entry) => !options.stage || entry.stage === options.stage)
    .filter((entry) => entry.status === (options.status ?? "active"))
    .map((entry) => ({ entry, score: score(entry, terms) }))
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, options.limit ?? 20)
    .map(({ entry, score }) => ({ ...entry, body: undefined, score, preview: preview(entry.body) }));
  return { query, filters: { schemeId: options.schemeId ?? null, stage: options.stage ?? null, status: options.status ?? "active" }, results };
}

export async function rebuildCatalog(home: string): Promise<Catalog> {
  const root = await requireHome(home);
  const catalog = CatalogSchema.parse({ version: CatalogVersion, generatedAt: now(), entries: await catalogEntries(root) });
  await writeJson(resolve(root, "indexes/catalog.json"), catalog);
  return catalog;
}

export async function checkCognitionHome(home: string) {
  const root = await requireHome(home);
  const sourceFiles = await jsonFiles(resolve(root, "sources/records"));
  const schemeFiles = await jsonFiles(resolve(root, "schemes"));
  const artifactFiles = await jsonFiles(resolve(root, "artifacts"));
  const sourceProblems: string[] = [];
  for (const file of sourceFiles) {
    const source = await readSource(root, file.slice(0, -5));
    if (source.predecessorId) {
      const predecessor = await readSource(root, source.predecessorId);
      if (predecessor.kind !== source.kind || predecessor.locator !== source.locator) {
        throw new Error(`source ${source.id} does not retain predecessor identity`);
      }
    }
    const content = await readFile(resolveContained(root, source.contentPath, `source ${source.id}`));
    if (sha256(content) !== source.contentSha256) sourceProblems.push(`${source.id}: content hash mismatch`);
  }
  for (const file of schemeFiles) FormationSchemeSchema.parse(await readJson(resolve(root, "schemes", file)));
  for (const file of artifactFiles) {
    const artifact = await readArtifact(root, file.slice(0, -5));
    await validateArtifactFormation(root, artifact);
  }
  const current = CatalogSchema.parse(await readJson(resolve(root, "indexes/catalog.json")));
  const expected = await catalogEntries(root);
  const eventsPath = resolve(root, "state/events.jsonl");
  const eventLines = (await exists(eventsPath)) ? (await readFile(eventsPath, "utf8")).split("\n").filter((line) => line.trim()) : [];
  const events = eventLines.map((line) => CognitionEventSchema.parse(JSON.parse(line)));
  const schemes = await Promise.all(schemeFiles.map(async (file) => FormationSchemeSchema.parse(await readJson(resolve(root, "schemes", file)))));
  const sources = await Promise.all(sourceFiles.map((file) => readSource(root, file.slice(0, -5))));
  const artifacts = await Promise.all(artifactFiles.map((file) => readArtifact(root, file.slice(0, -5))));
  const eventProblems = reconcileEvents(events, schemes, sources, artifacts);
  const indexFresh = JSON.stringify(current.entries) === JSON.stringify(expected);
  const healthy = sourceProblems.length === 0 && eventProblems.length === 0 && indexFresh;
  return {
    healthy,
    home: root,
    sources: sourceFiles.length,
    schemes: schemeFiles.length,
    artifacts: artifactFiles.length,
    events: events.length,
    sourceProblems,
    eventProblems,
    indexFresh,
  };
}

async function validateArtifactFormation(root: string, artifact: CognitiveArtifact): Promise<void> {
  const scheme = await readScheme(root, artifact.scheme.id, artifact.scheme.revision);
  const move = scheme.definition.moves.find((candidate) => candidate.id === artifact.formation.moveId);
  if (!move) throw new Error(`artifact ${artifact.id} references unknown move ${artifact.formation.moveId}`);
  if (artifact.stage !== move.outputStage) {
    throw new Error(`artifact ${artifact.id} stage ${artifact.stage} does not match move ${move.id} output ${move.outputStage}`);
  }
  if (artifact.formation.inputs.length !== move.inputs.length) {
    throw new Error(`artifact ${artifact.id} has ${artifact.formation.inputs.length} inputs; move ${move.id} requires ${move.inputs.length}`);
  }
  for (let index = 0; index < move.inputs.length; index += 1) {
    await validateInput(root, scheme.definition, move.inputs[index]!, artifact.formation.inputs[index]!, index);
  }
}

async function validateAdmissionLineage(
  root: string,
  artifact: CognitiveArtifact,
  visiting = new Set<string>(),
  validated = new Set<string>(),
): Promise<void> {
  if (validated.has(artifact.id)) return;
  if (visiting.has(artifact.id)) throw new Error(`formation cycle detected at ${artifact.id}`);
  visiting.add(artifact.id);
  await validateArtifactFormation(root, artifact);
  for (const input of artifact.formation.inputs) {
    if (input.type === "source") {
      await readSourceContent(root, input.id);
      continue;
    }
    const dependency = await readArtifact(root, input.id);
    if (dependency.status !== "active") {
      throw new Error(`cannot admit ${artifact.id}: input artifact ${input.id} is ${dependency.status}`);
    }
    await validateAdmissionLineage(root, dependency, visiting, validated);
  }
  visiting.delete(artifact.id);
  validated.add(artifact.id);
}

function reconcileEvents(
  events: Array<ReturnType<typeof CognitionEventSchema.parse>>,
  schemes: FormationScheme[],
  sources: SourceRecord[],
  artifacts: CognitiveArtifact[],
): string[] {
  const problems: string[] = [];
  const targetsByType = new Map<EventType, Map<string, number>>();
  for (const event of events) {
    const targets = targetsByType.get(event.type) ?? new Map<string, number>();
    targets.set(event.targetId, (targets.get(event.targetId) ?? 0) + 1);
    targetsByType.set(event.type, targets);
  }
  const requireExactlyOne = (type: EventType, targetId: string) => {
    const count = targetsByType.get(type)?.get(targetId) ?? 0;
    if (count !== 1) problems.push(`${type} for ${targetId}: expected 1 event, found ${count}`);
  };
  for (const scheme of schemes) requireExactlyOne("scheme.registered", `${scheme.definition.id}@${scheme.definition.revision}`);
  for (const source of sources) requireExactlyOne("source.captured", source.id);
  for (const artifact of artifacts) {
    requireExactlyOne("artifact.proposed", artifact.id);
    if (artifact.status === "active" || artifact.status === "superseded") requireExactlyOne("artifact.admitted", artifact.id);
    if (artifact.status === "superseded") requireExactlyOne("artifact.superseded", artifact.id);
  }
  const schemeIds = new Set(schemes.map((scheme) => `${scheme.definition.id}@${scheme.definition.revision}`));
  const sourceIds = new Set(sources.map((source) => source.id));
  const artifactsById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  for (const event of events) {
    if (event.type === "scheme.registered" && !schemeIds.has(event.targetId)) problems.push(`${event.type} targets missing scheme ${event.targetId}`);
    if (event.type === "source.captured" && !sourceIds.has(event.targetId)) problems.push(`${event.type} targets missing source ${event.targetId}`);
    if (event.type.startsWith("artifact.")) {
      const artifact = artifactsById.get(event.targetId);
      if (!artifact) problems.push(`${event.type} targets missing artifact ${event.targetId}`);
      else if (event.type === "artifact.admitted" && artifact.status === "proposed") problems.push(`${event.type} targets proposed artifact ${event.targetId}`);
      else if (event.type === "artifact.superseded" && artifact.status !== "superseded") problems.push(`${event.type} targets non-superseded artifact ${event.targetId}`);
      else if (event.type === "artifact.used" && artifact.status === "proposed") problems.push(`${event.type} targets proposed artifact ${event.targetId}`);
    }
  }
  return problems;
}

async function validateInput(
  root: string,
  scheme: FormationSchemeDefinition,
  slot: FormationSchemeDefinition["moves"][number]["inputs"][number],
  input: FormationInput,
  index: number,
) {
  if (slot.type !== input.type) throw new Error(`formation input ${index + 1} must be ${slot.type}, received ${input.type}`);
  if (input.type === "source") {
    const source = await readSource(root, input.id);
    if (input.locator && input.locator !== source.locator) {
      throw new Error(`formation input ${input.id} locator does not match its source record`);
    }
    return;
  }
  const artifact = await readArtifact(root, input.id);
  if (artifact.scheme.id !== scheme.id || artifact.scheme.revision !== scheme.revision) {
    throw new Error(`formation input ${input.id} belongs to another scheme revision`);
  }
  if (artifact.stage !== (slot as { stage: string }).stage) {
    throw new Error(`formation input ${input.id} must be at stage ${(slot as { stage: string }).stage}, found ${artifact.stage}`);
  }
}

async function catalogEntries(root: string): Promise<CatalogEntry[]> {
  return (await readAllArtifacts(root)).map((artifact) => ({
    id: artifact.id,
    schemeId: artifact.scheme.id,
    schemeRevision: artifact.scheme.revision,
    stage: artifact.stage,
    title: artifact.title,
    body: artifact.body,
    tags: artifact.tags,
    status: artifact.status,
    updatedAt: artifact.updatedAt,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

async function readAllArtifacts(root: string): Promise<CognitiveArtifact[]> {
  return Promise.all((await jsonFiles(resolve(root, "artifacts"))).map((file) => readArtifact(root, file.slice(0, -5))));
}

async function requireHome(home: string): Promise<string> {
  const root = resolve(home);
  CognitionManifestSchema.parse(await readJson(resolve(root, "manifest.json")));
  return root;
}

async function readScheme(root: string, id: string, revision: string): Promise<FormationScheme> {
  const scheme = FormationSchemeSchema.parse(await readJson(schemePath(root, id, revision)));
  if (scheme.definition.id !== id || scheme.definition.revision !== revision) throw new Error(`formation scheme identity mismatch: ${id}@${revision}`);
  return scheme;
}

async function readSource(root: string, id: string): Promise<SourceRecord> {
  if (!/^source_[a-f0-9]{20}$/.test(id)) throw new Error(`invalid source id: ${id}`);
  const source = SourceRecordSchema.parse(await readJson(resolveContained(root, `sources/records/${id}.json`, "source record")));
  if (source.id !== id || source.contentPath !== `sources/raw/${id}.bin`) throw new Error(`source record identity mismatch: ${id}`);
  return source;
}

async function readArtifact(root: string, id: string): Promise<CognitiveArtifact> {
  const artifact = CognitiveArtifactSchema.parse(await readJson(artifactPath(root, id)));
  if (artifact.id !== id) throw new Error(`cognitive artifact identity mismatch: ${id}`);
  return artifact;
}

function schemePath(root: string, id: string, revision: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(id) || !/^[a-zA-Z0-9._-]+$/.test(revision)) throw new Error(`invalid formation scheme identity: ${id}@${revision}`);
  return resolveContained(root, `schemes/${id}@${revision}.json`, "formation scheme");
}

function artifactPath(root: string, id: string): string {
  if (!/^artifact_[a-zA-Z0-9-]+$/.test(id)) throw new Error(`invalid cognitive artifact id: ${id}`);
  return resolveContained(root, `artifacts/${id}.json`, "cognitive artifact");
}

function score(entry: CatalogEntry, terms: string[]): number {
  const title = entry.title.toLocaleLowerCase();
  const body = entry.body.toLocaleLowerCase();
  const tags = entry.tags.join(" ").toLocaleLowerCase();
  const stage = entry.stage.toLocaleLowerCase();
  return terms.reduce((total, term) => total + (title.includes(term) ? 4 : 0) + (tags.includes(term) ? 3 : 0) + (stage.includes(term) ? 2 : 0) + (body.includes(term) ? 1 : 0), 0);
}

async function appendEvent(root: string, type: EventType, actor: string, targetId: string, data: Record<string, unknown>) {
  const event = { version: "atthis.cognition-event.v1", id: `event_${randomUUID()}`, at: now(), actor, type, targetId, data };
  await appendFile(resolve(root, "state/events.jsonl"), `${JSON.stringify(event)}\n`, "utf8");
}

function emptyCatalog(): Catalog { return { version: CatalogVersion, generatedAt: now(), entries: [] }; }
function summarizeArtifact(artifact: CognitiveArtifact) {
  return {
    id: artifact.id,
    scheme: artifact.scheme,
    stage: artifact.stage,
    title: artifact.title,
    status: artifact.status,
    moveId: artifact.formation.moveId,
    inputs: artifact.formation.inputs,
    updatedAt: artifact.updatedAt,
  };
}
function summarizeSource(source: SourceRecord) {
  return { id: source.id, kind: source.kind, locator: source.locator, capturedAt: source.capturedAt };
}
function searchTerms(query: string) { const value = query.trim().toLocaleLowerCase(); return value ? [...new Set([value, ...value.split(/\s+/u)])] : []; }
function preview(content: string) { return content.length > 240 ? `${content.slice(0, 237)}...` : content; }
async function jsonFiles(path: string) { return (await readdir(path)).filter((name) => name.endsWith(".json")).sort(); }

function resolveContained(root: string, path: string, label: string): string {
  if (isAbsolute(path)) throw new Error(`${label} path must be relative: ${path}`);
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)) throw new Error(`${label} path escapes cognition home: ${path}`);
  return absolute;
}

async function readJson(path: string): Promise<unknown> { return JSON.parse(await readFile(path, "utf8")); }
async function writeJson(path: string, value: unknown): Promise<void> { await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.${randomUUID()}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, path); }
async function writeBytes(path: string, value: Uint8Array): Promise<void> { await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.${randomUUID()}.tmp`; await writeFile(temporary, value); await rename(temporary, path); }
async function exists(path: string): Promise<boolean> { return stat(path).then(() => true, () => false); }
function sha256(value: Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
function nonempty(value: string, label: string): string { if (!value.trim()) throw new Error(`${label} must be non-empty`); return value.trim(); }
function now(): string { return new Date().toISOString(); }
