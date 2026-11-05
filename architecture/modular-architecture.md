# Modular architecture

- **MUST** organize code around cohesive business capabilities/features, not only technical file types, as project size warrants.
- **MUST** define module ownership and public interfaces. Internal implementation should not be imported across feature boundaries without an explicit contract.
- **MUST** avoid circular dependencies. Fix dependency direction rather than hiding cycles with lazy references unless the framework requires a documented exception.
- **SHOULD** keep domain/business rules independent of HTTP, UI and persistence details where practical.
- **SHOULD** make infrastructure adapters (database, mail, payment, external APIs) replaceable behind narrow interfaces when that improves testing or change isolation.
- **MAY** use a layered, hexagonal or feature-oriented architecture. Choose the simplest approach that fits system complexity and document material trade-offs.

## Dependency direction

Presentation/transport → application/use cases → domain rules. Infrastructure implements interfaces required by inner layers. Avoid domain rules importing controllers, React components or framework transport types.
