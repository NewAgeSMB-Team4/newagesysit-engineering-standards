# React engineering standards

- Build UI from cohesive components with clear props and one primary responsibility.
- Prefer function components and hooks; follow the repository's React version and framework conventions.
- Keep state minimal and colocated; derive values during render rather than duplicating derived state.
- Use effects only to synchronize with external systems (subscriptions, imperative APIs, browser APIs), not as a default data-flow mechanism.
- Keep custom hooks focused and name them `use...`.
- Use stable keys for lists; never use array indexes when items can be inserted, removed or reordered.
- Use semantic HTML, accessible names, keyboard support and visible focus.
- Handle loading, empty, error and disabled states for asynchronous UI.
- Avoid premature memoization. Profile before optimizing unless a stable identity is required by an API.
- Keep business rules out of presentation components; delegate to feature/domain modules.
