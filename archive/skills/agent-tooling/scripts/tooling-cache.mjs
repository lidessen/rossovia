#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const adapters = {
  codex: {
    command: "codex",
    versionArgs: ["--version"],
    helpArgs: ["exec", "--help"],
  },
  claude: {
    command: "claude",
    versionArgs: ["--version"],
    helpArgs: ["--help"],
  },
  cursor: {
    command: "cursor-agent",
    versionArgs: ["--version"],
    helpArgs: ["--help"],
  },
};

function usage(message) {
  if (message) process.stderr.write(`${message}\n\n`);
  process.stderr.write(
    "Usage:\n"
      + "  node scripts/tooling-cache.mjs probe <codex|claude|cursor> [--cache-dir <path>]\n"
      + "  node scripts/tooling-cache.mjs show <codex|claude|cursor> [--cache-dir <path>]\n"
      + "  node scripts/tooling-cache.mjs put <tool> <capabilities.json> [--cache-dir <path>]\n"
      + "  node scripts/tooling-cache.mjs list [--cache-dir <path>]\n"
      + "  node scripts/tooling-cache.mjs root [--cache-dir <path>]\n",
  );
  process.exit(message ? 2 : 0);
}

function parseArguments(argv) {
  const remaining = [];
  let cacheDirectory;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--cache-dir") {
      const value = argv[index + 1];
      if (!value) usage("--cache-dir requires a path");
      cacheDirectory = resolve(value);
      index += 1;
    } else {
      remaining.push(argv[index]);
    }
  }
  return { remaining, cacheDirectory };
}

function defaultCacheDirectory() {
  if (process.env.AGENT_TOOLING_CACHE_HOME) {
    return resolve(process.env.AGENT_TOOLING_CACHE_HOME);
  }
  if (process.env.XDG_CACHE_HOME) {
    return join(resolve(process.env.XDG_CACHE_HOME), "agent-tooling");
  }
  if (platform() === "darwin") {
    return join(homedir(), "Library", "Caches", "agent-tooling");
  }
  if (platform() === "win32" && process.env.LOCALAPPDATA) {
    return join(resolve(process.env.LOCALAPPDATA), "agent-tooling", "Cache");
  }
  return join(homedir(), ".cache", "agent-tooling");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function writeAtomic(path, content) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, content, "utf8");
    renameSync(temporary, path);
  } catch (error) {
    try {
      rmSync(temporary, { force: true });
    } catch {
      // Preserve the original failure.
    }
    throw new Error(`cannot write agent-tooling cache at ${path}: ${error.message}`);
  }
}

function writeJson(path, value) {
  writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    shell: false,
    timeout: 30_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    available: result.error?.code !== "ENOENT",
    exitCode: result.status,
    signal: result.signal,
    error: result.error ? result.error.message : null,
    stdout,
    stderr,
  };
}

function evidenceText(result) {
  const sections = [];
  if (result.stdout) sections.push(result.stdout);
  if (result.stderr) sections.push(`--- stderr ---\n${result.stderr}`);
  if (result.error) sections.push(`--- error ---\n${result.error}\n`);
  return sections.join("\n");
}

function versionIdentity(result) {
  const stdout = result.stdout.trim();
  if (stdout) return stdout;
  return result.stderr.trim() || null;
}

function compactEvidence(result, relativePath, text) {
  return {
    path: relativePath,
    sha256: sha256(text),
    exitCode: result.exitCode,
    signal: result.signal,
    error: result.error,
  };
}

function requireTool(tool) {
  const adapter = adapters[tool];
  if (!adapter) usage(`unsupported tool '${tool}'`);
  return adapter;
}

function probe(tool, cacheDirectory) {
  const adapter = requireTool(tool);
  const toolDirectory = join(cacheDirectory, tool);
  const evidenceDirectory = join(toolDirectory, "evidence");
  const versionResult = run(adapter.command, adapter.versionArgs);
  const helpResult = versionResult.available
    ? run(adapter.command, adapter.helpArgs)
    : {
        available: false,
        exitCode: null,
        signal: null,
        error: `executable not found: ${adapter.command}`,
        stdout: "",
        stderr: "",
      };
  const versionText = evidenceText(versionResult);
  const helpText = evidenceText(helpResult);
  const versionPath = join(evidenceDirectory, "version.txt");
  const helpPath = join(evidenceDirectory, "headless-help.txt");
  writeAtomic(versionPath, versionText);
  writeAtomic(helpPath, helpText);

  const observation = {
    version: "agent-tooling-observation.v1",
    tool,
    capturedAt: now(),
    adapter: {
      command: adapter.command,
      versionArgs: adapter.versionArgs,
      helpArgs: adapter.helpArgs,
    },
    binary: {
      available: versionResult.available,
      versionVerified: versionResult.exitCode === 0,
      versionText: versionResult.exitCode === 0 ? versionIdentity(versionResult) : null,
    },
    evidence: {
      version: compactEvidence(versionResult, "evidence/version.txt", versionText),
      headlessHelp: compactEvidence(helpResult, "evidence/headless-help.txt", helpText),
    },
  };
  writeJson(join(toolDirectory, "observation.json"), observation);
  return observation;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertTimestamp(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
}

function validateCapabilities(value, tool) {
  assertObject(value, "capability projection");
  if (value.version !== "agent-tooling-capabilities.v1") {
    throw new Error("unsupported capability projection version");
  }
  if (value.tool !== tool) {
    throw new Error(`capability projection tool must equal '${tool}'`);
  }
  if (typeof value.toolVersion !== "string" || value.toolVersion.trim() === "") {
    throw new Error("toolVersion must be a non-empty string");
  }
  assertTimestamp(value.checkedAt, "checkedAt");
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    throw new Error("sources must contain at least one observed source");
  }
  for (const [index, source] of value.sources.entries()) {
    assertObject(source, `sources[${index}]`);
    if (typeof source.kind !== "string" || typeof source.locator !== "string") {
      throw new Error(`sources[${index}] requires string kind and locator`);
    }
    assertTimestamp(source.checkedAt, `sources[${index}].checkedAt`);
  }
  assertObject(value.capabilities, "capabilities");
  return value;
}

function put(tool, sourcePath, cacheDirectory) {
  requireTool(tool);
  const absoluteSource = resolve(sourcePath);
  const raw = readFileSync(absoluteSource, "utf8");
  const projection = validateCapabilities(JSON.parse(raw), tool);
  const stored = {
    ...projection,
    projectionSha256: sha256(raw),
    cachedAt: now(),
  };
  const destination = join(cacheDirectory, tool, "capabilities.json");
  writeJson(destination, stored);
  return { tool, destination, projectionSha256: stored.projectionSha256 };
}

function currentVersion(adapter) {
  const result = run(adapter.command, adapter.versionArgs);
  return {
    available: result.available,
    verified: result.exitCode === 0,
    versionText: result.exitCode === 0 ? versionIdentity(result) : null,
  };
}

function show(tool, cacheDirectory) {
  const adapter = requireTool(tool);
  const toolDirectory = join(cacheDirectory, tool);
  const observationPath = join(toolDirectory, "observation.json");
  const capabilitiesPath = join(toolDirectory, "capabilities.json");
  const observation = existsSync(observationPath) ? readJson(observationPath) : null;
  const capabilities = existsSync(capabilitiesPath) ? readJson(capabilitiesPath) : null;
  const installed = currentVersion(adapter);
  let localProbe = "missing";
  if (!installed.available) localProbe = "unavailable";
  else if (!installed.verified) localProbe = "probe-failed";
  else if (observation?.binary?.versionText === installed.versionText) localProbe = "current";
  else if (observation) localProbe = "stale";
  const capabilityVersion = capabilities?.toolVersion;
  const capabilityMatch = capabilityVersion && installed.versionText
    ? installed.versionText.includes(capabilityVersion)
      || capabilityVersion.includes(installed.versionText)
    : false;
  return {
    tool,
    cacheDirectory,
    installed,
    freshness: {
      localProbe,
      capabilityVersion: capabilities
        ? capabilityMatch
          ? "matches-installed-version"
          : "review-required"
        : "missing",
      documentation: capabilities ? "recorded-not-revalidated" : "missing",
    },
    observation,
    capabilities,
  };
}

function list(cacheDirectory) {
  if (!existsSync(cacheDirectory)) return { cacheDirectory, tools: [] };
  const tools = readdirSync(cacheDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return { cacheDirectory, tools };
}

const { remaining, cacheDirectory: cacheOverride } = parseArguments(process.argv.slice(2));
const [command, ...arguments_] = remaining;
const cacheDirectory = cacheOverride ?? defaultCacheDirectory();

try {
  let result;
  if (command === "probe" && arguments_.length === 1) {
    result = probe(arguments_[0], cacheDirectory);
  } else if (command === "show" && arguments_.length === 1) {
    result = show(arguments_[0], cacheDirectory);
  } else if (command === "put" && arguments_.length === 2) {
    result = put(arguments_[0], arguments_[1], cacheDirectory);
  } else if (command === "list" && arguments_.length === 0) {
    result = list(cacheDirectory);
  } else if (command === "root" && arguments_.length === 0) {
    result = { cacheDirectory };
  } else {
    usage(command ? `invalid arguments for '${command}'` : undefined);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`tooling-cache: ${error.message}\n`);
  process.exit(1);
}
