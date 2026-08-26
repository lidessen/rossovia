import { describe, expect, test } from "bun:test";
import { shouldSubmitOnEnter } from "../src/ime.js";

describe("IME-safe capture submission", () => {
  test("only a plain Enter outside composition submits", () => {
    expect(shouldSubmitOnEnter({ key: "Enter", isComposing: true, keyCode: 229 }, true)).toBe(false);
    expect(shouldSubmitOnEnter({ key: "Enter", isComposing: false, keyCode: 13 }, true)).toBe(false);
    expect(shouldSubmitOnEnter({ key: "Enter", isComposing: false, keyCode: 13 }, false)).toBe(true);
    expect(shouldSubmitOnEnter({ key: "Enter", shiftKey: true, isComposing: false, keyCode: 13 }, false)).toBe(false);
  });
});
