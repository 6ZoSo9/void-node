# VOID Public Earn Gateway v1

Status: implementation lane. Deployment remains separate and must be proven after merge.

## Purpose

Expose only the network paths an outside Work Credit participant needs after receiving an operator-issued, account-bound, task-bound, expiring ticket.

The gateway does not issue tickets. It does not accept participant-selected Work Credit amounts. The fixed pilot award remains exactly **3 WC** after verified useful work.

## Public routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/__void/public-earn-gateway-v1/status.json` | GET/HEAD | Sanitized gateway status and safety boundary |
| `/health` | GET/HEAD | Sanitized coordinator identity and health used by the participant CLI |
| `/wc/public-earning-pilot-v1/status` | GET/HEAD | Sanitized coordinator capability status |
| `/wc/redeemable?account=...` | GET/HEAD | Sanitized canonical account balance |
| `/wc/public-earning-pilot-v1/submit-result` | POST | Capability-bound result submission only |
| `/download/wc-public-earning-participant-v1.sh` | GET/HEAD | Public participant CLI |

## Explicitly not public

- `/wc/public-earning-pilot-v1/operator/issue`
- generic `/jobs/submit`
- local executor control routes
- wallet creation, import, unlock, export, signing, or sending
- WC to VOID execution
- Buy VOID fulfillment
- validator admission or mutation
- operator or administrative APIs

## Transport boundary

The internet-facing adapter receives the bounded request and forwards only the exact earning routes to a separately configured coordinator upstream. The coordinator upstream address is never emitted by the adapter status or response surfaces.

The result route requires JSON, has bounded request and response sizes, uses an upstream timeout, strips cookies and every caller header except one strictly validated `Bearer wcep1.<32-hex-ticket-id>.<43-base64url-secret>` capability on the exact submit route, rejects redirects, and applies an in-memory submission rate limit. Missing, malformed, or ticket-mismatched capability authorization is rejected before the coordinator is contacted. Authorization is never forwarded on read routes or any non-submit route. The capability ticket and coordinator remain responsible for account, task, dataset, executor, expiry, signature, single-use, and duplicate-credit enforcement.

## Participant flow

1. An operator issues one bounded ticket outside the public gateway.
2. The participant downloads the CLI over the public gateway.
3. The participant runs the CLI against a trusted public coordinator base and coordinator node ID.
4. The participant node performs the ticket-bound work locally.
5. The CLI submits the signed result through the exact public result route.
6. Precision verifies the receipt and credits exactly 3 WC once.
7. The CLI verifies the canonical balance delta and deletes the consumed ticket file.

A successful submission proves useful-work earning only. It grants no wallet, settlement, Buy VOID, validator, or operator authority.
