import { resolve, sep } from "node:path";
import { assertControlledFixturesCurrent } from "./scripts/fixture-consistency.js";
import { validateProjectBundle } from "./lib/project-evidence-bundle.js";
import { validateProjectBundleAgainstRepository } from "./scripts/project-lens-builder.js";

const DEFAULT_PORT = 4311;
const PORT_ENV = "HUMAN_AGENT_VIS_PORT";
const ROOT = import.meta.dir;

function parsePort() {
  const arguments_ = Bun.argv.slice(2);
  let raw = process.env[PORT_ENV] ?? String(DEFAULT_PORT);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--port") raw = arguments_[index + 1] ?? "";
    if (argument.startsWith("--port=")) raw = argument.slice("--port=".length);
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError(`Invalid port '${raw}'. Use --port <1-65535> or ${PORT_ENV}.`);
  }
  return port;
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function extension(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function response(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

await assertControlledFixturesCurrent();
const port = parsePort();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  development: true,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return response(400, "Malformed path");
    }
    if (pathname === "/api/project-bundle") {
      const requested = url.searchParams.get("path") ?? "";
      const expectedBindingDigest = url.searchParams.get("binding") ?? "";
      if (!requested.startsWith("./generated/") || requested.includes("..")) {
        return response(400, "Only generated Project Lens bundles are allowed.");
      }
      const generatedRoot = resolve(ROOT, "generated");
      const bundlePath = resolve(ROOT, requested);
      if (!bundlePath.startsWith(`${generatedRoot}${sep}`)) {
        return response(403, "Project Lens bundle path is outside generated state.");
      }
      const bundleFile = Bun.file(bundlePath);
      if (!(await bundleFile.exists())) return response(404, "Generate a Project Lens bundle first.");
      try {
        const bundle = await bundleFile.json();
        const internal = await validateProjectBundle(bundle);
        if (!internal.valid) return response(409, internal.errors.map((entry) => entry.message).join(" "));
        const repository = await validateProjectBundleAgainstRepository(bundle, { expectedBindingDigest });
        if (!repository.valid) return response(409, repository.errors.map((entry) => entry.message).join(" "));
        return response(200, JSON.stringify(bundle), { "content-type": contentTypes[".json"] });
      } catch (error) {
        return response(422, `Project Lens bundle could not be verified: ${error.message}`);
      }
    }
    if (pathname === "/") pathname = "/index.html";
    const filePath = resolve(ROOT, `.${pathname}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
      return response(403, "Path is outside the prototype root");
    }
    const file = Bun.file(filePath);
    if (!(await file.exists())) return response(404, "Not found");
    return response(200, file, {
      "content-type": contentTypes[extension(filePath)] ?? "application/octet-stream",
    });
  },
});

console.log(`Human-Agent Visualization: ${server.url}`);
console.log(`Override with ${PORT_ENV} or --port.`);
