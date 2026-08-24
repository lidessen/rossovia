# Retained comparison facts

## Candidate A

- route trace target: `ai-sdk-v7/kimi-coding/k3`
- provider request: thinking enabled, interleaved reasoning history, temperature 1
- completion: investigate in text, then run a private structured-settlement call

## Candidate B

- route trace target: `ai-sdk-v7/opencode-go/deepseek-v4-flash`
- provider request: thinking disabled
- completion: inline JSON-object response

Both candidates received the same four read-only files, task instructions,
output shape, 300-second duration boundary, and alternating serial schedule.

## Worker-visible task packet excerpt

The worker-visible `acceptance` array contained statements including:

- "States that terminalTools is a caller-defined one-of action contract whose input remains trace evidence rather than the logical result"
- "States that outputSchema independently validates the final logical output"
- "Identifies Swarm as a closed fixed-manifest execution form with manifest-order projection"
- "Keeps CellInput and runCell free of queue, dependency, retry, priority, and durability vocabulary"

## Repeated observations

| Case | Candidate | Repetition | Status | Reads | Duration |
|---|---|---:|---|---:|---:|
| completion contracts | A | 1 | passed | 4 | 148,557 ms |
| completion contracts | A | 2 | passed | 4 | 199,191 ms |
| completion contracts | B | 1 | passed | 4 | 10,453 ms |
| completion contracts | B | 2 | passed | 4 | 10,048 ms |
| orchestration boundary | A | 1 | cancelled | 4 | 300,005 ms |
| orchestration boundary | A | 2 | passed | 4 | 295,143 ms |
| orchestration boundary | B | 1 | passed | 4 | 10,575 ms |
| orchestration boundary | B | 2 | passed | 4 | 11,444 ms |

All seven settled outputs matched the worker-visible acceptance statements.
The cancelled run completed its main model step and entered structured
settlement before reaching the duration boundary.

The blind judge preferred A on the completion-contract case, claiming B did not
reject substitution or cite concrete paths. The retained B outputs used the
phrase `independent, non-substitutable` and listed the same complete paths. A
second judge prompt emphasizing contrast evidence repeated the preference.
