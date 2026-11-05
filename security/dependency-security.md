# Dependency and supply-chain security

- Commit the lockfile and use the package manager selected by the project.
- Run dependency vulnerability scanning in CI and on a scheduled cadence.
- Review package provenance, maintainers, release activity, license and transitive dependency impact before adding a package.
- Pin CI/toolchain versions where reproducibility or supply-chain risk requires it; use supported versions and a documented update cadence.
- Do not install packages from untrusted sources or run remote install scripts without review.
- Triage findings by exploitability, reachability, exposure and severity; record accepted risks with owner and expiry.
- Enable secret scanning and protect default branches with required checks.
