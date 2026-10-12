# DataNet Content Commitment Object Preflight v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1`

Status: read-only readiness evidence only.

## Purpose

This gate closes the one-shot race precondition before an unsigned commitment transaction plan may even be prepared.

It binds:

- the exact Phase-0 canonical-preparation intent;
- the exact approved assembly manifest and promotion candidate;
- the complete Ed25519-signed Sovereign review chain ending in `APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION`;
- the production Sovereign Primary public-key fingerprint;
- an accepted exact registry deployment attestation;
- the exact object/content/byte-length tuple;
- one current Chain-2050 observation block;
- exact registry runtime and immutable views; and
- two `isCommitted(objectIdSha256)` observations at the same fixed block.

## Sovereign approval provenance

A self-hashed preparation intent is not authority by itself.

Before any RPC call, the production observer now requires:

1. the exact assembly manifest;
2. the exact promotion candidate;
3. the complete signed review chain from sequence `0` through the final approval; and
4. the canonical Sovereign Primary Ed25519 public key whose DER SHA-256 equals the merged key-role registry fingerprint.

Every review decision is checked for:

- exact closed shape;
- Chain-2050 / Phase-0 / operator-rooted binding;
- exact assembly and candidate hashes;
- monotonic sequence;
- exact predecessor decision SHA-256;
- allowed HOLD reasons;
- terminal approval reason `SOVEREIGN_REVIEW_ACCEPTED`;
- nonzero review-evidence hash;
- nondecreasing timestamp not predating packet assembly;
- exact signer role/fingerprint;
- no mutation authority in the preparation boundary;
- deterministic decision ID; and
- valid Ed25519 signature.

All decisions before the final entry must be `HOLD`. The final entry must be `APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION`.

The final signed decision must match the decision ID/hash/sequence/fingerprint carried by the preparation intent.

The commitment tuple in the intent must also match both the signed assembly manifest and the exact promotion candidate.

A forged but internally self-consistent preparation intent therefore HOLDs **before any Chain-2050 RPC call**.

## Observer boundary

The observer accepts loopback HTTP only and permits only:

- `eth_chainId`
- `eth_blockNumber`
- `eth_getBlockByNumber`
- `eth_getCode`
- `eth_call`

All code and calls are pinned to the same head block tag.

The head block hash is re-read after the object checks.

There is no automatic retry.

## Required result

Both `isCommitted` reads must be exactly `false`.

If either is true, the gate HOLDs.

A block-hash change, runtime mismatch, registry-view mismatch, wrong chain, malformed RPC result, remote RPC URL, deployment-attestation mismatch, packet/approval mismatch, or observer failure also HOLDs.

## Meaning of GREEN

GREEN sets:

`sovereign_review_chain_verified=true`

`approved_packet_commitment_verified=true`

`object_uncommitted_preflight_verified=true`

`ready_for_separate_unsigned_transaction_plan=true`

It still does not authorize or perform:

- commit calldata construction;
- transaction construction;
- transaction signing;
- transaction broadcast;
- Chain-2050 mutation;
- wallet/signer access;
- validator/governance mutation;
- Work Credit mutation; or
- funds action.

## Production/test separation

The production observer pins the Sovereign Primary governance-attestation fingerprint from the merged key-role registry.

The focused proof uses a separate ephemeral Ed25519 key only through the explicit proof helper and proves that the production wrapper rejects that test key before RPC.

## Next gate

`separate_unsigned_commit_transaction_plan_with_fresh_pre_sign_revalidation`

That later transaction-plan lane must preserve a fresh pre-sign revalidation because another valid publisher action could commit the object after this observation.
