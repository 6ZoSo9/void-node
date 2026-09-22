# VOID public participant browser login key v1

Marker: `VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1`

## Purpose

This source-only browser primitive owns the dedicated Ed25519 login key used by
participant Stage-A authentication.

It is intentionally separate from the Account Wallet.

The module is added as an inert public-app asset in this stage. No existing app
entry point imports it, no network request is made, and no production route is
mounted.

## Key generation

The manager generates exactly one Ed25519 keypair per participant account.

The private key is generated with Web Crypto as **non-extractable** and with
only the `sign` usage. The public key has only `verify` usage and is exported
as canonical SPKI for server-side enrollment.

The public descriptor contains only:

- participant account ID;
- key type `ed25519`;
- SPKI DER encoded as base64url;
- SHA-256 fingerprint of the SPKI DER;
- capability `participant.account.read.v1`; and
- the explicit statement that the private key is non-extractable.

No raw private key is returned by the manager.

## Browser storage

The provided browser storage adapter uses IndexedDB:

- database: `void-participant-login-key-v1`
- object store: `login_keys_v1`
- key path: `account`

The record stores the browser `CryptoKey` objects directly. It does not
serialize private-key bytes into JSON, localStorage, sessionStorage, or cookies.

The IndexedDB adapter requires a secure browser context.

Generation is first-bind-only locally. The storage contract exposes `get` and
create-only `add`; there is no silent delete, replace, rotation, recovery, or
export operation in v1.

## Signing firewall

The private login key is **not** exposed as a generic signing oracle.

The only signing operation is `signChallenge(account, challenge)`.

Before Web Crypto is allowed to sign, the module requires the exact Stage-A
challenge shape and validates:

- marker `VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1`;
- domain `VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1`;
- exact participant account;
- exact capability `participant.account.read.v1`;
- 32-hex challenge ID;
- 32-byte base64url nonce shape;
- exact 60-second issued/expiry interval;
- canonical base64url payload encoding; and
- exact canonical JSON payload fields matching every challenge field.

A modified domain, account, challenge ID, nonce, timestamp, capability, payload,
or extra field fails before signing.

The returned object is already the exact login request body:

```json
{
  "challenge_id": "...",
  "nonce": "...",
  "account": "...",
  "signature_base64url": "..."
}
```

## Security limit of non-extractable browser keys

Non-extractable means the Web Crypto API refuses raw private-key export. It does
not make a compromised same-origin page harmless: malicious script executing
with the page's origin could still ask the CryptoKey to sign while it has
access to the browser context.

For that reason, activating this module in the public app must remain gated on
the separate public-origin script/CSP/supply-chain review. This source-only
stage does not activate the module.

## Explicit non-authority

This stage performs no:

- Account Wallet passphrase/private-key/seed access;
- Wallet unlock or transaction signing;
- generic arbitrary-message signing;
- network request;
- Work Credit mutation;
- validator mutation; or
- money movement.

## Proof

`scripts/prove_void_public_participant_browser_login_key_v1.mjs` uses Node's
Web Crypto implementation plus an in-memory create-only store to prove:

- Ed25519 generation;
- non-extractable private key;
- public SPKI export;
- private export rejection;
- duplicate-account key rejection;
- descriptor reload/fingerprint revalidation;
- exact Stage-A challenge signing;
- signature verification with the generated public key;
- cross-account/domain/payload/extra-field rejection;
- no generic network, Web Storage, cookie, Wallet, transaction-signing, or
  private-key-export primitive in the source.

Hosted proof targets Node 22, 24, and 26.
