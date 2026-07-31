# VOID CI cost boundary v1

`VOID_CI_COST_BOUNDARY_V1` prevents a workflow change from silently selecting
an unreviewed GitHub Actions runner class.

## Enforced runner boundary

The checker currently accepts only runner assignments already reviewed for
this public repository:

- `ubuntu-latest`
- `ubuntu-22.04`
- `ubuntu-24.04`
- the exact two-value Ubuntu matrix in
  `.github/workflows/public-release-qualification-v1.yml`
- the exact manual self-hosted label set
  `[self-hosted, void-node, beta-proof]`

Every other literal runner label, dynamic expression, matrix value, inline
self-hosted label set, empty value, or multiline runner group fails closed.
Adding even another standard free runner requires an explicit review and
checker update; this is intentional.

The self-hosted beta workflow uses operator-owned hardware and is
`workflow_dispatch` only. It does not select a GitHub-hosted paid runner, but
an operator should still consider local electricity and machine use before
manually dispatching it.

## Command

```bash
python3 scripts/check_void_ci_cost_boundary_v1.py --self-test
python3 scripts/check_void_ci_cost_boundary_v1.py --repo-root .
```

## Scope

This guard checks direct `runs-on` assignments in tracked workflow YAML. It
does not query billing APIs, create budgets, inspect account payment settings,
execute a paid external service, or guarantee that arbitrary third-party
actions have no separate commercial terms.

For enforcement, make `CI Cost Boundary v1` a required pull-request check.
Repository administrators must separately review third-party actions,
credentials, cloud integrations, and manually dispatched self-hosted jobs.

The guard performs no deployment, service restart, wallet or signer access,
Work Credit write, payment execution, or fund movement.
