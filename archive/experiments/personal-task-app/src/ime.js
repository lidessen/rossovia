export function shouldSubmitOnEnter(event, compositionActive = false) {
  return event.key === "Enter"
    && event.shiftKey !== true
    && event.isComposing !== true
    && event.keyCode !== 229
    && compositionActive !== true;
}
