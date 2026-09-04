# Buy VOID Chain-2050 presale settlement reference machine v1

Marker: `VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1`

Status: source/proof/schema/reference only. This document does not assert that the
state machine is deployed, that Chain-2050 currently records these fields, or
that the public presale is enabled.

## Purpose

Define the smallest deterministic Chain-2050 state transition needed to make the
chain the canonical anchor for Buy VOID fulfillment and finite presale inventory
without turning DataNet or a local journal into a competing economic ledger.

The reference machine closes the design gap between:

- a finalized USDC payment on Base mainnet or Ethereum mainnet;
- one corresponding finalized VOID delivery on Chain-2050; and
- the remaining finite `10,000,000 VOID` presale inventory.

It is intentionally pure. It performs no RPC request, filesystem operation,
wallet access, signing, transaction construction, broadcast, inventory funding,
service activation, or money movement.

## Canonical economics

The reference contract fixes these values:

| Property | Value |
| --- | --- |
| Chain-2050 chain ID | `2050` |
| Pool | `buy-void-presale-v1` |
| Initial presale inventory | `10,000,000 VOID` |
| VOID decimals in this reference | `6` |
| Inventory atoms | `10000000000000` |
| Accepted source asset | USDC |
| USDC decimals | `6` |
| Price | `2 VOID per 1 USDC` |
| Implied price | `$0.50 per VOID` |
| Exact payment | required |
| Hidden minimum | none |
| Per-buyer throttle below remaining inventory | none |

A one-atom USDC payment is valid when all other requirements are met and maps to
two VOID atoms. A purchase may consume the complete remaining pool in one
transition. The finite pool, not an arbitrary per-buyer ceiling, is the upper
bound.

## Accepted payment rails

Source payment truth belongs to the source chain:

- Base mainnet: canonical name `base`, EVM chain ID `8453`;
- Ethereum mainnet: canonical name `ethereum`, EVM chain ID `1`;
- input alias `eth` canonicalizes to `ethereum` before identity derivation.

A payment identity is:

```text
voidpay1:<canonical-source-chain>:<transaction-hash>:<log-index>
```

The Chain-2050 payment key is the lowercase SHA-256 digest of that exact identity.
This keeps Base and Ethereum transactions in separate identity domains even when
they happen to use the same transaction bytes or log index.

## Delivery identity

A finalized Chain-2050 delivery event is identified as:

```text
voiddelivery1:2050:<transaction-hash>:<log-index>
```

Its SHA-256 digest is the delivery-event key. The reference state machine enforces
both directions:

1. one payment key may bind to at most one fulfillment; and
2. one delivery-event key may bind to at most one payment.

An exact replay of the same immutable settlement facts is idempotent. A different
delivery, amount, address, policy fingerprint, source finality attestation, or
Chain-2050 finality attestation for an already fulfilled payment is a conflict,
not another fulfillment.

## Required source payment evidence

The closed source-payment record binds:

- canonical source-chain name and exact EVM chain ID;
- transaction hash and log index;
- canonical payment identity and payment-key digest;
- payer and VOID delivery address;
- exact positive USDC atoms;
- source-policy fingerprint;
- source-finality attestation digest;
- `finality_status=finalized`; and
- `exact_payment_verified=true`.

This reference does not define the live Base or Ethereum RPC/finality adapter.
The separate dual-rail policy contract in #1463 defines the required isolation
and complete-set configuration. Runtime integration must consume independently
verified source-chain evidence; caller-written JSON is not sufficient authority.

## Required Chain-2050 delivery evidence

The closed delivery record binds:

- chain ID `2050`;
- delivery transaction hash and log index;
- containing block height and block hash;
- exact recipient and positive VOID atoms;
- `execution_status=success`;
- accepted checkpoint height and hash;
- finality-policy identity; and
- finality-attestation digest.

The accepted checkpoint may not precede the delivery block. This structural rule
does not itself prove ancestry, validator convergence, or checkpoint authenticity.
A live implementation still needs an exact source-backed Chain-2050 route,
state/event contract, fork-choice rule, and finality-attestation verifier.

## State transition

The state starts with:

```text
remaining_inventory_void_atoms = 10000000000000
fulfilled_void_atoms = 0
fulfillment_count = 0
state_sequence = 0
```

For a candidate settlement:

1. verify the expected prior state hash;
2. validate the finalized source-payment record;
3. validate the finalized Chain-2050 delivery record;
4. reject a reused payment key unless the settlement is an exact duplicate;
5. reject a delivery event already bound to another payment;
6. require `delivery_void_atoms = payment_usdc_atoms * 2`;
7. require delivery recipient equality with the payment-bound delivery address;
8. require sufficient remaining inventory;
9. create one payment-keyed fulfillment anchor;
10. decrement remaining inventory;
11. increment fulfilled inventory and fulfillment count;
12. advance the transition root and state hash atomically in the model.

The conservation invariant is always:

```text
remaining_inventory_void_atoms + fulfilled_void_atoms
  = 10000000000000
```

No successful transition can mint presale inventory, lose fulfilled inventory,
reuse a payment, or reuse a delivery event.

## Fulfillment anchor

Each fulfillment record binds:

- pool and policy identity;
- canonical source payment identity and key;
- source rail, transaction, log, policy fingerprint, and finality attestation;
- exact USDC atoms and delivery address;
- exact VOID atoms;
- Chain-2050 delivery identity and key;
- Chain-2050 transaction, log, block, and finality attestation;
- exact predecessor state hash; and
- exact state sequence.

The fulfillment anchor is a domain-separated SHA-256 digest of the complete
record excluding only its own digest field.

The transition root is then advanced from:

```text
previous transition root + fulfillment anchor
```

The state hash binds the complete resulting state. These hashes are deterministic
reference identities. They are not signatures and do not independently establish
that a record was finalized by Chain-2050.

## Replay and reconstruction

`replayBuyVoidChain2050PresaleEventsV1()` rebuilds presale state directly from an
ordered bounded sequence of validated fulfillment records.

Replay requires:

- exact contiguous sequence numbers beginning at one;
- exact predecessor-state hashes;
- unique payment keys;
- unique delivery-event keys;
- valid fulfillment anchors;
- rate preservation;
- finite-inventory conservation; and
- bounded input cardinality.

Replay does not fabricate source-chain or Chain-2050 finality evidence and does
not return a silently truncated copy of the event stream. Its output is the
reconstructed state, exact event count, and the all-false operational authority
object.

This is the intended recovery relationship:

```text
finalized Chain-2050 fulfillment events -> rebuilt local projection
```

not:

```text
local journal -> replacement canonical economic history
```

## Local state after V510

Local state remains useful only for bounded unresolved work, such as:

- payment observed but not yet finalized;
- source finality verified but no delivery transaction prepared;
- transaction prepared but not broadcast;
- broadcast outcome unknown;
- delivery observed but not yet accepted under Chain-2050 finality policy;
- temporary correlation while waiting for the payment-keyed chain anchor; and
- operator evidence that does not claim canonical finality.

Once a fulfillment and its inventory transition are finalized on Chain-2050,
local payment/fulfillment/inventory indexes become disposable projections. On
conflict, finalized chain truth wins. A local record absent from the finalized
chain cannot authorize another delivery.

## DataNet boundary

This reference machine records economic truth only. It does not store payload
bytes and does not claim DataNet availability.

DataNet remains responsible for:

- payload retention;
- replica discovery;
- bounded retrieval;
- content verification;
- repair planning and execution;
- compaction; and
- availability evidence.

A Chain-2050 digest states which bytes are expected. It does not prove that any
peer still possesses those bytes. #1462 covers bounded object acquisition, and
#1464 covers chain-anchored reconstruction and repair planning. Neither should
be interpreted as a second Buy VOID economic ledger.

## Current-source gap

The current live Buy VOID delivery path remains a plain ERC-20 transfer and does
not carry the source payment key. Current canonical saga configuration is still
structurally single-chain. Therefore this reference is a successor contract, not
an activation claim.

A sensitive implementation lane must eventually map the reference transition to
an exact Chain-2050 contract/state/event surface that atomically provides:

1. payment-key non-reuse;
2. delivery-event non-reuse;
3. finite remaining inventory;
4. fulfillment event emission;
5. inventory conservation; and
6. deterministic state/finality querying after restart.

That lane must also integrate the complete isolated Base/Ethereum policy from
#1463. It must not silently fall back to one rail.

## Migration posture

A safe migration should proceed in separate gates:

1. independently review this reference contract;
2. identify the exact Chain-2050 state-transition implementation surface;
3. implement source-only state and event logic in a sensitive owned lane;
4. prove duplicate, conflict, stale-state, oversell, and restart adversaries;
5. integrate dual-rail finality adapters;
6. reconcile #1352 and #1314 against the reduced local-state requirement;
7. test on isolated non-production state;
8. obtain separate activation and inventory-funding authorization; and
9. enable public purchase only after legal and operational gates are also true.

## Executable evidence

The focused proof exercises the real reference machine across both rails,
including:

- exact payment and delivery identities;
- full-pool and one-atom purchases;
- exact duplicate idempotence;
- conflicting payment reuse;
- delivery-event reuse;
- stale-state rejection;
- oversell rejection;
- recipient and rate mismatch;
- source and Chain-2050 record-shape adversaries;
- fulfillment/state hash tampering;
- local projection replacement from chain truth;
- unanchored-local-claim rejection;
- bounded event export;
- direct event replay and sequence/predecessor drift;
- a 160-transition mixed Base/Ethereum conservation campaign; and
- canonical integer admission.

The same proof validates the checked-in fixture, schema identity, workflow
contract, documentation markers, and exact no-authority boundary.

## Authority boundary

This source package does not:

- mutate Chain-2050;
- call Base, Ethereum, or Chain-2050 RPC;
- read or write runtime files;
- access credentials, private keys, wallets, or signers;
- construct, sign, or broadcast a transaction;
- reserve or fund presale inventory;
- enable the public presale;
- change validators or Work Credits;
- deploy or restart a service;
- alter treasury or liquidity state; or
- move funds.

A source commit, green proof, or merged PR would still not authorize any of those
operations.
