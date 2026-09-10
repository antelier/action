# Execution receipts on a pull request

This integration is under local validation. It is not included in the currently
published Action. Do not replace a working install with the example until the
Action release contains `verify` and `publish` modes.

Antelier reads the completed CI result for the exact PR head, then exercises the
browser scenarios your default branch already approves. The PR comment separates
the workflow result from each browser result. It does not infer individual test
counts or claim that the entire application works.

The first supported setup requires:

- Existing CI triggered by `pull_request` and a completed run for the current head.
- A successful GitHub deployment marked transient and non-production for that head.
- A stable preview URL matching `app` in default-branch `.antelier/journeys.yml`.
  Dynamic per-PR hostname patterns are not supported yet.
- A configured `deployed.header` or `deployed.path` returning the full 40-character
  PR head SHA. Antelier observes it before and after the browser run. This is an
  application-reported revision, not cryptographic deployment attestation.
- Default-branch `.antelier/EXPECTATIONS.md` approving that configuration's hash.
  Protect that branch: the approval is a reviewed file, not a digital signature.
- Google Chrome or installed Playwright Chromium on the verification runner.
- Pre-created, disposable test accounts when login is required. Configure only
  `ANTELIER_USER_*` and `ANTELIER_PASS_*` for those accounts. No service-role key.

Run `antelier journeys expectations`, review the scenarios, fill the approval,
and merge those files through the team's ordinary review process. PR descriptions
cannot grant approval or choose the preview URL. A failed run never rewrites the
approved expectations. Drift suggestions remain unapproved patches in the report.

Use the example in `github-app/execution-workflow.example.yml` after release.
Set the existing CI workflow's name and exact file path, and pin the released
Antelier Action commit in both jobs. The workflow must live on the default branch.
It does not check out PR code. The verifier uses read permissions; only the
separate publisher can write the comment and Check. Never add a PR checkout or
repository command to the publisher, or use `pull_request_target` to execute fork
code. The digest comes directly from `needs.verify.outputs`, not the artifact.

The browser worker receives a small environment allowlist, without GitHub tokens,
Actions runtime tokens, cloud keys or administrative database credentials. It
contacts the approved app and configured backend origins. The parent job reads
GitHub metadata and uploads the report. Screenshots can contain application data;
use synthetic accounts/data, especially with public repository artifacts. The
browser connection policy is not a sandbox for an application server.

Each run is bounded to five minutes of browser execution. Missing setup,
interference, timeout, changed approval, changed deployment, missing screenshots
or inconsistent completion cannot produce a verified scenario. A report's files
are hashed and bound to the source CI run, PR revision and verifier workflow
attempt before publication. The publisher checks the PR head again before writes.

The run artifact includes JSON, HTML, screenshots and any proposed expectation
patches. A refuted scenario names the policy revision, journey and failing step so
the team's agent can reproduce it using the same preview revision and accounts.
This integration does not automatically repair arbitrary defects, run missing
named tests, or turn issue/description text into approved expectations. Those are
remaining Phase 1 work, not capabilities established by a successful CI result.
