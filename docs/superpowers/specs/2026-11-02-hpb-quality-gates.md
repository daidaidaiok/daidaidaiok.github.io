# HPB Blog Quality Gates — Specification

**Date:** 2026-11-02

**Repository:** `daidaidaiok/daidaidaiok.github.io`
**Scope:** HPB-4450, HPB-4449, HPB-4448, HPB-4447, HPB-4446, HPB-4445, HPB-4444, HPB-4443, HPB-4429, HPB-4428, HPB-4427, HPB-4426, HPB-4425, HPB-4424, HPB-4423

## Goal

Deliver the fifteen requested issue fixes as independent PRs into `staging`, then publish the integrated result through one `staging` → `main` PR. Improve the blog's regression, content, asset, accessibility, bundle-size, dependency, and static-analysis gates without changing public route or data contracts.

## Agreed decisions

- Seed `staging` from the latest `origin/main`; all issue branches target `staging`.
- Each issue gets its own branch and PR. HPB-4425 precedes HPB-4428 because both change `CopyLinkButton`.
- Use Vitest and a repository-owned diff-coverage gate at 80% for changed runtime lines.
- Compare per-route and shared initial JavaScript against the base build; fail above 10% growth.
- Use Node 24 across the Pages and PR workflows.
- Enable required PR checks on `staging` and `main` only after their status contexts exist.
- Finish with a manual promotion PR using this repository's existing Pages workflow; do not invoke the global promote skill.

## Required behavior

1. `yarn test` runs deterministically in local and CI environments and emits coverage; changed runtime lines must meet the agreed threshold.
2. The responsive navigation never shows desktop and mobile navigation simultaneously from 640–767px; the concrete-structure metadata has the corrected text.
3. The bookshelf page has one visible H1; the specified interactive controls show pointer affordance; copied/close/warning icons are SVG decoration while text preserves accessible meaning.
4. Content validation reports missing required frontmatter, invalid local links, and invalid RSS metadata with source locations.
5. Added PNG/JPG assets above 500,000 bytes fail CI; the existing oversized mountains photo is optimized below that budget, with an explicit versioned exception mechanism and documented modern-image guidance.
6. Dependency changes introducing High/Critical vulnerabilities fail PR checks; CodeQL analyzes JavaScript/TypeScript; Dependabot updates dependency manifests and GitHub Actions on a weekly schedule.
7. Automated axe scans cover `/`, `/blog`, `/tags`, a real generated tag route, `/about`, and `/projects`; serious-or-higher violations fail and the report is retained.
8. Bundle checks report per-route and shared client-JavaScript size changes and fail when a route exceeds 10% growth against its base build.
9. Active GitHub rulesets require PRs and the new checks for both `staging` and `main`; the final Pages deployment succeeds and the public routes remain reachable.

## Out of scope

- Public APIs, database/storage schemas, site routing changes beyond the listed defect fixes, unrelated content edits, and a Next.js major-version migration.
- Automatic merging of Dependabot PRs.
