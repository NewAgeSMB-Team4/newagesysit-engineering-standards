# Next.js performance

- Measure route-level performance and Core Web Vitals; use production-like builds for validation.
- Keep client bundles small by minimizing client boundaries and avoiding unnecessary client-only dependencies.
- Use dynamic imports for genuinely heavy, non-critical client features where it improves initial loading.
- Use `next/image`, appropriate dimensions and modern formats; configure remote patterns narrowly.
- Use `next/font` where appropriate to reduce external font requests and layout shift.
- Avoid sequential server data waterfalls; parallelize independent work.
- Use Suspense/loading UI for slow independent regions when useful.
- Analyze bundle output before adding large dependencies.
- Do not add memoization (`memo`, `useMemo`, `useCallback`) by habit; use it when profiling or stable identity requirements justify it.
- Check caching and invalidation behavior; caching is a correctness and isolation concern as well as a performance tool.
