# Agent Environment Concepts

## In plain words

A portable agent environment is the smallest human-owned record needed to
rebuild how a person works with coding agents. It is not a copy of a home
directory. Each tool receives a local projection of that intent, while logins,
device history, caches, and other private state stay local unless deliberately
promoted for a named reason.

## Essence

1. **Desired workflow:** what the person must be able to do and the working
   agreement the agent must receive.
2. **Portable inheritance:** the non-secret sources, provenance, and decisions
   a later device needs to reconstruct that capability.
3. **Reconciliation:** three-way comparison among prior projection, evolving
   portable intent, and actual target without erasing target-owned state.
4. **Rehydration:** interactive or secure restoration of credentials and other
   non-portable prerequisites.
5. **Runtime proof:** evidence from the ordinary tool entry that the intended
   capability arrived and excluded state did not.

## Domain vocabulary

- **Portable workflow source:** human-approved record of desired capabilities,
  working agreements, reusable workflow modules, source locators, projection
  mappings, exclusions, and verification. It may be a profile inside an
  existing dotfiles source rather than a new repository.
- **Portable profile:** compact index and template for recurring setup with
  multiple independently changing modules when no existing carrier already
  owns it. A one-capability setup does not need a profile merely to be valid.
- **Workflow module:** one independently changing piece of intent, such as a
  personal instruction, context-delivery choice, capability, safety boundary,
  hook, agent role, or verification expectation. Modules are chosen from the
  actual environment; this is not a universal schema.
- **Applied baseline:** prior source revision and projection evidence recorded
  for one device/tool. It permits three-way reconciliation but owns no desired
  state.
- **Desired source:** authoritative non-secret content or commitment the person
  expects to survive devices. It may live in an existing dotfiles/configuration
  repository; the profile can point to it instead of duplicating it.
- **Capability selection:** the human-approved capability identity. Together
  with its desired source, it defines what setup may project. An installer can
  apply this selection but cannot author it.
- **Marketplace discovery:** optional exploration of unknown third-party
  capabilities after an explicit request to discover or compare candidates. It
  produces proposals, never desired setup state by itself.
- **Tool projection:** Codex, Cursor, Claude Code, or another tool's local
  representation of desired source. A supported import can create a projection,
  but does not become the cross-tool source.
- **Secret prerequisite:** credential or authorization required for capability.
  The profile stores purpose, provider, scope, secure-store expectation, and
  status check—not the value.
- **Machine-local state:** sessions, chats, generated memories, caches, indexes,
  telemetry, device identifiers, UI geometry, and other state excluded by
  default from reconstruction.
- **Local override:** explicit target-device difference that remains outside or
  later than the portable projection. It carries a reason and verification.
- **Reconciliation ledger:** proposed and actual disposition of each component
  on one target device.
- **Device receipt:** evidence of the last applied source revision and what was
  applied, preserved, deferred,
  unsupported, or failed. It can be regenerated from the source, target, and
  run evidence and therefore owns no desired-state authority.
