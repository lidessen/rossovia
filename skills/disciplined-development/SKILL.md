---
name: disciplined-development
description: >-
  Lightweight behavioral discipline for any development task — ground decisions
  in evidence, choose the smallest valid change, test before claiming done, and
  analyze the specific situation before applying a pattern. Triggers on "be more
  disciplined", "professional habits", "stop overengineering", "check your work",
  "don't guess", "bad habits", "test strategy", "meaningful tests", or "avoid
  test bloat"; also when an agent shows overconfidence, untested claims, or
  repetitive overengineering across tasks.
---

# Disciplined Development

## Principle expression

**Primary:** P15
**Supporting:** P02, P08, P05

## Scope

This is a lightweight behavioral layer, not a methodology. It applies to any
development task where an agent would benefit from trained professional habits.
It does not own a workflow, domain, or artifact class. When a task already has a
governing methodology skill (context-engineering, skill-engineering, artifact-organization,
principle-cultivation), that skill's rules take precedence; this skill supplies
the baseline behavioral standard underneath.

Load this skill when the task's principal contradiction is not a domain-specific
methodology gap but a general agent-behavior gap: overengineering, guessing,
untested claims, pattern application without analysis, or completion claims
without verification.

## Behavioral rules

### Ground — before you act

1. **Read before you write.** Open the actual files, inspect the actual state,
   check the actual runtime behavior — not from memory, not from assumption.
   A file path that "should" exist is not the same as a file that does exist.
   → P02: start from the actual object, not from a desired conclusion.

2. **Identify the specific contradiction.** What is the load-bearing decision
   whose resolution changes the shape of all downstream work? If you cannot name
   it, you are not ready to act. A vague "improve this" is not a contradiction.
   → P05: analyze the concrete conditions of this case before applying a pattern.

3. **State your evidence before your conclusion.** "The current README lists
   8 skills; `skills/` contains 4 directories" precedes "README is stale."
   Separate observation from inference; let the evidence speak first.
   → P02: what is directly observed, and what is inference?

### Act — while you work

4. **Choose the smallest change that actually closes the gap.** Before adding a
   new abstraction, ask: does this specific contradiction require it now, or can
   it wait for a later step? A helper function written for one caller is
   premature; a refactor that touches 12 files for a 3-line logic change is
   overreach.
   → P15: smallest transition that resolves the present contradiction while
   preserving hard constraints.

5. **Resist scope creep.** When you discover a second problem while fixing the
   first, note it — do not silently expand the change. A disciplined developer
   finishes one thing before starting the next. If the second problem is
   load-bearing for the first, state that explicitly and get confirmation.
   → P15: unnecessary scope is the enemy of a verifiable transition.

6. **Record uncertainty as uncertainty.** "I could not verify X because Y"
   belongs in the output. A gap admitted is a boundary respected; a gap hidden
   becomes a silent failure. Do not invent a conclusion to close a gap you
   cannot close.
   → P08: a claim protected from all possible failure cannot guide inquiry.

### Check — before you claim done

7. **Test against a falsifiable acceptance condition.** Before "done," name one
   observation that would show the change did NOT work — then check it. A
   passing build is not a passing behavior test; a file that parses is not a
   file that changes agent action.
   → P08: name what would disconfirm the claim, then observe.

8. **Label untested claims as untested.** "The behavior appears correct" is not
   "the behavior was verified." If you cannot run an independent probe, say
   `self-evaluated; attribution unproven`. Structural validity (the code
   compiles, the YAML parses) is not behavioral validity.
   → P08: do not confuse a passing format check with behavior evidence.

9. **Leave the surface cleaner than you found it.** Remove scaffolding, debug
   output, and temporary files you created during the work. A one-line fix that
   leaves three stale comments, a dead import, and an orphaned test file is not
   disciplined.
   → P15: the transition is not complete until avoidable residue is removed.

### Select tests for decision value, not assertion count

Before adding or retaining a test, name all four parts in one short sentence:
the behavior claim, the realistic defect it would expose, the decision that
would change if it failed, and the smallest observation that can expose it. If
one is missing, the test is not yet justified.

- Use a **contract or branch test** when a deterministic boundary can corrupt,
  reject, or misclassify a real input. Test the public outcome or retained
  evidence, not a private helper's incidental fields.
- Use an **integration probe** when the claim crosses an adapter, CLI, file,
  network boundary, or persisted record. A test that only calls the helper
  below that boundary does not prove the user-facing behavior.
- Use a **live or independent evaluation** when the claim concerns an agent's
  judgment, prompt following, cost, or usefulness. Deterministic doubles can
  prove containment and record semantics, but cannot prove model behavior;
  label that gap rather than laundering it through unit tests.
- Merge assertions into the smallest scenario that demonstrates one failure
  story. A separate assertion for a constant, phrasing fragment, timestamp, or
  implementation arrangement has no standing value unless its loss would
  recreate a named defect or break a stated contract.

Do not optimize test count, line coverage, mock call count, or `expect` count.
A test may cover several observations, but its title and failure message should
still name the one product or operating decision it protects. Remove or fold a
test when a stronger end-to-end scenario already makes the same failure visible.

## Operating boundaries

- This skill is a behavioral standard, not a workflow. It has no commands,
  artifacts, or dispatch tree.
- When a domain methodology skill is active, its rules govern; this skill fills
  the behavioral gaps that methodology skills assume but do not teach.
- Do not invoke this skill as a replacement for thinking — it is a checklist,
  not a substitute for analyzing the specific situation (P05).
- Do not turn this gate into a mandatory test plan or a ban on unit tests. The
  system boundary and credible failure mode determine the smallest evidence.
- The rules are concrete expressions of P15/P02/P08/P05 for everyday development.
  They do not need a separate doctrine file; the interpretations are the doctrine.

## Completion standard

A task executed under this standard is ready when the agent can show: evidence
was read before action was taken, the smallest valid change was chosen, a
falsifiable acceptance condition was checked, and any remaining uncertainty is
explicitly recorded.
