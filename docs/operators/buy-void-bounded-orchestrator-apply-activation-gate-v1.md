# Buy VOID bounded orchestrator apply activation gate V1

## Purpose

This lane adds a reviewable activation boundary around the bounded Buy VOID
orchestrator. It does not enable any stage.

The runtime continues to derive lifecycle state from server-owned request and
journal records. A dry-run response now includes a deterministic activation
plan and SHA-256 fingerprint. An apply request can be validated against that
server-derived plan, but the production runtime policy remains disabled with
an empty stage allowlist and no execution bridge.

## Default posture

- Activation gate disabled
- Enabled stage count: 0
- Client-supplied snapshots forbidden
- Client-supplied activation policies forbidden
- Request-ID-only selector
- One request per invocation
- One stage transition per invocation
- No automatic retry
- No background loop
- No startup execution
- No filesystem write by the gate
- No RPC call by the gate
- No wallet access
- No signing
- No transaction broadcast
- No money movement

## Server-derived activation plan

The fingerprint binds:

- Request ID
- Server-derived lifecycle snapshot
- Append-only operator-event evidence
- Selected orchestrator stage
- Stage command
- Required orchestrator confirmation
- Required delegated confirmation
- Required stage confirmation

Changing the request state, selected stage, or stage command changes the plan
fingerprint.

## Candidate stages

The gate defines confirmations for two non-money candidates:

- `observe_and_claim`
- `reserve_inventory_and_attempt`

They remain disabled and absent from the production allowlist in V1.

## Hard-forbidden stages

The non-money activation gate cannot authorize:

- `execute_reserved_plan`
- `reconcile_possible_broadcast`
- `closeout_confirmed_delivery`

These stages require separate future lanes because they involve transaction
execution, post-broadcast state, or terminal inventory/public closeout.

## Runtime behavior

Dry-run command:

```json
{
  "action": "run_bounded_auto_fulfillment_stage",
  "request_id": "buyvoid_...",
  "stage_command": {
    "action": "verify_and_claim",
    "request_id": "buyvoid_..."
  }
}
```

The response includes `apply_activation.plan.plan_fingerprint_sha256`.

An apply request may echo the plan fingerprint and all confirmations, but V1
still returns `apply_activation_gate_disabled`. No delegated stage command is
executed.

## Future activation rule

A later activation change must be a separate reviewed lane that changes the
server-owned policy from zero enabled stages. It must not simultaneously
enable native execution, delivery, or confirmed closeout.
