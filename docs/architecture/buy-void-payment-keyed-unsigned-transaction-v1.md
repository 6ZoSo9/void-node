# Buy VOID payment-keyed unsigned transaction v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1`

Status: source-only transaction construction. This module performs no RPC,
filesystem I/O, credential access, wallet access, signing, transaction
broadcast, runtime route mount, or funds movement.

## Purpose

The payment-keyed Buy VOID path needs exactly one unsigned transaction shape
before signer/custody code is allowed to act. The legacy sign/broadcast adapter
reconstructs `VoidToken.transfer(address,uint256)` internally; this module
instead binds the merged payment-keyed fulfillment call to a generic bounded
nonce/fee plan.

The output is an exact EIP-1559 transaction with:

- type 2;
- Chain-2050;
- bounded nonce;
- bounded gas limit;
- bounded max fee and priority fee;
- `to` = the configured fulfillment contract;
- `value` = zero; and
- `data` = the exact canonical `fulfill(bytes32,address,uint256)` calldata.

## Call authority

A Ready-shaped object is not trusted by type shape alone. Before transaction
construction the module independently verifies:

- the merged payment-keyed fulfillment-call Ready truth surface;
- canonical `voidpay1` identity;
- canonical payment key rederived through the merged source-finality binder;
- exact configured fulfillment contract;
- delivery address;
- configured maximum VOID amount;
- 6-decimal VOID to 18-decimal token-atom scale;
- `uint256` bounds;
- exact `fulfill` calldata re-encoding;
- calldata SHA-256; and
- the merged call fingerprint.

## Plan authority

The generic transaction plan must bind Chain-2050 and satisfy all configured
nonce/gas/fee caps. Priority fee may not exceed either its policy cap or the
transaction max fee.

The normalized plan and complete unsigned transaction receive separate SHA-256
fingerprints for later custody/signer binding.

## Explicit non-authority

This module does not:

- contact Chain-2050;
- reserve a nonce on disk;
- access a credential;
- inspect a live wallet;
- sign a transaction;
- submit a transaction;
- reconcile a receipt; or
- mutate Buy VOID state.

The payment-keyed broadcaster prerequisite is merged in #1523 at
`4a0e734151fda89e212af979f2053d85f915c9d6`. A later reviewed signer/custody
composition can consume this exact unsigned transaction and that broadcaster
without reconstructing target or calldata.

## Latest merged prerequisite

The payment-keyed transaction-preparation prerequisite is now merged in #1522 at `d979a0ed225293dc2828fdcf82a17306d1d5de64`. This unsigned-transaction binder remains source-only; the latest PR generation is validated against that merged main.
