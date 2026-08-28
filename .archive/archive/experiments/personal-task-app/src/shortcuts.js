function isEditingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  if (["input", "textarea", "select"].includes(tagName)) return true;
  if (target?.isContentEditable) return true;
  return Boolean(target?.closest?.('[contenteditable]:not([contenteditable="false"])'));
}

export function shouldFocusCapture(event) {
  return !event.defaultPrevented
    && event.key?.toLowerCase() === "n"
    && !event.isComposing
    && event.keyCode !== 229
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && !isEditingTarget(event.target);
}
