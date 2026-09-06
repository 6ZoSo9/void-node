# Buy VOID Chain-2050 two-phase presale reference v1

Marker: `VOID_BUY_VOID_CHAIN2050_PRESALE_TWO_PHASE_V1`

Status: source/proof/schema/reference only. No Chain-2050 contract is deployed by
this package, no source-chain RPC is called, no wallet or signer is accessed, no
transaction is constructed or broadcast, and no public presale state is changed.

## Why this replaces the earlier draft reference

The earlier #1465 draft modeled one transition that accepted both a finalized
source-chain payment and an already-finalized Chain-2050 VOID delivery, and only
then decremented finite presale inventory. That ordering is not sufficient as a
presale authority model: the delivery could already have happened before the
inventory check rejected an oversubscribed purchase.

It also collapsed two facts that the active V510 coordination contract keeps
separate: **payment confirmation remains separate from fulfillment**.

This generation therefore replaces that single post-delivery accounting step
with two canonical Chain-2050 transitions.

## Canonical economics

- presale pool: `10,000,000 VOID`;
- VOID decimals in the reference: `6`;
- USDC decimals: `6`;
- fixed rate: `2 VOID per 1 USDC` (`$0.50/VOID`);
- exact payment required;
- no hidden minimum;
- no per-buyer throttle below remaining inventory.

The aggregate invariant is:

```text
available + reserved + fulfilled = 10,000,000 VOID
```

## Phase 1 — confirm and reserve

`confirmPayment()` consumes one independently finalized Base or Ethereum USDC
payment record. The canonical payment identity remains:

```text
voidpay1:<base|ethereum>:<transaction_hash>:<log_index>
```

The payment key is byte-identical to the canonical #1463 chain-anchor key:

```text
SHA256(
  "VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0" ||
  U32BE(byte_length(canonical_payment_identity)) ||
  canonical_payment_identity
)
```

The older plain SHA-256 identity digest remains compatibility evidence only; it
is not the payment-key authority used by this reference generation.

Before any fulfillment may be accepted, the transition:

1. binds the exact expected prior Chain-2050 presale-state hash;
2. validates the closed finalized source-payment record;
3. derives the exact length-framed #1463 chain-anchor payment key;
4. computes the exact `2:1` VOID reservation;
5. rejects if `required_void > available_void`;
6. creates one immutable payment reservation;
7. moves the exact amount from `available` to `reserved`;
8. increments the confirmed-payment count and global state sequence; and
9. advances the transition root and state hash.

An exact replay of the same payment is idempotent. Reuse of the same payment
identity with changed amount, recipient, policy fingerprint, or finality
attestation is a conflict.

Most importantly, **oversubscription is rejected before fulfillment**. A buyer may
reserve the exact remaining pool, after which another payment cannot obtain
fulfillment authority from this state machine.

A capacity-rejected result is deliberately a non-effect result in this reference.
It does not reserve inventory or grant delivery authority. Handling a customer
who paid after capacity was exhausted remains a separately reviewed
reconciliation/refund/legal policy.

## Phase 2 — record finalized fulfillment

`recordFulfillment()` requires an existing exact reservation keyed by the payment
key. It then consumes one independently finalized Chain-2050 VOID delivery
observation.

The fulfillment transition requires:

- exact payment reservation already present;
- exact recipient equality;
- delivered VOID equal to the reserved amount;
- one delivery event bound to at most one payment;
- successful Chain-2050 execution;
- containing block identity;
- accepted checkpoint height/hash covering that block;
- finality-policy identity and attestation digest; and
- exact current presale-state precondition.

Only then does the model move the amount from `reserved` to `fulfilled`.
`available` does not change during fulfillment.

A standalone fulfillment record re-derives its payment key from its canonical
payment identity and rejects substitution. Its reservation-anchor digest is
context-bound: replay and the eventual Chain-2050 implementation must match that
digest against the already-recorded reservation for the same payment key.

An exact duplicate finalized delivery converges without another mutation.
A changed delivery, checkpoint, finality policy, finality attestation, amount, or
recipient conflicts.

## State and replay

The state binds:

```text
available_inventory_void_atoms
reserved_inventory_void_atoms
fulfilled_inventory_void_atoms
confirmed_payment_count
fulfilled_payment_count
state_sequence
previous_state_sha256
last_transition_anchor_sha256
transition_root_sha256
state_sha256
```

Every confirmation and every fulfillment advances one state sequence.
Therefore:

```text
state_sequence = confirmed_payment_count + fulfilled_payment_count
```

`replayTwoPhasePresaleEventsV1()` reconstructs the same state from an ordered,
bounded sequence of `payment_confirmed` and `fulfillment_recorded` reference
events. Each event must reproduce its exact record and resulting state digest.
This is a reference for chain reconstruction, not a local ledger authority.

## Source-chain and Chain-2050 finality boundary

The reference accepts closed finalized evidence objects but does not itself
authenticate Base/Ethereum RPC, Chain-2050 ancestry, checkpoint signatures, or
fork choice. #1463 remains the prerequisite for isolated Base/Ethereum policy and
finality-adapter identity.

A future sensitive `contracts/mainnet/` implementation must bind those verified
inputs to actual Chain-2050 authorization. Caller-written JSON is never sufficient
authority.

The current Chain-2050 delivery remains a plain ERC-20 transfer. Until the
two-phase state/event surface exists on-chain, local correlation and reservation
state remain only bounded pre-finalization operational state and must not be
misrepresented as finalized chain truth.

## DataNet boundary

DataNet owns off-chain byte availability: retention, retrieval, replication,
repair, compaction, and content verification. It does not own presale economic
truth.

A future Chain-2050 content commitment can identify expected bytes; DataNet still
must retain and serve those bytes. Finalized economic indexes derived from the
chain are disposable projections.

## Implementation consequence

The sensitive implementation should not copy the earlier post-delivery model.
It should expose separate reviewed authority for:

1. payment confirmation / finite-inventory reservation; and
2. fulfillment recording against that exact reservation.

This does not prescribe whether the final production implementation performs the
VOID transfer inside a settlement contract or records a separately executed
delivery. If delivery remains external, the runtime must obtain the chain-canonical
reservation **before** it signs or broadcasts the delivery.

## Evidence

The focused proof covers Base and Ethereum confirmation, one-atom purchases,
full-pool reservation, oversubscription rejection before fulfillment, stale-state
rejection, duplicate/conflict behavior, reservation-before-fulfillment,
wrong-recipient and wrong-amount holds, checkpoint coverage, delivery-event
non-reuse, state/anchor tampering, exact two-phase replay, and a 120-transition
mixed-rail conservation campaign.

## Authority boundary

All runtime-sensitive flags are false. This package does not authorize Ready,
merge, deployment, production configuration, RPC access, credentials, keys,
wallets, signers, inventory funding, transaction construction/signing/broadcast,
public presale activation, treasury/liquidity mutation, validators, Work Credits,
or funds movement.
