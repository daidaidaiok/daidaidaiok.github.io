# Dependency security policy

- `Dependency review / High+` scans dependency changes in pull requests and fails on High or Critical advisories.
- `Dependency audit / High+` audits both lockfiles on pull requests targeting `staging` or `main`; the Pages build repeats both audits before deploying.
- Yarn Classic exits non-zero for advisories of any severity, so `audit:yarn-high` parses its JSON summary and blocks only High or Critical findings.
- `package.json` keeps Yarn `resolutions` and npm `overrides` aligned because several legacy transitive ranges do not yet admit patched releases. The compatibility overrides for `brace-expansion`, `js-yaml`, `postcss`, `sharp`, the patched Jaeger propagator with its supported API peer range, TOML, and Zod were validated with the repository test suite and static build.
- Remove an override when its parent package accepts the patched version; regenerate and validate both lockfiles after dependency changes.
