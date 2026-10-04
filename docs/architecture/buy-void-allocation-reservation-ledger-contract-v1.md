# Buy VOID Allocation Reservation Ledger Contract v1

Marker: `VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1_GREEN`

## Purpose

Define the deterministic append-only reservation-ledger contract required before
verified USDC payments can become durable presale allocation obligations.

This lane is deliberately **source-only**. It does not read or write the live
allocation ledger, does not mount a runtime route, does not reserve production
inventory, does not activate the presale, and does not move funds or VOID.

The existing public/private HOLD surfaces remain authoritative until a later
reviewed runtime-integration lane proves the writer, custody, activation, and
recovery boundaries.

## Record identity

Each planned record has:

- `record_type=allocation_reserved`;
- deterministic `record_id=voidalloc1_<sha256>`, bound to the request ID,
  canonical payment identity, exact durable `payment_verified` event digest,
  and immutable request launch-authority lineage;
- canonical payment identity from the existing
  `canonicalBuyVoidPaymentIdentityV1(...)` primitive:
  `voidpay1:<chain>:<tx_hash>:<log_index>`;
- exact Base or Ethereum source-chain normalization;
- canonical lower-case payment transaction hash and buyer delivery address;
- canonical uint32 payment log index (`0..4294967295`), normalized to
  non-negative decimal text so the reservation identity cannot diverge from the
  verified-payment/finality authority;
- content-addressed refs for verified-payment evidence, duplicate-guard result,
  inventory-guard result, and explicit operator activation record;
- exact `payment_verified_event_sha256`, committing the durable accepted
  operator-event bytes rather than only upstream receipt/finality evidence; and
- the exact immutable request-authority tuple copied from the durable request:
  `coupled_launch_id`, `source_composition_id`,
  `activation_generation`, `generation_tip_sha256`,
  `activation_receipt_id`, `activation_receipt_sha256`, and the original
  `expires_at_ms`.

The planner accepts that launch lineage only through one schema-closed
`VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1` object. It does not accept seven
independent launch fields. Runtime integration must read that object from the
durable request that produced the verified payment; it must not reconstruct or
caller-select the lineage independently.

The original expiry is historical acceptance lineage. A later crash-recovery
reservation does not require that lease to still be live; it must preserve the
exact authority that accepted the obligation.

No second payment-identity or launch-identity scheme is introduced.

## Canonical presale economics

The ledger imports the repository's existing
`VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1` contract. Every reservation
must use exactly:

- total presale pool: `10,000,000 VOID`;
- rate: `2 VOID per 1 USDC` (`$0.50/VOID`).

An arbitrary pool size or a VOID/USDC quote that does not satisfy that exact
ratio is a HOLD. The allocation ledger cannot become an alternate pricing or
inventory authority.

## Inventory arithmetic

All VOID and USDC amounts use exact integer micro-unit arithmetic with at most
six decimal places.

Decimal input text is bounded to 32 characters before any trim, regular-expression,
or `BigInt` conversion. This is intentionally much larger than the canonical
10,000,000-VOID / 5,000,000-USDC presale domain while preventing a near-ledger-size
numeric field from turning the pure classifier into pathological bigint work.

For every new record:

```text
reserved_before + remaining_before = pool_total
quote_void <= remaining_before
reserved_after = reserved_before + quote_void
remaining_after = remaining_before - quote_void
reserved_after + remaining_after = pool_total
reserved_after <= pool_total
remaining_after >= 0
```

For every record after genesis, the pool total, reserved-before, and
remaining-before values must exactly continue the preceding record's
reserved-after and remaining-after state.

A pool-total change after the first reservation is a HOLD.

## Append-only hash chain

The first record carries:

`previous_allocation_record_hash = sha256:000...000`

and must begin from the complete presale inventory state:
`reserved_void_total_before=0` and
`remaining_void_before=pool_void_total_before`. A nonzero pre-reserved
"genesis" is rejected, so a later nonzero-state row cannot simply be detached
and relabeled as genesis. This check does **not** detect rollback to a genuine
earlier valid prefix or to an empty ledger.

Every later record carries the exact preceding
`allocation_record_hash`.

`allocation_record_hash` is SHA-256 over canonical JSON of the complete
record before the hash field is inserted. The ledger classifier rejects:

- malformed JSON;
- a missing final JSONL newline;
- blank rows;
- non-canonical JSON serialization, including alternate key order or
  duplicate-key ambiguity;
- unknown or missing fields;
- non-canonical chain/hash/address/amount/index encodings;
- invalid inventory arithmetic;
- state discontinuity;
- a duplicate record hash;
- a wrong previous-record hash;
- duplicate request IDs;
- duplicate canonical payment identities;
- record-ID mismatch;
- content tampering without a matching record hash;
- more than 100,000 records or more than 64 MiB of ledger bytes.

## Rollback / high-water limitation

This source classifier proves internal continuity only for the ledger bytes it
is given. A valid two-record ledger, its genuine one-record prefix, and an empty
ledger can each be internally valid when considered in isolation. Therefore
the JSONL hash chain is **not** rollback-safe persistence by itself.

Production runtime integration must bind the ledger to a separately protected
monotonic high-water containing at least the latest accepted
`record_count + tip_hash` (or a stronger equivalent). Before planning or
appending, the writer must require the presented ledger to match that high-water
exactly. Ledger growth and high-water advancement must use one reviewed
crash-recoverable publication protocol; an empty ledger after a non-genesis
high-water, a shorter valid prefix, or any tip/count mismatch must HOLD.

The source authority therefore keeps
`external_high_water_binding=false`,
`rollback_detection=false`, and
`production_gate_ready=false`.

## Planning and idempotence

`planBuyVoidAllocationReservationV1(...)` is pure. It accepts existing ledger
bytes and returns either a HOLD or the exact next JSONL bytes; it never performs
filesystem I/O.

Planning requires all four explicit prerequisites to be true:

- verified payment gate green;
- duplicate payment guard green;
- inventory allocation guard green;
- explicit operator activation record green.

For a new payment it derives the current reserved/remaining inventory from the
validated ledger and refuses oversell.

An exact retry for a request/payment pair already present in the ledger returns
`idempotent` and returns the unchanged ledger bytes. It does not append a
second record. Exact replay also requires the same durable
`payment_verified_event_sha256` and the same complete request-authority tuple.
A reused request ID with a different payment identity, changed event bytes,
changed launch generation/receipt/tip/expiry, a reused payment identity with
another request, or changed economic/evidence bindings HOLDs.

## Required record fields

The source contract implements the already-published record shape:

- `record_type`
- `record_id`
- `request_id`
- `coupled_launch_id`
- `source_composition_id`
- `activation_generation`
- `generation_tip_sha256`
- `activation_receipt_id`
- `activation_receipt_sha256`
- `expires_at_ms`
- `source_chain`
- `payment_transaction_hash`
- `payment_log_index`
- `canonical_payment_identity`
- `payment_verified_event_sha256`
- `buyer_delivery_wallet`
- `quote_void_amount`
- `quote_usdc_amount`
- `pool_void_total_before`
- `reserved_void_total_before`
- `remaining_void_before`
- `reserved_void_total_after`
- `remaining_void_after`
- `verified_payment_receipt_ref`
- `duplicate_payment_guard_result`
- `inventory_allocation_guard_result`
- `operator_activation_record_ref`
- `created_at_ms`
- `previous_allocation_record_hash`
- `allocation_record_hash`

## Current production truth

This source contract does **not** make the existing allocation gate green.

The following existing HOLDs remain unchanged and must continue to report false
until a separate runtime-integration generation is reviewed:

- `allocation_reservation_record_green`;
- `allocation_reservation_record_write_enabled`;
- `append_only_allocation_reservation_record_enforced`;
- `private_allocation_ledger_hold_green`;
- `private_allocation_ledger_write_enabled`;
- public presale activation;
- automatic fulfillment.

The parent coupled Buy VOID gate must therefore remain HOLD.

The older public shape-only descriptor for
`/public-node/usdc-void-buy-pool/allocation-reservation-record-v1.json`
predates these immutable lineage commitments and remains non-authoritative
because record writes are disabled. Before any runtime/public activation, the
integration lane must update that descriptor/proof to the reviewed durable
record schema; this source contract does not silently widen a live public API.

## Remaining integration work

A later lane must, in one reviewed serialization boundary:

1. produce a canonical finality-complete verified-payment v2 event;
2. apply the canonical duplicate-payment identity guard;
3. apply finite-capacity admission;
4. read the exact durable request and pass its schema-closed
   `VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1` object unchanged into this planner;
5. commit the exact durable canonical `payment_verified` event bytes as
   `payment_verified_event_sha256`;
6. verify explicit operator activation;
7. re-read and validate the private allocation ledger under its writer lock;
8. plan the exact next reservation record with this contract;
9. require the current ledger count/tip to equal a separately protected
   monotonic high-water;
10. durably append/fsync the record and advance the high-water through one
    crash-recoverable publication protocol;
11. re-read and prove the new count, tip, high-water, inventory totals, launch
    lineage, and payment-event commitment, rejecting valid-prefix/empty-ledger
    rollback;
12. publish any recovery index/sidecar only from the accepted durable state;
13. require allocation reservation before any fulfillment instruction can
    execute.

That later writer must establish private path custody, no-follow semantics,
crash recovery, shared lock ordering, and deterministic conflict responses.
None of those authorities are inferred from this source-green contract.

## Authority boundary

`VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1` explicitly keeps:

- `external_high_water_binding=false`;
- `rollback_detection=false`;
- `runtime_integration=false`;
- `filesystem_read=false`;
- `filesystem_write=false`;
- `allocation_reservation_write=false`;
- `payment_verified_event_write=false`;
- wallet/signer/private-key access false;
- transaction construction/signing/broadcast false;
- Chain-2050 mutation false;
- market/presale activation false;
- `production_gate_ready=false`;
- `funds_movement=false`.

## Verification

```bash
npx tsx scripts/prove_buy_void_allocation_reservation_ledger_v1.ts
npx tsx scripts/prove_buy_void_canonical_presale_economics_v1.ts
bash ops/mainnet0/usdc-to-void-presale-allocation-reservation-record-v1-proof.sh
bash ops/mainnet0/usdc-to-void-presale-private-allocation-ledger-hold-v1-proof.sh
npm run typecheck
npm run build
git diff --check
```

The focused proof uses only in-memory synthetic ledger bytes. It creates no
runtime directory, allocation file, payment, wallet operation, transaction, or
production economic state.
