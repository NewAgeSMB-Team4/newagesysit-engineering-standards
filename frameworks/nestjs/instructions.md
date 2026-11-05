# NestJS engineering standards

## Architecture

- **MUST** organize application capabilities into cohesive NestJS modules.
- **MUST** keep controllers focused on transport: parse request context, delegate, and shape responses.
- **MUST** keep business rules in providers/services or domain/application layers—not in controllers, guards or interceptors.
- **SHOULD** use DTOs for inbound/outbound transport contracts and map persistence models to response DTOs.
- **MUST** use dependency injection; avoid manual construction of providers that bypass Nest lifecycle/configuration.
- **MUST** avoid circular module dependencies. Refactor boundaries before considering `forwardRef`.
- **SHOULD** keep each module's exported providers minimal.

## Request lifecycle and validation

- Configure a global validation pipe for HTTP input, with transformation and whitelisting appropriate to the API contract.
- Use DTO classes supported by the chosen validation library; do not assume TypeScript interfaces exist at runtime.
- Use Guards for authentication/authorization, Pipes for validation/transformation, Interceptors for cross-cutting request/response concerns, and Filters for exception mapping.
- Do not put business logic in middleware or interceptors merely because they run on every request.

## Data and reliability

- Keep persistence access behind repositories/data-access providers where it improves isolation.
- Use transactions for multi-write invariants and idempotency for retryable workflows.
- Bound pagination, query complexity, uploads, concurrency and external API calls.
- Configure timeouts and bounded retries; never blindly retry non-idempotent operations.
- Use structured logging and correlation IDs; redact sensitive fields.

## Security

- Apply authentication and authorization at the operation boundary.
- Validate object-level ownership and tenant scope.
- Configure CORS, security headers, rate limiting and CSRF controls according to the API's deployment/authentication model.
- Verify webhook signatures and implement idempotent processing.
- See `security.md`, `validation-and-dtos.md` and `database.md`.
