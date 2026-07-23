# Work Cell Live Observation Probe

## Claim

A long-running Work Cell should expose enough provider-neutral evidence to
distinguish active model work, tool execution, completed-step use, settlement,
and failure before the final record exists. Observation must not require a
provider-specific status poll or turn raw hidden reasoning into a durable
runtime contract.

## Triggering observation

During the Kimi K3 visual-design practice, a background process initially
exposed only whether its PID was alive. One non-streaming implementation pass
then ended with a transport `TimeoutError` after roughly five minutes without
any intermediate signal. The caller could not distinguish active reasoning
from a stalled request until failure.

The same call was repeated through AI SDK streaming with a temporary JSONL
observer. It exposed model start, reasoning start, reasoning-character progress,
reasoning finish, step finish, finish reason, and usage while the process was
live. The first bounded attempt showed why this mattered: all but three of its
14,000 completion tokens were reasoning tokens, it ended with
`finishReason=length`, and it produced no usable diff. Process liveness alone
would not have revealed that failure mode.

## Smallest runtime change

- `runCell` accepts an optional `onTrace` observer and projects the same bounded
  events retained in the final trace as they occur.
- A synchronous observer failure is retained once as `cell.observer.failed` and
  detaches the projection; it cannot change execution or settlement.
- `cell.started` identifies the run, Cell, driver, provider, and model.
- The AI SDK driver emits step start, tool start and finish, completed-step
  usage, and its existing terminal and settlement events without changing the
  generic Cell input.
- A caller that attaches a live observer activates the AI SDK streaming path.
  Provider reasoning and response streams become bounded start, character
  progress, and finish events; raw reasoning text is not retained.
- The `run` CLI writes each event to a run-ID-scoped JSONL file beside the input,
  prints a compact live projection to stderr, and returns that path with the
  final result only while the sink remains writable. A failed sink is retained
  as an observation failure without being advertised as a usable log.

The trace remains an execution observation, not correctness evidence. Raw
reasoning text is not retained. A stream-capable carrier may expose bounded
reasoning activity when the provider supplies it; absence of that signal is
reported as a capability limit rather than filled with invented thoughts.

## Verification

- `bun test` passed all 138 Work Cell tests.
- `bun run typecheck` passed.
- A deterministic core test observed `cell.started`, an in-run progress event,
  and `cell.finished` before comparing them with the retained final trace.
- A failure probe made the observer throw on its first event; the Cell still
  completed, the observer was not called again, and the retained trace recorded
  the projection failure.
- A CLI sink probe verified that a successful first append publishes the path,
  while a later append failure withdraws it rather than claiming a partial log.
- An AI SDK streaming test observed reasoning progress, a real `read_file`
  execution, response production, and two settled usage reports without raw
  reasoning text entering the trace.
- Route tests verified direct streaming metadata and pre-stream fallback while
  preserving the no-spliced-partial-output boundary.
- An ordinary CLI probe ran through the configured Kimi-first route and showed
  `thinking started`, bounded completion, response activity, the settled
  `kimi-coding/k3` route, and 756 total tokens before returning `passed`.

The first ordinary CLI attempt also falsified the initial implementation: the
provider route still rejected streaming even though the leaf model supported
it. The route now forwards streaming calls and permits fallback only before a
target returns a stream.

## Remaining boundary

The slice covers one ordinary `run` CLI invocation and the public `runCell`
API. Swarm-wide aggregation remains a carrier projection above this boundary;
it should reuse the event sink rather than add fields to `CellInput` or
provider-specific observers to the generic core.
