# Block Proposer Authority Allowlist Boundary v1

Status: green

Marker:

```text
VOID_BLOCK_PROPOSER_AUTHORITY_ALLOWLIST_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after cryptographic block-signature verification.

A self-authenticating block can prove it was signed by the claimed key, but that alone does not prove the proposer is authorized.

This lane adds an authority-mode allowlist so storage append validation can reject self-signed but unauthorized proposer blocks.

## Runtime controls

Authority mode is opt-in through environment:

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_TRUSTED_PROPOSERS=<comma separated proposer node ids>
```

Aliases:

```text
VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER=1
VOID_BLOCK_PROPOSER_ALLOWLIST=<comma separated proposer node ids>
VOID_TRUSTED_BLOCK_PROPOSERS=<comma separated proposer node ids>
```

## Implemented boundary

When authority mode is enabled, `validateBlockForAppend()` requires:

- `proposerPubkey` present
- cryptographic block signature verification green
- `block.proposer` present in trusted proposer ID allowlist

## Proof coverage

`scripts/prove_block_proposer_authority_allowlist_boundary.ts` proves:

- allowlisted signed proposer block persists
- self-signed but unauthorized proposer block is rejected
- missing proposer public key is rejected in authority mode
- allowlisted proposer with bad signature is rejected
- default-off authority mode preserves existing self-authenticating behavior

## Explicit limitation

This is an allowlist authority gate, not fork choice and not multi-peer quorum.

The allowlist source is environment-backed for this v1 boundary. A later validator-runtime-truth lane should bind the allowlist to verified epoch manifests or validator-set truth instead of operator env.
