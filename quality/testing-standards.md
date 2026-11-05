# Testing standards

- **MUST** add or update tests for new/changed business behavior and defect fixes.
- **MUST** test important failure paths, validation and authorization—not only happy paths.
- **SHOULD** use a test pyramid: many focused unit tests, integration tests at boundaries, and a smaller set of critical end-to-end journeys.
- **MUST** keep tests deterministic; avoid real production services/data and uncontrolled time/randomness.
- **MUST** isolate test data and clean up resources.
- **SHOULD** mock external systems at the boundary, not mock every internal function.
- **MUST** avoid asserting private implementation details when behavior can be tested.
- **SHOULD** define coverage thresholds based on criticality and trend; coverage percentage alone is not proof of quality.
- **MUST** ensure security-sensitive code has tests for denied access and invalid input.
