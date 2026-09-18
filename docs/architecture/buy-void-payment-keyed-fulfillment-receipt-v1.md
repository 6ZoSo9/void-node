# Buy VOID payment-keyed fulfillment receipt evidence v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1`

Status: source-only read-only receipt verification. This module performs no
filesystem mutation, wallet or secret access, signing, transaction broadcast,
inventory mutation, runtime route mount, or funds movement.

## Purpose

The payment-keyed fulfillment contract provides two independent on-chain facts
for a successful delivery transaction:

1. `BuyVoidPresaleFulfillmentV1.Fulfilled`, binding the canonical payment
   delivery ID to the recipient, amount, and fulfillment block; and
2. `VoidToken.Transfer`, proving the same amount moved from the fulfillment
   contract to the recipient.

The legacy receipt reconciler is intentionally bound to a direct
`VoidToken.transfer` transaction. This module verifies the new contract-mediated
receipt shape without altering that live path.

## Expected authority

The verifier consumes the exact Ready output from the merged payment-keyed
fulfillment call binder and an exact expected transaction hash.

Before any RPC call it requires:

- the merged payment-keyed call marker/version/Ready truth surface;
- Chain-2050 and zero call value;
- exact configured fulfillment contract;
- canonical payment identity and 32-byte payment-delivery key;
- exact delivery address; and
- positive token-atom amount.

## Receipt binding

A confirming receipt must have:

- the exact expected transaction hash;
- `from` equal to the configured fulfillment wallet;
- `to` equal to the fulfillment contract;
- successful status;
- a positive block number and valid block hash;
- exactly one matching `Fulfilled` event emitted by the fulfillment contract;
- exactly one matching VOID `Transfer` event emitted by the configured token;
- `Fulfilled.paymentDeliveryId` equal to the canonical payment key;
- identical recipient and token-atom amount in both events;
- `Fulfilled.fulfilledAtBlock` equal to the receipt block number;
- transfer `from` equal to the fulfillment contract; and
- the VOID transfer log occurring before the fulfillment event, matching the
  contract's transfer-then-emit execution order.

Unrelated logs may coexist in the receipt, but duplicate matching fulfillment or
VOID transfer events fail closed.

## Finality and stability

The only RPC methods are:

- `eth_chainId`;
- `eth_getTransactionReceipt`; and
- `eth_blockNumber`.

After the configured minimum confirmation depth is reached, the verifier reads
the same receipt again and requires the transaction envelope, block number,
block hash, status, payment ID, recipient, amount, and both relevant log indices
to remain identical. A reorg or changed receipt fails closed.

## Explicit non-authority

This module does not:

- infer a transaction hash from untrusted input;
- access a signer or wallet;
- broadcast or retry a transaction;
- decrement inventory;
- write the execution journal;
- mark a public request fulfilled; or
- activate the Buy VOID route.

A later reviewed composition must connect this evidence to durable execution
custody and terminal closeout.
