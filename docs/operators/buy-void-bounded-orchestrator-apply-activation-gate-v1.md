# Buy VOID bounded orchestrator apply activation gate V1

## Purpose

This gate provides a reviewable, server-controlled activation boundary around
the bounded Buy VOID orchestrator.

The production default remains disabled with an empty allowlist. The runtime
execution bridge is now mounted in source, but it can apply only two non-money
stages and only after a deterministic plan and exact confirmations authorize
one transition.

This source lane does not configure a host, invoke apply, deploy, restart a
service, access a wallet, sign, broadcast, or move funds.

## Default posture

- Activation disabled
- Default enabled stage count: 0
- Client-supplied snapshots forbidden
- Client-supplied activation policies forbidden
- Request-ID-only selector
- One request per invocation
- One stage transition per invocation
- No automatic retry
- No background loop
- No startup execution
- No wallet access
- No signing
- No transaction broadcast
- No money movement

## Server-derived activation plan

The SHA-256 fingerprint binds:

- request ID;
- server-derived lifecycle snapshot;
- append-only operator-event evidence;
- selected orchestrator stage;
- stage command;
- required orchestrator confirmation;
- required delegated confirmation;
- required stage confirmation.

Changing any bound value produces a different fingerprint.

## Candidate stages

The only server-policy candidates are:

- `observe_and_claim`
- `reserve_inventory_and_attempt`

Both remain disabled unless the server apply flag is true and the exact stage is
present in the server allowlist.

## Hard-forbidden stages

This gate cannot authorize:

- `execute_reserved_plan`
- `reconcile_possible_broadcast`
- `closeout_confirmed_delivery`

These stages remain outside the bridge because they involve wallet/native
execution, post-broadcast reconciliation, or terminal delivery closeout.

## Runtime configuration

Server-only flag:

`VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ENABLED`

Server-only comma-separated allowlist:

`VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ALLOWED_STAGES`

Invalid allowlist values fail closed. Enabling the flag with an empty allowlist
also fails closed. Request bodies containing `activation_policy`,
`allowed_stages`, or `enabled_stages` are rejected.

## Apply sequence

1. Derive the lifecycle snapshot from server-owned request and journal records.
2. Run the orchestrator in dry mode.
3. Build the deterministic activation plan.
4. Return the plan fingerprint and exact confirmations.
5. Receive a separate apply request echoing all bindings.
6. Re-derive and re-evaluate the plan.
7. Authorize only an allowlisted non-money stage.
8. Delegate exactly one stage transition.
9. Reject any result reporting wallet, signing, broadcast, or money authority.

## Operational truth

The source bridge is mounted, but disabled by default. Merging this code does
not set the server policy, enable a runtime, deploy a service, or apply any
request. Those actions remain separately reviewed operator gates.
