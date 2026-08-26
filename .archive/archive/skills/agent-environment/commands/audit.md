# Audit an Agent Environment

Perform a read-only inventory of the named user-level coding-agent environment.

1. Confirm the person, device, tools, ordinary entry paths, and whether a
   portable source or dotfiles carrier already exists. Do not create one during
   an audit.
2. For each tool, inspect installation provenance and version, supported
   user-level instruction/configuration locations, installed skills/plugins or
   MCP declarations, hooks and permission policy, and authentication status.
   Prefer official status and diagnostic commands. Do not print credential
   values or read opaque databases merely because they are accessible.
3. Read only the relevant sections of `references/tool-surfaces.md`, then check
   the current official documentation for any path, command, schema, or
   precedence that could have changed.
4. Classify each observed item as `desired source`, `tool projection`, `secret
   prerequisite`, `machine-local state`, `local override`, or `unknown`.
   Explain conflicts and unknowns rather than guessing.
5. Compare the observed state with any accepted portable profile and the last
   applied receipt. Distinguish source change from target drift. Return
   `missing`, `matching`, `drifted`, `target-only`, `unsupported`, and
   `unverified` items. Do not equate file equality with runtime delivery.
6. Recommend the smallest next action: no change, establish a portable source,
   reconcile an update, perform a bounded migration, or run verification. State
   what would disconfirm the recommendation.

Return a redacted inventory and reconciliation proposal. An audit performs no
installation, login, configuration write, symlink change, or file replacement.
