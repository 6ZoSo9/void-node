# Buy VOID chain-anchor and DataNet boundary v1

Marker: `VOID_BUY_VOID_CHAIN_ANCHOR_AND_DATANET_BOUNDARY_V1`

Status: source/proof/design contract only. This document does not activate a
payment rail, deploy a contract, start a service, authorize a signer, broadcast a
transaction, fund inventory, or enable the public presale.

## Decision

The presale accepts two source-payment rails:

1. **Base mainnet USDC** (`source_chain=base`, EVM chain ID `8453`)
2. **Ethereum mainnet USDC** (`source_chain=ethereum`, EVM chain ID `1`)

`eth` is an input alias for `ethereum`; canonical records use `ethereum`.

The canonical payment identity remains:

```text
voidpay1:<source_chain>:<source_transaction_hash>:<source_log_index>
```

`source_log_index` is canonical unsigned 64-bit decimal: `0` through
`18446744073709551615`, with no leading-zero alternate encoding.

The source payment chain owns truth about its finalized USDC transfer. Chain-2050
owns truth about finalized VOID delivery and presale inventory only when those
facts are actually represented in Chain-2050 state. DataNet owns availability of
off-chain bytes, not economic truth. Local journals and indexes may retain
bounded unresolved work and cache derived views, but must not override finalized
chain state.

## Current source-backed reality

The present Buy VOID source already recognizes both `base` and `ethereum` and
derives the canonical payment identity from the source chain, transaction hash,
and log index:

- `src/economic/buy_void_auto_fulfillment_v1.ts`
- `scripts/prove_buy_void_auto_fulfillment_v1.ts`

The current delivery adapter constructs a plain ERC-20 transfer:

```text
transfer(deliveryAddress, tokenAmountAtoms)
```

Source:

- `src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts`

The delivery receipt reconciler independently queries Chain-2050 receipt and
head information, verifies an exact token transfer, enforces a configurable
confirmation threshold, and re-reads the receipt for stability:

- `src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.ts`

The current fulfillment confirmation module joins the source payment identity to
the observed Chain-2050 delivery receipt using local intent data:

- `src/economic/buy_void_fulfillment_confirmation_v1.ts`

Therefore the current source proves all of the following:

- Base USDC and Ethereum USDC can be distinguished by canonical source-chain
  payment identity.
- A Chain-2050 VOID transfer can be observed and validated.
- The Chain-2050 transfer itself does **not** currently contain the source
  payment identity.
- Chain-2050 does **not** currently contain a payment-keyed presale reservation
  that consumes finite capacity before fulfillment.
- The payment-to-fulfillment correlation is currently assembled off-chain.
- Confirmation depth is implemented, but a complete live Chain-2050
  route/fork-choice/finality authority is not yet implemented.
- The finite 10,000,000 VOID presale inventory is not yet represented by a
  source-proven Chain-2050 pool state in this contract.
- A chain digest can prove what bytes should exist, but cannot prove that any
  DataNet peer still retains those bytes.

The finality limitation is explicitly recorded in
`docs/security/live-canonical-chain-state-finality-api-boundary-v1.md`: the
existing boundary is an API/helper response-file contract, not an actual live
route call, fork choice, or peer quorum.

## CHAIN_OWNS

### Base and Ethereum source-payment chains

After the applicable source-chain finality policy is satisfied, the relevant
source chain is canonical for:

- USDC contract
- transfer transaction hash
- transfer log index
- sender
- presale receive address
- atomic USDC amount
- block number and block hash
- finality evidence

Base and Ethereum require separate server-controlled RPC/configuration bindings.
A client-supplied chain, RPC URL, token address, receive address, or finality
threshold must never become authority.

### Chain-2050

Current Chain-2050 can be queried for an exact VOID transfer receipt. To become
the complete presale anchor of truth, Chain-2050 still needs four source-backed
successors:

1. **Payment-keyed inventory reservation.** A finalized source payment must
   consume one deterministic payment key and move the exact purchase amount
   from `available` to `reserved` on Chain-2050 before delivery may be signed
   or broadcast. This makes oversubscription fail before fulfillment. This is the required
**reservation before fulfillment** ordering.
2. **Payment-keyed fulfillment anchor.** Fulfillment must reference that exact
   reservation, reject payment-key or delivery-event reuse, and move the exact
   amount from `reserved` to `fulfilled`.
3. **Finite presale inventory state.** Chain-2050 must expose
   `available + reserved + fulfilled = 10,000,000 VOID`; local counters cannot
   override it after recovery.
4. **DataNet content commitment.** DataNet objects or generations that need
   canonical identity must have a Chain-2050 commitment containing at least the
   object identity and expected content digest.

A minimal payment key is:

```text
SHA256(
  "VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0" ||
  U32BE(byte_length(canonical_payment_identity)) ||
  canonical_payment_identity
)
```

The length frame prevents concatenation ambiguity. The contract module also
retains the existing plain SHA-256 of the canonical payment identity for
compatibility with current Buy VOID records.

The payment key is consumed first by the reservation transition and then
referenced by fulfillment. A future Chain-2050 implementation should enforce the
semantic equivalent of:

```text
# Phase 1: finalized source payment -> reservation
require(reservation_by_payment_key[payment_key] is absent)
require(available_inventory >= void_amount)
reservation_by_payment_key[payment_key] =
  (void_amount, delivery_address, source_evidence_digest)
available_inventory -= void_amount
reserved_inventory += void_amount
emit payment-keyed reservation evidence

# Phase 2: reservation -> fulfillment
require(reservation_by_payment_key[payment_key] exists)
require(fulfillment_by_payment_key[payment_key] is absent)
require(delivery matches exact reservation)
fulfillment_by_payment_key[payment_key] = fulfillment_digest
reserved_inventory -= void_amount
fulfilled_inventory += void_amount
emit payment-keyed fulfillment evidence
```

If VOID delivery remains an external ERC-20 transfer rather than occurring
inside the settlement transition, the exact Chain-2050 reservation must be
finalized **before** the runtime signs or broadcasts that delivery.

This document deliberately does not select a deployment address, contract
implementation, upgrade authority, signer, or activation procedure.

### Cross-chain qualification

The Chain-2050 reservation and fulfillment anchors make the correlation
immutable and duplicate-resistant, but they do not by themselves trustlessly
prove a Base or Ethereum receipt. Until a reviewed light-client, bridge, or
proof system exists, a bounded authorized payment verifier must still validate
the source-chain receipt before proposing the Chain-2050 reservation. That
verifier is an input authority boundary, not an alternate final ledger.

## DATANET_OWNS

DataNet owns:

- the actual off-chain payload bytes
- replica placement and availability
- peer retrieval routes
- content-verified repair
- bounded retention and compaction
- availability evidence

For every retrieved segment:

```text
expected digest comes from a finalized Chain-2050 commitment
retrieved bytes come from one or more DataNet peers
SHA256(retrieved bytes) must equal the expected digest
```

A valid chain commitment plus missing bytes means `PAYLOAD_UNAVAILABLE`, not
success. Bytes with the wrong digest mean `PAYLOAD_DIGEST_MISMATCH_HOLD`, even
when every peer agrees. Peer consensus cannot override the chain commitment.

## LOCAL_STATE_REQUIRED

Only bounded unfinished work remains authoritative locally:

- source-payment observations that have not reached the applicable finality rule
- pre-broadcast nonce and submission intent
- a broadcast whose receipt is unknown
- temporary payment-to-delivery correlation until the payment-keyed
  Chain-2050 reservation exists
- incomplete DataNet publication or repair intent

The local record must be keyed deterministically, replay-safe, bounded, and
recoverable. Once a corresponding finalized chain record exists, the local
record becomes evidence or cache data and cannot redefine the outcome.

## DISPOSABLE_LOCAL_STATE

The following must be reconstructible:

- finalized payment index
- finalized reservation index
- finalized fulfillment index
- purchase-status projection
- DataNet peer-route cache
- replica-availability cache

A restart rebuilds these views from finalized source-chain/Chain-2050 state and
surviving DataNet peers. Conflicting local values are discarded or quarantined;
they never win over finalized chain state.

## V4_RETAIN_DELETE

### Retain where bytes or unfinished work still need protection

- failure-atomic byte publication
- create-only/no-replace behavior
- foreign-generation preservation
- exact-byte verify-then-use coupling
- bounded pre-finalization replay
- bounded crash recovery
- content-addressed manifests

These are DataNet and unresolved-operation correctness mechanisms.

### Delete where the mechanism duplicates finalized chain truth

- local finalized-payment ledger authority
- local finalized-reservation ledger authority
- local finalized-fulfillment ledger authority
- local inventory truth that can override Chain-2050
- local purchase status treated as canonical
- full presale-history duplication
- broker ordering sequence used as a substitute for chain order
- economic checkpoint selector treated as a competing ledger root

This is a semantic deletion decision. It does not authorize deleting any
existing branch, file, deployment, or operator data.

## Recovery decision table

The executable recovery helper below describes the current pre-successor source,
where Chain-2050 still has no reservation surface. Under the successor design,
`READY_FOR_BOUNDED_PREPARATION` may prepare or verify a reservation proposal but
does **not** authorize signing or broadcasting a VOID delivery. Delivery
signing/broadcast must remain held until the exact payment-keyed Chain-2050
reservation is finalized. #1465 owns the two-phase state-transition reference;
this boundary contract intentionally does not duplicate that state machine.

| Source payment | Chain-2050 delivery | Payment-keyed anchor | Result |
|---|---|---|---|
| not finalized | any | any | `SOURCE_PAYMENT_NOT_FINAL_HOLD` |
| finalized | absent | absent | `READY_FOR_BOUNDED_PREPARATION` |
| finalized | observed | absent | `CORRELATION_ANCHOR_MISSING_HOLD` |
| finalized | observed | exact and finalized | `ALREADY_FULFILLED` |
| finalized | observed | conflicts | `FULFILLMENT_ANCHOR_*_HOLD` |

`READY_FOR_BOUNDED_PREPARATION` is not signing, broadcast, inventory, or money
authority. It only means the deterministic next intent may be prepared under a
separately reviewed execution contract.

## Executable contract

The machine-readable contract is split across:

- `scripts/lib/void_buy_void_chain_anchor_contract_v1.mjs`
- `schemas/buy-void-chain-anchor-contract-v1.schema.json`
- `fixtures/economic/buy-void-chain-anchor-contract-v1.example.json`
- `scripts/prove_void_buy_void_chain_anchor_contract_v1.mjs`
- `.github/workflows/void-buy-void-chain-anchor-contract-v1.yml`

The module provides:

- exact Base/Ethereum source-chain normalization
- canonical payment identity
- domain-separated payment/fulfillment anchor key
- explicit reservation-before-fulfillment successor boundary
- closed fulfillment-anchor validation
- one-payment/one-fulfillment and one-delivery-event/one-payment checks
- recovery decisions where finalized chain truth outranks local cache
- bounded DataNet segment verification against a finalized chain commitment
- closed V510 responsibility packet validation

## Evidence gates

### Hosted

The focused proof must pass on Node 22, 24, and 26 and prove:

- both payment rails
- canonical identities and domain separation
- payment confirmation separated from fulfillment
- Chain-2050 reservation before delivery
- available/reserved/fulfilled inventory conservation
- duplicate/conflict rejection
- local-cache precedence
- chain-truth versus byte-availability separation
- DataNet digest verification
- schema/fixture closure
- current-source bindings
- immutable workflow dependencies and diff hygiene

### Designated host

A later host-bound packet must prove:

- failure-atomic publication
- directory durability
- foreign-generation preservation
- peer loss, partition, and rejoin
- reconstruction from chain anchors plus surviving peers
- forged/stale payload rejection
- bounded replica repair
- a live Chain-2050 finality source

Nimo's separate disposable probe has already demonstrated the underlying
`O_TMPFILE`, exact-inode publication, directory `fsync`, create-only,
`SO_PEERCRED`, `SCM_RIGHTS`, sealed `memfd`, and `pidfd_open` primitives on one
Ubuntu/ext4 host. This repository lane does not embed that machine-local receipt
and does not claim the stricter process-isolation or complete designated-host
evidence gate is green.

## Integration order

1. Independently review this responsibility and identity contract.
2. Define the exact Chain-2050 payment-keyed fulfillment/inventory state
   transition in a separate sensitive source lane.
3. Prove Base and Ethereum source-payment finality adapters against exact
   server-controlled policies.
4. Rebuild the Buy VOID execution/reconciliation path so finalized chain state
   replaces redundant local ledger authority.
5. Integrate DataNet content commitments and chain-plus-peer reconstruction.
6. Reconcile #1352 and #1314 against current `main`.
7. Run exact-current-main hosted and designated-host acceptance.
8. Keep deployment, signer access, inventory funding, and public activation
   behind separate explicit authorization.

## Negative evidence and authority boundary

This lane does not prove that:

- Base or Ethereum production RPC/configuration is active
- a real payment has been received
- the payment-keyed Chain-2050 anchor exists
- Chain-2050 has hard protocol finality
- presale inventory is funded or represented on-chain
- DataNet bytes are replicated
- #1352 or #1314 is source-complete
- any public purchase endpoint is enabled

Source-green is not deployed. A digest is not availability. A confirmation count
is not automatically protocol finality. A local receipt is not finalized chain
truth.
