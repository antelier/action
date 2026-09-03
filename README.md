# Work Loop claim check (GitHub Action)

Checks what an AI agent's pull request **claims** against what its diff **actually changed**. Every cited line resolves to the diff; nothing is invented. One sticky comment per PR (updated in place on push) and one Check run.

## Install in one step

Create `.github/workflows/work-loop.yml`:

```yaml
name: Work Loop claim check
on:
  pull_request:
    types: [opened, synchronize, edited, reopened]
  push:
permissions:
  contents: read
  pull-requests: write
  checks: write
jobs:
  claim-check:
    if: ${{ github.event_name == 'pull_request' || github.ref_name == github.event.repository.default_branch }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: huyn7539/work-loop-action@main
```

That is all. The next pull request gets a comment like:

> **Claim check for #42 — 4 present · 1 absent · 3 not checkable**
> **Needs your eyes:** "Updated the `scripts` block in `package.json` …" is ABSENT — file not matched.

Labels: `present` (the described change is in the diff at the cited hunk), `partial` (some of it), `absent` (nothing in the diff corresponds), `contradicted` (the diff does the opposite), `not checkable` (cannot be decided from the diff). Claims about test runs, CI or performance are never guessed.

## What it needs

Nothing but the workflow's own `GITHUB_TOKEN`. No account, no key, no server. The runner's `gh` CLI is used for reads and the comment/Check writes. Private code stays on the runner.

## Known gaps (honest)

- Judged claims (behaviour descriptions with no identifier in the diff) are shown as *not checked* in this build; the deterministic tier decides the rest.
- Author attestation is drafted in the comment; confirming it requires the Work Loop web view, which is not part of this action yet.
- GitHub only today; GitLab is next.

Source-available, run-only license; see LICENSE.md. Feedback: open an issue here.
