# Coupled native-gas liability reconciliation v1

## Purpose

This source-only contract classifies how one exact open Buy VOID native-gas
liability should be accounted after one exact terminal native transaction cost
has been proven by
`VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1`.

It does **not** mutate the durable open-liability store and does not authorize
release of native wei. It produces deterministic accounting evidence for a
later payer-serialized mutation layer.

## Inputs

The classifier consumes exactly:

- one canonical open
  `VOID_COUPLED_NATIVE_GAS_LIABILITY_V1` record; and
- one successful terminal-cost evidence record from the merged terminal-cost
  contract.

The open-liability identity is independently rederived from every economic
field. The terminal-cost evidence content address and arithmetic are also
rederived rather than trusting caller booleans.

The two records must bind exactly on:

- liability ID;
- obligation ID;
- payer address;
- nonce;
- transaction-plan fingerprint; and
- maximum reserved wei.

The terminal evidence must retain the reviewed false authority boundary:
no release, mutation, or funds movement.

## Attempt accounting

One reviewed attempt envelope is:

```text
one_attempt_maximum_wei =
  transaction_native_value_wei
  + gas_limit * admitted_max_fee_per_gas_wei
```

The open liability must satisfy:

```text
maximum_reserved_wei =
  one_attempt_maximum_wei * attempt_limit
```

where V1 admits only attempt limits 1 or 2.

The terminal evidence proves the exact cost of one completed attempt:

```text
actual_consumed_wei =
  gas_used * effective_gas_price
  + confirmed_native_value_consumed
```

with reverted native-value consumption equal to zero.

## Confirmed outcome

A confirmed transfer is terminal for this liability generation.

Therefore:

```text
remaining_attempt_allowance = 0
retained_future_attempt_reserve_wei = 0
next_open_reserved_wei = 0

unused_reserve_release_candidate_wei =
  maximum_reserved_wei - actual_consumed_wei
```

Even here, `liability_release_authorized=false`. A later store writer must
re-read the exact payer domain and persist reviewed reconciliation evidence
before any reserve accounting changes.

## Reverted outcome

A reverted transaction is a completed attempt, but it may still have reviewed
future-attempt capacity.

For `attempt_limit=2`, exactly one full future attempt envelope remains:

```text
remaining_attempt_allowance = 1
retained_future_attempt_reserve_wei = one_attempt_maximum_wei
next_open_reserved_wei = one_attempt_maximum_wei
```

The first attempt's actual gas consumption is retired from the old reserve and
its unused headroom may be classified as a future release candidate:

```text
unused_reserve_release_candidate_wei =
  maximum_reserved_wei
  - actual_consumed_wei
  - retained_future_attempt_reserve_wei
```

For `attempt_limit=1`, no reviewed retry envelope remains:

```text
remaining_attempt_allowance = 0
next_open_reserved_wei = 0
additional_attempt_requires_new_liability = true
```

The broadcast journal's generic `retry_allowed=true` does not mint native-gas
capacity. Any additional attempt must first obtain a newly reviewed native-gas
liability.

This contract never authorizes retry execution itself.

## Why not keep the entire old liability after revert?

Keeping already-consumed wei permanently reserved would double-count native
balance that has already been spent. Releasing every unconsumed wei would be
equally wrong when a second attempt envelope was explicitly reserved.

V1 therefore separates:

- actual consumed reserve;
- whole still-authorized future-attempt reserve; and
- unused completed-attempt headroom.

Only the last category is a release **candidate**, never release authority.

## HOLD conditions

The classifier HOLDS on, among other cases:

- malformed or noncanonical open liability;
- invalid liability content address;
- liability envelope arithmetic mismatch;
- malformed terminal-cost evidence;
- altered terminal-cost authority flags;
- liability/evidence payer, nonce, plan, obligation, or ID mismatch;
- altered terminal evidence content address;
- gas-used mismatch against the exact liability gas limit;
- effective gas price above the admitted cap;
- gas-cost or native-value-consumption arithmetic mismatch;
- confirmation-depth mismatch;
- actual consumption above the reserved envelope; or
- a retained future attempt envelope larger than the unconsumed reserve.

## Authority boundary

`VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1` keeps false:

- durable open-liability store binding;
- liability-store mutation;
- liability release;
- retry execution;
- WC/VOID reconciliation;
- runtime integration;
- live balance or fee observation;
- RPC read/write;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 mutation;
- activation;
- inventory, treasury, or liquidity movement; and
- funds movement.

A later durable reconciliation writer must operate under the same payer-scoped
serialization domain as the open-liability store, re-read authoritative state,
persist append-only reconciliation evidence, and postcheck the resulting reserve
floor before any release can become authoritative.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_liability_reconciliation_v1.ts
```

The proof covers:

- confirmed attempt-limit-1 accounting;
- reverted attempt-limit-1 accounting requiring a new liability for retry;
- reverted attempt-limit-2 accounting retaining exactly one full future
  attempt envelope;
- confirmed attempt-limit-2 terminal close classification;
- liability identity tampering;
- terminal evidence arithmetic tampering;
- terminal gas mismatch;
- terminal evidence authority tampering;
- terminal evidence content-address tampering; and
- all mutation/release/runtime/funds authority remaining false.
