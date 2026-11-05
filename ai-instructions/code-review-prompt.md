# NSES code review prompt

Review the supplied diff against the project's pinned NSES version and local requirements. Do not modify code unless explicitly asked.

Prioritize findings in this order:
1. Security: authentication, authorization, tenant/object access, injection, XSS, CSRF, SSRF, secrets, sensitive data exposure, uploads, webhooks, abuse controls.
2. Correctness: business rules, edge cases, concurrency, transactions, idempotency, error handling.
3. Reliability: timeouts, retries, resource bounds, observability, failure recovery.
4. Performance: query patterns, N+1, unbounded work, caching isolation, client bundle/rendering.
5. Maintainability: architecture boundaries, duplication, complexity, types, documentation and tests.

For each finding provide severity (Critical/High/Medium/Low), file and line, evidence, impact, a concrete recommendation and whether it blocks merge. Do not report speculative issues as facts. Distinguish confirmed findings from questions. If no findings are identified, say that the review is limited to the supplied diff and is not a guarantee of security.
