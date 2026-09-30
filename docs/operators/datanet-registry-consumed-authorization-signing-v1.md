# DataNet registry consumed-authorization signing v1

Marker: `VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1`

Status: exact one-shot Nimo signing implementation. Broadcast remains HOLD.

## Purpose

Sign exactly one already-reviewed DataNet registry deployment transaction on
Nimo only after all prior authority and replay gates have completed.

The signing runtime requires:

- the exact unsigned transaction candidate and its complete evidence lineage;
- the exact signing request and final signing-review lineage;
- one exact transaction-bound signing authorization;
- the generation-bound Nimo replay-state identity;
- the immutable consumption record for the exact signing operation;
- the same operation-bound confirmation carried by the signing authorization;
- the dedicated registry deployer credential; and
- a caller-selected private output path for the signed artifact.

General operator approval is not accepted as the confirmation.

## Order of irreversible actions

The production runner is deliberately ordered:

1. validate all public/evidence artifacts;
2. rebuild the exact signing authorization;
3. derive the stable signing-operation ID;
4. verify the externally bound state-root generation;
5. load and validate the immutable consumption record;
6. recheck authorization expiry;
7. validate the signed-output destination before key access;
8. atomically publish a private signing claim for the operation;
9. read back and validate that exact claim;
10. recheck state-root generation and expiry;
11. open the deployer credential;
12. derive and verify the deployer address;
13. sign the exact unsigned hash once;
14. cryptographically recover and verify the signed transaction; and
15. exclusively publish the mode-0600 signed artifact.

The durable signing claim is published before credential access. If any failure
occurs after that claim, the operation remains claimed and cannot be retried by
this gate. This intentionally prefers a stranded operation over a second
signature.

## Durable signing claim

The signer creates one private mode-0600 record under the generation-bound
state root:

`signing/<voiddrso1_operation_id>.json`

The claim binds:

- signing-execution admission ID;
- stable signing-operation ID;
- state-store ID;
- consumed authorization record ID;
- signing authorization ID;
- candidate ID;
- transaction fingerprint;
- unsigned transaction hash; and
- authorization expiry.

A pre-existing claim fails closed before credential access.

## Private-key handling

The Nimo runner opens the dedicated credential only after admission and claim
validation.

The credential directory must be canonical, owner-only mode 0700. The
credential must be a direct regular file, one hard link, current-user owned,
mode 0400/0600, and opened with `O_NOFOLLOW`.

Credential text is parsed directly from a mutable byte buffer into a 32-byte
key buffer. The source buffer and raw key buffer are zeroed after use. The key
is never printed, hashed into evidence, or written to disk.

The signing core derives the signer address and requires exact equality with
the dedicated registry deployer address before signing.

## Signed artifact

The private mode-0600 artifact contains:

- signing claim/operation/authorization/request/candidate lineage;
- deployer address;
- unsigned transaction hash;
- signed transaction hash;
- signed serialized transaction;
- SHA-256 of signed serialized bytes; and
- explicit authority facts.

The signed artifact does **not** authorize broadcast.

## Authority boundary

This gate may:

- access the dedicated deployer private key after durable claim;
- sign exactly one bound transaction;
- export that signed transaction to one private file.

It does **not**:

- submit or broadcast;
- deploy the contract;
- call an RPC send method;
- mutate Chain-2050 through this gate;
- mutate validators;
- move tokens or funds directly;
- authorize migration/public activation; or
- retry automatically.

Every signed artifact records:

- `transaction_broadcast_authorized=false`;
- `transaction_broadcast_performed=false`;
- `chain2050_write_authorized=false`; and
- `automatic_retry=false`.

## Confirmation boundary

The runner requires the exact operation-bound confirmation already embedded in
the signing authorization. That confirmation binds:

- candidate ID;
- final signing-review ID;
- unsigned transaction hash; and
- transaction fingerprint.

A generic instruction such as “continue” is not the signing confirmation.

## CI

CI never uses the production deployer private key.

The proof uses the canonical production evidence fixture for
authorization/consumption admission, then a separate ephemeral test key to prove
the EIP-1559 signing, sender recovery, signed transaction hash, and key-buffer
zeroing behavior.

## Next gate

A green private signed artifact permits only:

`separate_signed_transaction_verification_and_broadcast_authorization_v1`

Broadcast remains separately authorized and separately replay-controlled.
