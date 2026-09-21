# VOID public participant read session v1

Marker: `VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1`

## Purpose

This source-only Stage A defines the authentication primitive needed for an
authorized participant to view exactly one existing account's read-only Wallet
and Earn surfaces through the public app without making account-scoped data
anonymous-public.

It does **not** mount a public route, change the composition gateway, deploy a
service, restart a node, or activate a live session.

## Existing ownership proof

Participant Account Wallet records already bind an account ID to an encrypted
native private key and its derived wallet address. The existing wallet
`/unlock` route decrypts that key and places it into a live signer cache, so it
is deliberately **not** used for public-session authentication.

This primitive instead:

1. issues one short-lived account-bound challenge;
2. accepts the exact challenge, account, nonce, and participant passphrase;
3. reads the existing bounded Account Wallet record;
4. decrypts the key only in-process;
5. derives the wallet address and requires it to equal the stored address;
6. discards the plaintext key without touching the wallet unlock cache;
7. returns one random short-lived bearer session token;
8. stores only the token SHA-256 server-side; and
9. authorizes only `participant.account.read.v1` for the exact bound account.

The session token is not wallet authority and is not a signer.

## Session boundaries

Challenge lifetime: 60 seconds.

Session lifetime: 15 minutes.

The capability is fixed:

`participant.account.read.v1`

The primitive rejects:

- missing or malformed account IDs;
- missing/malformed wallet records;
- wrong passphrases;
- wallet-record address/key mismatches;
- expired, consumed, substituted, or cross-account challenges;
- malformed or tampered bearer tokens;
- expired/revoked sessions;
- attempts to use one account session for another account.

Logout removes the server-side session record immediately.

## Explicit non-authority

This generation grants no:

- wallet unlock;
- signer-cache write;
- transaction signing;
- wallet send;
- Work Credit mutation;
- validator mutation;
- generic RPC;
- account directory enumeration;
- public mutation authority;
- money movement.

The passphrase is authentication input only. It is never returned, written to
the session record, included in a token, or emitted by the proof.

## Stage B

A later reviewed Stage B may mount this primitive into the composition gateway
with fixed routes such as challenge/login/logout and session-authorized
read-only Wallet/Earn adapters. That integration must keep anonymous public mode
unchanged and must never proxy the private wallet create/import/unlock/export,
send, generic `/wc`, `/jobs`, `/receipts`, validator, operator, or RPC
namespaces.

Browser UI activation is also Stage B. The anonymous app must continue to clear
account context and show public-safe network truth when no authorized session
exists.

## Proof

`scripts/prove_void_public_participant_read_session_v1.mjs` uses an ephemeral
wallet record and deterministic fixture entropy to falsify replay, wrong
password, wrong account, token substitution, expiry, logout, and wallet
address-binding mismatch. Node 22, 24, and 26 run the focused hosted proof.

No real wallet record, passphrase, private key, live session, node runtime,
Tailscale route, DNS record, WordPress page, transaction, or funds action is
used by CI.
