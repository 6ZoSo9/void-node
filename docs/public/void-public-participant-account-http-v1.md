# VOID public participant account HTTP v1

Marker: `VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1`

## Purpose

This source-only stage gives the authenticated participant Wallet/Earn
projection an exact HTTP-shaped boundary.

It does **not** create a listener and does **not** mount routes into the public
composition gateway.

## Exact routes

- `GET|HEAD /__void/participant/account/v1/status.json`
- `GET /__void/participant/account/v1/wallet?account=<exact-account>`
- `GET /__void/participant/account/v1/earn?account=<exact-account>`

The Wallet/Earn routes require exactly one `account` query parameter matching
`^[A-Za-z0-9._:-]{1,128}$`. Duplicate or additional query fields fail closed.

No Wallet/Earn request body is accepted.

## Authorization

Wallet/Earn reads require the exact bearer shape:

`Bearer vps1.<32-lowercase-hex-session-id>.<43-base64url-secret>`

The token is passed only to the already-reviewed authenticated account
projection. It is never returned in a response and this stage performs no
source fetch of its own.

Ambiguous duplicate Authorization values fail before the projection is called.

The underlying projection remains responsible for cryptographic session
authorization, exact-account enforcement, binding rotation/revocation
revalidation, and sanitized loopback source reads.

## Error boundary

The HTTP-shaped contract intentionally normalizes internal failures:

- missing/malformed/expired/stale session -> `401 session_authorization_failed`
- valid session used for another account -> `403 account_scope_mismatch`
- sanitized source/projection failure -> `503 account_read_unavailable`

Raw session, filesystem, registry, source-route, or upstream error strings are
not emitted.

## Non-proxy boundary

This stage contains no `fetch()` call and knows no raw Wallet, Work Credit,
jobs, receipts, DataNet, signer, or RPC route.

It accepts only the already-sanitized projection result and revalidates:

- `ok: true`;
- exact account;
- exact `wallet` or `earn` view;
- `read_only: true`; and
- capability `participant.account.read.v1`.

A malformed projection result fails closed.

## Explicit non-authority

This stage adds no:

- cookie authentication;
- wildcard CORS;
- Wallet private-key access;
- Wallet unlock/export/send;
- transaction signing;
- Work Credit mutation or settlement;
- validator or operator mutation;
- generic RPC;
- raw-source proxy;
- listener;
- production route mount; or
- money movement.

## Proof

`scripts/prove_void_public_participant_account_http_v1.mjs` proves:

- exact status/Wallet/Earn route admission;
- scheme-relative authority-smuggling rejection;
- exact single-account query admission;
- missing and duplicate Authorization rejection before projection access;
- GET-only Wallet/Earn contract;
- request-body rejection;
- exact Wallet/Earn projection arguments;
- normalized session, scope, and source failures;
- malformed projection-result rejection;
- bearer-token non-reflection;
- no raw source route, fetch primitive, mutation primitive, listener, or raw
  empty catch.

Hosted proof targets Node 22, 24, and 26.
