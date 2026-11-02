# Code scanning policy

- CodeQL analyzes JavaScript and TypeScript with the `security-extended` query suite on pull requests to `staging` and `main`, pushes to either branch, and a weekly scheduled refresh.
- The CodeQL workflow uploads results to GitHub code scanning with least-privilege read permissions plus `security-events: write`.
- The `staging` and `main` repository rulesets must require CodeQL code-scanning results at High severity or above, with no bypass actors. The rulesets are enabled after all batch status checks exist.
