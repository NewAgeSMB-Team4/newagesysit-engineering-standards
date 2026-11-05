# Component and responsibility design

- **MUST** give each component/module one cohesive responsibility and a clear contract.
- **SHOULD** compose small components rather than build a single component with many unrelated modes.
- **SHOULD** keep domain/business logic out of visual presentation components; move reusable logic to hooks, services or use-case modules appropriate to the framework.
- **SHOULD** make state ownership explicit and keep state as close as practical to the components that need it.
- **MUST** avoid premature generic component libraries. Promote components to shared scope only when reuse and ownership are clear.
- **MUST** expose accessible names, keyboard behavior and semantic HTML for interactive UI.
- **SHOULD** define loading, empty, error, disabled and success states for user-facing asynchronous flows.
- **SHOULD** keep props small and meaningful; avoid passing entire database entities when a view model is sufficient.
