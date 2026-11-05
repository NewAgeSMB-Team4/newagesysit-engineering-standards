# Code review standards

Reviewers assess correctness, security, maintainability, performance and test evidence—not personal style preferences already automated by formatters.

## Blocking review questions

1. Does the change meet the requirement and preserve existing behavior?
2. Are authorization and tenant/ownership checks enforced server-side?
3. Are all untrusted inputs validated and safely used?
4. Can sensitive data leak through responses, logs, errors or client bundles?
5. Are errors, concurrency, retries and partial failures handled?
6. Are database queries bounded and appropriate indexes considered?
7. Are tests meaningful and covering important failure paths?
8. Are migrations, feature flags, rollback and operational impacts addressed?
9. Is documentation updated where necessary?
10. Did required CI checks pass?

## Severity

- **Critical:** exploitable security flaw, data loss/corruption, unauthorized access, secret exposure. Block immediately.
- **High:** major functional defect, authorization gap, serious reliability/performance issue. Block.
- **Medium:** maintainability, edge case or non-critical performance issue. Normally fix before merge; exceptions require owner agreement.
- **Low:** minor improvement. May be follow-up work.

Every finding should identify location, impact, reproduction/evidence and a suggested fix. Do not approve based only on an AI review.
