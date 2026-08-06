import { describe, expect, test } from "bun:test";
import { shouldFocusCapture } from "../src/shortcuts.js";

function event(overrides = {}) {
  return {
    key: "n",
    keyCode: 78,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: { tagName: "BODY", isContentEditable: false },
    ...overrides,
  };
}

describe("desktop quick capture shortcut", () => {
  test("plain n or N focuses capture only outside editing and IME contexts", () => {
    expect(shouldFocusCapture(event())).toBe(true);
    expect(shouldFocusCapture(event({ key: "N" }))).toBe(true);
    expect(shouldFocusCapture(event({ target: { tagName: "INPUT" } }))).toBe(false);
    expect(shouldFocusCapture(event({ target: { tagName: "DIV", isContentEditable: true } }))).toBe(false);
    expect(shouldFocusCapture(event({ isComposing: true, keyCode: 229 }))).toBe(false);
    expect(shouldFocusCapture(event({ metaKey: true }))).toBe(false);
    expect(shouldFocusCapture(event({ shiftKey: true, key: "N" }))).toBe(false);
  });
});
