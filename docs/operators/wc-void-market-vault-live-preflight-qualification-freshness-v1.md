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

The live preflight applies the same control-freshness window twice: once before
any Chain-2050 RPC observation and again after the fixed-block / pending-nonce
revalidation immediately before any production preflight material or
`preflight_id` is constructed.

Both checks require:

```text
verified_at_unix <= reverified_at_unix < valid_until_unix
reverified_at_unix <= current_wall_clock_unix < valid_until_unix
```

At either boundary, at or after `valid_until_unix`, the result is:

```text
HOLD
reason=live_deployment_preflight_launch_controller_control_expired
```

Before the first boundary, **zero RPC calls** are permitted. If the qualification
is fresh when observation begins but expires while RPC observation is in flight,
the RPC reads may already have occurred, but the second boundary returns HOLD
before a production preflight artifact or ID is minted.

Production evaluation time comes from the process wall clock inside
`observeVoidWcVoidMarketVaultLiveDeploymentPreflightV1(...)`. The initial and
final wall-clock reads are internal; a production caller cannot extend
qualification life by supplying either time.

The test-only observer has deterministic explicit initial/final evaluation-time
seams so CI proves both expiry before RPC and expiry after a full valid RPC
observation but before artifact mint.

## Operational consequence

A qualification is current only while all of these are simultaneously true
through the **entire observation and artifact-mint boundary**:

1. its exact source head/tree still equal canonical current main;
2. its reviewed qualification/dependency bytes still match;
3. its launch-controller proof-of-control window has not expired at observation
   start; and
4. that same control window remains unexpired after RPC revalidation immediately
   before artifact mint.

If the control window expires before the production RPC/deployer/inventory
observation is ready, create a new challenge, obtain a fresh offline control
signature, verify new control evidence, and generate a new current-head
qualification. Do not extend or rewrite the old artifact.

This freshness wall does not authorize deployer selection, transaction
construction/signing/broadcast, deployment, inventory funding, market/presale
activation, token transfer, or funds movement.
