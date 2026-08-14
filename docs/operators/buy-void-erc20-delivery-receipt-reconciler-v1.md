# Buy VOID canonical ERC-20 delivery receipt reconciler v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1`

## Purpose

Provide a standalone, read-only Chain-2050 receipt-reconciliation bridge for the
canonical `VoidToken` ERC-20 Buy VOID delivery path.

This source lane does not mount the canonical delivery runtime and does not
perform terminal closeout. It establishes whether one already-broadcast
execution attempt has exact, final confirmed evidence of the intended
`VoidToken.Transfer`.

## Required evidence

A successful decision requires all of the following to agree exactly:

- Chain ID `2050`;
- one exact execution-attempt ID across reservation, prepared transaction, and
  broadcast observation;
- the reservation's canonical fulfillment-intent fingerprint plus exact payment
  and request keys;
- the execution attempt's prepared and broadcast transaction hash;
- receipt success status;
- receipt `from` = the allowlisted fulfillment wallet;
- receipt transaction `to` = the configured canonical `VoidToken` contract;
- exactly one `Transfer(address,address,uint256)` event emitted by that token;
- event `from` = the fulfillment wallet;
- event `to` = the intended delivery address;
- event value = `void_amount_units * 10^12`, using the canonical 6-decimal
  fulfillment-unit to 18-decimal token-atom scale;
- a stable receipt block number and block hash; and
- the configured minimum confirmation depth.

An otherwise successful transaction without the exact transfer event is not
delivery evidence.

## RPC boundary

Only these read-only JSON-RPC methods are permitted:

- `eth_chainId`;
- `eth_getTransactionReceipt`;
- `eth_blockNumber`.

The built-in HTTP transport accepts loopback HTTP only and enforces bounded
request/response sizes and a bounded timeout.

## Output

A confirmed result includes a SHA-256 evidence fingerprint binding:

- Chain ID;
- transaction hash;
- receipt block number and hash;
- token contract;
- transfer sender;
- transfer recipient;
- exact token atom amount; and
- transfer log index.

The fingerprint is an integrity identifier, not a signature or consensus
certificate.

## Authority boundary

This reconciler is dry-only. It does not:

- write an execution journal;
- write a public request journal;
- decrement inventory;
- access a wallet or secret;
- sign a transaction;
- broadcast or retry a transaction;
- mount a runtime route;
- restart a service; or
- move funds.

Terminal closeout and any write of confirmed fulfillment state remain separate
later gates.

`PROTECT THE CORE`
