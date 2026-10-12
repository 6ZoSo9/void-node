# Dual-source quote relative freshness gate v1

Marker: `VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1`

## Problem

The conservative reducer rejects quotes that are expired at `evaluated_at`, but expiry alone is not a freshness guarantee. A source can present an old observation with an unusually long expiry timestamp. That quote remains formally unexpired while no longer representing a timely market observation.

## Boundary

This gate consumes four supplied values:

1. the exact dual-source reducer input;
2. its exact conservative reducer receipt;
3. its input-bound derivation-verification envelope;
4. a maximum relative quote age between 0 and 3,600 seconds.

It first repeats complete input-bound receipt and verification-envelope checks. It then computes each quote age as the ceiling of:

```text
evaluated_at - observed_at
```

The gate fails closed when either age exceeds the supplied policy.

## Evidence honesty

This is **relative** freshness only. `evaluated_at` is supplied evidence and is not authenticated against a trusted wall clock. The receipt therefore fixes:

```text
relative_freshness_verified=true
evaluation_clock_authenticated=false
wall_clock_freshness_verified=false
source_identity_authenticated=false
```

A later runtime acquisition lane may bind evaluation time to a trusted clock and provider identity. This source-only gate does not claim either property.

## Integrity

The receipt binds:

- the source-input digest;
- reducer-receipt digest;
- derivation-verification digest;
- evaluation instant;
- configured maximum age;
- both source quote identities and conservative ceiling ages;
- maximum observed quote age;
- explicit non-execution and non-authentication boundaries.

Receipt verification reparses the closed shape, validates its content digest, recomputes the complete gate from the original evidence and policy, and requires exact canonical equality. Recomputing an unkeyed digest after changing an age does not forge valid input-bound freshness evidence.

## Non-authority

A green relative-freshness receipt does not authenticate a provider, prove current wall-clock freshness, demonstrate liquidity or fills, authorize trading, access a wallet, construct a transaction, submit a transaction, deploy code, write Work Credits, or move funds.
