# Dependabot policy

- The `npm` ecosystem entry monitors both npm and Yarn manifests/lockfiles in `/` and targets `staging` for scheduled version updates.
- Patch/minor production and development packages are grouped separately; major updates are grouped separately. GitHub Actions patch/minor and major updates also use separate groups.
- Version-update PRs are checked weekly on Monday, capped at five open PRs per ecosystem, and use automatic rebasing. `rebase-strategy: auto` is explicit so routine updates do not accumulate merge conflicts.
- `target-branch: staging` applies to version updates. GitHub security-update PRs still target the repository default branch (`main`) and remain separate from routine grouped version updates; the configured version-update PR cap does not block security PRs.
- Dependabot closes an update PR when the same update is already present on the default branch. It automatically rebases active update PRs when its schedule detects a base change or conflict, but stops rebasing a PR after 30 days; maintainers close obsolete PRs or rebase them manually after that point.
