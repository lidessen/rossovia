# Chronicle projections

A projection is any derived index, JSONL export, metric, report, graph, or
dashboard built from named Observation Records and their declared sources.

It must retain:

- its input record IDs and source scope;
- the transform/generator identity and generation time;
- its known exclusions, aggregation, and uncertainty;
- a route back to the records it summarizes.

It may be deleted and rebuilt. It does not gain fact authority, does not become
the correction target for a source record, and cannot silently amend source
history. A projection that cannot be rebuilt must be promoted through a new
source/owner decision rather than treated as a convenient exception.

No projection is implemented in this pilot.
