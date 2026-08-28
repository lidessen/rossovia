# Current Tool-Surface Routing

This reference routes investigation; it is not a frozen configuration schema.
Before writing a user-level file, setting, hook, plugin, MCP declaration, or
permission, open the linked official documentation and compare it with the
installed version's diagnostics. Record the observed version in the migration
receipt.

Across harnesses, prefer an on-demand skill for a reusable procedure or body of
methodology. Reserve always-on personal instructions or rules for a small
working agreement that truly applies to nearly every task. Do not project the
same method into both surfaces merely to make tools look alike: that spends
context, creates two update paths, and makes precedence harder to observe.

## Codex

- [Codex configuration basics](https://learn.chatgpt.com/docs/config-file/config-basic)
  currently place personal durable settings in `~/.codex/config.toml`, with
  project configuration in trusted `.codex/config.toml` layers. Merge only the
  selected keys; do not replace a person's full configuration.
- [Codex custom instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
  currently discover global guidance from `$CODEX_HOME/AGENTS.override.md` or
  `$CODEX_HOME/AGENTS.md`, then add project guidance. Treat the global file as a
  projection of personal working agreements, not a place for project facts.
- [Codex skills](https://learn.chatgpt.com/docs/build-skills) currently discover
  user skills under `$HOME/.agents/skills`. Preserve skill source/provenance and
  installation intent; do not migrate caches or assume a copied directory is
  registered.
- The current [Codex import flow](https://learn.chatgpt.com/docs/import) can
  import supported instructions, settings, skills, plugins, projects, MCP
  configuration, hooks, commands, and agents from other coding agents without
  deleting the source setup. Use it when available, then audit the imported
  result and separately finish authorization. It is a Codex projection, not a
  portable cross-tool source.

## Cursor

- [Cursor rules](https://docs.cursor.com/context/rules) distinguish project
  rules in `.cursor/rules` from user rules defined in **Cursor Settings >
  Rules**. User rules are plain text and always applied; do not invent a stable
  backing file when the current documentation exposes only the settings UI.
- [Cursor CLI permissions](https://docs.cursor.com/en/cli/reference/permissions)
  currently use `~/.cursor/cli-config.json` for global CLI policy. Parse and
  merge the supported JSON keys rather than copying a whole `.cursor` tree.
- [Cursor CLI authentication](https://docs.cursor.com/en/cli/reference/authentication)
  provides `cursor-agent login`, `status`, and `logout`; retain only the need
  and status in a portable profile. Reauthenticate on the target device.

Check the current Cursor documentation for supported settings sync, skills,
extensions, MCP, hooks, and editor-profile migration before selecting a
carrier. Opaque editor databases and generated memories remain machine-local by
default even when they can be located on disk.

## Claude Code

- [Claude Code settings](https://code.claude.com/docs/en/settings) currently
  distinguish user `~/.claude/settings.json`, shared project settings, local
  project settings, and managed policy. Preserve that scope; a user migration
  must not turn personal preferences into project or organizational policy.
- [Claude Code memory and instructions](https://code.claude.com/docs/en/memory)
  currently use `~/.claude/CLAUDE.md` for personal instructions while project
  auto-memory is machine-local under `~/.claude/projects/.../memory/`. Migrate
  the approved personal instruction source; exclude generated auto-memory by
  default.
- [Claude Code skills](https://code.claude.com/docs/en/skills) currently place
  personal skills under `~/.claude/skills`. Prefer a supported installer or
  shared source with recorded provenance over copying unknown installed state.
- Use the current Claude Code authentication and diagnostics flow for the
  installed version. Do not copy credential files or infer interactive TUI
  readiness from an API environment variable alone.

## Shared skill installation

The current [skills CLI reference](https://www.skills.sh/docs/cli) is one
portable installation path across supported agents. Record repository/source,
selected skill names, scope, and any agent selector. Re-run the current CLI on
the target and verify discovery; do not make its generated install tree the
only record of provenance. Inspect the target CLI's current help before
execution and retain that output as command evidence. This bundled reference
deliberately carries no update, list, install, remove, or verification command:
those verbs, flags, and scopes belong to the target version's observed surface.

This installation path applies only after the desired source and skill
selection are known. The CLI's marketplace or catalog search is a separate
capability-discovery surface: use it only when the human explicitly asks to
discover or compare candidates. A setup request with a missing source must ask
for that source rather than searching for substitutes.
