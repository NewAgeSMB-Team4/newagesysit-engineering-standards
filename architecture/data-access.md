# Data access and persistence

- **MUST** keep database access out of UI components and HTTP controllers; delegate to an application/service or data-access layer.
- **MUST** parameterize queries; never concatenate untrusted input into SQL or query operators.
- **MUST** enforce tenant and ownership scoping in the data-access path, not only in the UI.
- **SHOULD** select only required fields and bound result sets.
- **SHOULD** use transactions for invariants spanning multiple writes.
- **MUST** define migration and rollback considerations for schema changes.
- **SHOULD** add indexes based on observed query patterns and query plans, not guesswork.
- **MUST** avoid N+1 access patterns; batch or join where appropriate.
- **MUST** define retention, deletion and backup expectations for sensitive/business-critical data.
