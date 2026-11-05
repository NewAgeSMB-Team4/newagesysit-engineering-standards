# Clean code and maintainability

- **MUST** keep each module cohesive and minimize its public surface.
- **MUST** remove duplication when the same business rule is repeated and likely to change together. Do not force unrelated code into a shared abstraction just because it looks similar.
- **SHOULD** keep functions small enough to understand without scrolling through unrelated logic; split by responsibility, not arbitrary line count.
- **SHOULD** use constants/enums for domain values with meaning; keep configuration outside business logic.
- **SHOULD** make side effects visible at boundaries (I/O, database, network, filesystem, telemetry).
- **SHOULD** document why, constraints and non-obvious decisions rather than restating what the code does.
- **MUST** avoid commented-out code; source control preserves history.
- **MUST** avoid broad lint suppressions. Any suppression must be line-scoped where possible and explain why.
- **SHOULD** refactor only as far as needed for the requested change, unless a separate refactor is agreed.
