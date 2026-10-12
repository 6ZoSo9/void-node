# Live Canonical Chain-State Finality API Boundary v1

Status: green

Marker:

```text
VOID_LIVE_CANONICAL_CHAIN_STATE_FINALITY_API_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after live local chain/store path epoch-root sourcing.

The previous boundary reads expected validator epoch roots from local live store files. This lane adds a stricter API/helper response source. In this mode, append validation requires a finalized canonical chain-state API/helper response and rejects DATA_DIR/live store files, canonical fixture files, local commitment files, and raw env roots as substitutes.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth_live_chain_api_epoch_root
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE=/path/to/live-api-response.json
VOID_BLOCK_PROPOSER_EPOCH=0
```

## API/helper response shape

```json
{
  "ok": true,
  "marker": "VOID_LIVE_CANONICAL_CHAIN_STATE_FINALITY_API_FIXTURE_V1",
  "source": "live_canonical_chain_state_api",
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

When authority source is `signed_runtime_truth_live_chain_api_epoch_root`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth signature valid against trusted signer key
- live canonical chain-state API/helper response file present and parseable
- API response not `ok:false`
- finalized API epoch-root entry for target epoch
- API root is 64-hex
- signed runtime truth manifest body hash equals API committed root
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

DATA_DIR/live store files, canonical fixture files, local commitment files, and raw env roots are not accepted as substitutes in this strict mode.

## Proof coverage

`scripts/prove_live_canonical_chain_state_finality_api_boundary.ts` proves:

- finalized API epoch-root accepts matching signed runtime truth
- fixture/env/local/live file substitutes are rejected when API response source is missing
- missing API response file is rejected
- malformed API response is rejected
- `ok:false` API response is rejected
- stale/wrong epoch API response is rejected
- malformed API root is rejected
- non-finalized API response is rejected
- wrong API committed root is rejected even if fixture/env/local roots are correct
- signed but different runtime-truth body under old API root is rejected

## Explicit limitation

This is an API/helper response file boundary, not an actual HTTP route call, not fork choice, and not peer quorum.

The next lane should replace the response fixture with a live canonical chain-state route/helper call and finality checks.
