import { describe, expect, test } from "bun:test";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";

const unusedClient = {} as AutonomyClient;
const handler = createWorkbenchRequestHandler({
  port: 4317,
  roots: [],
}, unusedClient);

describe("Principal Workbench static asset contract", () => {
  test.each([
    ["/", "text/html; charset=utf-8"],
    ["/styles.css", "text/css; charset=utf-8"],
    ["/app.js", "text/javascript; charset=utf-8"],
    ["/execution-proposal.js", "text/javascript; charset=utf-8"],
    ["/operational-semantics.js", "text/javascript; charset=utf-8"],
  ])("serves the declared browser entry dependency %s", async (pathname, contentType) => {
    const response = await handler(new Request(`http://127.0.0.1:4317${pathname}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(contentType);
    expect(await response.text()).not.toHaveLength(0);
  });

  test("continues to reject undeclared public paths", async () => {
    const response = await handler(
      new Request("http://127.0.0.1:4317/private-source.ts"),
    );

    expect(response.status).toBe(404);
  });
});
