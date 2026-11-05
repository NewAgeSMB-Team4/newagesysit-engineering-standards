# NestJS security

- Use Guards for authentication and authorization; authorization must be checked for each protected operation and resource.
- Use a global validation strategy for all external input.
- Configure CORS with explicit trusted origins; avoid wildcard origins with credentials.
- Apply security headers using the supported middleware/platform integration.
- Rate-limit login, OTP, password reset, public search and costly endpoints.
- Use approved password hashing and secure session/token lifecycle.
- Verify webhook signatures using the provider's exact signing scheme and raw-body requirements; make processing idempotent.
- Restrict file uploads by size, type, content and storage policy; authorize download access.
- Avoid leaking stack traces or internal exception messages in production responses.
- Redact secrets and personal data from logs.
- Follow current NestJS security documentation for the installed version and chosen HTTP adapter.
