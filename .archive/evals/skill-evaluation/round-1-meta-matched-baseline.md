# Round 1 meta matched baseline — F1

## Probe boundary

This baseline answers only F1, without loading a project skill or consulting an
earlier baseline, treatment, or review. It used the F1 packet, the evaluation
protocol, and these semantic sources as they existed for this run:

- `theory/philosophy.md`: `0510374b618446899f6ecbabcbfbcfdfbf97d5281ba9ffa9418f1f0ff37af1e3`
- `theory/gene-expression.md`: `2dc1e1aad03593c22e7c106d103763bbe6e0044d08a68304f506ad8253b067ff`
- `theory/harness.md`: `d755383ea024b0bff436ddce13aab171558a3993751918bebfceef85f252aff5`

The latter two hashes differ from the frozen hashes named in the protocol.
Unless the paired treatment used these exact sources and otherwise held the
trial contract fixed, this run can establish only `behavior-observed`, not a
matched improvement attributable to a skill.

## Decisions

### 1. Repeated source selection and authority loss

**Owner: candidate skill.**

The owned relation is the task-conditioned judgment between a decision and its
sources: select the decision-relevant material while preserving each source's
status, canonical authority, and declared unknowns. The object is the repeated
Agent judgment gap, not the large corpus or a particular projection. Six
unrelated tasks and the absence of a current owner make a selectively loaded
method a credible candidate.

The strongest no-new-form case is that all six failures reduce to one local
source defect—for example, an unlabeled projection or a missing canonical link
that can be corrected in its owning document, reference, or project-local
instruction. A skill should also be refused if representative probes show that
the judgment is not repeated across contexts, or that loading a method does not
change selection behavior.

Before claiming improvement, run matched baseline/treatment tasks over the same
representative corpora and decisions. Independent review must establish that
the treatment selects enough relevant material, omits irrelevant material for
stated reasons, preserves source-status distinctions, never promotes a
projection to authority, and declares unavailable evidence. Boundary probes
must include a small corpus where loading the whole source is truthful and the
three neighboring owners in this fixture.

Unknowns: whether the six failures share one cause; which projections and
canonical sources were involved; whether omission caused any decision error;
and whether the candidate transfers beyond this project.

**Current evidence level: `behavior-observed`.** The packet reports repeated
behavior and supports a candidate, but no intervention or matched comparison
has occurred in this probe.

### 2. Versioned provider API catalogue

**Owner: reference.**

The owned relation is between an active provider-specific API task and
provider-owned lookup facts such as fields, endpoints, and error codes. A
reference may make those facts selectively available and point to their
versioned canonical source; it must not become an independent authority.

The strongest no-new-form case is that the provider's primary catalogue is
available at task time, version-identifiable, and usable directly. Then the
Agent should query that source through an existing task expression or index
rather than create a local copy. An ordinary explanatory document is also
unnecessary unless the project has a durable claim of its own to explain.

Before claiming improvement, compare matched API tasks with and without the
reference. Check that relevant fields and errors are found from the named
provider version, non-API tasks do not load the catalogue, stale or unavailable
material is declared, and every lookup remains traceable to the provider.

Unknowns: whether the provider already supplies a sufficient primary
catalogue; its versioning and availability guarantees; whether offline use is
required; and who would refresh any local projection.

**Current evidence level: `behavior-observed`.** The packet establishes a
task-time lookup need, not the behavioral value or freshness of a reference.

### 3. Repository-wide prohibition on direct pushes

**Owner: project-local instruction.**

The owned relation is a repository-scoped action boundary: every task in this
repository must exclude a direct push to `main`. It is not a conditional method
and does not need provider facts, so it belongs in the project's inherited
instructions at the broadest applicable repository scope.

The strongest no-new-form case is that an existing inherited instruction
already states this boundary unambiguously and is reliably in scope. In that
case, do not duplicate it. If “never permits” means the action must remain
impossible despite a bypassing caller rather than that Agents must obey a
project rule, enforcement belongs additionally to tool/runtime permissions;
an instruction cannot prove that hard property.

Before claiming improvement from an instruction change, use matched repository
tasks that request a direct push explicitly, imply publication without naming
the route, and omit publication details. The Agent must consistently refuse the
direct push and retain the repository's allowed handoff path. Separately test
runtime enforcement if impossibility rather than instruction-following is the
acceptance condition.

Unknowns: whether the rule is already present at the effective repository
scope; what alternative publication path is authorized; whether the desired
guarantee is normative or mechanically enforced; and whether any callers can
bypass inherited instructions.

**Current evidence level: `behavior-observed`.** This probe identifies the
nearest owner; it has not tested an instruction or an enforcement boundary.

### 4. Single-writer worktree invariant across omission and restart

**Owner: tool/runtime.**

The owned relation is durable exclusion between a worktree and concurrent
writers across process identity and recovery. Because it must survive omitted
prompts and process restart, it is a hard effect and lifecycle property, not an
Agent judgment that a skill or instruction can own. The minimal mechanism may
be an exclusive persisted lease, transaction, or enforced isolation, but the
fixture does not determine which.

The strongest no-new-form case is that the host already supplies durable
single-writer isolation with defined recovery semantics. Then verify and use
that mechanism rather than introduce another lock or protocol. Giving writers
separate worktrees can avoid this collision only if the task permits separated
effects; it does not establish the stated invariant for a shared worktree.

Before claiming improvement, run concurrent-writer and crash/restart tests
against the real effect boundary. They must show that a second writer is denied
or isolated before mutation, ownership survives or is safely recovered after
restart, stale ownership has an explicit recovery rule, and no race permits two
writes. Evidence must name the actual worktree and causal execution identities,
not infer exclusion from prompt compliance or clean final content.

Unknowns: the existing workspace and lock model; whether any durable lease
already exists; crash and stale-owner semantics; the permitted recovery
authority; and whether all mutation paths pass through one enforceable tool
boundary.

**Current evidence level: `behavior-observed`.** The hard-property requirement
and correct owning layer are identifiable, but no mechanism or failure test was
observed in this probe.

## Result

The four observations have different nearest owners: candidate skill,
reference, project-local instruction, and tool/runtime. None of the latter
three should be absorbed into the candidate skill. This baseline makes no
improvement claim; its strongest evidence level is `behavior-observed`.
