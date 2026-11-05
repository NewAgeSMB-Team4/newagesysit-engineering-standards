# Next.js Server and Client Component boundaries

- Server Components are the default in the App Router. They are appropriate for data access, secrets, server-side composition and static rendering.
- Client Components are appropriate for interactive state, event handlers, effects, browser APIs and client-only libraries.
- Put `'use client'` at the smallest component boundary that needs it. Every import reachable from that boundary becomes part of the client module graph.
- Never import server-only database clients, secret-bearing modules or privileged service code into a Client Component.
- Use `import 'server-only'` in sensitive server modules where supported.
- Props crossing the server/client boundary must be serializable and must not contain secrets or unnecessary personal data.
- Do not move all data fetching to the browser by default. Prefer server-side fetching when it improves security, performance or simplicity.
- Avoid using `useEffect` to derive state or to perform data fetching that belongs in the server data layer; use effects for genuine synchronization with external client systems.
- Test both rendering behavior and authorization behavior; a Server Component is not automatically authorized just because it runs on the server.
