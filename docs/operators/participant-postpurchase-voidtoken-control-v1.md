# Participant post-purchase VoidToken control v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1`

Status: source-only ownership/control mechanism. This contract does not submit or
broadcast a transaction, expose public RPC, enable the legacy participant-wallet
mutation routes, read a private key, or move tokens.

## Purpose

A successful presale delivery is not sufficient for public-sale readiness.
After delivery, the participant must be able to control and transfer the
delivered canonical `VoidToken` without surrendering private-key custody to the
VOID node.

The legacy participant-wallet mutation helper is intentionally default-off and
uses a private loopback RPC. It is not the production answer to this gate.

This source contract instead proves a non-custodial primitive:

1. start from a confirmed delivery evidence projection;
2. require the delivered address to be the canonical participant EOA;
3. parse a raw signed Chain-2050 transaction;
4. recover the EOA signer directly from the transaction signature;
5. require recovered signer = delivery recipient;
6. require target = canonical `VoidToken`;
7. require zero native value and the Epoch-2 zero-gas-price fee envelope;
8. decode exact ERC-20 `transfer(address,uint256)` calldata; and
9. require the requested transfer amount to be positive and no greater than the
   delivered lot bound by the evidence projection.

## Delivery evidence boundary

The source verifier accepts the public-safe fields produced by a successful
`VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1` decision:

- `delivery_confirmed=true`;
- chain ID `2050`;
- canonical `VoidToken`;
- participant delivery address;
- delivered token amount;
- delivery transaction hash;
- receipt evidence fingerprint; and
- positive observed confirmation count.

The current source proof uses a synthetic projection and therefore reports:

`delivery_provenance_verified=false`

A later runtime/evidence adapter must bind these fields to a real accepted
delivery receipt before this mechanism can satisfy the durable launch gate.

## Participant control transaction

The participant control transaction must be a signed EIP-1559 transaction with:

- chain ID `2050`;
- type `2`;
- recovered signer equal to the delivery recipient;
- target equal to canonical
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- native value `0`;
- `maxFeePerGas=0`;
- `maxPriorityFeePerGas=0`;
- gas limit between the transaction minimum and the current bounded
  `3,000,000` maximum;
- exact `transfer(address,uint256)` calldata;
- nonzero transfer recipient; and
- positive transfer amount not exceeding the delivered lot.

This demonstrates that the participant EOA itself—not a project wallet or
relayer—authorizes the token movement.

## Deliberately unresolved runtime path

The current Epoch-2 signed-intent/public-submission gateway proves bounded
authorization and replay handling, but it does not submit or broadcast a
participant EOA raw transaction.

Therefore this source contract deliberately reports:

- `transaction_submission_path_ready=false`;
- `runtime_route_active=false`;
- `public_submission_open=false`;
- `transaction_submitted=false`;
- `transaction_broadcast=false`;
- `authoritative_chain2050_write=false`; and
- `participant_balance_verified_live=false`.

A future bounded raw-transaction submission lane must preserve participant
signature ownership, exact target/calldata/value/fee policy, nonce/replay
safety, receipt/finality evidence, and the no-private-key-custody boundary.

## Coupled launch status

This mechanism is **source-ready only**. It does not by itself set the durable
coupled candidate's
`participant_post_purchase_voidtoken_control_ready=true`.

That gate remains false until real delivery provenance and a participant-usable
submission/finality path are proven.

## Authority

No wallet/signer/private-key access, transaction construction, signing,
submission, broadcast, Chain-2050 write, token movement, market/presale
activation, or funds movement is authorized.

Verification:

```bash
node scripts/prove_void_participant_postpurchase_voidtoken_control_v1.mjs
```
