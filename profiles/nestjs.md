# NSES Technology Profile: NestJS

**Applies to:** NestJS backend services using Node.js and, where applicable, TypeScript.

This profile imports the shared baseline and the detailed standards relevant to NestJS. Read this profile from the project-root `CLAUDE.md` when using Claude Code. Other agents should follow the same document list from the project-root `AGENTS.md`.

## Core engineering standards

@../core/coding-principles.md
@../core/clean-code.md
@../core/naming-conventions.md
@../core/error-handling.md
@../core/documentation.md
@../core/logging-observability.md

## Architecture standards

@../architecture/modular-architecture.md
@../architecture/data-access.md
@../architecture/api-design.md

## Security standards

@../security/security-baseline.md
@../security/input-validation.md
@../security/authentication-authorization.md
@../security/data-protection.md
@../security/dependency-security.md

## Performance standards

@../performance/performance-standards.md

## NestJS standards

@../frameworks/nestjs/instructions.md
@../frameworks/nestjs/module-architecture.md
@../frameworks/nestjs/validation-and-dtos.md
@../frameworks/nestjs/security.md
@../frameworks/nestjs/database.md

## Quality standards

@../quality/testing-standards.md
@../quality/test-types.md

## Profile-specific requirements

- Keep controllers focused on transport concerns; place business rules in providers/services.
- Organize modules around cohesive business capabilities and avoid circular dependencies.
- Validate external input at the boundary using DTOs and configured validation pipes.
- Enforce authentication and authorization on the server using appropriate guards and policies.
- Keep persistence concerns behind clear data-access boundaries appropriate to the project's ORM and complexity.
- Use transactions for operations that require atomicity; design retries and idempotency for externally retried operations.
- Avoid N+1 queries, unbounded result sets and unnecessary selected columns.
- Write unit tests for business logic and integration/E2E tests for important API and persistence behavior.
