# Set Up an Agent Environment

Establish the requested part of an authorized user-level coding-agent
environment on one device.

1. Recover required working agreements, capabilities, installation preferences,
   trust boundaries, and acceptance observations. Declare which surfaces this
   setup actually needs—for example selected skills, harness guidance and
   configuration, runtime tools, authorization, or a composed subset—and which
   nearby surfaces are deliberately excluded. These are examples, not fixed
   tiers. If the request only names products, infer conservatively; do not turn
   `setup` into a full CLI/provider installation. If an installation target is
   required but not named or supplied by the active runtime, ask one scoped
   question instead of discovering every installed harness. Resolve the desired
   source for every selected capability before choosing an installer. Treat a
   declared source and selection as fixed inputs. If a required source is
   missing, return a plain final response with status `NEEDS_INPUT` and one
   scoped request for the source. Do not use an interactive-question tool.
   Stop before inventory, target-skill loading, vendor lookup, installer
   selection, conditional planning, or device action; do not search a
   marketplace or substitute a recommended third-party capability. Marketplace
   discovery requires a separate explicit request to discover or compare
   candidates. For each proposed projection,
   name the recurring action it should improve, the ordinary-use observation
   that would show that gain, and its persistent context, dependency, update,
   duplication, and maintenance burden. If the unchanged environment already
   supports the action or the expected gain is not material, record a no-op and
   do not configure that surface. Keep user-level setup thin: concise
   cross-project agreements, source locators, and native discovery of
   already-selected on-demand capabilities may belong there; project facts and
   specialized hooks, MCP, provider, permission, or runtime configuration
   require an explicit recurring cross-project need.
   Treat a named capability as the setup object, not as an instruction to load
   or execute it. Installing a selected skill does not authorize installing its
   target harness; if that harness is absent, record runtime availability as a
   prerequisite or deferred verification unless runtime installation was
   separately selected.
2. Audit only the relevant device surfaces without reading secrets or opaque
   application stores. Reuse a trusted dotfiles/configuration source if it
   already owns the relevant files. For one bounded capability, retain its
   source locator, explicit selection, and receipt without creating a profile.
   Use `assets/environment-profile.md` in a user-approved version-controlled
   location only when several independently changing modules need a recurring
   source. For one selected skill, inspect only its source, the chosen harness's
   discovery path, and any same-name conflict at that path. Do not inventory
   other tool homes, sessions, caches, or provider state. When only classifying
   or proposing an installer-managed setup, do not fetch or read the target
   skill body unless a named compatibility or safety question requires it. Keep
   device-specific receipts outside any shared desired source. Do not inspect
   the active host as a proxy for a fresh, remote, or hypothetical target. When
   target access is absent, plan from declared facts and leave target
   observations unresolved.
3. Separate desired source, tool projections, secret prerequisites,
   machine-local state, and local overrides. When a profile is actually used,
   obtain human confirmation before destructive replacement or before promoting
   an existing machine artifact into that source.
4. Read only the sections of `references/tool-surfaces.md` required by the
   selected surfaces and verify the current vendor documentation. Use supported
   skill installers, imports, settings commands, or runtime installers only
   where each is necessary to the declared capability and after its source is
   known. Do not use installer discovery as a source-selection fallback. A
   vendor path or flag that current documentation can establish is
   `lookup-required`, not missing human input. Ask the human only for a missing
   source, selection, preference, or authority boundary. Establish installed
   versions, supported paths, and current flags through bounded read-only
   diagnostics or current official documentation; do not return them as user
   questions.
5. Before each write, retain a rollback copy or version-control checkpoint.
   Merge structured configuration by key and text projections by an explicit
   owned block. Preserve unrelated target content. Stop on ambiguous duplicate
   owners, invalid syntax, or a target changed since inspection.
6. Name in-scope authentication and secret requirements in the selected source
   or receipt without values. Let the human complete supported login or
   secret-manager steps; record only status and scope after completion.
7. Verify each selected capability through its ordinary use path, including one
   distinctive behavior and one preserved/excluded boundary. A skill-only setup
   can verify discovery and invocation without installing or calling a new CLI.
   Confirm that the projection improved the named action without adding an
   unnecessary always-on instruction, runtime, updater, or duplicate source.
   Record unsupported and deferred in-scope items rather than weakening
   acceptance silently; record unselected surfaces as out of scope.
8. Write a setup receipt alongside the chosen source or return it in chat when
   no durable carrier was authorized. Include relevant source revision,
   observed versions, applied and preserved items, rollback paths, manual work,
   deliberate no-ops, added burdens, and reopening signals. For more than one
   target projection, retain a compact row per capability and harness with its
   benefit observation, burden, and `applied`, `no-op`, `deferred`, or `failed`
   disposition. Group rows only when their ordinary path, evidence, burden, and
   independent removal boundary are the same.

Setup is incomplete when an in-scope file exists but the intended agent or
runtime has not loaded it, or when required interactive authorization remains
necessary but is not visible in the receipt. It is not incomplete merely
because a CLI, provider, or other capability was outside the declared setup
surface.
