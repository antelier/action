# Antelier

Checks what an AI coding agent's pull request **claims** against what its diff **actually changed**.

Every cited line resolves to bytes in the diff. Nothing is invented. One sticky comment per PR, updated in place on every push, and one Check run. Runs beside your code reviewer, not instead of it.

## Install in one step

Create `.github/workflows/antelier.yml`:

```yaml
name: Antelier claim check
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
      - uses: huyn7539/antelier-action@v0
```

That is all. No account, no key, no server. The next pull request gets a comment like:

> **Claim check for #42 — 5 of 8 claims checked · 4 present · 1 absent**
> **Needs your eyes:** "Updated the `scripts` block in `package.json` …" is ABSENT — file not matched.

A real example on a six-file Copilot change: [huyn7539/vscode#1](https://github.com/huyn7539/vscode/pull/1) (a fork of microsoft/vscode with the upstream PR replayed onto it).

The headline always says how many of the PR's claims could be decided. Sentences that describe the situation before the change, or why it was made, are context, not claims: they are listed under the table and never labelled.

Each claim in the PR description gets one row and one label:

| Label | Meaning |
|---|---|
| `present` | the described change is in the diff at the cited hunk |
| `partial` | some of it is |
| `absent` | nothing in the diff corresponds |
| `contradicted` | the diff does the opposite of what the description says |
| `not checkable` | cannot be decided from the diff (test runs, CI, performance, intent) |

Claims about test runs, CI results or performance are never guessed. They are shown as not checkable so a person decides.

## Why

Agents write confident PR descriptions. Reviewers read the description first and the diff second, if at all. A description that says "added tests" when the diff added none is the failure this catches. The comment gives the reviewer the one thing to look at before trusting the rest.

## What it needs

Only the workflow's own `GITHUB_TOKEN`. The runner's `gh` CLI is used for reads and for the comment and Check writes. Your code never leaves the runner.

## What it does not do (yet)

- It does not review code quality or find bugs. Use it beside CodeRabbit, Copilot code review, Greptile or your own reviewers.
- Judged claims (behaviour descriptions with no identifier in the diff) are shown as *not checked* in this build. The deterministic tier decides the rest.
- Author attestation is drafted in the comment. Confirming it needs the Antelier web view, which is not part of this action yet.
- GitHub only today. GitLab is next.
- If the PR has merge conflicts, GitHub runs no pull-request workflows at all, so Antelier stays silent. Resolve the conflict and push.
- On a push to the default branch it posts a Check only (no commit comment), so the workflow never needs `contents: write`.

Measured on 30 external agent PRs (oxc, next.js, home-assistant, vscode and others) against a two-labeller golden set: present precision 0.76, absent precision 1.0, contradicted precision 1.0, fabricated citations 0. Methodology and numbers will be published with each release.

Source-available, run-only license; see LICENSE.md. Feedback: open an issue here.
