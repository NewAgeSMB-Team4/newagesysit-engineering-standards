# Test types and expectations

## Unit

Test pure functions, domain rules, services and component behavior in isolation. Cover boundaries, invalid states and error behavior.

## Integration

Test database repositories, framework wiring, validation, serialization, external adapters and transactions against realistic test infrastructure where practical.

## End-to-end

Test critical user journeys and API contracts through the deployed application boundary. Keep tests few, stable and high value.

## React UI

Prefer user-observable behavior: accessible roles/names, keyboard interactions, loading/error states and form validation. Avoid brittle snapshots as the only evidence.

## Test data

Use synthetic data. Never copy production personal data or credentials into fixtures. Ensure tests do not depend on execution order.
