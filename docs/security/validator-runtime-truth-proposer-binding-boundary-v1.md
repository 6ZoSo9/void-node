# Validator Runtime Truth Proposer Binding Boundary v1

Status: green

Marker:

```text
VOID_VALIDATOR_RUNTIME_TRUTH_PROPOSER_BINDING_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after the proposer allowlist boundary.

The proposer allowlist proves an unauthorized proposer can be rejected when authority mode is enabled, but an operator-provided allowlist is not the same thing as validator runtime truth.

This lane adds strict runtime-truth authority mode. In this mode, append validation derives the expected proposer from a validator runtime truth schedule fixture and rejects a block whose claimed proposer is not the scheduled proposer for the block slot.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=runtime_truth
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_PROPOSER_EPOCH=0
```

By default, block number is treated as the slot for this v1 boundary.

## Fixture shape

```json
{
  "marker": "VOID_VALIDATOR_RUNTIME_TRUTH_PROPOSER_BINDING_FIXTURE_V1",
  "epoch": "0",
  "schedule": [
    { "slot": 0, "proposer": "<node-id>" }
  ]
}
```

## Implemented boundary

When authority mode is enabled and source is `runtime_truth`, `validateBlockForAppend()` requires:

- `proposerPubkey` present
- cryptographic block signature verification green
- validator runtime truth file present and parseable
- schedule entry for the target epoch and slot
- `block.proposer` equals the scheduled proposer

## Proof coverage

`scripts/prove_validator_runtime_truth_proposer_binding_boundary.ts` proves:

- scheduled slot proposer block persists
- non-slot proposer is rejected
- env-only authority is rejected in runtime-truth mode
- malformed runtime truth file is rejected
- unsupported authority source is rejected
- missing schedule is rejected

## Explicit limitation

This is a runtime-truth schedule binding boundary, not fork choice and not multi-peer quorum.

The v1 runtime truth source is a local JSON file. A later lane should bind this file to signed epoch manifests or chain-derived validator set truth.
