# Delivery Capability Map

Build only the rows that can change the current placement decision. Do not
transfer a result from one agent product or version to another.

| Capability | Evidence | Observed or documented result | Unknown or boundary |
|---|---|---|---|
| Pre-action instruction surface | current official documentation or runtime observation | Which source or projection is loaded, for which agent, and when? | Does a similarly named file load elsewhere? |
| Activated method discovery | current official documentation or runtime observation | Which metadata is visible and how is a method selected? | Does a local path take precedence? |
| On-demand source access | task observation or documented tool/resource access | Which referenced source can the agent reach after activation? | What path, nesting, or permission limit applies? |
| Dynamic context injection | current official documentation or runtime observation | Which lifecycle moments can add context, with what guarantee? | Is it advisory, blocking, or unavailable? |
| Task-specific path observation | trace, tool log, or equivalent task evidence | Did this task receive the named source/projection at the required moment? | Is the path opaque even though capability is documented? |

Documented capability proves possibility, not use in one task. A correct task
result proves compatibility, not the path that caused it. Keep those claims
separate.
