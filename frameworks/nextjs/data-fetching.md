# Next.js data fetching and caching

- Fetch directly from the underlying service/data layer in Server Components when possible; avoid an extra request to your own Route Handler.
- Use a shared server-side data-access/service layer for business rules and tenant/authorization scoping.
- Parallelize independent requests with `Promise.all` when failure semantics permit; use `Promise.allSettled` only when partial results are a deliberate product behavior.
- Define cache policy explicitly. User-specific, permission-dependent or sensitive data must not enter a shared cache without a safe, complete cache key and invalidation design.
- Document revalidation triggers and ensure mutations invalidate affected data.
- Add timeouts, error handling and bounded retries for external APIs.
- Avoid waterfall requests and N+1 database access.
- Follow APIs supported by the installed Next.js version; caching defaults have changed across releases.
