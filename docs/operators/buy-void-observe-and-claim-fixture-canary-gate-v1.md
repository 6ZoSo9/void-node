# Buy VOID observe-and-claim fixture canary gate V1

## Current live finding

The read-only server-derived probe found two request IDs and zero requests
eligible for the `observe_and_claim` stage. Therefore this lane does not arm a
live request.

## Purpose

This fixture-only gate defines the exact one-request canary boundary that will
be used when a future server-derived request becomes eligible. It is not
imported by the live runtime and cannot perform a stage transition.

## Default posture

- Fixture-only
- Live activation unmounted
- Gate disabled
- Enabled stage count: 0
- Exact request allowlist count: 0
- Candidate stage: `observe_and_claim`
- Maximum successful canary mutations: 1
- Automatic retry: false
- No background loop
- No startup execution
- No filesystem write
- No inventory reservation
- No execution-attempt reservation
- No wallet access
- No signing
- No transaction broadcast
- No RPC mutation
- No money movement

## Arming contract

A future live canary requires a separate reviewed lane that binds exactly one
server-derived request ID and keeps the stage allowlist fixed to
`observe_and_claim`.

The caller must echo:

- The exact server-derived activation-plan fingerprint
- The orchestrator confirmation
- The delegated auto-claim confirmation
- The `observe_and_claim` stage confirmation
- The canary confirmation

The gate must auto-disable after one successful mutation or any terminal or
uncertain outcome. Append-only journals must be preserved.

## Hard-forbidden stages

The fixture canary cannot authorize:

- `reserve_inventory_and_attempt`
- `execute_reserved_plan`
- `reconcile_possible_broadcast`
- `closeout_confirmed_delivery`

## Fixture evidence

The example fixture records the current zero-candidate state and the controls
required before a one-request live canary can be considered.
