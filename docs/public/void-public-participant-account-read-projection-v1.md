# VOID public participant account read projection v1

Marker: `VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1`

## Purpose

This source-only stage composes an authorized Stage-A participant session with
the existing loopback-only sanitized Wallet and Earn UI adapters.

It does **not** expose the raw participant wallet routes or raw Work Credit,
jobs, receipts, or DataNet routes.

## Authorization boundary

Every read requires:

1. one bearer session from
   `VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1`;
2. one explicit account ID matching `^[A-Za-z0-9._:-]{1,128}$`; and
3. one exact view: `wallet` or `earn`.

The projection invokes `authorizeAccountRead()` before any source fetch.
Wrong-account and invalid-session requests therefore do not contact the
loopback source.

The bearer token is never forwarded to the source adapter.

## Exact source boundary

The source base must be an exact HTTP loopback origin:

`http://127.0.0.1:<1-65535>`

No userinfo, path, query, fragment, HTTPS origin, hostname alias, or remote
address is accepted.

Only these already-sanitized source routes are read:

- Wallet: `/__void/ui/wave3/wallet.json?account=<exact-account>`
- Earn: `/__void/ui/wave4/earn.json?account=<exact-account>`

No caller cookies or Authorization headers are forwarded. Fetches use GET,
omit credentials, reject redirects, require JSON, have a fixed timeout, and
bound the response body to 256 KiB.

## Double sanitization

The existing Wave-3/4 source bodies are not returned directly.

### Wallet summary

The public-session projection retains only:

- whether the sanitized wallet source is available;
- whether the account has a Wallet;
- the account's public Wallet address;
- sanitized native-gas display availability;
- Ledger WC balance/count; and
- Production WC balance/count.

It removes source base URLs, local hostname/node identity, Wallet unlocked
state, unlocked address, source route metadata, and raw source bodies.

### Earn summary

The public-session projection retains only:

- bounded earning status and safe-mode state;
- jobs-per-hour counters;
- legacy WC accounting totals;
- Production WC balance/count;
- last-hour reward totals;
- recent job count;
- verification receipt count; and
- bounded DataNet counters.

It does not return job or receipt items, dataset IDs, selection detail, last
credit references, raw source routes, or source bodies.

## Upstream contract verification

Before projecting a source response, the stage requires:

- the exact expected Wave-3 or Wave-4 marker;
- `read_only: true`;
- exact account equality; and
- every relevant mutation/authority boundary to remain `false`.

A source marker/account mismatch fails closed.

## Explicit non-authority

This stage grants no:

- Wallet private-key access;
- Wallet unlock/export/send;
- transaction signing;
- Work Credit mutation or settlement;
- job execution/submission;
- reward award;
- validator or operator mutation;
- generic RPC;
- listener creation;
- production route mount; or
- money movement.

## Deployment

None. This branch adds a source-only composition primitive. A later reviewed
HTTP edge binding may expose the two summaries after the session HTTP contract
itself is green.

## Proof

`scripts/prove_void_public_participant_account_read_projection_v1.mjs`
composes a real Ed25519 Stage-A session with synthetic sanitized Wave-3/4
sources and proves:

- exact-account authorization happens before source fetch;
- invalid/wrong-account sessions never reach the source;
- bearer Authorization and cookies are not forwarded;
- only exact loopback source origins are accepted;
- Wallet local hostname, source-base, unlock state, and source route metadata
  do not escape;
- Earn job/receipt details, dataset details, last-credit detail, and raw source
  routes do not escape;
- source marker and account mismatches fail closed;
- declared oversized source bodies fail closed;
- no raw private route, mutation primitive, listener, or raw empty catch is
  introduced.

Hosted proof targets Node 22, 24, and 26.
