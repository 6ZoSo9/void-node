# DataNet Content Commitment Pre-Sign Revalidation v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1`

Status: source-only read-only dynamic transaction binding. This lane does not access a signer or wallet, sign, broadcast, mutate Chain-2050, change validators/governance/WC, restart services, or move funds.

## Purpose

The unsigned call plan intentionally leaves nonce, gas, and fees unbound.

This gate binds those dynamic fields only after fresh Chain-2050 revalidation, while still refusing signing authority.

## Exact plan admission

The gate rebuilds the exact unsigned call plan from the full hardened evidence chain and requires canonical equality with the supplied plan.

A copied plan ID alone is insufficient.

## Two-sided freshness wall

The gate runs the hardened object preflight twice.

Between the two preflights it takes two pending-state snapshots of:

- publisher pending nonce;
- gas price;
- pending gas estimate for the exact registry commit call; and
- publisher pending native balance.

For the canonical Epoch-2 execution model, **both** in-window gas-price
observations must be exactly zero. A nonzero observation is policy drift and
HOLDs the lane. The balance is still observed and lineage-bound, but a positive
native balance is not required because the exact maximum native gas cost is
zero.

The second snapshot is the dynamic binding source for gas, fee, and balance checks. Only after both snapshots does the gate run the second hardened preflight.

After that final hardened preflight, it re-reads the publisher pending nonce once more. The nonce must match both in-window snapshots and the post-preflight read.

This ordering matters: the second hardened preflight proves the object is still uncommitted after the gas/fee/balance binding window, while the final nonce read catches a pending-nonce race across that preflight.

## Fee policy

V1 does not silently inherit Buy-VOID production limits.

The caller supplies an explicit closed DataNet fee policy. On current Epoch-2
main that policy is exact, not merely capped:

- `max_fee_per_gas_wei=0`;
- `max_priority_fee_per_gas_wei=0`;
- `max_total_gas_cost_wei=0`.

Gas remains metered. The gas-limit multiplier and maximum gas limit stay bounded,
the pending estimate must remain positive, and the resulting gas limit must stay
within policy. The fee multiplier remains part of the content-addressed policy
for continuity, but with observed gas price zero the computed max fee is exactly
zero.

Request timeout and response bytes remain bounded. Any nonzero fee/cost policy
or nonzero in-window gas-price observation HOLDs.

## Unsigned transaction candidate

GREEN may materialize a type-2 unsigned candidate containing:

- Chain ID 2050;
- stable pending nonce;
- exact publisher;
- exact registry;
- zero native value;
- exact commit calldata;
- bounded positive gas limit;
- exact zero max fee; and
- exact zero priority fee.

It is still unsigned and grants no signer access.

## Remaining signer boundary

Even GREEN sets:

`signer_identity_bound=false`

`signer_access_authorized=false`

`transaction_signing_authorized=false`

`transaction_broadcast_authorized=false`

The next lane must bind the exact publisher signer identity and re-run freshness immediately before signing. This pre-sign result is evidence, not a bearer authorization.

## Next gate

`bind_exact_publisher_signer_identity_then_revalidate_immediately_before_signing`
