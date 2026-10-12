# Validator Runtime Truth Epoch-Root Binding Boundary v1

Status: green

Marker:

```text
VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT_BINDING_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after signed validator runtime truth.

A runtime truth manifest can be signed by a trusted authority key, but append validation also needs to prove the manifest body matches an expected epoch root or validator-set commitment.

This lane adds strict epoch-root mode. In this mode, append validation requires the signed runtime truth manifest body hash to match an expected 64-hex epoch root.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth_epoch_root
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT=<64-hex-body-hash>
VOID_BLOCK_PROPOSER_EPOCH=0
```

Root aliases:

```text
VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_BODY_HASH
VOID_VALIDATOR_RUNTIME_TRUTH_BODY_HASH
```

## Root definition

The v1 epoch root is:

```text
sha256(canonical stable JSON manifest body with signature block removed)
```

This is the same canonical body used for the signed runtime truth manifest signature.

## Implemented boundary

When authority source is `signed_runtime_truth_epoch_root`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth signature valid against trusted signer key
- expected epoch root present
- expected epoch root is 64-hex
- manifest body hash equals expected epoch root
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

## Proof coverage

`scripts/prove_validator_runtime_truth_epoch_root_binding_boundary.ts` proves:

- signed runtime truth matching expected epoch root accepts scheduled proposer
- missing epoch root is rejected
- malformed epoch root is rejected
- wrong epoch root is rejected
- signed but different manifest body under old root is rejected
- proposer mismatch is still rejected after root passes

## Explicit limitation

This is a local epoch-root/body-hash binding boundary, not fork choice and not multi-peer quorum.

The next lane should bind the expected epoch root to a chain-derived validator-set commitment or finalized epoch manifest root.
