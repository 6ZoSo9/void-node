# Chain-Derived Validator Epoch Root Source Boundary v1

Status: green

Marker:

```text
VOID_CHAIN_DERIVED_VALIDATOR_EPOCH_ROOT_SOURCE_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after validator runtime truth epoch-root binding.

The previous boundary requires a signed runtime truth manifest to match an expected epoch root, but that expected root still comes from local env/config. This lane adds a strict chain-derived source mode where the expected epoch root must come from a chain/ledger commitment fixture file.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth_chain_epoch_root
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE=/path/to/epoch-root-commitment.json
VOID_BLOCK_PROPOSER_EPOCH=0
```

## Commitment fixture shape

```json
{
  "marker": "VOID_VALIDATOR_EPOCH_ROOT_COMMITMENT_FIXTURE_V1",
  "chain_id": "void-local-dev",
  "commitments": [
    { "epoch": "0", "root": "<64-hex-runtime-truth-body-hash>" }
  ]
}
```

## Implemented boundary

When authority source is `signed_runtime_truth_chain_epoch_root`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth signature valid against trusted signer key
- chain/ledger epoch-root commitment file present and parseable
- commitment entry for target epoch
- commitment root is 64-hex
- signed runtime truth manifest body hash equals committed root
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

Raw env epoch-root values are not accepted as a substitute in this strict mode.

## Proof coverage

`scripts/prove_chain_derived_validator_epoch_root_source_boundary.ts` proves:

- chain-derived epoch-root commitment accepts matching signed runtime truth
- missing commitment source is rejected
- missing commitment file is rejected even if raw env root is present
- malformed commitment file is rejected
- malformed commitment root is rejected
- wrong commitment root is rejected
- raw env root cannot substitute for chain commitment root
- signed but different manifest body under old committed root is rejected

## Explicit limitation

This is a chain/ledger commitment fixture boundary, not full chain-derived validator-set verification.

The next lane should replace the local fixture with a finalized epoch manifest root or chain-derived validator-set commitment read from the canonical chain state.
