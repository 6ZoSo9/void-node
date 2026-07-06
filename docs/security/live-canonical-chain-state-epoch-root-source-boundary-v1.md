# Live Canonical Chain-State Epoch-Root Source Boundary v1

Status: green

Marker:

```text
VOID_LIVE_CANONICAL_CHAIN_STATE_EPOCH_ROOT_SOURCE_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after the canonical chain/store-state fixture boundary.

The previous boundary requires a canonical chain/store-state fixture. This lane adds a stricter live local chain/store path source. In this mode, append validation reads the expected validator epoch-root commitment from the live node data directory instead of an explicit fixture file.

Raw env roots, local commitment fixtures, and canonical fixture files are not accepted as substitutes in this strict mode.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth_live_chain_epoch_root
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
DATA_DIR=/path/to/live-node-data
VOID_BLOCK_PROPOSER_EPOCH=0
```

Optional explicit live chain-state dir:

```text
VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR=/path/to/live-node-data
```

## Live store candidate files

The v1 live local store reader checks:

```text
$DATA_DIR/validator-epoch-root-commitments.json
$DATA_DIR/chain/validator-epoch-root-commitments.json
$DATA_DIR/canonical-chain-state.json
$DATA_DIR/chain/canonical-chain-state.json
```

## Implemented boundary

When authority source is `signed_runtime_truth_live_chain_epoch_root`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth signature valid against trusted signer key
- live chain-state directory present
- live chain-state commitment file present and parseable
- live commitment entry for target epoch
- live commitment finalized/canonical
- live commitment root is 64-hex
- signed runtime truth manifest body hash equals live committed root
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

Raw env roots, local commitment fixtures, and canonical fixture files are not accepted as substitutes in this strict mode.

## Proof coverage

`scripts/prove_live_canonical_chain_state_epoch_root_source_boundary.ts` proves:

- live chain-state epoch-root accepts matching signed runtime truth
- DATA_DIR fallback live chain-state path works
- canonical fixture/local commitment/raw env root cannot substitute for missing live chain-state path
- missing live chain-state file is rejected
- malformed live chain-state file is rejected
- missing live epoch commitment is rejected
- malformed live root is rejected
- unfinalized/stale live commitment is rejected
- wrong live committed root is rejected even if fixture/env roots are correct
- signed but different runtime-truth body under old live root is rejected

## Explicit limitation

This is a local live store-path boundary, not fork choice, not peer quorum, and not a network finality proof.

The next lane should replace local file reads with live canonical chain-state API/finality checks.
