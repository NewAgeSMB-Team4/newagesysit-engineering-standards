# API design

- **MUST** validate path, query, headers and body inputs at the server boundary.
- **MUST** authenticate and authorize each protected operation; authentication alone is not authorization.
- **MUST** use consistent response and error schemas and document externally consumed contracts.
- **SHOULD** use correct HTTP methods/status codes and resource-oriented routes.
- **SHOULD** paginate collection endpoints and enforce maximum page size.
- **MUST** define idempotency/replay behavior for payment, order, webhook and other retry-prone operations.
- **MUST** avoid leaking internal IDs or data across tenant/ownership boundaries.
- **SHOULD** version breaking public API changes and provide a migration/deprecation plan.
