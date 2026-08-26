# Run identity and isolation note: practice-cycle round 3

- trial/round：`method-probe-round-3-practice-cycle` / `round-3`
- baseline runner：`01a0385a-9174-7132-aa78-f5d76f377d06` (`Copernicus`)
- treatment runner：`01a0385a-9243-7791-8928-fe8fc8779a11` (`Cicero`)
- runner/model/harness exact identity：`unknown`; these are distinct internal Agent identities, so same-runner
  equivalence is not established
- task/source identity：both were instructed to use the same frozen task fixture and the same task SHA-256
- role visibility：each runner was instructed not to read the other output; actual process-level visibility `unknown`
- baseline candidate loading：instruction said not to load candidate; runtime proof `unknown`
- treatment candidate loading：instruction said to load only candidate; runtime proof `unknown`
- tools/permissions/workspace/AGENTS context：exact runtime isolation `unknown`; instructions prohibited file writes,
  network and other source reads
- output capture：Main received both structured returns and copied them into separate artifacts
- baseline output artifact SHA-256：`11ba07b36f374bdfb14de418b09b25774ca362635f4fe4aaf6feeb7fcd42bd8b`
- treatment output artifact SHA-256：`63bc414892e13d6453d4a658c24969583a2b24e1d05e4b188e54a396a271da81`

## Standing

This note establishes the recorded run identities and known isolation gaps. It does not establish matched
execution or causal attribution. Any later semantic comparison is capped at `behavior-observed` unless a
reviewer finds stronger independently verifiable evidence.
