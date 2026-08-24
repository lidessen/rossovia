# Review or Improve a Tool or CLI Surface

Use this path when the owning surface is the project's command-line interface:
its commands, arguments, help, output contract, or how agents invoke tools
through a shell. It covers both a read-only review and an authorized smallest
compatible improvement; keep the two modes separate throughout.

## Object and evidence first

Form the actual object before naming fixes. Collect four kinds of real
evidence, each with the exact command text and observed output:

1. **Real help.** Run `<cli> --help` and each relevant subcommand's `--help` in
   a clean, noninteractive shell. Record what is present and what is missing.
2. **Source.** Read the code that defines the interface — argument parser,
   command table, option defaults — when the project exposes it.
3. **Real invocation.** Find traces of the CLI actually being called — agent
   transcripts, task logs, CI output, shell history — including both working
   and failing calls.
4. **Failure evidence.** Nonzero exit codes, stderr text, hangs, timeouts, and
   prompts that stalled a noninteractive caller.

A README or design document describes intent and may be stale; it cannot
substitute for the help and behavior actually observed. Mark every dimension
below as observed, absent, or unverified, and cite the command and output that
settled it. Do not score the CLI or turn the dimensions into an audit rating:
a score is not behavior evidence and cannot change a deployment decision.

## Review dimensions

Work through the dimensions that matter for the named agent action. For each,
ask what the agent must be able to do, then find the cheapest observation that
exposes the gap.

1. **Discoverability.** Can an agent reach the right command, subcommand, and
   flag from the CLI itself — `--help` at every level, completion, or a `list`
   command? Count the discovery cost: what must an agent already know, or read
   from a README, before it can form a correct first invocation?
2. **Grammar and composability.** Consistent flag and positional grammar,
   subcommand depth, `--` end-of-options handling, and the composition
   contract: exit codes, stdout/stderr split, and pipe-ability. A grammar that
   needs quoting tricks or reordering to express a normal task raises the cost
   of constructing every future invocation.
3. **Stable selectors.** Can the agent address the target, revision, or object
   by a stable machine key — id, ref, sha, path — instead of a fuzzy display
   name? Fuzzy selection forces a parse-then-verify loop on every call.
4. **Read/effect boundary.** Does the grammar itself separate reading from
   mutating? Prefer explicit `list`/`get`/`diff`/`dry-run`/`--check` forms so a
   mistaken invocation cannot change state silently.
5. **Structured output.** Is there a machine-readable form — `--json`,
   `--format` — for values the agent must parse? Scraping human tables is a
   per-invocation cost and a drift risk.
6. **Error and recovery.** Do failures return a nonzero exit code, a message on
   stderr, and enough state — what failed, what partially changed, what to run
   next — for the agent to recover without redoing completed work?
7. **Idempotency and retry.** Is a re-run safe? Prefer create-if-absent,
   explicit `--overwrite`, unique keys, and retryable verb forms. A retry that
   doubles the effect turns every transient failure into cleanup work.
8. **Compatibility and deprecation.** How does the agent know which version it
   is invoking and whether a change is breaking? Prefer `--version`, documented
   deprecation notices, and a changelog over silent behavior shifts.
9. **Help and examples.** Does the help state argument types, defaults, and
   required versus optional, and show one copy-pasteable noninteractive example
   per main verb?
10. **Shell invocation safety.** Does the CLI work without a TTY (`--no-input`,
    `--batch`, environment variables for tokens), end option parsing with `--`
    or documented `VAR=value` placement, avoid echoing secrets into logs, and
    avoid spawning editors or prompts that hang an automated caller?

## Select the principal contradiction

Rank the findings by their effect on the named agent action, not by count.
Name the single mismatch whose repair most changes downstream work (P04).
Preserve secondary hard constraints (P15). State which observation would show
the selection wrong (P08).

## Smallest compatible improvement

For an authorized change, prefer a backward-compatible repair:

- add or complete a help text, a `--json` form, a `--dry-run`/`--check` flag, a
  stable selector, or a `--no-input` mode;
- fix an error message or exit code so it says what actually failed;
- deprecate before removing, and keep old spellings working during the overlap.

Before writing, name the changed decision, the owner of the CLI contract (a
person or governing source, not this skill), and the burden of each
alternative. Renaming, removing, or re-semantizing a flag or command is a
breaking change; propose it only when the owner authorizes a migration, and
state the migration path. Do not invent a new orchestrator, wrapper, or gate;
the smallest change lives in the CLI contract itself.

## Verify through real invocation

The improvement claim counts only when the actual CLI behaves differently on
the actual entry path:

1. Re-run the representative failing invocation, or the closest safe probe,
   through the same noninteractive shell an agent uses.
2. Run one boundary invocation that should keep working or stay unaffected.
3. Record command text, exit code, stdout, and stderr for both.

For a read-only review, do not run probes that mutate. If safe verification is
unavailable, label the behavior claim `inconclusive`; never substitute a
checklist, score, or prompt review for invocation evidence.

## Report

Return the named agent action, the observed gap with the exact invocation that
showed it, the principal contradiction, the selected owner, the smallest
compatible change or recommendation, invocation and boundary evidence,
residual uncertainty, and the human decision still required. If the evidence
points outside the CLI contract — product behavior, policy, or missing domain
truth — route it there and stop.
