# NestJS database standards

- Keep query construction in repositories/data-access providers or clearly defined persistence adapters.
- Use parameterized ORM/query-builder APIs; never concatenate user input into raw SQL.
- Enforce tenant and object ownership constraints in queries or a trusted service boundary.
- Use transactions for related writes and define isolation/concurrency expectations for critical workflows.
- Avoid N+1 queries and unbounded result sets; paginate and select only required fields.
- Add indexes based on query plans and production-like workload evidence.
- Use migrations for schema changes; review backward compatibility and rollback/forward-fix strategy.
- Do not expose ORM entities directly as API responses.
- Keep test and development databases separate from production; use synthetic test data.
