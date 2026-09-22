# VOID public participant login pairing v1

Marker: `VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1`

## Purpose

This source-only stage bridges a local Account Wallet to a future public
participant login key without sending wallet secrets through the public
website.

The local issuer proves ownership of one existing Account Wallet and returns
one short-lived one-time pairing token. A later public binding stage may consume
that token once while accepting the browser's dedicated Ed25519 login public
key.

This stage does not write the login-key binding registry.

## Local issue boundary

The issue command requires:

- exact participant account ID;
- absolute local VOID data directory;
- a local Account Wallet record for that account;
- a canonical mode-`0600` passphrase file owned by the current user; and
- a private mode-`0700` pairing state directory.

The passphrase is read only by the local issuer. The tool decrypts the existing
Account Wallet private key only long enough to derive its address and require
that it matches the wallet record. It does not call the existing wallet unlock
route and does not write the signer cache.

The public website never receives the wallet passphrase or wallet private key.

## Pairing token

A successful issue returns one bearer token:

`vpp1.<32-hex-ticket-id>.<43-base64url-secret>`

The active ticket record stores only the token SHA-256 and contains:

- account ID;
- wallet address;
- fixed capability `participant.login_key.bind.v1`;
- issued timestamp;
- expiry timestamp; and
- ticket ID.

The raw pairing token is returned once and is not stored in the pairing state.

Pairing lifetime: 5 minutes.

Only one unexpired active pairing ticket may exist for one account.

Issuance inside one pairing state directory is serialized by a create-only
mode-`0600` `.issue.lock` beneath the mode-`0700` state root. A concurrent
issuer fails closed with `pairing_issue_busy` before wallet ownership proof or
ticket creation. The lock is removed after the issuance attempt. If the issuer
process terminates abnormally while holding the lock, the stale lock must be
removed only after the operator confirms no issuer is still running.

## Consumption

The source exports a bounded consume primitive for the later public binding
stage. Consumption requires the exact account plus raw pairing token.

The primitive:

1. validates the token shape;
2. loads the exact active ticket by ticket ID;
3. requires account, capability, and expiry to match;
4. timing-safe compares the token SHA-256;
5. atomically renames the ticket from `active/` to `consumed/`; and
6. returns the account/wallet binding evidence with no mutation authority.

The atomic active-to-consumed rename makes the capability single-use across
concurrent consumers. Replays, wrong accounts, token substitutions, expired
tickets, and missing tickets fail closed.

## Explicit non-authority

This stage grants no:

- public Wallet passphrase transport;
- persistent wallet private-key storage;
- wallet unlock;
- signer-cache write;
- transaction signing;
- wallet send;
- Work Credit mutation;
- validator mutation;
- money movement; or
- login-key binding-registry mutation.

The pairing capability can only authorize the next separately reviewed
login-key binding step.

## Future binding stage

The next stage should accept:

- account ID;
- one unconsumed pairing token; and
- one browser-generated Ed25519 login public key.

After consuming the pairing ticket, that stage may append or rotate the exact
account→login-key binding under its own durable registry contract. The browser
private login key must never leave the browser.

After binding, normal public login uses the challenge-response primitive from
`VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1`; it never asks for the Wallet
passphrase again.

## CLI issue shape

A future operator/participant wrapper may call:

```bash
node tools/void-public-participant-login-pairing-v1.mjs issue \
  --account ACCOUNT \
  --data-dir /absolute/void/data \
  --passphrase-file /absolute/private/passphrase-file \
  --state-dir /absolute/private/pairing-state
```

Do not put the passphrase itself on the command line, in an environment
variable, in Git, or in the pairing token.

## Proof

`scripts/prove_void_public_participant_login_pairing_v1.mjs` uses only
ephemeral fixture Wallet material. It proves:

- correct local wallet ownership admission;
- mode-`0600` passphrase-file requirement;
- wrong-passphrase rejection;
- wallet-address mismatch rejection;
- no raw pairing-token persistence;
- no Wallet passphrase/private-key persistence;
- one active ticket per account;
- concurrent issuance fails closed behind the create-only issue lock;
- account-bound consumption;
- token-tamper rejection;
- one-time consumption/replay rejection;
- expiry rejection; and
- false wallet/signer/economic authority.

Node 22, 24, and 26 run the focused hosted proof.
