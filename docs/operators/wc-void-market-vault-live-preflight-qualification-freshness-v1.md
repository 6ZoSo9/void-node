# WC/VOID market-vault live-preflight qualification freshness v1

Tracks #2225.

The market-vault role/deployment qualification embeds the bounded
launch-controller proof-of-control window:

```text
verified_at_unix
reverified_at_unix
valid_until_unix
```

The live deployment observation preflight must not convert that short-lived
control proof into an indefinitely reusable deployment-preparation credential.

## Production rule

Before any Chain-2050 RPC observation, the live preflight now requires:

```text
verified_at_unix <= reverified_at_unix < valid_until_unix
reverified_at_unix <= current_wall_clock_unix < valid_until_unix
```

At or after `valid_until_unix`, the result is:

```text
HOLD
reason=live_deployment_preflight_launch_controller_control_expired
```

and **zero RPC calls** are permitted.

Production evaluation time comes from the process wall clock inside
`observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(...)`. A caller cannot
extend qualification life by supplying an evaluation time.

The test-only observer has a deterministic explicit evaluation-time seam so the
expiry boundary can be proved without a time-dependent CI fixture.

## Operational consequence

A qualification is current only while all of these are simultaneously true:

1. its exact source head/tree still equal canonical current main;
2. its reviewed qualification/dependency bytes still match;
3. its launch-controller proof-of-control window has not expired.

If the control window expires before the production RPC/deployer/inventory
observation is ready, create a new challenge, obtain a fresh offline control
signature, verify new control evidence, and generate a new current-head
qualification. Do not extend or rewrite the old artifact.

This freshness wall does not authorize deployer selection, transaction
construction/signing/broadcast, deployment, inventory funding, market/presale
activation, token transfer, or funds movement.
