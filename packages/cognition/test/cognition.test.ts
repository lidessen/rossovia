import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  admitCognitiveArtifact,
  captureSource,
  checkCognitionHome,
  findFormationDependents,
  findSourceDependents,
  initializeCognitionHome,
  proposeCognitiveArtifact,
  queryCognition,
  querySources,
  recordCognitionUse,
  readSourceContent,
  rebuildCatalog,
  registerFormationScheme,
  retainFormationProposals,
  supersedeCognitiveArtifact,
  traceFormation,
} from "../src";

const homes: string[] = [];

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })));
});

describe("progressive cognition formation", () => {
  test("enforces a declared multi-stage path and admission lineage", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Bounded formation experiment");
    const boundarySource = await source(home, "design:boundary", "The source owns project facts.");
    const runtimeSource = await source(home, "runtime:index", "The catalog can be rebuilt.");

    const boundary = await propose(home, "observe", [{ type: "source", id: boundarySource.id }], "Source authority", "The source owns facts.");
    const runtime = await propose(home, "observe", [{ type: "source", id: runtimeSource.id }], "Index behavior", "The catalog is a projection.");
    const model = await propose(home, "synthesize", [
      { type: "artifact", id: boundary.id },
      { type: "artifact", id: runtime.id },
    ], "Authority model", "Retrieval projections never acquire source authority.");

    await admitCognitiveArtifact(home, boundary.id, "reviewer:test", "Checked against source");
    await expect(admitCognitiveArtifact(home, model.id, "reviewer:test", "Premature synthesis")).rejects.toThrow(`input artifact ${runtime.id} is proposed`);
    await admitCognitiveArtifact(home, runtime.id, "reviewer:test", "Checked against source");
    await admitCognitiveArtifact(home, model.id, "reviewer:test", "Relations checked together");

    const guidance = await propose(home, "guide", [{ type: "artifact", id: model.id }], "Maintenance guidance", "Rebuild indexes; repair sources.");
    await admitCognitiveArtifact(home, guidance.id, "reviewer:test", "Guidance follows admitted model");

    await expect(propose(home, "guide", [{ type: "source", id: boundarySource.id }], "Illegal jump", "Skip the formation path.")).rejects.toThrow("must be artifact");
    expect((await traceFormation(home, guidance.id)).artifacts.map((item) => item.stage)).toEqual(["guidance", "model", "observation", "observation"]);
    expect((await findFormationDependents(home, boundary.id)).dependents.map((item) => item.id)).toEqual([model.id, guidance.id]);
  });

  test("expresses practice feedback as a new formation rather than an automatic rewrite", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Practice loop probe");
    const material = await source(home, "design:rule", "Use source authority.");
    const observation = await propose(home, "observe", [{ type: "source", id: material.id }], "Initial observation", "Sources own facts.");
    await admitCognitiveArtifact(home, observation.id, "reviewer:test", "Observed directly");
    const second = await propose(home, "observe", [{ type: "source", id: material.id }], "Second observation", "Indexes are projections.");
    await admitCognitiveArtifact(home, second.id, "reviewer:test", "Observed directly");
    const model = await propose(home, "synthesize", [{ type: "artifact", id: observation.id }, { type: "artifact", id: second.id }], "Model", "Fact authority remains with sources.");
    await admitCognitiveArtifact(home, model.id, "reviewer:test", "Synthesis verified");
    const guidance = await propose(home, "guide", [{ type: "artifact", id: model.id }], "Guidance", "Inspect sources before accepting projections.");
    await admitCognitiveArtifact(home, guidance.id, "reviewer:test", "Ready for practice");
    const outcome = await source(home, "practice:review", "Direct source inspection was still too costly for routine review.");

    const revisedObservation = await propose(home, "reflect", [
      { type: "artifact", id: guidance.id },
      { type: "source", id: outcome.id },
    ], "Observed limitation", "The guidance preserved authority but imposed excessive routine cost.");
    expect(revisedObservation.stage).toBe("observation");
    expect(revisedObservation.status).toBe("proposed");
    expect((await queryCognition(home, "excessive")).results).toEqual([]);
    expect((await queryCognition(home, "excessive", { status: "proposed" })).results[0]?.id).toBe(revisedObservation.id);
  });

  test("uses a different domain scheme without universal stages", async () => {
    const home = await newHome();
    await registerFormationScheme(home, {
      id: "personal-preference",
      revision: "1",
      title: "Personal preference formation",
      stages: [{ id: "signal", purpose: "Retain one situated expression." }, { id: "preference", purpose: "Form a bounded repeated preference." }],
      moves: [
        { id: "notice", purpose: "Represent one direct expression.", inputs: [{ type: "source", role: "expression" }], outputStage: "signal" },
        { id: "infer", purpose: "Infer a preference from two admitted signals.", inputs: [{ type: "artifact", role: "earlier signal", stage: "signal" }, { type: "artifact", role: "later signal", stage: "signal" }], outputStage: "preference" },
      ],
    }, "human:test", "Non-project counterexample");
    const first = await source(home, "conversation:one", "Summarize a large review before asking me to confirm.");
    const signal = await proposeCognitiveArtifact(home, {
      scheme: { id: "personal-preference", revision: "1" }, moveId: "notice", title: "Review summary request", body: "A summary was requested before confirmation.", rationale: "Direct expression", inputs: [{ type: "source", id: first.id }], actor: "agent:test",
    });
    expect(signal.stage).toBe("signal");
    expect(signal).not.toHaveProperty("workspace");
    expect(signal).not.toHaveProperty("gitRevision");
  });

  test("retains prepared Cell output only as proposals for one fixed move", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Cell boundary probe");
    const material = await source(home, "design:cell", "A Cell executes a prepared move but cannot admit it.");
    expect(await retainFormationProposals(home, {
      version: "atthis.cognition-formation.v1", disposition: "no-proposal", rationale: "Material is insufficient.", proposals: [],
    }, { scheme: { id: "project", revision: "1" }, moveId: "observe", inputs: [{ type: "source", id: material.id }], actor: "cell:test" })).toEqual([]);
    const retained = await retainFormationProposals(home, {
      version: "atthis.cognition-formation.v1",
      disposition: "propose",
      rationale: "One bounded observation is supported.",
      proposals: [{ title: "Cell boundary", body: "The Cell prepares but does not admit cognition.", limitations: ["Host authority remains external."], tags: ["authority"], formationRationale: "Directly stated by the source." }],
    }, { scheme: { id: "project", revision: "1" }, moveId: "observe", inputs: [{ type: "source", id: material.id }], actor: "cell:test" });
    expect(retained[0]?.status).toBe("proposed");
  });

  test("maintains admitted memory through revision impact, observed use, and explicit replacement", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Maintenance lifecycle probe");
    const originalSource = await source(home, "design:maintained", "The catalog owns retrieval only.");
    const original = await propose(home, "observe", [{ type: "source", id: originalSource.id }], "Original observation", "The catalog owns retrieval only.");
    await admitCognitiveArtifact(home, original.id, "reviewer:test", "Checked original source");

    const revisedSource = await captureSource(home, {
      kind: "manual",
      locator: "design:maintained",
      content: new TextEncoder().encode("The catalog is one replaceable retrieval projection."),
      predecessorId: originalSource.id,
      actor: "hook:test",
    });
    const sourceImpact = await findSourceDependents(home, revisedSource.id);
    expect(sourceImpact.affected.map((item) => item.id)).toEqual([original.id]);

    const replacement = await propose(home, "observe", [{ type: "source", id: revisedSource.id }], "Revised observation", "The catalog is one replaceable retrieval projection.");
    await admitCognitiveArtifact(home, replacement.id, "reviewer:test", "Checked revised source");
    expect((await recordCognitionUse(home, replacement.id, "agent:test", "Prepare a retrieval design")).purpose).toBe("Prepare a retrieval design");
    const superseded = await supersedeCognitiveArtifact(home, original.id, replacement.id, "reviewer:test", "Re-formed from revised source");
    expect(superseded.supersession?.replacementId).toBe(replacement.id);
    expect((await queryCognition(home, "catalog")).results.map((item) => item.id)).toEqual([replacement.id]);
    expect((await queryCognition(home, "catalog", { status: "superseded" })).results.map((item) => item.id)).toEqual([original.id]);
  });

  test("retains source revision identity across a content reversion", async () => {
    const home = await newHome();
    const original = await source(home, "design:reversion", "Version A");
    const revised = await captureSource(home, {
      kind: "manual",
      locator: "design:reversion",
      content: new TextEncoder().encode("Version B"),
      predecessorId: original.id,
      actor: "hook:test",
    });
    const reverted = await captureSource(home, {
      kind: "manual",
      locator: "design:reversion",
      content: new TextEncoder().encode("Version A"),
      predecessorId: revised.id,
      actor: "hook:test",
    });
    expect(reverted.id).not.toBe(original.id);
    expect(reverted.predecessorId).toBe(revised.id);
    await expect(captureSource(home, {
      kind: "manual",
      locator: "design:reversion",
      content: new TextEncoder().encode("Version A"),
      predecessorId: reverted.id,
      actor: "hook:test",
    })).rejects.toThrow("must change the captured content");
  });

  test("fails closed on forged source locators and damaged admission evidence", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Source integrity probe");
    const material = await source(home, "design:authority", "The source owns the claim.");
    await expect(proposeCognitiveArtifact(home, {
      scheme: { id: "project", revision: "1" },
      moveId: "observe",
      title: "Forged locator",
      body: "The source owns the claim.",
      rationale: "Claimed source relation",
      inputs: [{ type: "source", id: material.id, locator: "design:other" }],
      actor: "agent:test",
    })).rejects.toThrow("locator does not match");

    const forgedStage = await propose(home, "observe", [{ type: "source", id: material.id }], "Forged stage", "The source owns the claim.");
    const forgedStagePath = join(home, "artifacts", `${forgedStage.id}.json`);
    const forgedStageRecord = JSON.parse(await readFile(forgedStagePath, "utf8"));
    forgedStageRecord.stage = "guidance";
    await writeFile(forgedStagePath, JSON.stringify(forgedStageRecord), "utf8");
    await expect(admitCognitiveArtifact(home, forgedStage.id, "reviewer:test", "Checked source")).rejects.toThrow("does not match move observe output observation");
    await expect(checkCognitionHome(home)).rejects.toThrow("does not match move observe output observation");

    forgedStageRecord.stage = "observation";
    await writeFile(forgedStagePath, JSON.stringify(forgedStageRecord), "utf8");
    const proposed = await propose(home, "observe", [{ type: "source", id: material.id }], "Admission integrity", "The source owns the claim.");
    await writeFile(join(home, "sources", "raw", `${material.id}.bin`), "tampered", "utf8");
    await expect(admitCognitiveArtifact(home, proposed.id, "reviewer:test", "Checked source")).rejects.toThrow("source content hash mismatch");
  });

  test("rechecks transitive source integrity before admitting a higher formation", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Transitive admission probe");
    const firstSource = await source(home, "design:first", "First observation.");
    const secondSource = await source(home, "design:second", "Second observation.");
    const first = await propose(home, "observe", [{ type: "source", id: firstSource.id }], "First", "First observation.");
    const second = await propose(home, "observe", [{ type: "source", id: secondSource.id }], "Second", "Second observation.");
    await admitCognitiveArtifact(home, first.id, "reviewer:test", "Checked source");
    await admitCognitiveArtifact(home, second.id, "reviewer:test", "Checked source");
    const model = await propose(home, "synthesize", [{ type: "artifact", id: first.id }, { type: "artifact", id: second.id }], "Model", "Related observations.");

    await writeFile(join(home, "sources", "raw", `${firstSource.id}.bin`), "tampered", "utf8");
    await expect(admitCognitiveArtifact(home, model.id, "reviewer:test", "Checked lineage")).rejects.toThrow(`source content hash mismatch: ${firstSource.id}`);
  });

  test("keeps the CLI small, detects damaged evidence, and rebuilds its projection", async () => {
    const home = await mkdtemp(join(tmpdir(), "atthis-cognition-cli-"));
    homes.push(home);
    const sourceFile = join(home, "input.txt");
    const schemeFile = join(home, "scheme.json");
    const bodyFile = join(home, "observation.md");
    await writeFile(sourceFile, "A general note about cooperative review.\n", "utf8");
    await writeFile(schemeFile, JSON.stringify(projectScheme), "utf8");
    await writeFile(bodyFile, "Cooperative review was directly observed.\n", "utf8");
    expect(runCli("init", "--home", home).exitCode).toBe(0);
    expect(runCli("scheme", "add", schemeFile, "--by", "human:test", "--basis", "CLI probe", "--home", home).exitCode).toBe(0);
    const captured = JSON.parse(runCli("source", "add", sourceFile, "--kind", "manual", "--home", home).stdout.toString());
    expect((await querySources(home, "cooperative review")).results[0]?.id).toBe(captured.id);
    const proposedRun = runCli(
      "artifact", "propose", "--scheme", "project", "--revision", "1", "--move", "observe",
      "--title", "Cooperative review", "--body-file", bodyFile, "--rationale", "Direct source representation",
      "--input", `source:${captured.id}`, "--home", home,
    );
    expect(proposedRun.exitCode).toBe(0);
    const proposed = JSON.parse(proposedRun.stdout.toString());
    expect(runCli("artifact", "admit", proposed.id, "--by", "reviewer:test", "--basis", "Checked source", "--home", home).exitCode).toBe(0);
    const traced = JSON.parse(runCli("artifact", "trace", proposed.id, "--home", home).stdout.toString());
    expect(traced.sources.map((item: { id: string }) => item.id)).toEqual([captured.id]);
    const dependents = JSON.parse(runCli("artifact", "dependents", proposed.id, "--home", home).stdout.toString());
    expect(dependents.dependents).toEqual([]);
    const ingestedRun = runCliWithInput(JSON.stringify({
      kind: "conversation",
      locator: "session:cli-probe",
      content: "A correction entered through a generic hook contract.",
      actor: "hook:test",
    }), "source", "ingest", "--home", home);
    expect(ingestedRun.exitCode).toBe(0);
    const ingested = JSON.parse(ingestedRun.stdout.toString());
    expect(runCliWithInput(JSON.stringify({
      kind: "conversation",
      locator: "session:cli-probe",
      content: "A correction entered through a generic hook contract.",
      actor: "hook:test",
    }), "source", "ingest", "--home", home).stdout.toString()).toContain(ingested.id);
    expect((await checkCognitionHome(home)).schemes).toBe(1);
    const typo = runCli("query", "review", "--stgae", "observation", "--home", home);
    expect(typo.exitCode).toBe(2);
    expect(typo.stderr.toString()).toContain("unknown option: --stgae");

    await writeFile(join(home, "indexes", "catalog.json"), JSON.stringify({ version: "atthis.cognition-catalog.v1", generatedAt: new Date().toISOString(), entries: [] }), "utf8");
    const staleCheck = runCli("check", "--home", home);
    expect(staleCheck.exitCode).toBe(1);
    expect(JSON.parse(staleCheck.stdout.toString())).toMatchObject({ healthy: false, indexFresh: false });
    await rebuildCatalog(home);

    await writeFile(join(home, "sources", "raw", `${captured.id}.bin`), "tampered", "utf8");
    const damagedCheck = runCli("check", "--home", home);
    expect(damagedCheck.exitCode).toBe(1);
    expect(JSON.parse(damagedCheck.stdout.toString())).toMatchObject({ healthy: false, sourceProblems: [`${captured.id}: content hash mismatch`] });
    await expect(readSourceContent(home, captured.id)).rejects.toThrow("source content hash mismatch");
    expect((await queryCognition(home, "cooperative")).results.map((item) => item.id)).toEqual([proposed.id]);
    await writeFile(join(home, "indexes", "catalog.json"), JSON.stringify({ version: "atthis.cognition-catalog.v1", generatedAt: new Date().toISOString(), entries: [{ bad: true }] }), "utf8");
    await expect(queryCognition(home, "cooperative")).rejects.toThrow();
    await expect(checkCognitionHome(home)).rejects.toThrow();
    await rebuildCatalog(home);
    expect(JSON.parse(await readFile(join(home, "indexes", "catalog.json"), "utf8")).entries.map((entry: { id: string }) => entry.id)).toEqual([proposed.id]);
  });

  test("treats missing operation evidence as an unhealthy cognition home", async () => {
    const home = await newHome();
    await registerFormationScheme(home, projectScheme, "human:test", "Operation evidence probe");
    await source(home, "design:evidence", "Operation evidence must remain inspectable.");
    await writeFile(join(home, "state", "events.jsonl"), "", "utf8");

    const checked = await checkCognitionHome(home);
    expect(checked.healthy).toBeFalse();
    expect(checked.eventProblems).toContain("scheme.registered for project@1: expected 1 event, found 0");
    expect(runCli("check", "--home", home).exitCode).toBe(1);
  });

  test("prints explicit help successfully while unknown commands still fail", () => {
    const help = runCli("--help");
    expect(help.exitCode).toBe(0);
    expect(new TextDecoder().decode(help.stdout)).toContain("usage:");

    const shortHelp = runCli("-h");
    expect(shortHelp.exitCode).toBe(0);

    const unknown = runCli("unknown-command");
    expect(unknown.exitCode).toBe(2);
    expect(new TextDecoder().decode(unknown.stderr)).toContain("usage:");
  });
});

const projectScheme = {
  id: "project",
  revision: "1",
  title: "Project cognition formation",
  stages: [
    { id: "observation", purpose: "Represent bounded source or practice observations." },
    { id: "model", purpose: "Synthesize admitted observations into a local explanatory model." },
    { id: "guidance", purpose: "Express an admitted model for a named practice." },
  ],
  moves: [
    { id: "observe", purpose: "Represent one source without premature synthesis.", inputs: [{ type: "source", role: "material" }], outputStage: "observation" },
    { id: "synthesize", purpose: "Relate two observations into a bounded model.", inputs: [{ type: "artifact", role: "first determination", stage: "observation" }, { type: "artifact", role: "second determination", stage: "observation" }], outputStage: "model" },
    { id: "guide", purpose: "Express a model as actionable guidance.", inputs: [{ type: "artifact", role: "governing model", stage: "model" }], outputStage: "guidance" },
    { id: "reflect", purpose: "Return an observed practice outcome to cognition.", inputs: [{ type: "artifact", role: "guidance tested in practice", stage: "guidance" }, { type: "source", role: "observed practice outcome" }], outputStage: "observation" },
  ],
} as const;

async function newHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), "atthis-cognition-"));
  homes.push(home);
  await initializeCognitionHome(home);
  return home;
}

async function source(home: string, locator: string, content: string) {
  return captureSource(home, { kind: "manual", locator, content: new TextEncoder().encode(content), actor: "human:test" });
}

async function propose(home: string, moveId: string, inputs: Array<{ type: "source" | "artifact"; id: string }>, title: string, body: string) {
  return proposeCognitiveArtifact(home, { scheme: { id: "project", revision: "1" }, moveId, title, body, rationale: `Execute ${moveId} from declared inputs.`, inputs, actor: "agent:test" });
}

function runCli(...args: string[]) {
  return Bun.spawnSync(["bun", join(import.meta.dir, "..", "src", "cli.ts"), ...args], { stdout: "pipe", stderr: "pipe" });
}

function runCliWithInput(input: string, ...args: string[]) {
  return Bun.spawnSync(["bun", join(import.meta.dir, "..", "src", "cli.ts"), ...args], {
    stdin: new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
  });
}
