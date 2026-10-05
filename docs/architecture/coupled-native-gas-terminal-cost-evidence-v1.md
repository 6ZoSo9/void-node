# Coupled native-gas terminal cost evidence v1

## Purpose

Issue #2460 needs exact terminal gas-cost evidence before any open native-gas
liability can later be reconciled or released.

This source-only contract composes the **current native Buy VOID delivery lane**:

1. one exact open `VOID_COUPLED_NATIVE_GAS_LIABILITY_V1`;
2. the exact prepared native transaction reservation;
3. the durable native broadcast-outcome record created after receipt
   reconciliation; and
4. a fresh raw Chain-2050 receipt plus current block number carrying the gas
   fields that the durable terminal records intentionally do not preserve.

It does **not** consume the older payment-keyed contract-fulfillment receipt
evidence. That is a different transaction lane: the current prepared native
transaction is a type-2 direct transfer to the buyer delivery address, while
the historical payment-keyed fulfillment receipt verifies a zero-value contract
call with calldata/logs.

Marker:

`VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1`.

## Inputs

`classifyCoupledNativeGasTerminalCostEvidenceV1(...)` consumes:

- `liability`: exact open presale native-gas liability;
- `buy_void_plan`: exact prepared native transaction reservation;
- `terminal_outcome`:
  - `void_buy_void_broadcast_confirmed_record_v1`, or
  - `void_buy_void_broadcast_reverted_record_v1`;
- `raw_receipt`: exact projected receipt fields:
  - `transactionHash`;
  - `blockNumber`;
  - `blockHash`;
  - `status`;
  - `gasUsed`;
  - `effectiveGasPrice`;
  - `from`;
  - `to`;
- `current_block_number`: fresh RPC block-height quantity; and
- `required_min_confirmations`: server-controlled later-runtime policy input,
  bounded to the same 1..1000 domain as the native receipt reconciler.

The source contract itself performs no RPC or filesystem read. Therefore raw
receipt/current-block transport and terminal-outcome storage custody remain
explicitly unproven here and grant no release authority.

## Prepared-plan and liability binding

The prepared plan is not trusted by shape alone. The classifier rederives:

- wallet-key SHA-256;
- transaction-template fingerprint;
- transaction-plan fingerprint; and
- reservation ID.

It also validates the complete authority-false prepared-plan surface.

The open liability is exact-key validated, its reserved envelope is recomputed,
and its deterministic liability ID is rederived.

The liability and plan must then agree on:

- reservation / obligation ID;
- payer;
- nonce;
- plan fingerprint;
- native transaction value;
- gas limit;
- admitted max fee per gas; and
- source-evidence plan fingerprint.

## Durable native terminal authority

### Confirmed

A confirmed broadcast-outcome record must contain a current
`BuyVoidConfirmedFulfillmentRecordV1` with a delivery block hash.

The classifier independently rederives:

- canonical payment-identity SHA-256;
- delivery-binding fingerprint; and
- broadcast confirmed-record confirmation fingerprint.

The confirmed record must bind to the prepared plan's:

- attempt ID through the outcome wrapper;
- fulfillment wallet;
- delivery address; and
- VOID amount after the canonical native-delivery unit conversion.

The native delivery path uses 6-decimal fulfillment units and 18-decimal native
units, so the binding is:

```text
plan.native_value_wei =
  confirmed.void_amount_units * 1_000_000_000_000
```

This is the same 10^12 conversion used by the native execution planner and
sign/broadcast adapter; direct string equality between VOID units and wei is
invalid.

### Reverted

A reverted broadcast-outcome record must independently satisfy its recorded
arithmetic:

```text
confirmation_count =
  current_block_number - block_number + 1
confirmation_count >= min_revert_confirmations
1 <= min_revert_confirmations <= 1000
```

It must be definitive, non-reconciling, retry-allowed, and must not claim that
the outcome-journal module itself broadcast the transaction.

A reverted record intentionally retains `retry_allowed=true`. This terminal
cost evidence does **not** release that retry/manual-recovery allowance.

## Fresh receipt revalidation

The supplied raw receipt must bind to the same direct native transaction:

- transaction hash = durable native outcome transaction hash;
- block number = durable terminal block number;
- receipt status = confirmed/reverted durable outcome;
- receipt `from` = liability/plan fulfillment wallet;
- receipt `to` = prepared delivery address.

For confirmed delivery, the fresh raw receipt block hash must exactly equal the
durable confirmed delivery block hash.

For reverted delivery, the historical reverted record did not persist block
hash. The fresh raw receipt supplies the current block hash, and a later trusted
runtime must source that receipt/current block from the reviewed Chain-2050 RPC
transport before this evidence can ever influence release.

Fresh confirmation depth is recomputed:

```text
fresh_confirmations =
  fresh_current_block - receipt_block + 1
```

It must be at least:

- the supplied current minimum-confirmation policy; and
- the durable terminal record's already-observed confirmation count.

This prevents terminal-cost classification from weakening the finality already
required when the durable outcome was written.

## Gas-cost arithmetic

The contract requires:

```text
0 < gasUsed <= liability.gas_limit
0 <= effectiveGasPrice <= liability.admitted_max_fee_per_gas_wei
gas_cost_wei = gasUsed * effectiveGasPrice
```

Zero effective gas price is accepted. Metered execution and native fee debit
are distinct concepts in the current Chain-2050 evidence.

For confirmed direct delivery:

```text
transaction_native_value_consumed_wei =
  liability.transaction_native_value_wei

liability_consumed_wei =
  transaction_native_value_consumed_wei + gas_cost_wei
```

For reverted delivery:

```text
transaction_native_value_consumed_wei = 0
liability_consumed_wei = gas_cost_wei
```

The resulting consumed amount must never exceed
`liability.maximum_reserved_wei`.

This is conservative liability accounting. It is not a general-purpose EVM
account-balance-delta or execution-trace proof.

## Output

Success returns deterministic terminal-cost evidence binding:

- liability / plan / attempt identity;
- native transaction hash;
- confirmed/reverted durable outcome;
- deterministic terminal-record fingerprint;
- exact receipt block hash/number;
- fresh current block and confirmation count;
- exact gas used;
- exact effective gas price;
- exact gas cost;
- exact native delivery value consumed by outcome semantics;
- exact total liability consumption; and
- exact maximum reserved envelope.

The result always reports:

`liability_release_authorized=false`.

## HOLDs

The classifier HOLDS on, among other cases:

- malformed or noncanonical prepared-plan identity;
- malformed/relabelled open liability;
- liability/plan mismatch;
- malformed native terminal outcome;
- delivery-binding fingerprint mismatch;
- confirmed-outcome fingerprint mismatch;
- reverted confirmation arithmetic mismatch;
- confirmed terminal record not matching payer/delivery/amount;
- receipt tx/block/status mismatch;
- confirmed block-hash mismatch;
- sender/delivery endpoint mismatch;
- current block before receipt block;
- fresh confirmation regression;
- gas used above the liability gas limit;
- effective gas price above the admitted max fee;
- arithmetic overflow;
- liability consumption above the reserved envelope; or
- raw receipt extra/missing fields.

Unsigned, unsubmitted, pending, receipt-missing, broadcast-unknown and
reconciliation-required states do not have an accepted terminal outcome and
therefore cannot produce evidence here.

## Authority boundary

`VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1` keeps false:

- terminal-outcome storage read/custody;
- raw receipt transport verification;
- current-block transport verification;
- trust in caller-supplied minimum-confirmation policy;
- terminal receipt reconciliation mutation;
- liability release/store mutation;
- retry/manual-recovery allowance release;
- WC/VOID terminal-cost authority;
- runtime integration;
- RPC read/write;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 writes;
- activation;
- inventory/treasury/liquidity movement; and
- funds movement.

The next gate after this source contract is a separately reviewed runtime
composition that reads canonical terminal outcome storage and re-observes the
same Chain-2050 receipt/current block through a trusted bounded transport.
Only after that should a pure liability-reconciliation/release contract be
considered.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_terminal_cost_evidence_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof covers confirmed/reverted native outcomes, terminal
fingerprint validation, fresh-finality regression, zero gas price, gas/fee
ceilings, transaction/block/status mismatch, endpoint binding, plan/liability
conflict, malformed revert arithmetic, and raw-receipt exact-key enforcement.
