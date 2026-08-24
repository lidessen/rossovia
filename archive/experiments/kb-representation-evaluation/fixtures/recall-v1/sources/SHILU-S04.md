## Agent Interaction

Agent processors receive jobs and use Shilu tools to inspect sources, search
existing entries, and propose operations.

The interaction contract is the same for any agent:

1. Claim a job.
2. Read source material through the core.
3. Search for related entries using catalog, vector, and graph indexes.
4. Submit structured operations.
5. The core validates and commits or rejects operations.
6. The job is marked done, blocked, or needs review.

## Incremental Knowledge Workflow

new source
  -> register source
  -> enqueue digest-source job
  -> normalize source facts
  -> extract candidate entries
  -> search existing entries
  -> decide create / update / supersede / ignore / review
  -> commit operations
  -> update indexes
