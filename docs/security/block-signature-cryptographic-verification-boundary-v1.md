# Block Signature Cryptographic Verification Boundary v1

Status: green

Marker:

```text
VOID_BLOCK_SIGNATURE_CRYPTOGRAPHIC_VERIFICATION_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Add a cryptographic block-signature verification boundary after the signature-shape boundary.

This lane proves that when a block carries a self-authenticating proposer public key, the block signature is verified against the canonical block header bytes and the proposer id is bound to the public key.

## Implemented boundary

- `blockHeaderBytes()` defines canonical signed block-header bytes.
- `nodeIdFromPubPEM()` derives the node id from the proposer public key.
- `verifyBlockSignatureWithPubkey()` verifies:
  - proposer public key parses as Ed25519/SPKI PEM
  - derived node id matches `block.proposer`
  - Ed25519 signature verifies over canonical block-header bytes
- `Node.sealBlock()` now includes `proposerPubkey` on newly sealed blocks.
- `validateBlockForAppend()` cryptographically verifies the block signature when `proposerPubkey` is present.

## Proof coverage

`scripts/prove_block_signature_cryptographic_verification_boundary.ts` proves:

- a correctly signed self-authenticating block verifies and persists
- bad signature is rejected
- tampered header after signing is rejected
- mismatched proposer public key is rejected
- locally sealed blocks carry `proposerPubkey` and verify cryptographically

## Explicit limitation

This is a self-authenticated cryptographic verification boundary, not full validator authority.

A random proposer can still generate its own key and sign a structurally valid block unless a trusted proposer-key / validator-runtime-truth allowlist is enforced.

The next hardening lane should bind proposer keys to validator authority and reject blocks signed by non-authorized proposers.

This also does not implement fork choice or multi-peer quorum.
