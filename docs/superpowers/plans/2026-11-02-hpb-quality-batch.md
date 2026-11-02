# HPB-4450—HPB-4423 Quality Batch Implementation Plan

> Each issue is delivered as its own PR to `staging`. Apply the repository's full Ship gates to each PR. This batch plan is archived after the final promotion.

## Goal and constraints

- Implement all fifteen issues listed in the companion specification.
- Initialize `staging` from the latest `origin/main`; do all Git/file operations in the current worktree.
- No shared feature PRs. Merge file-disjoint issue PRs independently; HPB-4425 must precede HPB-4428.
- Use Node 24 and the existing Yarn-first workflow behavior. Do not change public routes or data contracts.

## Tasks and dependencies

### Task 1: HPB-4445 — Vitest and diff coverage

- Add Vitest, React Testing Library, deterministic `yarn test`, V8 coverage, and a repository-owned diff-line checker with an 80% threshold for changed runtime source lines.
- Add representative component/script regression tests and a PR check.
- Update the Pages build runtime to Node 24; verify a full static build.
- **Depends on:** staging initialization. **Produces:** reusable TS/React test command and stable test/coverage status checks.

### Task 2: HPB-4423 — Navigation breakpoint and metadata typo

- Align desktop/mobile visibility at the `md` boundary and correct the concrete-structure description. Test the 640–767px boundary and metadata text.
- **Depends on:** Task 1.

### Task 3: HPB-4424 — Bookshelf H1

- Add one visible page-level H1 before the book cards and retain book titles as H2. Test heading structure.
- **Depends on:** Task 1.

### Task 4: HPB-4425 — Copy button pointer affordance

- Add `cursor-pointer` to the copy control and test rendered behavior/class.
- **Depends on:** Task 1.

### Task 5: HPB-4426 — WeChat QR controls

- Add pointer affordance to open/close buttons without changing focus or dismissal behavior; test open/close.
- **Depends on:** Task 1.

### Task 6: HPB-4427 — Fullscreen reader pointer affordance

- Add pointer affordance to the fullscreen control; test control state and class.
- **Depends on:** Task 1.

### Task 7: HPB-4428 — Copy success icon

- Replace the text check glyph with an aria-hidden SVG while retaining “已复制”; add a regression test.
- **Depends on:** Tasks 1 and 4.

### Task 8: HPB-4429 — Textbook modal icons

- Replace the close and warning glyphs with aria-hidden SVGs; retain accessible close labeling and warning text. Test rendered semantics.
- **Depends on:** Task 1.

### Task 9: HPB-4448 — Content and RSS validation

- Add a validator for required MDX metadata, local links, and generated RSS metadata with file/line diagnostics; test valid and invalid fixtures and run it in PR CI.
- **Depends on:** Task 1.

### Task 10: HPB-4450 — Image/static asset governance

- Optimize `public/static/images/canada/mountains.jpg` below 500,000 bytes without obvious visual regression. Add a new-image budget checker, exact path/reason allowlist, tests, and format guidance.
- **Depends on:** Task 1.

### Task 11: HPB-4443 — Dependency vulnerability gates

- Add PR dependency review failing at High or Critical and a high-severity dependency audit in the build/deploy path; test workflow configuration and lockfile behavior.
- **Depends on:** Task 1.

### Task 12: HPB-4444 — CodeQL SAST

- Add JavaScript/TypeScript CodeQL scanning for PRs and scheduled refreshes with least-privilege permissions and a stable status context.
- **Depends on:** Task 1.

### Task 13: HPB-4446 — PR accessibility scan

- Scan the static `out/` export with Playwright and axe on the required core routes, fail on serious-or-higher violations, and retain the report.
- **Depends on:** Task 1.

### Task 14: HPB-4447 — Bundle budget

- Record route/shared initial JavaScript baselines, compare compressed sizes against the PR base, fail above 10% growth, and report per-route deltas.
- **Depends on:** Task 1 and static export build.

### Task 15: HPB-4449 — Dependabot

- Configure weekly JavaScript/Yarn and GitHub Actions updates, grouped routine updates, separate security updates, a bounded open-PR policy, and superseded-update handling.
- **Depends on:** Tasks 11–12 so bot-generated PRs encounter the security checks.

### Task 16: Branch enforcement and publication

- After all checks have produced statuses, configure active required-check rulesets for `staging` and `main`; require PRs and do not configure bypass actors.
- Create the final `staging` → `main` PR, wait for its checks, merge, and verify Pages deployment plus public route availability.
- **Depends on:** Tasks 1–15.

## Verification

- Per issue: focused TDD RED/GREEN, then full `yarn test`, repository lint, TypeScript check, and static build before simplify/review/commit.
- PR CI: test/diff coverage, content/RSS, asset budget, dependency review/audit, CodeQL, a11y, and bundle checks on both supported PR bases.
- Final: exact required-check contexts are active on both protected branches; promotion PR and Pages deployment succeed; smoke-check `/`, `/blog`, `/about`, and `/projects`.

## Risks

- The repository has no branch protection today; ruleset check names must be captured from successful workflow runs before enforcement.
- Node 24 compatibility and the existing dual lockfiles must be validated without introducing unintended lockfile churn.
- `public/static/images/canada/mountains.jpg` is currently over budget; image quality and dimensions must be inspected after optimization.
