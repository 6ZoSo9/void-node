# VOID public participant read session v1

Marker: `VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1`

## Purpose

This source-only Stage A defines the authentication primitive needed for an
authorized participant to view exactly one account's read-only Wallet and Earn
surfaces through the public app without making account-scoped data anonymous-
public.

It does **not** mount a public route, change the composition gateway, deploy a
service, restart a node, create a login binding, or activate a live session.

## Credential separation

The permanent public-login credential is a dedicated Ed25519 login key, not the
Account Wallet private key and not the Account Wallet passphrase.

The server consumes an operator-owned account-to-login-key binding registry.
Each active binding contains exactly:

- participant account ID;
- `ed25519` key type;
- Ed25519 public key PEM;
- exact SPKI SHA-256 fingerprint;
- fixed capability `participant.account.read.v1`; and
- active status.

The private login key never belongs in the binding registry.

A later local-only enrollment stage may prove Account Wallet ownership and bind
a fresh dedicated login public key to that account. That enrollment must happen
through a separately reviewed local boundary. The public website must never ask
for or transport the Account Wallet passphrase, wallet private key, seed phrase,
or transaction signer.

## Login challenge-response

The primitive:

1. accepts one syntactically valid account ID;
2. issues one short-lived opaque account-bound challenge without revealing
   whether that account currently has a login binding;
3. returns the exact domain-separated signing payload;
4. accepts the exact challenge ID, nonce, account, and Ed25519 signature;
5. re-reads the current login-key binding;
6. verifies the signature against the exact bound public key;
7. consumes the challenge regardless of authentication success;
8. returns one random short-lived bearer session token after successful proof;
9. stores only the session token SHA-256 server-side; and
10. authorizes only `participant.account.read.v1` for the exact bound account.

The signing domain is:

`VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1`

## Session boundaries

Challenge lifetime: 60 seconds.

Session lifetime: 15 minutes.

The capability is fixed:

`participant.account.read.v1`

The primitive rejects:

- malformed account IDs;
- malformed or noncanonical binding registries;
- duplicate account bindings;
- wrong key type, fingerprint, status, or capability;
- missing bindings;
- invalid Ed25519 signatures;
- expired, consumed, substituted, or cross-account challenges;
- malformed or tampered bearer tokens;
- expired/revoked sessions;
- attempts to use one account session for another account; and
- sessions whose current binding has been rotated or revoked.

Logout removes the server-side session record immediately.

Challenge issuance does not consult the registry, so it does not become an
account-binding enumeration oracle. Authentication failures collapse to the
generic `account_authentication_failed` result.

## Binding rotation and revocation

Every session authorization revalidates the current account binding
fingerprint. Rotating or removing the account's login-key binding invalidates
the existing session before account data is returned.

Possession of an old session token therefore does not bypass a later binding
rotation or revocation.

## Explicit non-authority

This generation grants no:

- Account Wallet passphrase transport;
- wallet private-key access;
- wallet unlock;
- signer-cache write;
- transaction signing;
- wallet send;
- Work Credit mutation;
- validator mutation;
- generic RPC;
- account directory enumeration;
- public mutation authority; or
- money movement.

The login private key authenticates only the bounded read-session capability.
It is deliberately separate from transaction/wallet authority.

## Stage B

A later reviewed Stage B may add a **local-only enrollment tool** that proves
the participant controls an existing Account Wallet and binds one fresh
dedicated Ed25519 login public key to that account. The Wallet passphrase may be
used locally by that enrollment tool but must never cross the public gateway.

A following public composition integration may mount fixed challenge/login/
logout routes and session-authorized read-only Wallet/Earn adapters. That
integration must keep anonymous public mode unchanged and must never proxy the
private wallet create/import/unlock/export, send, generic `/wc`, `/jobs`,
`/receipts`, validator, operator, or RPC namespaces.

The browser should keep the short-lived bearer session token only in
`sessionStorage` and attach it explicitly only to the exact authorized
Wallet/Earn read adapter requests. Ambient cookies are not required.

## Proof

`scripts/prove_void_public_participant_read_session_v1.mjs` creates ephemeral
Ed25519 login keys and a private fixture binding registry. It falsifies replay,
wrong signatures, unbound accounts, account substitution, token tampering,
challenge/session expiry, logout, binding rotation, and binding revocation.

The proof also requires:

- no wallet passphrase input in the session primitive;
- no wallet private-key access;
- no wallet unlock cache access;
- no transaction-signing primitive;
- exact account binding;
- exact `participant.account.read.v1` capability; and
- server-side session token SHA-256 comparison.

Node 22, 24, and 26 run the focused hosted proof.

No real wallet record, passphrase, wallet private key, login private key, live
session, node runtime, Tailscale route, DNS record, WordPress page, transaction,
or funds action is used by CI.
