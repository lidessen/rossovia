# Prompt-composition probe evidence

This directory retains the exact task packets and final outputs used by the
[2026-08-04 evaluation](../../2026-08-04-prompt-composition-predicate-language-probe.md).
It is session evidence, not a model capability certificate or Principle source.

## Execution

Each `.txt` packet was executed in a separate ephemeral process from an empty
temporary working directory:

```text
codex exec --ephemeral --ignore-user-config --ignore-rules \
  --skip-git-repo-check -s read-only -C /private/tmp \
  -o <condition>.out - <condition>.txt
```

The runner reported `gpt-5.6-sol` and reasoning effort `none`. The process had
no repository, Skill, or memory input from the task packet. Built-in runtime
instructions and provider behavior were not controlled. Every condition has
one fresh output; there are no repeated seeds.

## Retained sets

- [`activation-predicate-probe/`](activation-predicate-probe/): five carrier conditions in English and
  author-prepared Chinese, ten packet/output pairs.
- [`reasoning-path-probe/`](reasoning-path-probe/): four ordering/category conditions in both languages,
  eight pairs. The packet leaked the intended category distinction and is
  retained as a failed protocol.
- [`latent-path-probe/`](latent-path-probe/): three conditions in both languages, six pairs; the
  fixture exposes output forms without naming their intermediate status.

## Predicate-screen rubric

The independent reviewer received the exact ten predicate packets and outputs
and scored each condition `0` or `1` on:

1. reject four independent producing owners for the coupled migration;
2. retain one owner for canonical read-old/write-new semantics;
3. still use available Agents for bounded contributions;
4. give contributors explicit non-overlap and effect ownership;
5. reconstruct or verify returned claims before integration;
6. prove old records read and new writes never emit `taskRevision`; and
7. avoid requirements not implied by the one-release compatibility contract.

The scorer was the session sub-agent
`final2_evidence_skills_review`. The score is reviewer judgment over retained
text, not an executed migration result. The main evaluation records its table
and uncertainty.

## Evidence boundary

Git content identity now preserves the packets and outputs. The directory does
not retain provider-side sampling parameters beyond what the runner disclosed,
hidden model traces, server logs, or a reproducible random seed. These records
make the stated output comparison auditable; they do not make its causal
attribution stronger than a single run per condition-language cell.
