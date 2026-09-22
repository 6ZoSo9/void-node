# VOID public participant session HTTP v1

Marker: `VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1`

## Purpose

This source-only stage gives the Stage-A Ed25519 participant session primitive
an exact HTTP-shaped contract without mounting it in the production public
gateway.

It intentionally stops before Wallet or Earn projection.

## Exact routes

The contract recognizes only:

- `GET|HEAD /__void/participant/session/v1/status.json`
- `POST /__void/participant/session/v1/challenge`
- `POST /__void/participant/session/v1/login`
- `POST /__void/participant/session/v1/logout`

No listener or application route is mounted by this stage.

### Challenge

The challenge body is exactly:

```json
{"account":"participant-account-id"}
```

The account must match `^[A-Za-z0-9._:-]{1,128}$`.

Challenge issuance does not read the login-key registry and therefore does not
reveal whether an account is enrolled. It returns the exact domain-separated
payload that the participant's dedicated Ed25519 login key must sign.

### Login

The login body is exactly:

```json
{
  "challenge_id":"<32 lowercase hex>",
  "nonce":"<challenge nonce>",
  "account":"participant-account-id",
  "signature_base64url":"<Ed25519 signature>"
}
```

Successful login returns one short-lived bearer session token. The underlying
session primitive stores only its SHA-256 digest.

Authentication failures are normalized to
`account_authentication_failed`; the public HTTP contract does not expose
binding lookup failure details.

### Logout

Logout accepts the bearer token only in `Authorization`. It accepts no request
body and is intentionally idempotent: the HTTP-shaped result is `204` whether
the presented token was live, already logged out, malformed, or unknown.

## Transport rules

- challenge and login require JSON;
- request bodies are limited to 8 KiB;
- query strings are rejected on all exact routes;
- challenge and login reject Authorization headers;
- session authentication is bearer-token based, not cookie based;
- responses are `no-store`;
- wildcard CORS is not enabled.

A later edge binding must preserve these rules and add its own bounded ingress
and rate-limit policy.

## Internal authorization hook

The source exports an internal `authorizeAccountRead(authorization, account)`
hook. It delegates to Stage A and therefore:

- authorizes exactly one account;
- revalidates the current account→login-key binding;
- rejects rotated or revoked bindings;
- grants only `participant.account.read.v1`;
- grants no signing or money movement authority.

The hook is intended for the later sanitized Wallet/Earn projection stage. It
is not a generic proxy capability.

## Explicit non-authority

This stage performs no:

- Account Wallet passphrase transport;
- Wallet private-key access;
- Wallet unlock;
- signer-cache write;
- transaction signing;
- Wallet send;
- Work Credit mutation;
- validator mutation;
- generic RPC;
- listener creation;
- production route mount; or
- money movement.

## Proof

`scripts/prove_void_public_participant_session_http_v1.mjs` proves:

- unknown and enrolled accounts receive the same challenge shape;
- an unknown account fails only at login with the generic authentication error;
- a real Ed25519 fixture can log in;
- the resulting session authorizes only its exact account;
- challenge replay fails;
- malformed media type and query-bearing requests fail closed;
- challenge/login reject Authorization headers;
- logout is idempotent and revokes a live session;
- no Wallet/Earn/raw-data route, listener, secret, signing primitive, or raw
  empty catch is introduced.

Hosted proof targets Node 22, 24, and 26.
