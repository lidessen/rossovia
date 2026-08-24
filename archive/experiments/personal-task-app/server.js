const DEFAULT_PORT = 4310;
export const LOCAL_HOST = "127.0.0.1";
const root = import.meta.dir;

export function parsePort(args, env) {
  const equalsArgument = args.find((argument) => argument.startsWith("--port="));
  const flagIndex = args.indexOf("--port");
  const candidate = equalsArgument?.slice("--port=".length)
    ?? (flagIndex >= 0 ? args[flagIndex + 1] : undefined)
    ?? env.PERSONAL_TASK_APP_PORT
    ?? String(DEFAULT_PORT);
  const port = Number(candidate);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${candidate}`);
  }
  return port;
}

export function serverBindOptions(port) {
  return { hostname: LOCAL_HOST, port };
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

function extension(pathname) {
  const dot = pathname.lastIndexOf(".");
  return dot < 0 ? "" : pathname.slice(dot);
}

export function startServer({ args = Bun.argv.slice(2), env = process.env, port } = {}) {
  return Bun.serve({
    ...serverBindOptions(port ?? parsePort(args, env)),
    async fetch(request) {
      const url = new URL(request.url);
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response("Bad request", { status: 400 });
      }
      if (pathname === "/") pathname = "/index.html";
      if (pathname.includes("\0") || pathname.split("/").includes("..")) {
        return new Response("Bad request", { status: 400 });
      }
      const file = Bun.file(`${root}${pathname}`);
      if (!(await file.exists())) return new Response("Not found", { status: 404 });
      return new Response(file, {
        headers: {
          "Content-Type": mimeTypes.get(extension(pathname)) ?? "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    },
  });
}

if (import.meta.main) {
  const server = startServer();
  console.log(`Personal Task App: http://${LOCAL_HOST}:${server.port}`);
}
