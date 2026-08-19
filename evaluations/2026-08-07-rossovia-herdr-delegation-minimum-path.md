# Rossovia + Herdr Delegation Minimum Path

**Status:** routing and execution path supported; nested-delegation value and
cost judgment remain unresolved

**Observed:** 2026-08-06 to 2026-08-07

**Source revision:** `c41561db2d2295acec3b59c5581131e09408a02f`

## Question

Can a Main Codex Agent entered through the Rossovia repository resolve a real
project, use Herdr as the visible process carrier, delegate one bounded read-only
contribution, recover its result, and verify it without modifying either
repository?

The initial acceptance condition also treated any recursive delegation by the
worker as a failure. The Principal later rejected that condition: rare nested
delegation may be reasonable, and guidance should be evaluated by consequences
rather than converted into a broad prohibition.

## Observed path

1. `./apps/workbench/rossovia resolve meowask` returned
   `/Users/lidessen/workspaces/meowask` as `workspace.path`, with dirty `main`
   at `64a96f7b106f8c1e189f3ef7e3a90a021fdc0d97`.
2. Herdr 0.8.0 started the named session `rossovia-probe`. The Main Codex ran in
   `w1:p1`; it created background workspace `w2`, tab `w2:t1`, and pane `w2:p1`
   rooted at the resolved MeowAsk path.
3. Herdr started `meowask_reader` in `w2:p1` with
   `codex --sandbox read-only --ask-for-approval never --no-alt-screen`.
4. The first prompt returned `agent_prompt_stalled`. Re-submitting the same
   bounded request to the same idle Agent produced a working lifecycle and a
   later settled state.
5. The worker read `DESIGN.md` and `README.md`, returned a three-part product
   account and one verification risk, and cited exact headings. The Main Agent
   reopened those sources and confirmed all cited headings and the material
   content of the conclusion.
6. The worker also started `/root/bounded_source_investigation`. This was a
   nested delegation despite an explicit one-level prompt contract.
7. Git status and HEAD were compared before and after. The skills repository
   remained clean at the source revision, and MeowAsk retained the same
   pre-existing modified and untracked paths. No commit, merge, publication,
   dependency, or configuration effect occurred.

The Main terminal reported 82,691 tokens for this small probe. That figure was
not reconciled against a provider billing record, but it is sufficient evidence
that the realized organization was expensive relative to the task.

## Corrected interpretation

The original result called the entire path `FAIL` because nested delegation
occurred. That verdict confused process conformance with whole-system
reliability.

The observed consequences were instead:

- project routing, isolated startup, lifecycle observation, result retrieval,
  source verification, and effect containment succeeded;
- the nested child did not broaden repository effects or acceptance authority;
- the returned semantic result survived Main verification; and
- the total coordination and token cost was disproportionate to the small task.

The corrected standing is therefore **supported-partial**. The minimum carrier
works. The nested delegation is not itself a failure; it is evidence that the
Agent's topology judgment and cost sensitivity need better guidance.

## Theory delta

This practice supports the existing
[error-tolerant harness theory](../principles/research/agent-harness-control-debt-and-guided-recovery.md#provisional-theory--an-error-tolerant-action-and-evidence-system):
protect effects, evidence, and authority before constraining cognition. It also
narrows the delegation claim:

- one Agent must remain accountable for each current whole, but that does not
  require a globally flat topology;
- a worker may become the local Main for a newly discovered sub-contribution
  while inheriting the outer whole, effect boundary, and withheld authority;
- topology depth is neither success nor failure evidence;
- evaluate nested delegation through task fidelity, effect containment,
  evidence reconstruction, latency, attention saved, and coordination cost.

No new Sequence principle is implied. P01, P03, P05, P09, P11, P13, and P15
already cover recovering the reason behind rules, practice revision, concrete
conditions, attention partition, proportional authority separation, claim
admission, and the minimum valid transition.

## Paired follow-up

The [direct-versus-nested local
probe](evidence/2026-08-07-direct-vs-nested-delegation/README.md) declared one
source-local classification task and rubric for both arms. Both returns
produced five of five source-supported judgments and reported no effect. Main
verified the semantic judgments, not the runtime effect claims. Forced nesting
added one child contract, waiting, and parent reconstruction; the nested parent
reported 102 seconds versus the direct arm's 31 seconds without unique decision
evidence. Serving identities, actual sandbox capabilities, effect telemetry,
and token usage were unavailable.

This directionally supports direct preference for a small task whose sources
already fit the parent context. It does not prove the arms were runtime-matched
or test the real forty-file compatibility work used as a hypothetical scenario,
so it cannot establish a general nesting penalty.

## Next discriminating practice

Run a real isolated multi-file compatibility analysis with direct and nested
arms under the same rubric and a carrier that exposes per-arm token use and
duration. Compare factual findings, missed cross-file relations, effect
containment, parent reconstruction burden, latency, and token cost. Do not score
topology depth itself.
