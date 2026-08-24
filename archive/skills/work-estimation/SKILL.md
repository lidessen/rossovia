---
name: work-estimation
description: >-
  Estimate the necessary work before converting it into agent tokens, time, or
  money. Use when comparing implementation options, setting an agent budget,
  choosing estimate granularity or error tolerance, planning a discovery probe,
  or asking "how much work is this really?" / "预算怎么估？" / "工作量评估"
  / "误差容忍度". Do not use to invent a token price, approve spend, or replace
  strategic choice, execution, or calibration evidence.
argument-hint: "[estimate | compare | review]"
---

# Work Estimation

## Principle expression

**Primary:** P07
**Supporting:** P02, P08, P15

## Scope

Own one judgment: **given a concrete desired state and evidence, what is the
smallest necessary work graph, what resolution can the present decision tolerate,
and what remains discovery rather than committed work?**

Work is executor-independent. It is not person-days, tokens, dollars, elapsed
time, model capability, or a universal point scale. Conversion into resources,
human approval of a hard envelope, runtime enforcement, and retrospective
calibration belong to their respective owners.

## Principle source

Use a host Sequence and matching interpretations when present. Otherwise use
this package's read-only fallback in `references/sequence.md`. Read
only P07, P02, P08, and P15 for this skill's stable lineage.

## Start

Ground the work before assigning any size:

```text
Current state and source evidence:
Target state / decision to change:
Actor and decision horizon:
Hard constraints and irreversible surface:
Current alternatives, dependencies, and unknowns:
Strongest case for using no estimate or a coarser estimate:
```

If the decision is one-step, reversible, and no later actor must compare or
approve a resource commitment, use ordinary disciplined development. Do not
manufacture a work graph.

## Core method

1. **Recover the concrete state transition.** Read the object, its owners,
   existing evidence, and acceptance boundary. Separate observed work from a
   hoped-for implementation or an executor's claimed effort.
2. **Construct the necessary work graph.** Add a node only when it changes a
   required state, resolves a decision-changing unknown, verifies a hard
   constraint, or preserves a later settlement. State its dependency and
   acceptance observation. Do not use a fixed investigation/design/build/test
   sequence.
3. **Separate committed work from discovery branches.** A discovery node exists
   to decide whether later work is needed; it is not hidden contingency. Name
   the observation that opens or closes each branch and the smallest allocation
   needed to learn it.
4. **Choose decision-derived resolution.** Use
   [resolution and tolerance](references/resolution-and-tolerance.md). Estimate
   only as finely as needed for the current choice. If two alternatives remain
   indistinguishable within their tolerated uncertainty, route to a bounded
   discovery practice rather than inventing precision.
5. **Return a Work Estimate, not a price.** Use the
   [record shape](references/work-estimate.md) when approval, handoff, or a
   later comparison requires recovery. Name what an execution projection would
   need—executor profile, relevant observations, and confidence—but do not
   fabricate P50/P80/P95 or set a hard cap.
6. **Route the next owner.** Route resource conversion and hard enforcement to
   Work Cell/runtime policy; multi-alternative direction to strategic-advisory;
   post-run calibration to practice-cycle; carrier choice to form-guidance;
   durable placement to artifact-organization; and semantic insufficiency to
   principle-cultivation.

## Boundaries

- Do not map a work node directly to a Work Cell, person-day, token count, or
  price. One executor may combine nodes; another may need several attempts.
- Do not hide uncertainty in an undifferentiated percentage buffer. Preserve
  discovery branches and their opening observations separately.
- Do not use forecast overlap to pretend alternatives are equal. If uncertainty
  can change the decision, identify the next information-gathering practice.
- Do not approve a Budget Envelope, release a child-cell allocation, or allow a
  forecast view to accept its own result.
- Do not turn the record into a mandatory plan or universal work-point taxonomy.

## Completion standard

The estimate is ready when it names the concrete state transition, necessary
nodes, discovery branches, dependencies, resolution/tolerance, omitted work,
and a disconfirming observation. It is supported only when an action probe
compares real alternatives without using tokens/person-days as work, a boundary
probe declines a one-step request or unsupported point forecast, and a context
probe reads the object and acceptance boundary rather than an executor price
sheet.
