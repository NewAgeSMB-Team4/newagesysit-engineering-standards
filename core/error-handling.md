# Error handling

- **MUST** distinguish expected business failures from unexpected system failures.
- **MUST** return stable, documented error contracts at API boundaries; do not expose stack traces, SQL, secrets, filesystem paths or internal implementation details to clients.
- **MUST** preserve causal context when rethrowing/wrapping errors.
- **MUST** never convert an error into a success-shaped response or empty result unless that is explicitly the domain contract.
- **SHOULD** centralize transport-level error mapping and logging.
- **SHOULD** use typed/domain errors for expected cases; avoid parsing error message strings to determine program flow.
- **MUST** log unexpected failures once at an appropriate boundary, with correlation/request identifiers and safe context. Avoid duplicate noisy logs at every layer.
- **MUST NOT** log passwords, access tokens, session cookies, API keys, payment data or unnecessary personal data.
