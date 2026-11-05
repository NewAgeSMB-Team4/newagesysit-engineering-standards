# Next.js engineering standards

Applies to Next.js App Router by default. If a project uses Pages Router, document it and follow the applicable official guidance rather than forcing App Router patterns.

## Required defaults

- **MUST** use TypeScript for new application code and enable strict type checking where feasible.
- **MUST** use Server Components by default in App Router. Add `'use client'` only for state, event handlers, effects or browser-only APIs; keep the client boundary as low and narrow as possible.
- **MUST** treat every Server Action and Route Handler as a public-facing endpoint: authenticate, authorize, validate and rate-limit where appropriate.
- **MUST** keep secrets, privileged SDKs and database access in server-only modules. Use `server-only` for modules that must never enter the client graph.
- **MUST** return minimal serializable view models to Client Components; do not pass full ORM entities or sensitive fields.
- **MUST** use framework APIs intentionally for routing, metadata, images, fonts, scripts, error/loading/not-found states.
- **SHOULD** use the App Router data-fetching model and fetch directly from the data source in Server Components rather than making an unnecessary HTTP round trip to the app's own Route Handler.
- **MUST** understand and explicitly choose cache/revalidation behavior for data that is cached or user-specific. Never share private user data through a public cache.
- **SHOULD** use Suspense/streaming and parallel fetching where they improve perceived performance.
- **MUST** handle authorization in server-side data access, not merely hide links or pages.

## Suggested feature layout

```text
src/
  app/                 # routes, layouts, loading/error boundaries
  components/          # truly shared UI components
  features/<feature>/  # feature UI, schemas, actions, queries, types
  lib/                 # cross-cutting utilities and safe clients
  server/              # server-only services and data access
```

Adapt to the existing repository. Avoid creating a folder for every file or a global dumping ground.

## Data and mutations

- Validate input on the server with a runtime schema.
- Re-check identity and permission inside each mutation/action.
- Prefer direct server-side calls to application services from Server Components.
- Use Route Handlers for external HTTP APIs, webhooks or client-facing HTTP contracts—not as an internal proxy by default.
- Use Server Actions for UI-driven mutations where appropriate; do not treat them as private merely because they are called from the UI.
- Define cache invalidation/revalidation after mutations and test user/tenant isolation.

## UI and accessibility

- Use semantic HTML and accessible labels, focus states and keyboard support.
- Use `next/image` where appropriate and configure remote image hosts narrowly.
- Use `next/font` where appropriate; avoid blocking third-party scripts.
- Provide loading, empty, error and not-found states for relevant routes.

## Security and performance

See `security.md`, `server-client-components.md`, `data-fetching.md` and `performance.md`. Follow current official Next.js guidance for the installed major version; do not copy APIs from a different version.
