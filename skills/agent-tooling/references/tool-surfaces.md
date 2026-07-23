# Coding-Agent Tool Surfaces

This reference supplies official discovery entry points and a neutral cache
shape. It is not a frozen CLI manual. Check the installed version's help before
constructing an invocation, and revisit the linked official source before a
configuration mutation.

## Capability questions

For the selected harness, establish only the facts needed by the current
operation:

- What command starts an interactive or non-interactive agent run?
- Can the run emit a final JSON object, an event stream, or a schema-constrained
  result?
- Can it select or exclude user, project, hook, skill, plugin, MCP, memory, and
  rule sources without changing the ordinary installation?
- What tools and write permissions remain available in each mode?
- Can an exact session be resumed, and where is persistence controlled?
- Which usage, latency, model, auth carrier, and terminal state are observable?
- What constitutes success, failure, timeout, cancellation, or an incomplete
  event stream?
- Which supported surface enables, narrows, disables, reloads, or removes one
  configured component?

Do not assume similarly named flags provide equivalent isolation or authority.

## Official entry points

Checked on 2026-07-23:

- **Codex:** [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
  and [developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli).
  The current command family begins with `codex exec`.
- **Claude Code:** [headless mode](https://code.claude.com/docs/en/headless)
  and [CLI reference](https://code.claude.com/docs/en/cli-usage). The current
  command family uses `claude -p`; its documented bare mode is useful as a
  diagnostic counterfactual because it skips several discovered surfaces.
- **Cursor Agent:** [CLI parameters](https://docs.cursor.com/en/cli/reference/parameters),
  [output formats](https://docs.cursor.com/en/cli/reference/output-format), and
  [headless mode](https://docs.cursor.com/en/cli/headless). The current command
  family uses `cursor-agent -p`. Current documentation warns that print mode can
  retain write and shell capability, so isolate it before a probe.

These command families are bootstrap locators, not durable claims about current
flags or guarantees. The bundled script caches the installed version and help;
official-document findings belong in the machine-local capability projection.

For skills, hooks, MCP servers, plugins, rules, permissions, profiles, and
memory, begin from the official configuration index for the detected tool.
Load only the section needed by the current operation. Do not copy a vendor's
whole configuration reference into this package or cache.

## Capability projection

After live research, create a compact JSON file:

```json
{
  "version": "agent-tooling-capabilities.v1",
  "tool": "claude",
  "toolVersion": "observed version text",
  "checkedAt": "2026-07-23T00:00:00Z",
  "sources": [
    {
      "kind": "official-doc",
      "locator": "https://code.claude.com/docs/en/headless",
      "checkedAt": "2026-07-23T00:00:00Z"
    }
  ],
  "capabilities": {
    "headless": {
      "available": true,
      "argv": ["claude", "-p", "<prompt>"]
    },
    "structuredOutput": {
      "available": true,
      "formats": ["json", "stream-json"]
    },
    "cleanBaseline": {
      "available": true,
      "notes": "Recheck current help before use."
    }
  }
}
```

Keep capability names descriptive rather than enforcing a universal enum.
Include only task-relevant facts. `argv` is an argument vector template, never
a shell command string. A source records provenance; it does not make the
projection current forever.

## Cache interpretation

`probe` stores local version and help evidence. `put` validates and stores the
capability projection. `show` reports both plus separate freshness:

- `current`: the installed version still matches the last local probe;
- `stale`: the binary version changed;
- `probe-failed`: an executable was found but its version probe did not
  complete, for example because authentication or local runtime state blocked
  it;
- `missing` or `unavailable`: evidence was not obtained or no executable was
  found;
- `recorded-not-revalidated`: official-document claims exist but have not been
  refreshed during this invocation.

Only a new source check can promote documentation evidence. A version match
does not prove a web document is unchanged.
