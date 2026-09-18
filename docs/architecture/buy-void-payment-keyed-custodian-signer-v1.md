# Buy VOID payment-keyed custodian signer v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1`

Status: source-only signer boundary. The module has no RPC or broadcaster
dependency and performs no filesystem mutation or credential access itself.
Signing is possible only when an injected signer is supplied, `apply=true`,
and the exact confirmation token is present.

## Purpose

The legacy prepared-transaction credential signer reconstructs a native
transaction with a recipient target and empty calldata. That shape cannot safely
sign the payment-keyed fulfillment transaction.

This module consumes the explicit calldata-bearing payment-keyed custodian
request and reconstructs no transaction authority from legacy fields.

## Request revalidation

Before any signer method is called, the module independently verifies:

- exact request schema, marker, version, saga ID, attempt ID, and plan
  reservation ID;
- all no-authority booleans from the request;
- canonical payment identity and independently rederived payment key;
- exact fulfillment contract target;
- exact recipient and 6-to-18 decimal amount binding;
- exact canonical `fulfill(bytes32,address,uint256)` calldata;
- calldata SHA-256;
- fulfillment-call fingerprint;
- transaction-plan fingerprint;
- unsigned-transaction fingerprint;
- complete request fingerprint; and
- request idempotency key.

A forged request fails before the signer dependency is touched.

## Explicit signing gate

Signing requires all of:

- `apply=true`;
- exact confirmation
  `buyVoidSignPaymentKeyedCustodianTransactionV1`;
- injected signer dependency;
- signer-reported wallet address equal to the request wallet.

A dry run returns the validated fingerprints without wallet access or signing.

## Returned signature validation

After signing, the raw signed transaction is decoded independently and must
match exactly:

- signer/from wallet;
- type 2;
- Chain-2050;
- nonce;
- gas limit;
- max fee;
- priority fee;
- fulfillment-contract target;
- zero value;
- exact payment-keyed fulfillment calldata;
- empty access list; and
- transaction hash independently recomputed from the raw bytes.

A signer that signs another target, empty calldata, another amount, or another
fee/nonce shape is rejected.

## Authority boundary

The module may access the injected signer and produce a raw signed transaction
only under the explicit apply/confirmation gate.

It does not:

- read credentials or private keys itself;
- persist a raw signed transaction;
- call Chain-2050 RPC;
- broadcast a transaction;
- retry automatically;
- reconcile a receipt; or
- move funds.

The raw signed transaction is intended for a later opaque custody layer; it must
not be surfaced through the public Buy VOID runtime.
