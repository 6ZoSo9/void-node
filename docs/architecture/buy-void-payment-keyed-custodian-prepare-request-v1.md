# Buy VOID payment-keyed custodian prepare request v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1`

Status: source-only request binding. This module performs no RPC, filesystem
I/O, credential access, wallet access, signing, transaction broadcast, runtime
route mount, or funds movement.

## Purpose

The legacy prepared-transaction custodian request can carry only a delivery
address and native value. Its credential signer therefore reconstructs a native
transaction with `to = delivery_address` and `data = 0x`.

That schema cannot represent the payment-keyed Buy VOID transaction, whose exact
authority is:

- `to = BuyVoidPresaleFulfillmentV1`;
- `value = 0`; and
- `data = fulfill(bytes32,address,uint256)`.

This module defines a new explicit calldata-bearing custodian request so later
custody and credential-signing layers do not need to infer or reconstruct the
target or calldata.

## Required bindings

A Ready request requires:

- exact saga ID;
- exact externally supplied execution-attempt ID;
- exact plan-reservation ID;
- the merged payment-keyed fulfillment-call Ready truth surface;
- canonical `voidpay1` payment identity;
- independently rederived canonical payment key;
- exact configured fulfillment contract;
- exact delivery address and VOID amount;
- 6-decimal VOID to 18-decimal token-atom scale and uint256 bounds;
- exact canonical `fulfill(bytes32,address,uint256)` calldata;
- calldata SHA-256;
- recomputed fulfillment-call fingerprint; and
- a Chain-2050 nonce/gas/fee plan within configured limits.

## Request surface

The request carries explicit transaction authority:

- wallet address;
- nonce;
- transaction target;
- zero transaction value;
- exact transaction calldata and SHA-256;
- gas limit;
- max fee;
- priority fee;
- canonical payment identity/key;
- delivery address and amount;
- fulfillment-call fingerprint;
- transaction-plan fingerprint;
- unsigned-transaction fingerprint;
- request fingerprint; and
- idempotency key.

The idempotency key binds saga, attempt, plan reservation, unsigned transaction,
and complete request fingerprint.

## Non-authority

The request explicitly sets credential, wallet, signing, transaction-broadcast,
raw-signed-transaction persistence, and money-movement authorizations to false.

A later reviewed custodian/signer must require its own explicit authorization
before credential access or signing and must validate this request again rather
than trusting shape alone.
