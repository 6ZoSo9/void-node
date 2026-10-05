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
field. The terminal-cost evidence full content address, stable terminal-cost
accounting identity, and arithmetic are also independently rederived rather than
trusting caller booleans.

The full terminal-cost `evidence_id` remains freshness-sensitive because it
contains the current observed block and confirmation count. The durable
reconciliation therefore does **not** embed that volatile observation ID. It
embeds `terminal_cost_identity_sha256`, which binds the immutable terminal
transaction/receipt/cost facts and is independently rederived from the evidence.
As a result, re-observing the same confirmed transaction at a later block can
produce a newer `evidence_id` while producing the exact same canonical
reconciliation bytes and `reconciliation_id`.

That rederivation proves internal consistency only. This classifier does not
re-read the terminal-outcome store, does not obtain a fresh receipt from an
authenticated transport, does not independently observe the current block, and
does not establish the provenance of a caller-supplied terminal-cost evidence
object. A later durable reconciliation writer must re-observe or bind
authenticated terminal evidence before treating any reserve-release candidate
as authoritative.

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

The open-liability schema can represent attempt limits 1 or 2, but the
currently reviewed Buy VOID admission path creates only `attempt_limit=1`.
This V1 reconciliation contract therefore requires exactly one attempt.
A valid two-attempt liability HOLDS with
`coupled_native_gas_reconciliation_attempt_limit_not_supported` until a
separate attempt-ordinal/progression authority proves which attempt the
terminal evidence belongs to and how much retry capacity remains.

For the accepted V1 case:

```text
maximum_reserved_wei = one_attempt_maximum_wei
attempt_limit = 1
```

The terminal evidence proves the exact cost of that one completed attempt:

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
additional_attempt_requires_new_liability = true

unused_reserve_release_candidate_wei =
  maximum_reserved_wei - actual_consumed_wei
```

Even here, `liability_release_authorized=false`. A later store writer must
re-read the exact payer domain and persist reviewed reconciliation evidence
before any reserve accounting changes. Because this liability is terminal and
retains no future attempt allowance, any later transaction attempt must first
obtain a distinct newly admitted liability.

## Reverted outcome

A reverted transaction is fail-closed in V1 reconciliation.

The broadcast journal still carries `retry_allowed=true`, while the current
coordination layer does not yet define whether the obligation should be retried,
manually recovered, cancelled, re-funded, or otherwise disposed. A one-attempt
native-gas liability proves only the maximum envelope admitted for that attempt;
it does not authorize closing the obligation or releasing the unused remainder.

Therefore a valid reverted terminal-cost record returns:

```text
HOLD = coupled_native_gas_reconciliation_reverted_disposition_unresolved
```

V1 emits no reserve-release candidate, no terminal-close candidate, and no
new-liability requirement for a reverted outcome.

A later reviewed disposition contract must explicitly bind retry/manual-recovery
state before any reverted liability can be reconciled. Any future multi-attempt
version must additionally bind exact attempt ordinal/progression evidence.

## HOLD conditions

The classifier HOLDS on, among other cases:

- malformed or noncanonical open liability;
- invalid liability content address;
- liability envelope arithmetic mismatch;
- malformed terminal-cost evidence;
- altered terminal-cost authority flags;
- liability/evidence payer, nonce, plan, obligation, or ID mismatch;
- altered terminal evidence content address;
- altered stable terminal-cost accounting identity;
- gas-used mismatch against the exact liability gas limit;
- effective gas price above the admitted cap;
- gas-cost or native-value-consumption arithmetic mismatch;
- confirmation-depth mismatch;
- actual consumption above the reserved envelope; or
- any open liability with `attempt_limit != 1` in this V1 reconciliation contract; or
- any reverted terminal outcome until retry/manual-recovery disposition is reviewed.

## Authority boundary

`VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1` keeps false:

- reverted reconciliation authority;
- reverted retry/manual-recovery disposition authority;
- authenticated terminal-cost evidence provenance;
- terminal-outcome storage re-read;
- authenticated raw-receipt transport;
- trusted current-block observation;
- trusted minimum-confirmation policy;
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
authenticate or independently re-observe the terminal receipt and confirmation
depth, require the fresh observation to reproduce the same stable terminal-cost
identity/canonical reconciliation, persist append-only reconciliation evidence,
and postcheck the resulting reserve floor before any release can become
authoritative. It must not require a later observation's volatile
`evidence_id` to equal an earlier one merely because the chain head advanced.
The `unused_reserve_release_candidate_wei` field is never sufficient evidence
by itself.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_liability_reconciliation_v1.ts
```

The proof covers:

- confirmed attempt-limit-1 accounting;
- reverted attempt-limit-1 HOLD while retry/manual-recovery disposition is unresolved;
- explicit HOLD for a cryptographically valid attempt-limit-2 liability;
- liability identity tampering;
- terminal evidence arithmetic tampering;
- terminal gas mismatch;
- terminal evidence authority tampering;
- terminal evidence content-address tampering;
- stable terminal-cost identity tampering;
- later confirmation-depth re-observation changing the full evidence ID while
  preserving byte-identical reconciliation output; and
- all mutation/release/runtime/funds authority remaining false.
