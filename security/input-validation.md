# Input validation and injection prevention

- Validate all external inputs at entry points using schema-based validation (e.g. Zod, class-validator or an approved equivalent).
- Enforce maximum lengths, numeric bounds, array sizes, pagination caps and upload limits.
- Use allowlists for enums, sort fields, filter operators, redirect destinations and file types.
- Use parameterized database APIs; validate dynamic identifiers separately because identifiers generally cannot be parameterized like values.
- Escape/encode output for HTML, URL, JavaScript, CSS and SQL contexts; prefer safe framework APIs.
- Avoid `eval`, dynamic code generation and unsafe deserialization. Treat `dangerouslySetInnerHTML` as a security-sensitive exception requiring sanitization and review.
- Validate webhook signatures against the raw body when the provider's signing scheme requires it.
- Do not assume TypeScript interfaces or client-side validation provide runtime protection.
