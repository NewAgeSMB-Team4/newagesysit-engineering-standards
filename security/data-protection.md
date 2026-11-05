# Data protection and secrets

- Classify data at minimum as Public, Internal, Confidential or Restricted; project owners map this to company policy.
- Keep credentials, tokens, signing keys, connection strings and private customer data out of source, prompts, screenshots, logs and test fixtures.
- Use `.env.example` with dummy placeholders only. `.env*` secrets must be ignored by Git; allow only explicitly safe examples.
- Expose only intentionally public values to browser bundles. In Next.js, `NEXT_PUBLIC_` values are public and must never contain secrets.
- Return DTOs/view models rather than raw ORM entities; explicitly allowlist response fields.
- Encrypt data in transit and use approved encryption-at-rest controls for sensitive stores/backups.
- Define retention and deletion behavior; avoid collecting data without a product need.
- Restrict production data access. Use synthetic or masked data in development and testing.
