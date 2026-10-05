# Coupled native-gas terminal cost evidence v1

## Purpose

This source-only contract closes one evidence gap in issue #2460:

> a terminal Buy VOID receipt can prove finality/outcome without, by itself,
> proving the exact native gas debit that may later be reconciled against an
> open native-gas liability.

The contract does **not** release a liability. It only proves the exact gas
cost and payer debit for one already-open Buy VOID liability when all of the
following agree:

1. the canonical open liability;
2. the current prepared-transaction plan reservation;
3. immutable payment-keyed terminal receipt evidence; and
4. a raw terminal Chain-2050 receipt snapshot carrying the missing gas fields.

Marker:

`VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_V1`.

## Inputs

`classifyCoupledNativeGasTerminalCostEvidenceV1(...)` consumes:

- `liability`: an open `VOID_COUPLED_NATIVE_GAS_LIABILITY_V1` record;
- `buy_void_plan`: the exact current
  `VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1`;
- `terminal_receipt_evidence`: immutable
  `VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1`;
- `raw_receipt`: an exact projected receipt snapshot containing only:
  - `transactionHash`;
  - `blockNumber`;
  - `blockHash`;
  - `status`;
  - `gasUsed`;
  - `effectiveGasPrice`;
  - `from`;
  - `to`;
- `expected_receipt_policy_fingerprint_sha256`.

This source does not fetch the receipt. A later runtime composition must source
the raw receipt through a reviewed transport and obtain the immutable receipt
evidence from its canonical private store.

## Binding

The contract requires the liability and prepared plan to agree exactly on:

- reservation / obligation ID;
- payer address;
- nonce;
- transaction-plan fingerprint;
- transaction native value;
- gas limit;
- admitted max fee per gas; and
- Buy VOID source-evidence identity.

The immutable receipt evidence must agree with the plan on:

- saga ID;
- attempt ID; and
- delivery address.

The supplied expected receipt-policy fingerprint must equal the immutable
terminal evidence.

The raw receipt must agree with the terminal evidence on:

- transaction hash;
- receipt block number;
- receipt block hash; and
- success/revert outcome.

It must also bind:

- receipt `from` = liability payer;
- receipt `to` = reviewed fulfillment contract from terminal evidence.

The terminal receipt evidence object is independently revalidated for its exact
key set, confirmed/reverted field shape, authority object, and semantic evidence
fingerprint. This prevents a caller-fabricated terminal object from becoming
gas-cost authority merely because it has the right TypeScript shape.

## Gas-cost arithmetic

The contract parses EVM receipt quantities as canonical lowercase hex
quantities and requires:

```text
0 < gasUsed <= liability.gas_limit
0 <= effectiveGasPrice <= liability.admitted_max_fee_per_gas_wei
```

It derives:

```text
gas_cost_wei = gasUsed * effectiveGasPrice
```

For a confirmed/successful transaction:

```text
transaction_native_value_debit_wei = liability.transaction_native_value_wei
actual_payer_debit_wei =
  transaction_native_value_debit_wei + gas_cost_wei
```

For a reverted transaction:

```text
transaction_native_value_debit_wei = 0
actual_payer_debit_wei = gas_cost_wei
```

A reverted EVM call does not retain the transaction value transfer, but it can
still consume gas.

The actual payer debit must remain within
`liability.maximum_reserved_wei`.

Zero effective gas price is allowed because metered execution and native fee
debit are separate concepts in the current Chain-2050 evidence.

## Output

A successful classification returns a deterministic
`evidence_id = sha256(canonical(evidence body))` plus:

- exact liability / plan / attempt / transaction identities;
- terminal outcome;
- finality block + confirmation evidence;
- exact gas used;
- exact effective gas price;
- exact gas cost;
- exact native-value debit;
- exact total payer debit; and
- the reviewed maximum reserved envelope.

The output always keeps:

`liability_release_authorized=false`.

This evidence may be consumed by a later pure reconciliation classifier, but is
not itself release authority.

## HOLDs

The contract HOLDS on, among other cases:

- invalid/open-liability mismatch;
- prepared-plan/liability mismatch;
- saga/attempt mismatch;
- receipt-policy mismatch;
- altered terminal evidence fingerprint;
- malformed confirmed/reverted terminal evidence;
- raw receipt extra/missing fields;
- transaction/block/status mismatch;
- receipt sender/contract mismatch;
- gas used above the liability ceiling;
- effective gas price above the admitted ceiling;
- arithmetic overflow; or
- actual payer debit above the reserved envelope.

Pending, receipt-missing, and reorg/confirmation-uncertain states do not have
terminal receipt evidence and therefore cannot produce terminal gas-cost
authority through this contract.

## Authority boundary

`VOID_COUPLED_NATIVE_GAS_TERMINAL_COST_EVIDENCE_AUTHORITY_V1` keeps false:

- receipt-evidence storage read;
- raw receipt transport verification;
- receipt reconciliation mutation;
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

A later runtime composition must bind canonical storage and raw-receipt
transport. A separate later reconciliation contract must decide how much
liability, if any, becomes releasable.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_terminal_cost_evidence_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof covers confirmed and reverted outcomes, zero gas price,
gas-used and fee ceilings, transaction/block/status mismatch, endpoint binding,
receipt-policy binding, evidence-fingerprint tampering, plan/liability mismatch,
reverted-evidence shape, and raw-receipt exact-key enforcement.
