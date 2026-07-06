# Block Signature Authority Boundary v1

Status: green

Marker:

```text
VOID_BLOCK_SIGNATURE_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded block persistence hole after the peer import validation boundary.

This lane proves that unsigned or malformed-signature blocks cannot reach persistent block storage through `SegStore.saveBlock()`.

## Implemented boundary

`validateBlockForAppend()` now requires:

- non-empty proposer
- 128-hex Ed25519 signature shape

This applies at the storage boundary before append persistence.

## Proof coverage

`scripts/prove_block_signature_authority_boundary.ts` proves:

- empty signature is rejected
- malformed signature is rejected
- missing proposer is rejected
- rejected blocks are not persisted
- valid proposer plus 128-hex signature-shape block persists

## Explicit limitation

This proof validates signature presence and Ed25519 signature shape only.

It does not yet cryptographically verify block signatures against an authenticated proposer public-key map. That requires a proposer-key / validator-runtime-truth binding and should be the next hardening lane.

It also does not implement fork choice or multi-peer quorum.
