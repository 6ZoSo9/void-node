# Buy VOID payment-keyed transaction preparation v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_TRANSACTION_PREPARATION_V1`

Status: source-only read-only transaction planning. This module performs no
filesystem mutation, wallet access, secret access, signing, transaction
broadcast, runtime route mount, inventory mutation, or funds movement.

## Purpose

The merged payment-keyed fulfillment call binder produces the canonical
Chain-2050 call:

`BuyVoidPresaleFulfillmentV1.fulfill(bytes32,address,uint256)`.

The legacy transaction-preparation path still estimates and prepares
`VoidToken.transfer(address,uint256)`. This module closes the next dependency
gap without changing the live execution path.

It consumes the exact Ready output from the merged payment-keyed fulfillment
call binder and plans nonce, gas, fees, and native gas balance against the
fulfillment contract and the exact fulfillment calldata.

## Authority binding

Before any RPC request, the planner requires and independently checks:

- a reserved execution attempt with no prepared, broadcast, failure, or
  confirmation state;
- exact attempt ID equality between the attempt and fulfillment call;
- the merged payment-keyed call marker/version/Ready truth surface;
- Chain-2050 and zero transaction value;
- exact configured fulfillment contract address;
- canonical payment identity and delivery address equality with the reserved
  unsigned instruction;
- exact VOID fulfillment units and 6-to-18 decimal atom conversion;
- canonical payment key shape;
- exact re-encoding of
  `fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)`;
- SHA-256 of the exact calldata; and
- rederivation of the merged call fingerprint.

A caller-authored object that merely resembles a Ready result cannot change the
target, recipient, amount, payment key, or calldata without failing one of these
bindings.

## Read-only planning

The only allowed RPC methods are:

- `eth_chainId`;
- `eth_getTransactionCount` using `pending`;
- `eth_gasPrice`;
- `eth_estimateGas`; and
- `eth_getBalance`.

The gas estimate request is bound to:

- `from`: the configured fulfillment wallet;
- `to`: the configured fulfillment contract;
- `value`: zero; and
- `data`: the exact payment-keyed fulfillment calldata.

The module then applies configured gas and fee multipliers/caps and verifies the
wallet has enough native Chain-2050 balance for the maximum estimated gas cost.

## Network boundary

The default HTTP transport accepts loopback HTTP only and applies bounded
request/response sizes plus socket and total deadlines. The source also accepts
an injected transport for deterministic proofing.

## Explicit non-authority

This planner does not:

- access a wallet or signer;
- read credentials;
- sign a transaction;
- submit a transaction;
- mutate the execution attempt;
- reserve a nonce on disk;
- mount a runtime route;
- decrement inventory; or
- move funds.

The existing live ERC-20 preparation/composition/sign/broadcast path remains
unchanged by this gate.

## Next gate

The next reviewed migration should bind durable preparation custody and the
sign/broadcast validator to this planner's fulfillment-contract target and exact
calldata. The legacy `VoidToken.transfer` broadcaster and receipt assumptions
must remain fail-closed until those downstream bindings are migrated together.
