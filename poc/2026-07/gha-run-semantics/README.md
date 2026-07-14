# GitHub Actions run-conclusion semantics: skip, partial-skip, and continue-on-error

Three tiny `workflow_dispatch`-only workflows that pin down exactly how GitHub
Actions rolls job/step results up into the overall **run conclusion**. Each
workflow is intentionally minimal (a handful of lines) so the only thing being
tested is the semantics, not application logic.

## Why this matters

If you build any tooling that reads a workflow **run**'s `conclusion` field
(dashboards, bots, release gates, "did CI pass" checks), you need to know how
GitHub folds job-level and step-level outcomes into that single value. The
GitHub Actions docs describe this only informally. These three experiments
give a direct, reproducible answer, and the JSON captured from each run is
kept alongside this README so the claims below aren't just assertions.

## Experiments

### 1. Partial skip (`poc-2026-07-gha-partial-skip.yml`)

Two independent jobs in the same run:

- `gated`: gated by `if: false`, so it never executes → job conclusion `skipped`
- `sibling`: runs normally and succeeds → job conclusion `success`

**Question**: when one job in a run is skipped and another succeeds, what is
the *run*-level conclusion?

**Result**: run conclusion = **`success`**. A skipped sibling job does not
drag the run down — only executed jobs are considered for the run rollup.

### 2. All skipped (`poc-2026-07-gha-all-skip.yml`)

A single job gated by `if: false`. The job never executes.

**Question**: when *every* job in a run is skipped, what is the run
conclusion?

**Result**: run status/conclusion = **`skipped`**. With no executed job to
roll up from, the run itself reports as skipped rather than success or
failure.

### 3. `continue-on-error` (`poc-2026-07-gha-continue-on-error.yml`)

A single job with a step that fails (`exit 1`) but is marked
`continue-on-error: true`, followed by a step that inspects
`steps.<id>.outcome` / `steps.<id>.conclusion`, followed by a step that just
proves execution continued past the failure.

**Question**: does a `continue-on-error` step's failure show up anywhere, and
does it affect the job/run conclusion?

**Result**:
- The failed step's `outcome` = `failure`, but its `conclusion` = `success`
  (this is the documented distinction: `outcome` is what actually happened,
  `conclusion` is what happened *after* `continue-on-error` is applied).
- The job — and therefore the run — conclusion is **`success`**. Downstream
  steps in the same job execute normally, since the job doesn't see a failure
  once `continue-on-error` rewrites the step's conclusion.

## Reproduce it yourself

Each workflow lives in `.github/workflows/` of this repository and only
triggers on `workflow_dispatch` (no `push`/`schedule`), so it will never run
on its own — you have to fire it explicitly and it will not interfere with
this repository's normal GitHub Pages build.

```bash
# Trigger
gh workflow run poc-2026-07-gha-partial-skip.yml --repo <owner>/<repo>
gh workflow run poc-2026-07-gha-all-skip.yml --repo <owner>/<repo>
gh workflow run poc-2026-07-gha-continue-on-error.yml --repo <owner>/<repo>

# Find the run ID, then inspect it
gh run list --workflow poc-2026-07-gha-partial-skip.yml --repo <owner>/<repo> --limit 1
gh run view <RUN_ID> --repo <owner>/<repo> --json conclusion,status,jobs
```

## Evidence

Run URLs and the raw `gh run view --json conclusion,status,jobs` output
captured for each experiment are in this directory:

| Experiment | Run URL | Result | Raw JSON |
|---|---|---|---|
| Partial skip | https://github.com/shimajima-eiji/shimajima-eiji.github.io/actions/runs/29347655730 | run conclusion `success` | [`partial-skip.json`](./partial-skip.json) |
| All skip | https://github.com/shimajima-eiji/shimajima-eiji.github.io/actions/runs/29347661535 | run conclusion `skipped` | [`all-skip.json`](./all-skip.json) |
| continue-on-error | https://github.com/shimajima-eiji/shimajima-eiji.github.io/actions/runs/29347667082 | run conclusion `success`, step `outcome=failure`/`conclusion=success` | [`continue-on-error.json`](./continue-on-error.json), [`continue-on-error-log-excerpt.txt`](./continue-on-error-log-excerpt.txt) |

All three runs are public (this repository is public) and viewable without
being logged in to GitHub.
