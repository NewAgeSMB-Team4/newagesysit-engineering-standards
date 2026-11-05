# Performance and optimization

- **MUST** optimize based on measurements, profiling or a reproducible bottleneck—not intuition alone.
- **MUST** avoid unbounded data reads, unbounded loops over user-controlled collections and unbounded concurrency.
- **SHOULD** establish budgets for critical routes/APIs: latency, error rate, bundle size and key Core Web Vitals where applicable.
- **SHOULD** parallelize independent I/O, batch repeated calls and use pagination.
- **SHOULD** cache only when data freshness, invalidation, tenant isolation and authorization are understood.
- **MUST** ensure cache keys include every dimension that affects the result, including tenant/user scope when applicable.
- **SHOULD** lazy-load expensive UI or dependencies when it improves real user experience.
- **MUST** set timeouts and bounded retries for external calls; use exponential backoff with jitter where appropriate and avoid retrying non-idempotent operations blindly.
- **SHOULD** benchmark before and after material performance changes and document trade-offs.
