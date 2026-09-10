# Execution receipts on a pull request

This integration is an experimental branch candidate. Controlled live fork PRs
have exercised CI and browser receipts; the public `v0` release does not include
these modes. Existing installs remain unchanged. Customer onboarding and real
preview-provider integration are not established by this rehearsal.

Antelier reads the completed CI result for the exact PR head, then exercises the
browser scenarios your default branch already approves. The PR comment separates
the workflow result from each browser result. It does not infer individual test
counts or claim that the entire application works.

The first supported setup requires:

- Existing CI triggered by `pull_request` and a completed run for the current head.
- A successful GitHub deployment marked transient and non-production for that head.
- A successful deployment-status URL matching `app`, or the numeric-PR URL template
  approved in default-branch `.antelier/journeys.yml` (example below).
- An optional `deployed.header` or `deployed.path` returning the full 40-character
  PR head SHA. When configured, it must match before and after the browser run.
  Without it, browser steps still run and produce screenshots, but the result is
  **partially checked: revision unverified**, whether the steps pass or fail.
  Deployment metadata alone does not certify the app's running revision. An explicit
  revision mismatch still refuses; this is not cryptographic deployment attestation.
- Default-branch `.antelier/EXPECTATIONS.md` approving that configuration's hash.
  Protect that branch: the approval is a reviewed file, not a digital signature.
- Google Chrome or installed Playwright Chromium on the verification runner.
- Node 22.13 or newer (the candidate is tested with 22.23.1).
- Pre-created, disposable test accounts when login is required. Configure only
  `ANTELIER_USER_*` and `ANTELIER_PASS_*` for those accounts. No service-role key.

Run `antelier journeys expectations`, review the scenarios, fill the approval,
and merge those files through the team's ordinary review process. PR descriptions
cannot grant approval or choose the preview URL. A failed run never rewrites the
approved expectations. Drift suggestions remain unapproved patches in the report.

## One copied workflow file

Use [`execution-workflow.example.yml`](execution-workflow.example.yml). Copy the whole
file to `.github/workflows/antelier.yml`, set your existing CI workflow's name and
exact file path, and pin the reviewed candidate or released Action commit in both
places. Two jobs are in that **one file**; a second Antelier workflow is not needed.
Replace an existing claim-only Antelier workflow rather than leaving two competing
publishers enabled. Existing application CI remains your CI; this integration reads
its completed result. Merge the configuration onto the default branch before use.
The public `v0` tag does not support these modes yet.
It does not check out PR code. The verifier uses read permissions; only the
separate publisher can write the comment and Check. Never add a PR checkout or
repository command to the publisher, or use `pull_request_target` to execute fork
code. The digest comes directly from `needs.verify.outputs`, not the artifact.

## Preview URLs without an app revision endpoint

For a fixed preview, `app` remains sufficient. For a numbered per-PR preview:

```yaml
version: 1
app: https://my-site.netlify.app/
preview:
  url: https://deploy-preview-{pr}--my-site.netlify.app/
journeys:
  - name: visitor can reach sign in
    steps:
      - goto: /login
      - expect: { text: Sign in }
```

Replace the site and scenario with your own. The URL template is part of the
approval hash. Only `{pr}` is substituted, using the GitHub PR number; no wildcard
host, arbitrary branch string or URL from the description is accepted. The selected
successful, transient, non-production GitHub deployment must name the current head
and exactly match that URL. A template is not proof of a provider integration.

Netlify documents numbered preview URLs, but may expose its preview through commit
checks rather than the deployment API. Vercel documents generated URLs and GitHub
deployment statuses. Automatic provider-specific check extraction, Vercel random
hostname discovery and a provider cold-start walk remain unimplemented. A repository
without matching deployment metadata currently gets `not runnable` with the reason.
See [Netlify previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/),
[Netlify notifications](https://docs.netlify.com/deploy/deploy-notifications/) and
[Vercel GitHub deployments](https://vercel.com/docs/git/vercel-for-github).

No revision endpoint is required for the partial observation path. Add `deployed`
later to establish the revision before and after execution. A partial result is
neutral, never a green merge certificate; a failed observed step includes its
reproduction even when revision attribution is unavailable.

For a numbered-preview reproduction, use the candidate CLI's
`antelier journeys run --config .antelier/journeys.yml --no-ensure --preview-pr 123`.
Check `--help` first: the public npm release may not have this option. The CLI
refuses a numbered-preview config without a positive PR number before contacting
the app. It substitutes that number into the approved template, never falling
back to `app`. A local reproduction is not the independent CI verdict; rerun the
verification workflow after the correction. Keep expectations and approval intact.

The browser worker receives a small environment allowlist, without GitHub tokens,
Actions runtime tokens, cloud keys or administrative database credentials. It
contacts the approved app and configured backend origins. The parent job reads
GitHub metadata and uploads the report. Screenshots can contain application data;
use synthetic accounts/data, especially with public repository artifacts. The
browser connection policy is not a sandbox for an application server.
WebSockets remain blocked in this runner. A failed scenario depending on one is
runner interference, including sockets on the app's own origin; it cannot establish
an app defect. Use the application's realtime tests in CI for that behavior.

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

## Runtime and cost

The customer's GitHub Actions account supplies the runner time and artifact storage.
In the September 10 controlled Linux rehearsal, verifier/publisher jobs took 7/10
seconds for CI-only evidence, 40/30 seconds for the first passing browser case, and
26/14 seconds for a browser failure. These are recorded job wall times, not billing
estimates or a promise for your app. Queue, runner setup, rounding, account quotas
and retries affect the bill. Browser execution is capped at five minutes; the verify
job at ten minutes; artifacts are retained seven days. No model API is used by these
execution modes. [Run with a browser failure](https://github.com/huyn7539/antelier-journeys-testbed/actions/runs/34521816181).

## Recorded controlled rehearsal

[The owner-operated fork PR](https://github.com/huyn7539/antelier-journeys-testbed/pull/1)
contains the live sticky comment. Its run history includes passing CI, failing CI,
a stale old-head refusal, and a Linux browser defect while CI remains green.
The preview is synthetic and runner-local; deployment metadata and approval are
fixture inputs. This establishes workflow wiring, not customer adoption or a
production preview integration. The candidate bundle used for the browser defect
is `80db3dec9588fb1988a06e698b7da8693424f50c`.
