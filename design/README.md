# Design map

`design/` is the semantic map of the project. It is not a second runtime, a
task queue, or a place to copy volatile state. Each subdirectory answers a
different question; the source document named by that question remains the
authority.

| Directory | Question it answers | Typical contents |
|---|---|---|
| [`decisions/`](decisions/) | What consequential choice was accepted, and what did it replace? | Numbered decisions and preserved alternatives |
| [`harness/`](harness/) | How should agents receive context, use skills, and be reviewed? | Harness theory and delivery methods |
| [`operations/`](operations/) | How is an accepted design operated, migrated, configured, or handed off? | Operating protocol, migration roadmaps, decision briefs |
| [`observations/`](observations/) | What source-linked observations exist, and how may they be disposed of? | Observer and correction record model |
| [`organization/`](organization/) | How are project, home, artifact, and repository boundaries arranged? | Directory and ownership maps |
| [`research/`](research/) | What bounded inquiry has not yet become accepted design? | Research notes with provenance and uncertainty |
| [`aesthetics/`](aesthetics/) | What visual or form experiments are being evaluated? | Visual studies, cases, and design briefs |

The root documents [`DESIGN.md`](DESIGN.md), [`FOUNDING-IDENTITY.md`](FOUNDING-IDENTITY.md),
and [`FOUNDING-MANDATE.md`](FOUNDING-MANDATE.md) remain project orientation.
Numbered decisions remain the accepted decision history; they are not moved
into domain folders merely to make the tree look uniform.

## Why `operations/` exists

`operations/` is a legacy directory name for **operating contracts and
migrations**. It does not mean “all design work” and it does not own runtime
implementation. Its files tell a future human or host how to operate,
migrate, configure, or hand off an accepted design. See its
[README](operations/README.md) for each file's authority boundary.

New documents should use the semantic directory that matches the question.
Do not move existing files in bulk without preserving links, source identity,
and the owning decision.

## Placement test

Before adding a document, complete this sentence:

> This document exists so that **[reader]** can decide or do **[action]** from
> **[source/authority]**, while **[non-authority]** remains only a projection.

Accepted choices belong in `decisions/`; unsettled inquiry in `research/`;
agent delivery methods in `harness/`; operating or migration routes in
`operations/`; durable observations in `observations/`; and boundary maps in
`organization/`.
