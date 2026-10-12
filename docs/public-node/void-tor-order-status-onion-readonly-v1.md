# VOID Tor Order Status Onion Read-Only V1

`VOID_TOR_ORDER_STATUS_READONLY_V1` maps one exact public-agent order-status
read path through the existing loopback-only Tor onion origin.

## Exact route

```text
GET /public-agent/services/v1/orders/:submission_id/status.json
```

The route uses the existing bounded order-status request handler and configured
source root. It does not expose the node HTTP listener and does not proxy to a
caller-selected upstream.

## Required runtime inputs

```text
VOID_TOR_ORDER_STATUS_ROOT
VOID_TOR_ORDER_STATUS_MAX_BYTES
VOID_TOR_ORDER_STATUS_MAX_CONCURRENT_REQUESTS
```

Equivalent command-line flags are:

```text
--order-status-root PATH
--order-status-max-bytes 1048576
--order-status-max-concurrent-requests 8
```

The source root must be an existing real directory, not a symlink. The bounded
source resolver continues to reject traversal, unsafe links, oversized sources,
invalid JSON, and source-contract mismatches.

## Discovery

```text
/.well-known/void-order-status-onion-v1.json
/public-node/agents/order-status-tor-v1.json
```

The signed Tor transport descriptor also advertises
`agent_surfaces.order_status_readonly_v1`.

## Security boundary

The surface requires a valid signed VOID-node-to-onion binding, accepts exactly
`GET`, accepts no body, refuses credential and Origin headers, uses one exact
route template, invokes a fixed local handler, exposes no filesystem root, and
grants no submission, payment, dispatch, Work Credit, wallet, signer, runtime,
or operator authority.

## Status honesty

This lane implements and fixture-proves the source path. It does not install or
configure Tor, restart a service, modify a live source root, or claim a
successful external onion request. Live activation remains separate.
