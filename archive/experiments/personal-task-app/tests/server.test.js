import { describe, expect, test } from "bun:test";
import { LOCAL_HOST, parsePort, serverBindOptions } from "../server.js";

describe("local development server", () => {
  test("bind options explicitly restrict the listener to localhost", () => {
    expect(LOCAL_HOST).toBe("127.0.0.1");
    expect(serverBindOptions(4310)).toEqual({ hostname: "127.0.0.1", port: 4310 });
  });

  test("rejects invalid configured ports", () => {
    expect(() => parsePort(["--port", "0"], {})).toThrow("Invalid port");
    expect(() => parsePort(["--port=70000"], {})).toThrow("Invalid port");
  });
});
