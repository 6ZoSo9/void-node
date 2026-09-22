# VOID public participant account-read HTTP edge v1

Marker: `VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1`

## Purpose

This source-only edge composes the participant session HTTP contract with the
authenticated Wallet/Earn account-read projection.

It defines request/response behavior for two future public read routes without
creating a listener or mounting either route in production.

## Routes

Public status:

`GET|HEAD /__void/participant/account-read/v1/status.json`

Authenticated summaries:

- `GET /__void/participant/account-read/v1/wallet.json?account=<account>`
- `GET /__void/participant/account-read/v1/earn.json?account=<account>`

The protected routes accept exactly one `account` query parameter. Duplicate
account parameters and all extra query parameters fail closed.

## Authentication boundary

Protected reads require the Stage-A bearer session in the `Authorization`
header.

The edge:

1. rejects cookie authentication;
2. passes the exact bearer value and account only to the reviewed account-read
   projection;
3. relies on that projection to authorize the exact account before any
   loopback source fetch; and
4. never forwards the participant bearer token to Wallet/Earn source adapters.

Missing, invalid, stale, or wrong-account sessions return one coarse
`account_authorization_failed` response.

## Projection binding

Construction requires the exact
`VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1` authority descriptor.

The edge refuses composition if the projection advertises Wallet, Work Credit,
validator, generic-RPC, signing, money-movement, listener, production-route,
raw-source-forwarding, cookie-forwarding, or upstream-authorization authority.

Returned summaries are also checked for exact marker, account, view,
capability, and `read_only: true`.

## HTTP boundary

Protected routes:

- are GET-only;
- accept no request body;
- accept no cookies;
- require exactly one account query;
- expose no generic path proxy; and
- map source/projection failures to coarse `account_read_unavailable`
  responses rather than returning internal error text.

Unknown/raw Wallet, Work Credit, job, receipt, and generic routes return 404.

## Explicit non-authority

This stage grants no:

- Wallet passphrase/private-key access;
- Wallet unlock/export/send;
- transaction signing or broadcast;
- Work Credit mutation or settlement;
- job execution/submission;
- validator/operator mutation;
- generic RPC;
- cookie authentication;
- listener creation;
- production route mount; or
- money movement.

## Deployment

None.

A later gate may mount this handler into the reviewed public composition
gateway only after this source-only edge and its exact dependency generation
are green. Route mounting, service restart, public activation, and rollback
remain separate lifecycle decisions.

## Proof

`scripts/prove_void_public_participant_account_read_http_edge_v1.mjs`
composes:

`Ed25519 login -> Stage-A session HTTP -> account-read projection -> HTTP edge`

and proves:

- exact Wallet/Earn success;
- authorization before source fetch;
- wrong-account and missing-auth requests cause zero source reads;
- duplicate/extra query rejection;
- cookie rejection;
- GET-only/bodyless protected routes;
- no raw-route proxy;
- false-authority projection injection rejection;
- no listener or production mount; and
- no raw empty catch.

Hosted proof targets Node 22, 24, and 26.
