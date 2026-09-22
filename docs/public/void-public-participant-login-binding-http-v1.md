# VOID public participant login binding HTTP v1

Marker: `VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1`

## Purpose

This source-only HTTP-shaped adapter supplies the missing browser-to-enrollment
boundary between the local one-time pairing ticket and the already-reviewed
participant login-key binding primitive.

It does not create a listener and is not mounted into the public composition
gateway by this stage.

## Exact routes

- `GET|HEAD /__void/participant/enrollment/v1/status.json`
- `POST /__void/participant/enrollment/v1/bind`

The bind route accepts no query string.

## Exact bind request

The JSON object contains exactly:

```json
{
  "account": "participant-account",
  "pairing_token": "vpp1.<ticket-id>.<secret>",
  "login_public_key_spki_base64url": "<canonical Ed25519 SPKI>"
}
```

The body is capped at 8 KiB.

The adapter performs bounded shape admission before invoking the merged binding
primitive. Ed25519/canonical-SPKI validation remains authoritative in that
primitive and occurs before pairing-ticket consumption.

## Ambient-auth rejection

Enrollment authorization is **only** the one-time pairing token carried in the
exact JSON body.

The bind route rejects both Authorization and Cookie headers, including
ambiguous duplicate values. This stage therefore does not acquire ambient
cookie or bearer-session authority.

A later production edge mount must preserve same-origin/HTTPS and request-rate
boundaries, but those are not created here.

## Failure normalization

Once a request has valid public syntax, all binding-primitive failures are
normalized to:

`401 enrollment_failed`

The HTTP layer therefore does not expose whether:

- the account already has a login binding;
- the pairing ticket is absent, expired, consumed, wrong-account, or tampered;
- the supplied public key is not Ed25519/canonical;
- the registry is unavailable or at capacity.

Malformed public request syntax remains a `400 invalid_enrollment_request`.

## Successful response

Success returns only:

- exact account;
- key type `ed25519`;
- public-key SHA-256 fingerprint;
- capability `participant.account.read.v1`;
- `binding_created: true`;
- `pairing_consumed: true`; and
- explicit false secret/signing/money authority.

It does not return the raw pairing token or the Account Wallet address.

## Durability boundary

This adapter inherits the merged binding primitive's durability model:

- the pairing ticket moves atomically from `active/` to `consumed/`;
- the registry write is atomic and fsync-backed;
- an existing binding or invalid key is rejected before ticket consumption;
- a crash after ticket consumption but before registry publication remains an
  availability-only window and cannot create false login authority.

Automatic recovery/rotation is not introduced here.

## Explicit non-authority

This stage grants no:

- Wallet passphrase/private-key/seed access;
- login private-key access;
- Wallet unlock;
- signer-cache write;
- transaction signing;
- Wallet send;
- Work Credit mutation;
- validator mutation;
- generic RPC;
- session authority by itself;
- listener;
- production route mount; or
- money movement.

## Proof

`scripts/prove_void_public_participant_login_binding_http_v1.mjs` constructs
real private fixture state and invokes the actual merged binding primitive. It
proves:

- successful Ed25519 public-key binding;
- registry mode `0600`;
- active-to-consumed ticket transition;
- raw pairing token and Wallet address are not reflected;
- replay, existing-binding, and invalid-key failures are externally normalized;
- existing-binding and invalid-key rejection do not consume the ticket;
- Authorization/Cookie/query/extra-field rejection;
- no raw Wallet/economic route, listener, signing primitive, or raw empty catch.

Hosted proof targets Node 22, 24, and 26.
