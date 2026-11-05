# NestJS module architecture

A module should represent a cohesive capability (for example, Accounts, Orders, Billing), not simply a folder of unrelated controllers.

- Keep controllers, providers, DTOs, entities/repositories and tests close to their owning feature.
- Export only providers required by other modules; keep implementation private.
- Prefer explicit imports/exports over reaching into another module's internal files.
- Keep cross-cutting concerns in clearly owned shared modules (configuration, logging, database, auth) without turning `CommonModule` into a dumping ground.
- Avoid cyclic imports. Revisit domain ownership and dependency direction before using `forwardRef`.
- Keep framework transport concerns at the edge; application/domain logic should be testable without HTTP where practical.

Example (adapt to project conventions):

```text
src/
  modules/
    orders/
      orders.module.ts
      orders.controller.ts
      orders.service.ts
      dto/
      repositories/
      policies/
      tests/
  common/
  config/
  infrastructure/
```
