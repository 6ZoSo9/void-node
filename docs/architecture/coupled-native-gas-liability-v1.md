# Coupled native-gas liability classifier v1

Marker: `VOID_COUPLED_NATIVE_GAS_LIABILITY_V1`

Issue: #2460

## Purpose

This is the first current-generation source slice for the shared Chain-2050
native-gas liability boundary used by Buy VOID and the future WC/VOID settlement
lane.

It prevents one payer's observed native balance from being promised twice by
classifying a new Buy VOID gas liability against an exact census of already-open
liability records.

This file does **not** persist a journal, read a live RPC balance, observe live
fees, submit a transaction, or authorize either coupled launch surface.

## Current Buy VOID binding

A Buy VOID candidate must be the exact canonical
`VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1` shape.

The classifier independently re-derives:

- wallet key;
- transaction-template fingerprint;
- transaction-plan fingerprint; and
- reservation ID.

The liability then binds the already-reserved:

- payer wallet;
- nonce;
- transaction-plan fingerprint;
- gas limit; and
- maximum fee per gas.

The V1 liability reserves exactly:

```text
gas_limit * admitted_max_fee_per_gas_wei * 1 attempt
```

The current Buy VOID execution source does not authorize an automatic retry.
A later reviewed recovery/attempt policy must reserve any extra attempt allowance
**before** that allowance can consume the same payer balance. V1 does not
silently reserve or authorize a second attempt.

## Payer observation

`VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVATION_V1` is a pure,
content-addressed input packet containing:

- Chain ID 2050;
- exact payer address;
- observed native balance;
- required current max fee per gas;
- observation time;
- expiry; and
- source-evidence identity.

The classifier recomputes only the observation packet's time-window validity
from `now_ms`. It accepts no caller `fresh=true` boolean. The source does
not prove who selected that window or that it satisfies a production freshness
policy; `trusted_fee_freshness_policy_proven=false` remains explicit.

This packet is **not** proof that the balance, fee, time, or observation source
is live/trusted. Those remain later runtime evidence gates.

## Open-liability census

Every supplied record is canonicalized and re-derived. For one payer domain the
classifier:

1. rejects malformed or duplicate liability IDs;
2. sums every open liability, regardless of `presale` or `wc_void` lane;
3. rejects an existing reserve floor above the observed balance;
4. rejects obligation, transaction-plan, or nonce conflicts;
5. treats only an exact same liability ID as idempotent replay; and
6. requires:

```text
reserved_before + candidate_max_liability <= observed_native_balance
```

A structurally valid WC/VOID open liability can therefore consume capacity in
the shared payer domain now, but this module does not create a new WC/VOID
candidate.

## WC/VOID boundary

`classifyCoupledNativeGasWcVoidAdmissionV1()` always HOLDS with:

```text
coupled_native_gas_wc_void_settlement_plan_not_reviewed
```

That is intentional. Current source does not yet provide the exact accepted
WC/VOID settlement call, payer, nonce reservation, gas ceiling, or transaction
plan needed to authorize a new liability.

Do not copy a historical `settleVoid` gas number or obsolete shared payer into
this contract.

## Exact replay versus changed evidence

An exact existing liability is idempotent.

Changing the fee-observation identity, obligation identity, plan fingerprint,
nonce, gas limit, fee cap, or any liability field creates a different liability
identity. Reusing the same obligation with different liability material HOLDS;
it does not increase the reserve silently.

## Remaining required #2460 layers

This first source slice intentionally leaves false:

- durable liability journal read/write;
- atomic serialized persistence;
- live payer-balance observation;
- live fee observation;
- trusted time;
- terminal receipt reconciliation/release;
- manual recovery allowance;
- full-presale lifetime native-gas capacity;
- ongoing WC/VOID native-gas sustainability;
- runtime integration; and
- production activation.

The next source lane should persist this exact classifier decision under one
payer-scoped serialization domain, re-read the complete durable census before
append, create/fsync the liability, and postcheck the reserve floor.

Later receipt reconciliation must keep the full liability reserved while
unsigned, pending, receipt-missing, reorg/finality-uncertain, or crash-unreconciled.

## No hidden minimum

This contract has no purchase or trade amount input and introduces no hidden
minimum purchase/trade size. Gas-abuse policy remains the separate sponsored
gas / anti-grief policy stack.

## Authority boundary

`VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1` grants no:

- filesystem journal mutation;
- RPC read/write;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- inventory movement;
- WC mutation;
- market or presale activation;
- treasury/liquidity action; or
- funds movement.

Source-green is not durable accounting and is not economic activation.
