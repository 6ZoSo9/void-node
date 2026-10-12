# Buy VOID payment-keyed Chain-2050 broadcaster v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1`

Status: source-only broadcaster factory and signed-transaction admission wall. The
factory performs no RPC call, wallet access, signing, runtime route mount, or
funds movement. Its returned broadcaster can submit a transaction only when
explicitly invoked by a later reviewed execution composition.

## Purpose

The legacy Chain-2050 broadcaster accepts only signed
`VoidToken.transfer(address,uint256)` transactions. The payment-keyed Buy VOID
path instead requires signed calls to:

`BuyVoidPresaleFulfillmentV1.fulfill(bytes32,address,uint256)`.

This module provides the downstream broadcaster prerequisite without altering
the live dependency bootstrap or runtime composition.

## Local admission before RPC

Every raw signed transaction is parsed locally and must satisfy all of the
following before any Chain-2050 RPC call:

- EIP-1559 transaction type 2;
- chain ID 2050;
- exact configured fulfillment-contract destination;
- zero transaction value;
- exact decodable `fulfill(bytes32,address,uint256)` calldata;
- nonzero 32-byte payment-delivery ID;
- valid recipient address;
- positive token-atom amount not above the configured maximum; and
- exact canonical re-encoding of the calldata.

Malformed raw transactions, legacy ERC-20 transfers, wrong targets, nonzero
value, zero payment IDs, and over-limit amounts are rejected locally with
`submission_may_have_occurred=false`.

## Chain boundary

The factory accepts loopback HTTP only. It reuses the existing bounded
Chain-2050 transport and native broadcaster core.

Creating the factory performs no RPC probe. When the returned broadcaster is
called with an admissible transaction, the reused Chain-2050 broadcaster:

1. verifies chain identity before submission;
2. verifies chain identity again at the per-broadcast boundary; and
3. submits only with `eth_sendRawTransaction`.

The module performs no retry and does not wait for a receipt.

## Explicit non-authority

This module does not:

- create or read a wallet;
- read credentials or secrets;
- sign a transaction;
- mount a runtime route;
- alter nonce custody;
- mutate inventory;
- reconcile a receipt; or
- activate the public Buy VOID path.

Transaction broadcast and money movement are possible only if a later caller
obtains the returned broadcaster and explicitly calls it with a valid signed
transaction.

## Next integration

A later reviewed composition must pair this broadcaster with the payment-keyed
transaction-preparation planner and a sign/broadcast adapter that binds the exact
prepared fulfillment target and calldata to the signed transaction. The current
live ERC-20 dependency bootstrap remains unchanged until that full binding is
ready.
