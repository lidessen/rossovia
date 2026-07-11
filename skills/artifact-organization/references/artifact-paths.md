# Campaign Record

Do not create a record for a one-pass read-only audit. Persist one only when a
transition needs durable handoff, explicit approval, or evidence that a later
decision must recover.

## Path

1. If `design/organization/` exists, use
   `design/organization/YYYY-MM-DD-<slug>.md` while active.
2. Else if `design/` exists, create that organization directory and use the
   same dated filename.
3. Else use `organization/YYYY-MM-DD-<slug>.md`.

On successful settlement, promote stable organization into host design. Move
the record to `sessions/` or the host archive only when its evidence remains
decision-relevant; otherwise discard it.

## One-record shape

```markdown
# <Campaign>

**Status:** proposed | approved | active | pass | blocked | fail
**Accepted design:** <links>

## Audit
<current artifact roles and strongest keep-as-is case>

## Material gap
<one gap, decision consequence, and omission risk>

## Transition
<one wave, approval, and falsifiable acceptance condition>

## Verification
<gap closure, authority, inheritance, necessity, evidence, verdict>

## Disposition
<promoted design and whether this record is archived or discarded>
```

Do not split these sections into standing `MODEL`, `TARGET`, `GAP`,
`TRANSITION`, and `VERIFY` files. Those are reasoning steps, not institutions.
