# DataNet Content Commitment Single-Use Authorization Consumption v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1`

Status: durable consume-first boundary. This gate re-verifies the Sovereign authorization, re-checks its wall-clock validity, and atomically publishes one immutable consumption record before any transaction signer is accessed.

It does not access a signer, create a signer object, sign a transaction, authorize broadcast, broadcast, or write Chain-2050.

## Why consumption is separate from signing

A signed Sovereign authorization is intentionally single-use.

A pure signature verifier cannot prevent replay. This gate adds the missing durable state transition before signer access.

The safe ordering is:

1. re-verify exact Sovereign authorization;
2. re-check current wall-clock validity;
3. validate the private consumption state root;
4. atomically publish the immutable consumption record;
5. only a later gate may access the exact transaction signer.

A crash after step 4 burns the authorization rather than allowing an ambiguous re-sign. That is fail-closed behavior.

## Private state store

The caller supplies an existing absolute state root.

V1 requires:

- direct directory, not a symlink;
- no symlink ancestors;
- same UID where supported;
- exact mode `0700`;
- canonical realpath equality.

The gate creates only the `consumed/` child directory when absent, also mode `0700`.

Consumption records are mode `0600`.

## Atomic publication

The record is written to a private temporary file with exclusive create, file `fsync`, then published to the final authorization-ID path using an atomic hard link. The consumed directory is `fsync`ed after publication.

If the final authorization-ID record already exists, consumption HOLDs. The existing record is never overwritten or deleted.

There is no release/reuse operation in V1.

## Replay scope

Replay prevention is scoped to the exact state-store realpath.

The receipt records a SHA-256 fingerprint of that realpath.

V1 deliberately does **not** claim global replay prevention across multiple independently selected stores. Production runtime composition must bind one canonical state store and the later signer must require its exact fingerprint.

## Expiry

The gate re-checks time immediately before consumption:

- before `issued_at_utc` => HOLD;
- at or after `expires_at_utc` => HOLD.

The timestamp used by the production wrapper is `Date.now()`. The explicit-clock entrypoint exists for deterministic proofs and tests.

## Authority boundary

A GREEN consumption receipt means the authorization has been durably burned for one exact transaction fingerprint inside the exact state store.

GREEN still sets:

- signer object exposed = false;
- transaction signer access = false;
- wallet access = false;
- transaction signing performed = false;
- broadcast authorization = false;
- broadcast performed = false;
- Chain-2050 write authorization = false.

## Next gate

`exact_publisher_transaction_signing_from_consumed_authorization_v1`

That gate must independently rederive the exact candidate and consumption record, require the canonical state-store fingerprint, bind the exact publisher credential/signer, and sign at most once. It must not broadcast.
