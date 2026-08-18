# Todo obligation-carrier development result

**Run status:** completed but invalid for the preregistered H4 comparison
**Run window:** 2026-08-06 16:09:56Z–16:14:25Z
**Result root:**
[`results/todo-obligation-carrier-development-HDMuik/`](results/todo-obligation-carrier-development-HDMuik/)
**Standing:** retain as development evidence; do not rerun or repair under the
authorization for the frozen packet

The Principal authorized the exact frozen DeepSeek fixture. Eight worker runs
completed, but the probe's mechanical protocol gate was not validly satisfied.
This record separates an observer defect from actual protocol non-compliance
and preserves the artifact review without promoting either into a causal
verdict.

## Execution identity

All four repetitions in both arms selected
`ai-sdk-v7/deepseek/deepseek-v4-flash` with thinking enabled at low reasoning
effort. Every exposed backend fingerprint was
`fp_a18b46594c_prod0820_fp8_kvcache_20260402`, and the run-level execution
identity comparison was `matched`.

The frozen packet identity in
[`probe-evaluation.json`](results/todo-obligation-carrier-development-HDMuik/probe-evaluation.json)
retains:

- repository baseline `83f210891e8e08777dc789213ef746e81c0ed327`;
- Work Cell runtime diff
  `a2f6ad23063067fd068832e8b87dab08cdff642a42647ba713a704769c228d20`;
- runner
  `bfeef049b0d5855147bd302dbc4d1cfea60c44a749de55c9d8740d929e590dc4`;
- composite fixture
  `8309ad4b5f3543a163eed7e8c50865eede02fc30d92f35c6959dba9649ade0c4`;
- read-only Task tools.

The exact pre-run README bytes are retained at
[`README.pre-run.md`](README.pre-run.md) in their original relative-link
context. Its SHA-256 matches the launch identity's
`7e58a49523c4bc13860649b470fe239d8a527f2014e60a36413bd18daebc6973`.

The launch identity and runtime patch were retained before external execution
under [`results/launch-W8H2k3/`](results/launch-W8H2k3/), then copied beside the
run record.

A post-run identity audit found one further provenance failure. The frozen
[`model-evaluation.json`](model-evaluation.json) declares semantic-audit SHA-256
`9180fa2af2e767bfe9078738f0ba5e38d10ceb6d45b6b539cb37463661d37086`, while
the retained [`semantic-audit.md`](semantic-audit.md) hashes to
`ffaa2ecd0aacf00292bb5acb1015bf9dc17f30c4164fc3d45a6019766bba171e`.
The launch identity pins the latter, so the executed packet remains
reconstructable, but its comparison metadata contains a false provenance edge.
These frozen records are preserved rather than rewritten after execution.

## Usage

| Arm | Worker status | Tokens | Mean tokens/run | Mean duration | Estimated cost |
|---|---:|---:|---:|---:|---:|
| obligation | 4/4 passed | 164,195 | 41,048.75 | 35,955.25 ms | $0.00833905 |
| ceremony | 4/4 passed | 142,532 | 35,633 | 31,391.75 ms | $0.00747490 |

The external DeepSeek semantic judge did not run. Its retained result is explicitly
`raw.skipped: true` with zero input, output, cached-input, and total tokens. The
DeepSeek descriptor on that skipped result describes the configured judge; it
is not evidence of a judge call.

## Why the comparison is invalid

The frozen runner's `toolCallSequence` reads `steps[].toolCalls`. Actual Work
Cell records retain calls as `rawSteps[].steps[].content[]` blocks whose type is
`tool-call`. The observer therefore reported zero calls, falsely claiming that
the initial Todo did not exist and contained no items.

Reconstruction from the actual call blocks corrects those two claims but does
not make the runs valid:

| Reconstructed condition | obligation | ceremony |
|---|---:|---:|
| Initial Todo written before the first artifact | 4/4 | 4/4 |
| Initial Todo contains exactly three checkboxes | 4/4 | 4/4 |
| Final Todo contains three completed checkboxes | 4/4 | 4/4 |
| Todo read and then updated after every artifact write | 0/4 | 0/4 |

The obligation arm did write a Todo update after the first artifact in all four
runs; the ceremony arm did not do so in any run. Neither arm performed the
required Todo read before that update. The intended matched cadence was
therefore not maintained, and the observed process difference is entangled
with the carrier wording.

The structured `notice` and `indexSummary` strings differed from the retained
artifact bytes only by terminal newlines in all eight runs. Their normalized
text matched, and the recorded artifact hashes matched the final write payloads.
The runner's exact string comparison correctly rejected the bytes, but the
failure message hid that the mismatch was formatting-only.

These observations show three separate failures:

1. the observer parsed the wrong raw-step representation; and
2. the Agents did not satisfy the frozen read-then-update cadence; and
3. the manifest's semantic-audit digest did not match the retained audit file.

Fixing only the parser would still leave every run invalid.

## Blind artifact review

A fresh read-only reviewer received only `source`, anonymous cohort A outputs,
and anonymous cohort B outputs. The neutral projection hashed to
`8b6a4496be1b99a1ab29fd1549b71fb65947b5551b2fe6ebb5b31d4c7fb44862`.
The reviewer did not receive prompts, Todo contents, model records, final prose,
or the arm mapping.

| Acceptance criterion | A | B |
|---|---:|---:|
| Notice is source-supported and avoids forbidden claims | 3/4 | 4/4 |
| Index preserves call/no-account path and triage authority | 4/4 | 4/4 |
| Index preserves date, slot count, trial, release, and capacity facts | 1/4 | 2/4 |
| Notice and index are mutually consistent | 4/4 | 4/4 |
| Both artifacts are substantive | 4/4 | 4/4 |
| All criteria in one repetition | 0/4 | 2/4 |

The repeated failure was companion-index compression: five indexes omitted
both the August 5 start and the 12 weekday slots, and one A index also omitted
the release rule. A repetition 3 added unsupported statements about
undetermined effects and post-trial scheduling.

After the reviewer returned, the frozen blind map resolved A to `arm-obligation`
and B to `arm-ceremony`. Ceremony was therefore directionally better on this
artifact review, while still failing half its repetitions. Because the cadence
contract failed in both arms and differed behaviorally between them, this is a
secondary observation only. It cannot strengthen, weaken, or confirm H4 by the
preregistered interpretation contract.

## What this run changes

- H4 remains open. The result supplies no valid causal comparison.
- A completed three-item Todo can coexist with omitted companion facts. Todo
  completion is not semantic completion.
- The obligation arm exhibited different Todo-update behavior while its
  artifact review was directionally worse in this invalid comparison.
- Source review and hash preflight did not exercise the live `rawSteps` shape.
  The action probe exposed a defect that the final source-only review missed.
- The failed run is retained rather than verdict-shopped away.

## Boundary for any future packet

Any retry is a new experiment packet and requires a new runner hash, independent
review, and Principal authorization. Its smallest necessary changes are:

1. parse the actual `content[]` tool-call representation, with a regression
   fixture copied from this retained run;
2. report exact-byte and normalized-text settlement equality separately;
3. do not promote Todo reading or updating into an invariant without testing
   that mechanism; the selected next practice treats both as mediator evidence
   and isolates one host-owned return trigger;
4. perform an action preflight that proves the observer recognizes one known
   call sequence before spending on a full comparison;
5. compare every manifest-declared semantic-audit digest with the actual audit
   file before invoking a driver or model.

Do not rerun this clinic fixture merely after repairing the observer. The
fixture has been exposed, produced a ceiling-prone companion-index pattern, and
now carries post-hoc knowledge. A later test should first settle the mechanism
contract and then use a materially different transfer task.

That disposition is now expressed by the prospective
[Todo return-trigger transfer probe](../2026-08-06-todo-return-trigger/README.md).
It is a new causal object, not a repair or rerun of this packet.
