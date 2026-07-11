# Test an Agent Skill

Test whether a skill changes the intended agent behavior under a realistic
task; do not test whether its author can explain the intended behavior.

1. Read the skill and references/evaluation.md. State one falsifiable behavior
   claim and the evidence that would refute it.
2. Build a minimal action probe from raw task artifacts. Do not disclose the
   desired conclusion, expected fix, or prior diagnosis to an independent
   evaluator.
3. Include a boundary probe that should not activate the skill or should route
   to another form. Add a context-load or adversarial probe only when the
   claimed behavior is supposed to survive that condition.
4. When an independent fresh evaluator is safely available, compare a baseline
   and skill-enabled run. Otherwise run the probes directly and label the
   result self-evaluated; do not represent it as independent evidence.
5. Record the prompt, supplied artifacts, observed action, evidence, failure
   condition, and revision decision. A test that cannot change the decision is
   not evidence for deploying the instruction.

Retest after a material rewrite. Keep a failed probe as evidence; do not erase
it merely because a later wording variant passes.
