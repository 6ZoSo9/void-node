# Buy VOID payment-keyed runtime preflight v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1`

Status: source-only server binding. This module is not mounted in the parent
runtime and cannot sign or broadcast.

## Purpose

Convert a single server-selected execution-attempt ID into the exact inputs
required by the merged payment-keyed execution composition without accepting
saga identity, inventory reservation identity, fulfillment call, transaction
plan, raw transaction bytes, signer, broadcaster, or RPC policy from a future
operator caller.

Production defaults read the existing durable execution-attempt, fulfillment,
and inventory journals.

## Server-derived identities

For an exact reserved/clean execution attempt, the preflight:

1. finds exactly one matching fulfillment intent;
2. finds exactly one matching inventory reservation under the server policy;
3. uses that inventory reservation ID as the plan-reservation authority;
4. reconstructs the deterministic crash-consistent saga binding and saga ID;
5. runs the existing source-finality execution preflight;
6. builds the canonical payment-keyed Chain-2050 fulfillment call; and
7. invokes the merged payment-keyed execution composition in dry-run mode.

The proof deliberately supplies forged extra caller-style `saga_id` and
`plan_reservation_id` properties. They are ignored; the returned values are
derived from server state.

## Server policy contract

This module receives a server-owned policy object rather than a caller policy.
It requires:

- the canonical saga/economic policy;
- one canonical fulfillment wallet in that saga policy;
- the Chain-2050 payment-keyed transaction-preparation policy;
- an exact fulfillment contract;
- the maximum VOID amount equal to the canonical saga reservation cap.

The transaction-preparation policy is independently validated and bound into a
preflight policy fingerprint.

A later runtime adapter can construct this server-owned policy from environment
or another reviewed server configuration source. This PR deliberately does not
choose or mount that runtime configuration surface.

## Source-finality boundary

The canonical payment identity/key is not taken from the legacy local execution
reservation key. The existing source-finality preflight must return Ready before
the payment-keyed fulfillment call can be built.

Production uses the real source-finality preflight. Proof-only dependency
injection can substitute the observation so CI performs no live source-chain
RPC.

## Composition boundary

The merged payment-keyed execution composition is always called with
`apply=false`.

Therefore this module performs no:

- signer access;
- signing;
- durable submission claim;
- transaction broadcast;
- receipt acceptance;
- saga mutation;
- inventory mutation;
- public fulfillment closeout; or
- money movement.

The only RPC capability below this boundary is the already reviewed read-only
source-finality/planning surface.

## Next gate

After this server-derived preflight is independently proven, a later runtime
adapter may expose an attempt-ID-only loopback command behind default-off
server gates. Apply/broadcast must remain separate until crash-consistent saga
projection for the payment-keyed transaction path is reviewed.
