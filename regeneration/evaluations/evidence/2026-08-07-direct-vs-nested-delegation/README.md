# Direct versus Nested Delegation — Paired Local Probe

**Status:** one source-local paired comparison completed; direct preference is
directionally supported for this task; runtime matching, effect evidence,
general nesting value, and token cost remain unresolved

**Audience:** maintainers and reviewers deciding what this probe can support;
this is an evidence record, not an Agent operating guide

**Observed:** 2026-08-07

**Source revision:** `c41561db2d2295acec3b59c5581131e09408a02f`
plus the exact working-tree source hashes below

## Question

When two arms are given the same declared task, sources, and acceptance but
different topology instructions, do their retained returns show a correctness
or evidence gain from forced nesting that repays its reported coordination
cost?

The actual serving model identity, reasoning configuration, task-delivery
metadata, sandbox capability, and runtime tool surface were not retained. This
is therefore a paired prompt-and-return comparison, not a proven matched runtime
experiment.

This probe tests one consequence of the
[error-tolerant harness theory](../../../../principles/research/agent-harness-control-debt-and-guided-recovery.md#sub-agent-context-layering):
topology depth is not a validity gate, but a nested contribution must earn its
contract, waiting, and reconstruction cost through decision-changing evidence,
attention preservation, isolation, or latency.

## Frozen sources

Both arms were instructed to use only these read-only sources:

| Source | SHA-256 |
|---|---|
| `skills/agent-delegation/SKILL.md` | `ca28847c7b59f06c82c00b74141e59c544ada56c45ad325e48c690d48bd48fa1` |
| `skills/agent-delegation/references/delegation.md` | `e4ee035924a43f9e0174285c1fe8510899deacd7d7ff62d73d62e82d7c789174` |
| `skills/agent-delegation/references/worker.md` | `a2d62657e7afcf8d3eaf5a905d02e9ade4aacdc5bdbc2957b18685b759e8946b` |
| `skills/agent-delegation/references/reviewer.md` | `ef69124988cffc2077b29f5ee307f98da1f392d6ad0768b425232c97005ca0f8` |

Each arm reported verifying all four hashes before answering. Neither arm was
authorized or instructed to write the repository, change theory, accept the
experiment, or perform an external effect. Both reported no changed path or
external effect; the actual sandbox and effect capability were not retained as
independent runtime evidence.

## Paired task

Each arm classified the same five scenarios as `direct`, `nested-available`,
or `stop-return`, then supplied the governing relation, exact source lines,
benefit or cost judgment, inherited boundary, immediate-parent evidence, and a
disconfirming consequence:

- **A:** two short independent configuration files already in worker context;
- **B:** an isolated forty-file read-only migration analysis that would displace
  the remaining audit whole from active context;
- **C:** a proposed child modifying the same shared contract as its parent;
- **D:** a reviewer's narrow independent read-only source cross-check while the
  reviewer retains the verdict; and
- **E:** a child requesting publication credentials and merge authority denied
  to its parent.

The direct arm was instructed not to delegate and reported no descendants. The
nested arm had to analyze A, C, and E itself and delegate B and D together to
one fresh read-only child. The forced topology was the declared experimental
manipulation, not a proposed operating rule. The actual direct-arm capability
surface and both arms' model identities were not retained.

## Expected source-grounded judgment

| Scenario | Expected | Governing relation |
|---|---|---|
| A | `direct` | local trivial work does not repay coordination |
| B | `nested-available` | independent context-displacing evidence loop can protect parent attention |
| C | `direct` | one shared mutable contract retains one writer |
| D | `nested-available` | narrow read-only reproduction is allowed while the reviewer retains the verdict |
| E | `stop-return` | descendants cannot expand inherited authority |

## Observed result

| Observation | Direct arm | Nested arm |
|---|---:|---:|
| Correct classifications | 5 / 5 | 5 / 5 |
| Frozen hashes matched | 4 / 4 | 4 / 4 |
| Arm-reported repository or external effects | none | none |
| Descendants | 0 | 1 |
| Parent-reported elapsed wall time | 31 s | 102 s |
| Provider token usage | unavailable | unavailable |
| Serving model and runtime identity | not retained | not retained |
| Decision-changing evidence unique to the arm | none | none |

The Main Agent reopened the four numbered sources and verified every
classification against the contribution gate, one-writer boundary, inherited
authority boundary, immediate-parent reconstruction requirement, and reviewer
contract. Both semantic returns were materially correct. The nested parent also
reconstructed its child's B/D claim instead of forwarding it as a second
verdict. This verification does not independently prove the arms' reported
absence of repository or external effects.

The nested arm took 71 seconds longer, about 3.29 times the direct arm's
reported elapsed time. This is a single coarse wall-clock observation, not a
provider latency benchmark. The carrier exposes neither per-agent token usage
nor comparable hidden reasoning, so this probe cannot quantify token cost or
claim that nesting caused every timing difference.

Raw retained returns:

- [frozen task packet](TASK.md)
- [direct arm](arm-direct.md)
- [nested arm](arm-nested.md)
- [nested child](arm-nested-child.md)
- [independent review and disposition](review.md)

## Disposition

Within these paired returns, forced nesting **did not earn its reported
coordination cost**: semantic correctness remained equal while the nested arm
added a child contract, waiting, and parent reconstruction without new decision
evidence. This directionally supports the Skill's direct-preferred guidance for
this task; missing runtime identity and effect telemetry prevent a stronger
causal attribution.

It does **not** support a nesting prohibition. The task did not contain the
forty-file implementation reality described by scenario B; it only classified
that hypothetical case from four already-local files. A real context-displacing
subtree may change the result.

## Next discriminating practice

Use an isolated snapshot containing a real multi-file compatibility question.
Run one direct parent and one parent that delegates the isolated subtree while
retaining the same acceptance rubric. Choose a carrier that exposes per-arm
token use and duration. Compare factual findings, missed cross-file relations,
effect containment, parent reconstruction burden, latency, and token cost. Do
not score topology depth itself.
