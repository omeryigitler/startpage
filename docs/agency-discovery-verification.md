# Discovery failure correction · 11 November 2026

The existing Startpage components and real backend runner were exercised with
live public OSM reads and isolated in-memory persistence. Sliema hospitality
discovery returned three companies and produced two private template concepts
with estimates. The screenshot shows the Saint Julians Bay Hotel concept; it is
an unpublished test preview, with business details still awaiting verification.
No production records, customer messages or public demos were created.

The error/retry flow was also checked with controlled transport timeouts: a
readable failure, disabled retry during the cooldown, then recovery of the same
task. Old generic failures get a readable explanation without inventing a cause.
Sales and Studio retain one section heading. The production build passes.

![Isolated real-source concept preview](qa/agency-discovery-live.png)

## Run history removal

Remove and Undo were checked against the real history service with an isolated
sample record. Removal changed the count from one to zero; Undo restored the
same record with its attempt history. A second removal stayed removed after a
page refresh. Company and concept preservation and active-run rejection are
covered by backend tests. The original user-requested entry is cleaned once by
the production backend, separately from this browser fixture.

![Isolated history-removal check after refresh](qa/agency-history-removal.png)
