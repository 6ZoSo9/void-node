# DataNet registry single-use signing authorization consumption v1

Marker:
`VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1`

Status: durable replay-prevention gate before any deployer signer access.

## Purpose

Consume exactly one previously generated
`VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1` in a
private Nimo-local state store before any deployer credential may be opened for
signing.

Consumption is deliberately separate from signing. This gate writes one durable
record and nothing else.

## Required authorization

The consumer rebuilds the exact signing authorization from:

- the exact signing request;
- the full signing-request public/evidence lineage; and
- the authorization artifact.

The authorization must still bind:

- the exact transaction-bound confirmation;
- one exact candidate;
- one exact transaction fingerprint;
- one signing maximum;
- single-use semantics;
- broadcast false; and
- Chain-2050 write false.

## Runtime expiry

The authorization validity window is rechecked immediately before consumption.

Consumption fails closed when the runtime clock is:

- before `authorized_at_utc`; or
- at or after `valid_until_utc`.

No state mutation occurs for an authorization that is not currently valid.

## Private canonical state store

The production Nimo runner is fixed to:

`~/.local/state/void/datanet-registry-signing-v1`

That directory must already exist and must be:

- canonical absolute realpath;
- direct directory, not a symlink;
- owned by the current operator user; and
- mode 0700.

The gate does not create or relax the state root.

Within it, the consumer manages only:

`consumed/`

as mode 0700.

## Immutable single-use publication

The consumption record is mode 0600.

Publication uses:

1. exclusive temporary-file creation;
2. file fsync;
3. atomic hard-link publication to
   `consumed/<signing_authorization_id>.json`;
4. consumed-directory fsync; and
5. temporary-file removal.

If the final authorization path already exists, the authorization is rejected
as already consumed. Existing record bytes are never overwritten.

Replay prevention is explicitly scoped to the exact canonical state-store
realpath. The source does not claim global replay prevention outside that store.

## Consumption record

The record binds:

- signing authorization ID;
- signing request ID;
- candidate ID;
- final signing-review ID;
- transaction fingerprint;
- exact transaction-bound confirmation;
- exact public transaction summary;
- authorization and expiry times;
- consumption time; and
- SHA-256 of the canonical state-store realpath.

It records that consumption happened before any signer access.

## Authority boundary

This gate may mutate only the private replay-prevention state store.

It does **not**:

- inspect the deployer credential;
- access a private key;
- create/expose a signer or wallet;
- authorize signer access by itself;
- sign a transaction;
- export a signed transaction;
- submit or broadcast;
- deploy the registry;
- mutate Chain-2050 or validators;
- move tokens/funds;
- authorize migration/public activation; or
- retry automatically.

## Next gate

A green consumption record permits only:

`exact_nimo_registry_transaction_signing_from_consumed_authorization_v1`

The later signing gate must read the same canonical Nimo state store, rebuild
the same authorization/request/candidate lineage, recheck expiry again before
opening the credential, and sign exactly once.

Broadcast remains a separate authorization after signing.
