# Buy VOID payment-keyed presale fulfillment contract v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_CONTRACT_V1`

Status: **source-only** contract, adversarial test, proof, and CI candidate. This
lane performs no deployment, no inventory funding, no wallet/signer access, no
transaction broadcast, and no public-presale activation.

## Problem closed by this source

The current Buy VOID delivery runtime ultimately prepares a bare
`VoidToken.transfer(recipient, token_amount_atoms)`. Local journals can prevent
duplicate work while their state survives, but complete rollback can erase that
memory and a newly prepared transaction can have a different nonce, fee tuple,
signed hash, and submission key.

The destination chain therefore needs one canonical economic identity that does
not change when local planning changes:

`payment_delivery_id = H(domain || canonical source payment identity)`.

This contract does not derive or authenticate that ID. The existing reviewed
source-finality stack must do that before the configured fulfillment authority
may call `fulfill`. Caller-written IDs are not source-payment truth.

## Contract semantics

`BuyVoidPresaleFulfillmentV1` binds:

- one immutable reviewed `VoidToken` address;
- one immutable existing fulfillment authority address supplied at deployment;
- an exact lifetime presale cap of **10,000,000 VOID**, represented as
  `10_000_000 ether` / `10,000,000 × 10^18` token atoms; and
- an optional immutable predecessor fulfillment registry.

For `fulfill(paymentDeliveryId, recipient, amountAtoms)`:

1. only the configured fulfiller may call;
2. payment ID, recipient, and amount must be nonzero;
3. the payment ID must be absent from this registry and its predecessor lineage;
4. predecessor + local fulfilled token atoms + the requested amount must not
   exceed the fixed 10,000,000-VOID lifetime cap;
5. the complete fulfillment record and aggregate amount are written before the
   external token call;
6. exactly `amountAtoms` are transferred to `recipient`; and
7. a false token return reverts the entire transaction, including the claim.

A successful first fulfillment therefore permanently owns that payment ID in
the reviewed lineage. A later attempt using the same ID transfers zero
additional VOID even if recipient, amount, nonce, fees, or signed transaction
bytes differ.

## Successor / rollback boundary

Exactly-once state must not reset when contract code is replaced. A successor
may name one immutable predecessor. Its read path recursively includes
predecessor payment IDs and fulfilled totals. Construction fails closed unless
the predecessor reports the same VOID token and exact presale cap.

This makes a reviewed successor lineage capable of preserving payment uniqueness
and finite inventory across generations. A deployment that deliberately ignores
the canonical predecessor lineage is not an authorized Buy VOID successor and
must be rejected by the separate deployment/configuration gate.

## What this does not prove

This contract is not a source-chain payment verifier and does not itself prove:

- Base or Ethereum USDC receipt/finality;
- authenticated source RPC transport;
- canonical `payment_delivery_id` derivation;
- Chain-2050 deployment identity or bytecode;
- signer/fulfiller identity;
- inventory custody or funding;
- public runtime wiring; or
- participant-facing delivery finality.

The merged source-finality work remains the gate that must establish an exact
canonical payment identity before signing/broadcast is allowed. Runtime
integration must also replace the current bare ERC-20 transfer plan with
`fulfill(paymentDeliveryId, recipient, amountAtoms)` calldata and reconcile the
resulting `Fulfilled` event.

## Activation boundary

Deployment must separately bind the exact Chain-2050 network, canonical
`VoidToken`, existing reviewed fulfillment authority, predecessor lineage, and
creation/runtime bytecode. Funding must be separately authorized and proved.
No deployment or funding authority is introduced by this source PR.
