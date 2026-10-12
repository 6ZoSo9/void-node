# Canonical Chain Epoch-Root Commitment Source Boundary v1

Status: green

Marker:

```text
VOID_CANONICAL_CHAIN_EPOCH_ROOT_COMMITMENT_SOURCE_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after the chain-derived validator epoch-root source boundary.

The previous boundary requires a chain/ledger commitment fixture. This lane adds a stricter canonical-chain source mode where the expected validator epoch root must come from a canonical chain/store-state fixture and must be marked finalized/canonical.

Raw env roots and local commitment fixtures are not accepted as substitutes in this mode.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth_canonical_chain_epoch_root
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE=/path/to/canonical-chain-state.json
VOID_BLOCK_PROPOSER_EPOCH=0
```

## Canonical chain/store-state fixture shape

```json
{
  "marker": "VOID_CANONICAL_CHAIN_VALIDATOR_EPOCH_ROOT_STATE_FIXTURE_V1",
  "chain_id": "void-local-dev",
  "finalized": true,
  "validator_epoch_root_commitments": [
    {
      "epoch": "0",
      "root": "<64-hex-runtime-truth-body-hash>",
      "finalized": true,
      "block_number": 0,
      "block_hash": "<optional-64-hex>"
    }
  ]
}
```

## Implemented boundary

When authority source is `signed_runtime_truth_canonical_chain_epoch_root`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth signature valid against trusted signer key
- canonical chain/store-state file present and parseable
- canonical chain/store-state commitment entry for target epoch
- commitment is finalized/canonical
- commitment root is 64-hex
- signed runtime truth manifest body hash equals canonical committed root
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

Raw env roots and local commitment fixtures are not accepted as substitutes in this strict mode.

## Proof coverage

`scripts/prove_canonical_chain_epoch_root_commitment_source_boundary.ts` proves:

- canonical chain epoch-root state accepts matching signed runtime truth
- local commitment fixture and raw env root cannot substitute for missing canonical chain state
- missing canonical chain state file is rejected
- malformed canonical chain state file is rejected
- missing epoch commitment is rejected
- malformed canonical root is rejected
- unfinalized/stale commitment is rejected
- wrong canonical root is rejected even if local/env roots are correct
- signed but different manifest body under old canonical root is rejected

## Explicit limitation

This is a canonical chain/store-state fixture boundary.

A later lane should replace the fixture with live canonical chain-state reads and fork-choice/finality checks.
