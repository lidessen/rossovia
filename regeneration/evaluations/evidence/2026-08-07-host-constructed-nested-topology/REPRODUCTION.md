# Historical preflight reconstruction

**Audience:** maintainers reproducing the three delegation evidence preflights
without making a model call.

**Scope:** reconstruct the exact historical runner/runtime relation only. This
does not authorize a live run, regenerate retained evidence, or alter a current
working tree.

The runner packets were committed after their pinned Work Cell runtime. A clean
checkout of `c41561db2d2295acec3b59c5581131e09408a02f` has the matching runtime
but not these evidence directories. A checkout of the evidence revision has the
runners but a later runtime. Reproduction therefore needs one disposable mixed
snapshot with both identities explicit.

From a clean checkout of the revision containing this file:

1. Record `git rev-parse HEAD` as `<evidence-revision>`.
2. Create a disposable worktree at the pinned runtime revision:

   ```bash
   git worktree add /private/tmp/rossovia-delegation-repro \
     c41561db2d2295acec3b59c5581131e09408a02f
   ```

3. Restore only the fixture and evidence packets from `<evidence-revision>`:

   ```bash
   git -C /private/tmp/rossovia-delegation-repro restore \
     --source <evidence-revision> -- \
     regeneration/evaluations/evidence/2026-08-06-todo-return-trigger/fixture \
     regeneration/evaluations/evidence/2026-08-07-host-constructed-nested-topology \
     regeneration/evaluations/evidence/2026-08-08-parent-evidence-admission \
     regeneration/evaluations/evidence/2026-08-08-parent-admission-matched-pair
   ```

4. Install the pinned Work Cell dependencies, then run the no-model preflights:

   ```bash
   bun install --cwd=/private/tmp/rossovia-delegation-repro/packages/work-cell \
     --frozen-lockfile
   bun --cwd=/private/tmp/rossovia-delegation-repro/regeneration/evaluations/evidence/2026-08-07-host-constructed-nested-topology \
     run-topology.ts --preflight
   bun --cwd=/private/tmp/rossovia-delegation-repro/regeneration/evaluations/evidence/2026-08-08-parent-evidence-admission \
     run-parent-treatment.ts --preflight
   bun --cwd=/private/tmp/rossovia-delegation-repro/regeneration/evaluations/evidence/2026-08-08-parent-admission-matched-pair \
     run-parent-pair.ts --preflight \
     ../2026-08-06-todo-return-trigger/fixture
   ```

Each preflight must report the pinned Work Cell source-tree digest
`0925d6883d4d5207b4b5548dc45511089e008eaf9a787d95ec811c3e4b4605bb`
and `externalModelCalled: false`. A digest mismatch is an intentional refusal;
do not patch the packet or runner to make a later runtime pass.
