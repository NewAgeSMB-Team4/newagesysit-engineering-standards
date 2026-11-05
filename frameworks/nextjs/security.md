# Next.js security rules

1. Treat Server Actions, Route Handlers and Server Functions as remotely invocable boundaries.
2. Authenticate and authorize every operation independently; do not rely only on layout/page checks.
3. Validate all inputs server-side. Validate IDs and enforce record ownership/tenant scope in the query or service.
4. Keep secrets and privileged clients in server-only modules. Never prefix secrets with `NEXT_PUBLIC_`.
5. Avoid returning raw database records. Map to allowlisted DTOs.
6. Use secure session cookies and the application's approved CSRF/session strategy.
7. Configure CORS, CSP, frame protection and other headers based on actual deployment requirements. Avoid copying a restrictive CSP without testing required assets and scripts.
8. Protect login, OTP, reset, upload and expensive endpoints with abuse controls.
9. For redirects, allowlist trusted destinations; do not blindly redirect to user-provided URLs.
10. Do not render untrusted HTML with `dangerouslySetInnerHTML`. If required, sanitize with a maintained allowlist sanitizer and obtain review.
11. Review cache behavior to ensure personalized responses cannot be served to another user or tenant.
12. Keep framework and dependencies patched; review Next.js security advisories for the project's exact version.
