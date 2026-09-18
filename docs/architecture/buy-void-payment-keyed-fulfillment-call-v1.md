# Buy VOID payment-keyed fulfillment call binding v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1`

Status: source-only call-binding contract. It performs no RPC call, wallet access,
signing, transaction broadcast, deployment, inventory funding, runtime route
mount, or funds movement.

## Identity boundary

Current Buy VOID source contains two different payment-key hash domains.

The historical/local fulfillment journal uses a local indexing key. The merged
source-finality and Chain-2050 two-phase settlement path uses the canonical
fulfillment-anchor key derived from the finalized
`voidpay1:<base|ethereum>:<transaction>:<log>` payment identity under the
`VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1` framing domain.

Those keys are not interchangeable.

This module therefore accepts both facts but gives authority only to the key
carried by the merged production-ready source-finality preflight:

- `canonical_payment_key_sha256` determines the `bytes32` passed to
  `BuyVoidPresaleFulfillmentV1.fulfill(...)`;
- the binder reuses the merged source-finality payment-binding verifier to
  rederive that key from the exact canonical identity rather than trusting a
  caller-supplied hash;
- `legacy_local_payment_key_sha256` is retained only as diagnostic/local
  continuity metadata; and
- changing only the legacy local key cannot change calldata or the call
  fingerprint.

## Bound call

A ready result binds:

- exact execution attempt ID, equal to the source-finality Ready attempt;
- exact canonical payment identity;
- source rail, transaction hash, and log index independently matched to the
  unsigned fulfillment instruction;
- verified canonical fulfillment-anchor key;
- delivery address;
- 6-decimal VOID amount and the corresponding 18-decimal token atoms;
- Chain-2050;
- exact fulfillment contract address;
- zero transaction value; and
- canonical `fulfill(bytes32,address,uint256)` calldata.

Payment identities and unsigned decimal policy/amount scalars are length-bounded
before regex or BigInt work. The maximum source amount remains a server policy
input and is checked before calldata construction. The merged fulfillment contract independently enforces
the 10,000,000-VOID lifetime inventory ceiling on-chain.

## Composition requirement

This module is not a source-finality verifier. A raw caller-created object with
`production_source_finality_authority_ready=true` must never be accepted as
production authority merely because it matches this TypeScript shape.

The merged source-finality execution preflight now exposes the verified
canonical payment identity/key and exact attempt ID. This binder's input type is
that exact merged Ready type, and runtime checks require the complete Ready
truth surface before calldata can be produced.

Production composition must invoke that preflight and pass its exact Ready
result directly into this call binder. This module remains source-only until the
existing transaction-preparation/signing/broadcast path is migrated to consume
this call output.

## Remaining gates

The existing ERC-20 preparation/composition/broadcaster path still targets the
VOID token and enforces `transfer(address,uint256)`. A later reviewed
integration must migrate those bindings to the fulfillment contract target and
this exact calldata, update gas estimation/custody/signed-transaction/broadcaster
validation, and preserve all existing nonce, fee, signer, submission, crash
recovery and receipt gates.

No production configuration or deployment is authorized by this document.
