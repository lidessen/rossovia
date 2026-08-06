# Attention-management H2 development probe

**Status:** completed development probe; execution valid, blind semantic result
invalid on independent criterion audit; H2 inconclusive
**Hypothesis:** H2 integrated working character
**Frozen repository baseline:** `cff6613fb18145990e973e74ebe189612bdedf24`
**Execution mechanism:** Work Cell model-evaluation v3 instruction-carrier axis

This record is for maintainers reviewing or reproducing the H2 development
probe. It is not user guidance for enabling the carrier in an Agent runtime.

## Question

With the same semantic atoms, task, selected sources, route, inference policy,
tools, acceptance, workspace snapshot, and run schedule, does an integrated
working-character carrier produce a more stable ownership and next-action
decision than a disconnected Principle list?

This is a development probe of both H2 and the new Work Cell carrier axis. It
cannot confirm portability, a neural mechanism, Chinese behavior, or a durable
Agent personality.

## Fixture and headroom

The fixture mechanically extracts nine files from the frozen Git revision:
root guidance, Founding Mandate, architecture, Sequence, P13 and P14
interpretations, and three representative Skill entrypoints. Workers cannot see
later review records or the accepted repair.

Historical reviewers at the same baseline returned mixed decisions: two
surfaces were not ready and one retained the Principle sequence with residual
risk. That gives development headroom but is not a matched neutral baseline,
because the historical contributors had different functional review roles.
Any all-pass or common-failure outcome in this probe therefore invalidates the
fixture for H2 attribution rather than proving the carriers equivalent.

The [semantic audit](semantic-audit.md) records the English carriers and their
five shared atoms. Its expected SHA-256 is declared in
[`model-evaluation.json`](model-evaluation.json). Expected action, reference
criteria, and failure classes exist only in the evaluator side of that
manifest.

## Run contract

The two opaque arms use DeepSeek V4 Flash with declared low reasoning effort,
read-only file tools, 16 steps, and two balanced repetitions. Work Cell must:

- provide condition-neutral Cell and execution-profile identities;
- construct the driver without arm or carrier metadata;
- retain exact carrier hashes, the observed fixture-snapshot digest, order,
  route, usage, duration, and backend-fingerprint evidence;
- skip semantic judging if any Cell is unsettled or exposed serving identity
  differs inside a repetition; and
- withhold harness-owned condition and carrier metadata from the blind judge.

Run from `packages/work-cell`:

```bash
cd ../../regeneration/evaluations/evidence/2026-08-06-attention-management-h2
shasum -a 256 -c fixture-files.sha256
shasum -a 256 semantic-audit.md
cd ../../../../packages/work-cell
bun src/cli.ts model evaluate \
  ../../regeneration/evaluations/evidence/2026-08-06-attention-management-h2/model-evaluation.json
```

The per-file fixture check must pass, and the semantic-audit output must equal
the manifest's `comparison.semanticAuditSha256`, before the model command
begins. The per-file manifest preserves human-readable provenance. Work Cell
also compares the aggregate source snapshot with `fixture.expectedSha256`
before constructing a driver or making a model call, then verifies that every
trial copy retains that digest.

Raw results are written to `results/`. Promote only the exact retained run used
by the result below; do not select among reruns by preferred verdict.

## Evidence boundary

The runtime verifies the caller-declared source identity, within-run snapshot
identity, and execution-member equality, but not semantic equivalence of prose.
A worker may quote its carrier into final output, so blind evaluation excludes
harness-supplied carrier metadata but cannot guarantee the judge never infers
an arm from output. Provider-returned identity and usage are observations, not
a reproducible seed, hidden inference trace, or verified server-side model
revision.

## First execution attempt

The first invocation ran from `2026-08-06T13:55:05.861Z` to
`2026-08-06T13:55:29.956Z` and retained its complete
[`evaluation.json`](results/attention-management-h2-working-character-development-TqQghN/evaluation.json).
All four Cells received the same fixture digest
`a2af09bdd44ac40c47afc30f9b51a28e9e2362721a118b12661d9ba1db007677`
and a balanced AB/BA order, then failed before any model response because the
sandbox could not connect to the DeepSeek API. Every arm recorded zero tokens,
the judge was skipped, and the result is `inconclusive` for protocol execution,
not for H2.

That invocation did not retry outside the sandbox because doing so would have
sent the nine frozen repository files above to an external DeepSeek endpoint
without a Principal decision naming that disclosure. The Principal subsequently
authorized exactly this fixture, task packet, two carriers, four worker calls,
and one blind-judge call with `ALLOW_DEEPSEEK_H2_FIXTURE`. Do not reroute the
payload through another provider or direct runner. Retain the failed run beside
the authorized rerun rather than selecting by result.

## Authorized live run

The authorized invocation ran from `2026-08-06T14:16:00.323Z` to
`2026-08-06T14:20:24.345Z` and retained its complete
[`evaluation.json`](results/attention-management-h2-working-character-development-DsdfRH/evaluation.json).
The declared and observed fixture digests both equal
`a2af09bdd44ac40c47afc30f9b51a28e9e2362721a118b12661d9ba1db007677`.
All four Cells passed, the AB/BA schedule was preserved, and every repetition
reported the same selected route
`ai-sdk-v7/deepseek/deepseek-v4-flash` and backend fingerprint
`fp_a18b46594c_prod0820_fp8_kvcache_20260402`. Work Cell therefore recorded
execution identity as matched and ran the blind judge.

The blind map was A=`arm-cobalt`, B=`arm-amber`. The judge reported both arms
passing all five criteria and returned `tie`. The four workers used 330,731
tokens and an estimated USD 0.02085278; the judge used another 7,354 tokens.

An independent post-run audit rejects that semantic pass. Criterion 3 required
at least one **concrete lower-owner defect** in the supplied root guidance,
architecture, interpretations, or Skill evidence standing. The cited evidence
instead names supporting files outside the declared read scope. The workers
explicitly treated those files as unverified context or a blocker to stronger
certification, not as an observed candidate defect. The judge therefore turned
an unavailable relation into positive evidence and cannot establish the
all-pass premise.

This does not reject or support H2, and it does not establish that the fixture
was at ceiling. The execution and arm-identity evidence remain valid, but the
semantic comparison is non-discriminating because its judge admitted a false
positive on a load-bearing criterion. Preserve the raw result and retire this
fixture rather than rerunning it for a preferred label. A later probe needs an
evaluator that can distinguish an observed lower-owner defect from an
out-of-scope relation, plus a task population qualified by untreated variance
or failure and genuine `return`, `retain`, and `switch` decisions.
