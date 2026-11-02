# Bundle budget

- PR checks build both the target-branch revision and the PR revision using the same Node/Yarn workflow.
- For every exported HTML route, the check sums gzip-compressed initial JavaScript referenced by the page. It separately reports JavaScript assets shared by every exported route.
- Next.js `BASE_PATH` prefixes are normalized when locating `_next/static` assets; `index.html` maps to its directory route while standalone HTML filenames remain distinct routes.
- A route or the shared bundle fails when gzip bytes grow by more than the configured 10% threshold. Exactly 10% passes; removed routes and newly added routes are reported without a fabricated baseline.
- Any route-specific threshold override must use the exact route path, include a reason, and live in `scripts/bundle-budget.json`.
- The Actions artifact contains the complete per-route and shared-bundle comparison report.
