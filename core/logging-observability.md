# Logging and observability

- **MUST** use the project's structured logger in server applications; do not use ad-hoc `console.log` as production observability.
- **MUST** include useful context such as request/correlation ID, operation, outcome and duration where appropriate.
- **MUST** redact credentials, tokens, secrets and sensitive personal/customer data.
- **SHOULD** use consistent severity: debug for local diagnostics, info for meaningful events, warn for recoverable abnormal conditions, error for failed operations requiring attention.
- **SHOULD** measure latency, error rate and saturation for critical services and background jobs.
- **SHOULD** propagate trace/correlation context across service boundaries.
- **MUST NOT** use logs as the only audit trail for security-critical business actions; use a controlled audit event mechanism when required.
