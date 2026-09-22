# VOID public participant login binding v1

Marker: `VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1`

## Purpose

This source-only stage consumes one valid pairing ticket and binds one
browser-generated Ed25519 login public key to exactly one participant account.

It is the second half of participant login enrollment:

```text
local Account Wallet proof
  -> one-time pairing ticket
  -> browser Ed25519 public key
  -> private account-to-login-key registry
  -> later challenge-response read session
```

No public HTTP route is mounted by this stage.

## Input boundary

A binding request requires:

- exact participant account ID;
- one unconsumed `VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1` token;
- one canonical Ed25519 SubjectPublicKeyInfo value encoded as base64url;
- the private pairing state directory; and
- the private participant-login binding registry path.

The browser private login key is never accepted by this stage.

Non-Ed25519 keys are rejected before the pairing ticket is consumed.

## Binding registry

The registry marker is:

`VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1`

Each active binding contains exactly:

- account ID;
- `active` status;
- `ed25519` key type;
- canonical public-key PEM;
- SHA-256 of canonical SPKI DER; and
- the single capability `participant.account.read.v1`.

The registry is private mode `0600` beneath a mode-`0700` parent directory.
Writes use a same-directory temporary file, file fsync, atomic rename, and
parent-directory fsync.

A create-only registry lock serializes binding writers.

## First-bind-only boundary

This generation creates only the first login binding for an account.

If an account already has a binding, the operation fails with
`binding_account_exists` **before** the pairing ticket is consumed.

Silent key rotation is forbidden. Login-key rotation/recovery requires its own
later reviewed operation.

## Pairing consumption

After the public key and registry preconditions are accepted, the binding stage
consumes the exact pairing ticket using the pairing primitive's atomic
`active/` to `consumed/` rename.

The resulting registry never stores:

- the raw pairing token;
- Wallet passphrases;
- Wallet private keys; or
- login private keys.

A crash after pairing consumption but before registry publication cannot create
false login authority. The user may mint a fresh local pairing ticket and retry.
A later durability refinement may add an explicit enrollment transaction
journal if operational experience requires automatic recovery from that narrow
availability-only window.

## Session composition

The focused proof loads the resulting binding registry into
`VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1`, signs a real challenge with the
browser fixture's Ed25519 private key, and requires exact-account read-session
authorization.

This proves the source-only chain composes without introducing Wallet or
economic authority.

## Explicit non-authority

This stage grants no:

- Wallet passphrase transport;
- Wallet private-key access;
- login private-key access;
- Wallet unlock;
- transaction signing;
- Wallet send;
- Work Credit mutation;
- validator mutation;
- session authority by itself; or
- money movement.

Binding one public login key creates authentication metadata only.

## Proof

`scripts/prove_void_public_participant_login_binding_v1.mjs` proves:

- local pairing ticket → login binding composition;
- login binding → Stage-A challenge-response session composition;
- Ed25519-only public keys;
- canonical SPKI SHA-256 binding;
- no private-key or raw-token persistence;
- invalid key types do not consume pairing tickets;
- existing-account collisions do not consume pairing tickets;
- silent rotation is refused; and
- all Wallet/signer/economic authority remains false.

Node 22, 24, and 26 execute both pairing and binding proofs in the focused
enrollment workflow.
