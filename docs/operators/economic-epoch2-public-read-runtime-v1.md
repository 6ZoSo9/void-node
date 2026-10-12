# Epoch-2 public economic read runtime v1

Status: **source/runtime package ready; Precision activation evidence pending**.

## Purpose

This lane closes the read-only migration gate without activating the successor
network for transaction processing.

The runtime exposes verified public balance, runtime-code, and transaction
receipt lookup through a bounded HTTP surface. It never exposes raw JSON-RPC.

## Successor read replica

Precision runs a pinned Besu 26.8.1 read replica from the exact production
genesis already proven by the production-successor equivalence lane.

The replica is fixed to:

```text
RPC = http://127.0.0.1:18552/
genesis_sha256 = 6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941
block_number = 0x0
block_hash = 0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d
state_root = 0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2
```

It has no validator key, no P2P, no discovery, and no public raw RPC.

The replica is evidence/read infrastructure only. It is not the activated
three-validator successor network.

## Bounded read service

The loopback service runs at:

```text
http://127.0.0.1:4124
```

Only four GET/HEAD routes exist:

```text
/public-node/economic/epoch2/read-status-v1.json
/public-node/economic/epoch2/balance-v1?address=<canonical-address>
/public-node/economic/epoch2/code-v1?address=<canonical-address>
/public-node/economic/epoch2/receipt-v1?tx=<canonical-transaction-hash>
```

Balance and code are fixed to successor block `0x0`. Callers cannot select
another block or RPC method.

The service uses the existing source-proven public-read core and loopback-only
transport. The only RPC methods available beneath the service remain:

```text
eth_chainId
eth_getBlockByNumber
eth_getBalance
eth_getCode
eth_getTransactionReceipt
```

## Receipt semantics before activation

There are no real successor transaction receipts before transaction processing
is activated.

Therefore live evidence does not fabricate a successful receipt.

Instead, the runtime proves that:

- the real selected successor endpoint accepts the bounded receipt lookup;
- a fixed absent transaction hash deterministically returns no receipt;
- the response is classified through the exact public receipt route;
- successful-receipt normalization and block-identity revalidation remain
  source-proven by the existing gateway tests.

The live evidence records both:

```text
live_receipt_lookup_transport_verified=true
receipt_found=false
successful_receipt_semantics_source_proven=true
```

## Public edge

The existing Precision public-app composition gateway proxies only the four
exact paths above to the loopback read service.

It does not expose or forward raw JSON-RPC.

Public runtime evidence must prove the paths at three layers:

1. direct loopback service;
2. local composition gateway;
3. public HTTPS through `https://seed.nullfeed.org`.

The public route must also return the existing `https://voidchain.org` CORS
allowance.

## Promotion meaning

Fresh runtime evidence may promote:

```text
production_successor_rpc_endpoint_selected=true
live_balance_receipt_code_gateway_ready=true
public_balance_receipt_code_verification_ready=true
runtime_route_active=true
public_gateway_active=true
```

It must retain:

```text
successor_state_root_public_void_anchor_ready=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

After this promotion, the migration classifier should report only:

```text
successor_state_root_public_void_anchor_required
```

## Activation controls

The installer has separate controls for:

- writing the local service units and composition drop-in;
- starting the read-replica and bounded read services; and
- restarting the already-live composition gateway.

Installing source configuration does not restart public composition unless
`RESTART_COMPOSITION=1` is explicitly supplied.

No wallet/private key, transaction signing, transaction submission, transaction
broadcast, validator mutation, token movement, funds movement, or authoritative
Chain-2050 write is part of this lane.
