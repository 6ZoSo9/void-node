# VOID Public Earn Gateway v1

Status: implementation lane. Deployment remains separate and must be proven after merge.

## Purpose

Expose only the bounded network paths an outside Work Credit participant needs to claim and complete one server-selected useful-work ticket.

The gateway does not expose the operator issue route. Public ticket creation is limited to the signed Public Ticket Claim v1 contract. The gateway does not accept participant-selected Work Credit amounts, tasks, datasets, or input hashes. The fixed pilot award remains exactly **3 WC** after verified useful work.

## Public routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/__void/public-earn-gateway-v1/status.json` | GET/HEAD | Sanitized gateway status and safety boundary |
| `/health` | GET/HEAD | Sanitized coordinator identity and health used by the participant CLIs |
| `/wc/public-earning-pilot-v1/status` | GET/HEAD | Sanitized coordinator capability and public-claim status |
| `/wc/redeemable?account=...` | GET/HEAD | Sanitized canonical account balance |
| `/wc/public-earning-pilot-v1/claim-ticket` | POST | Signed, server-selected, rate-limited public ticket claim |
| `/wc/public-earning-pilot-v1/submit-result` | POST | Capability-bound result submission only |
| `/download/wc-public-ticket-claim-v1.sh` | GET/HEAD | Public claim-and-earn CLI |
| `/download/wc-public-earning-participant-v1.sh` | GET/HEAD | Existing ticket execution CLI |

## Explicitly not public

- `/wc/public-earning-pilot-v1/operator/issue`
- `/wc/public-earning-pilot-v1/sign-claim` because it is a loopback executor helper
- generic `/jobs/submit`
- local executor control routes
- wallet creation, import, unlock, export, signing, or sending
- WC to VOID execution
- Buy VOID fulfillment
- validator admission or mutation
- operator or administrative APIs

## Transport boundary

The internet-facing adapter receives bounded requests and forwards only the exact earning routes to a separately configured coordinator upstream. The coordinator upstream address is never emitted by adapter status or response surfaces.

The claim route:

- accepts POST with no query string;
- requires JSON and an exact `claim` plus `signature` object;
- rejects Authorization headers;
- validates bounded account, node-ID, public-key, nonce, timestamp, and Ed25519 signature shapes before contacting the coordinator;
- strips cookies and all caller headers;
- applies a separate in-memory claim rate limit;
- bounds request and response sizes;
- rejects redirects;
- forwards no participant-selected work parameters outside the signed claim contract.

The coordinator remains authoritative for public-key-to-node-ID derivation, signature verification, timestamp and replay enforcement, active-ticket bounds, cooldowns, daily limits, server-selected work, ticket creation, and token storage.

The result route requires JSON, has bounded request and response sizes, uses an upstream timeout, strips cookies and every caller header except one strictly validated `Bearer wcep1.<32-hex-ticket-id>.<43-base64url-secret>` capability on the exact submit route, rejects redirects, and applies an independent submission rate limit. Missing, malformed, or ticket-mismatched capability authorization is rejected before the coordinator is contacted. Authorization is never forwarded on read or claim routes.

## Participant flow

1. The participant downloads the public claim CLI.
2. The CLI verifies the local executor identity and trusted coordinator identity.
3. The local executor signs a fresh claim using its VOID node key.
4. The CLI submits the signed claim through the exact public claim route.
5. The coordinator verifies key possession, replay protection, policy limits, and server-selected work.
6. The gateway returns one single-use ticket and capability token over HTTPS.
7. The existing participant CLI performs the ticket-bound work locally.
8. The CLI submits the signed result through the exact public result route.
9. Precision verifies persisted work evidence and credits exactly 3 WC once.
10. The CLI verifies the canonical balance delta and deletes the consumed ticket file.

A successful claim or submission grants no wallet, settlement, Buy VOID, validator, or operator authority.
