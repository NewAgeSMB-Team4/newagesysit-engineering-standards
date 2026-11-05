# Security baseline

This baseline is informed by OWASP ASVS and secure-by-design principles. Each product should select an appropriate verification depth based on data sensitivity, exposure and business risk.

## Mandatory controls

1. **Trust boundaries:** treat browser input, API payloads, webhooks, files, external API responses, environment variables and database content as untrusted until validated.
2. **Authentication:** use established, maintained authentication libraries/protocols. Do not invent cryptography or password/session schemes.
3. **Authorization:** check permission on every protected server-side operation, including Server Actions, route handlers, background jobs and object-level access. Deny by default.
4. **Validation:** validate shape, type, length, format, ranges and allowed values at boundaries. Normalize only where appropriate. Reject unexpected fields for sensitive operations where feasible.
5. **Secrets:** never commit secrets. Keep secrets server-side, rotate exposed credentials, use a managed secret store in deployed environments and scan repositories.
6. **Output safety:** encode output for its context; avoid unsafe HTML rendering. Sanitize rich HTML with a maintained allowlist sanitizer when HTML is genuinely required.
7. **Transport:** use HTTPS in production; configure secure cookies, security headers, CORS allowlists and CSRF protections appropriate to the authentication model.
8. **Abuse controls:** rate-limit authentication, password reset, OTP, search, upload and expensive endpoints; add quotas/timeouts where appropriate.
9. **Data minimization:** collect, return and log only necessary data. Classify sensitive fields and redact them.
10. **Dependencies:** monitor vulnerabilities, update promptly and document accepted risks.
11. **Uploads:** enforce size/type limits, inspect content where risk warrants, generate server-side names, store outside executable paths and authorize downloads.
12. **Webhooks:** verify signatures, timestamp/replay controls where supported, handle retries idempotently and never trust source IP alone as proof.
13. **Errors:** return generic client errors; keep diagnostic detail in access-controlled logs.
14. **Testing:** include negative authorization, validation, abuse and sensitive-data exposure tests for critical flows.

## Security review triggers

Require focused security review for authentication/session changes, permissions, multi-tenancy, payment, personal/financial data, file upload, webhooks, encryption, secrets, public endpoints and infrastructure changes.

## Risk and exceptions

Critical/high vulnerabilities block release unless an explicitly authorized emergency exception records scope, compensating controls, owner and expiry. Never suppress a finding solely to make a dashboard green.
