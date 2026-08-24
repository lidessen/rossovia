# Resolution and Tolerance

## Resolution gate

| Current decision | Work representation | Stop when |
|---|---|---|
| Direction | capability/work-family alternatives and irreversible surface | the human can reject or retain a direction without a mission-level estimate |
| Capability | dependency graph and discovery branches | P80 scenario envelopes can distinguish investment options or identify a needed probe |
| Mission | necessary work nodes, acceptance, and settlement | an approved envelope and continuation gate can be named |
| Cell/tree | declared scope, capabilities, and resource allocation | runtime can enforce the approved hard bounds |

Do not refine merely because a number is desired. Refine when the current
uncertainty can reverse the decision, conceal a hard constraint, or prevent a
valid envelope.

## Tolerance policy

Record only the tolerances that change the decision:

| Tolerance | Question | Failure observation |
|---|---|---|
| Structural | Which unknowns may remain outside committed work? | A required node was omitted without a discovery branch. |
| Forecast | Which interval coverage is required for this risk? | Actual result repeatedly falls outside the stated interval. |
| Decision | How much forecast overlap is acceptable? | Competing alternatives reverse order within tolerated uncertainty. |
| Control | What may not be exceeded without a new approval? | A cell/tree consumes beyond its envelope or silently continues. |
| Calibration | What coverage, bias, width, and drift make a profile usable? | Data is insufficient, stale, systematically biased, or too wide for the decision. |

## Human-facing budget card

```text
Work: <known nodes> + <discovery branches>
Decision resolution: direction | capability | mission | cell/tree
Forecast: <executor profile, reference class, P50/P80/P95 or unknown>
Confidence: <sample count, matching limits, drift>
Envelope: <approved hard caps and child allocation>
Continuation: <who may release more, based on which partial evidence>
Replan trigger: <observation>
```
