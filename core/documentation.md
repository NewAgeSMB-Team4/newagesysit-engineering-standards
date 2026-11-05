# Documentation standards

- **MUST** update relevant documentation when changing public API behavior, environment configuration, setup, deployment, data model, security controls or operational procedures.
- **MUST** document non-obvious business rules and important architectural decisions.
- **SHOULD** use JSDoc/TSDoc for exported utilities or public APIs when intent, constraints or examples are not obvious. Do not add comments to every trivial function.
- **MUST** document environment variables by name, purpose, required/optional status and example placeholder; never include real values.
- **SHOULD** maintain OpenAPI/API docs for externally consumed HTTP APIs.
- **SHOULD** include setup, scripts, architecture overview, testing and deployment notes in project README.
- **MUST** keep examples runnable or clearly label them as illustrative.
