# VOID CI cost boundary v1

`VOID_CI_COST_BOUNDARY_V1` prevents a workflow change from silently expanding
reviewed GitHub Actions cost or pull-request fan-out.

## Runner boundary

The checker accepts only the reviewed direct runner assignments:

- `ubuntu-latest`
- `ubuntu-22.04`
- `ubuntu-24.04`
- the exact two-value `ubuntu-22.04` / `ubuntu-24.04` matrix in
  `.github/workflows/public-release-qualification-v1.yml`.

Other literal runner labels, dynamic expressions, inline runner-label lists,
empty values, and multiline runner groups fail closed. The current checker does
not grant a generic self-hosted exception.

## Pull-request fan-out non-expansion

The repository already contains legacy workflows with broad `pull_request`
triggers and many workflows that explicitly watch the shared
`public/public-node/index.json` root index. A single root-index edit can
therefore fan out into dozens of Actions runs. On 2026-09-30, direct repository
census found 37 workflow files containing that shared root-index dependency.

This guard does not rewrite or disable those existing workflows. Instead, on a
pull request or main-branch push it compares every changed workflow with the
base commit and fails closed when a change:

- turns a previously scoped/non-PR workflow into a repository-wide
  `pull_request` or `pull_request_target` trigger; or
- adds a new pull-request `paths` dependency on
  `public/public-node/index.json` when the prior trigger did not already cover
  that path.

Existing broad triggers may remain broad or narrow. Existing root-index
dependencies may remain or be removed. A broad trigger narrowed to the root
index is allowed because it reduces, rather than expands, fan-out.
`paths-ignore` without an explicit `paths` list remains broad for this
boundary. Renaming a broad/root-index workflow is treated as a new destination
and therefore requires explicit review.

The checker also reports the current repository-wide counts of broad
pull-request workflows and root-index pull-request dependencies for visibility;
those counts are observations, not a frozen allowlist.

## Commands

Runner and repository census:

```bash
python3 scripts/check_void_ci_cost_boundary_v1.py --self-test
python3 scripts/check_void_ci_cost_boundary_v1.py --repo-root .
```

Changed-workflow trigger comparison against an exact base commit:

```bash
python3 scripts/check_void_ci_cost_boundary_v1.py \
  --repo-root . \
  --base-ref <40-character-base-sha>
```

The GitHub workflow supplies the pull-request base SHA or push-before SHA with a
full-history checkout. Manual `workflow_dispatch` runs perform the runner and
repository census without a base comparison.

## Scope

This guard inspects tracked workflow YAML and local Git history only. It does
not query billing APIs, create budgets, execute paid external services, alter
workflow schedules, deploy, restart services, access wallets/signers, write
Work Credits, submit transactions, or move funds.

It is a non-expansion wall, not a claim that the current CI topology is already
minimal. Reducing the existing fan-out can be reviewed separately in smaller
workflow-family changes.
