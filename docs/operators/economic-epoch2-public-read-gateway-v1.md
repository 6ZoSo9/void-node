# Economic Epoch-2 public read gateway core v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1`

Status: source-only read core. No public route or default RPC transport is
enabled by this source.

## Purpose

The Epoch-2 migration gate requires a participant-verifiable read path for live
successor balances, transaction receipts, and deployed contract code.

Static public migration manifests are useful evidence, but they cannot replace a
live read path to the selected successor execution layer.

This core defines that bounded read contract without exposing raw public RPC.

## Query surface

Exactly three query kinds are admitted.

### Balance

The caller supplies:

- one canonical account address; and
- one exact canonical hex block number.

The core verifies Chain ID 2050, reads the exact block, queries
`eth_getBalance` at that exact block number, and re-reads the block afterward.

The block number, block hash, and state root must remain identical.

### Code

Code uses the same exact-block binding as balance.

The result must be canonical lower hex and is bounded to 128 KiB. The output
includes the exact code bytes and a SHA-256 of the decoded bytecode.

### Receipt

The caller supplies one exact transaction hash.

The core:

1. reads the receipt;
2. binds its block number/hash to `eth_getBlockByNumber`;
3. re-reads the receipt;
4. re-reads the block; and
5. requires identical receipt and block identity.

The source returns receipt status as observed. A reverted receipt is still
readable evidence; the core does not relabel it as success.

## RPC boundary

The core has no URL, socket, HTTP client, authentication material, or default
network transport.

A caller must inject a transport. The only method names used by this source are:

- `eth_chainId`;
- `eth_getBlockByNumber`;
- `eth_getBalance`;
- `eth_getCode`; and
- `eth_getTransactionReceipt`.

Each transport call has a caller-selected timeout bounded to 1–5,000 ms. The
core combines an event-loop timer with monotonic elapsed-time checking so a
transport result returning after the bound does not become successful merely
because the timer was delayed.

No arbitrary JSON-RPC method is accepted from the request.

Public request objects are inspected through the fixed required-field allowlist
only. Required fields must be own enumerable data properties; accessors,
descriptor traps, or missing fields fail closed. The core does not enumerate
caller-controlled keys, and unrecognized fields are ignored before
normalization so they cannot expand work or enter the evidence ID.

## Evidence output

Successful source queries are normalized and content-addressed as
`sha256:<64 lowercase hex>` evidence IDs.

The output binds:

- Chain 2050 / execution epoch 2;
- query kind;
- exact block number/hash/state root; and
- the normalized balance, code, or receipt result.

## Deliberate runtime boundary

This source proves the bounded **read primitive**, not a live public gateway.

It therefore keeps:

```text
public_economic_read_gateway_source_ready=true
live_balance_receipt_code_gateway_ready=false
public_balance_receipt_code_verification_ready=false
runtime_route_active=false
public_gateway_active=false
migration_authorized=false
public_activation_authorized=false
```

A later composition must provide a reviewed server-controlled successor RPC
transport, a bounded public route, request limits, and live external acceptance
before the migration gate can advance.

## Authority

This source has no transaction, wallet/signer, chain-write, Work Credit,
validator, migration, activation, or funds authority.

Verification:

```bash
node scripts/prove_void_economic_epoch2_public_read_gateway_v1.mjs
```
