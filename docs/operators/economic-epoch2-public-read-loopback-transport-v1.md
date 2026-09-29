# Economic Epoch-2 public read loopback transport v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_READ_LOOPBACK_TRANSPORT_V1`

Status: **source transport green; production successor RPC endpoint HOLD**.

## Purpose

The bounded public economic read core now has a concrete server-side transport
primitive without exposing raw public RPC.

This source accepts only one exact endpoint class:

```text
http://127.0.0.1:<1024-65535>/
```

The endpoint is construction-time server configuration. It is not accepted from
a public read request.

## Network boundary

The transport rejects:

- HTTPS or any non-HTTP scheme;
- `localhost`, IPv6, wildcard, or non-loopback hosts;
- credentials in the URL;
- non-root paths;
- query strings or fragments;
- missing/default ports; and
- redirects.

No production endpoint is selected by this lane.

## RPC surface

Only these methods can leave the transport:

- `eth_chainId`;
- `eth_getBlockByNumber`;
- `eth_getBalance`;
- `eth_getCode`; and
- `eth_getTransactionReceipt`.

The transport accepts the fixed request tuple emitted by the read core:
`method`, `params`, and `timeout_ms`. Extra fields or write methods fail
before any HTTP request.

Responses are bounded to 512 KiB, require HTTP 200 plus an
`application/json` content type, and must be a JSON-RPC 2.0 response with the
expected request id. RPC errors fail closed.

Transport timeout is bounded to 1–5,000 ms and uses an abort signal. The public
read core independently maintains its own elapsed-time deadline as a second
boundary.

## Integration proof

The proof starts a fresh ephemeral HTTP server on `127.0.0.1` with an
operating-system-selected port and drives the merged public-read core through
the transport for:

- exact-block balance;
- exact-block code; and
- transaction receipt.

It also proves rejection of redirects, wrong content type, RPC errors,
oversized responses, timeout, non-loopback/canonical endpoint drift, request
shape drift, and a direct write-method attempt.

The test listener is local to hosted CI and is not a production VOID service.

## Gate boundary

This lane may establish:

```text
public_economic_read_gateway_source_ready=true
server_controlled_loopback_read_transport_source_ready=true
```

It does **not** establish:

```text
production_successor_rpc_endpoint_selected=true
live_balance_receipt_code_gateway_ready=true
public_balance_receipt_code_verification_ready=true
runtime_route_active=true
public_gateway_active=true
migration_authorized=true
public_activation_authorized=true
```

The next runtime gate must select and review the actual internal successor RPC
endpoint, bind the service/runtime identity, keep raw public RPC unreachable,
and prove live balance/receipt/code reads plus external public-route acceptance.

## Authority

This source/test lane opens only an ephemeral CI loopback listener. It performs
no external network access, production RPC contact, credential/wallet/private
key access, transaction construction/signing/submission/broadcast,
authoritative Chain-2050 write, Work Credit or validator mutation, token/funds
movement, migration, or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_public_read_loopback_transport_v1.mjs
```
