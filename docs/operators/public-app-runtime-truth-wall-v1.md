# Public App Runtime Truth Wall v1

## Purpose

The public composition gateway previously reduced every strict-readiness failure
to the browser label `Degraded`. That was honest but incomplete when the node
was synchronized, had its expected peer mesh, and was intentionally running
with txroot persistence quarantined.

This wall preserves strict readiness while introducing a distinct public
runtime state:

- `ready`: all strict readiness conditions are green.
- `restricted_ready`: chain and expected peer mesh are synchronized, all public
  telemetry sources are available, and the only failing strict condition is
  the declared txroot safety quarantine.
- `degraded`: telemetry is available, but neither ready classification applies.
- `unavailable`: one or more required telemetry sources are unavailable.

`restricted_ready` is never promoted to `ready`.

## Browser behavior

The injected compatibility script requests only:

`/__void/public-app/network.json`

It does not request account Wallet, Earn, WC, job, receipt, RPC, upgrade, or
operator routes. In restricted-ready mode the browser displays:

- `Synchronized`
- `Synchronized · quarantined`
- an explicit txroot safety-quarantine explanation

## Deployment boundary

Merging this wall performs no live deployment. Updating the live service later
requires restarting only the composition gateway. The node, Public Earn
Gateway, Funnel target, chain state, and money lanes remain unchanged.
