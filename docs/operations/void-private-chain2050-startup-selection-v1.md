# VOID private Chain-2050 startup selection v1

## Purpose

Prevent a private Chain-2050 RPC restart from silently loading an older durable Anvil baseline after the runtime had previously advanced beyond that baseline.

This lane is read-only. It selects which already-existing durable state artifact would be eligible for a later startup integration. It does not load state, start or stop Anvil, mutate systemd, replay a transaction, sign, broadcast, access a wallet, or move funds.

## Relationship to the checkpoint primitive

The parent checkpoint lane creates content-addressed private `anvil_dumpState` artifacts and manifests with a two-phase durability boundary:

1. state and manifest files are fsynced and the checkpoint root is fsynced;
2. an exact `.complete-v1` finalization marker is created and fsynced; and
3. the checkpoint root is fsynced again before capture returns success.

This selector consumes only checkpoints carrying that exact finalization marker. Unmarked exact-name state/manifest artifacts are crash debris, not durable authority.

## Fail-closed minimum durable head

The caller supplies `minimum_block_number` from independently established durable/economic truth.

A baseline below that minimum is not an acceptable fallback merely because it is valid in isolation.

Example:

```text
baseline block = 100
required minimum = 104
validated finalized checkpoints = none
=> HOLD durable_state_below_required_minimum
```

An unmarked incomplete checkpoint at block 104 does not satisfy the minimum. This is the core restart-safety rule.

## Baseline contract

The caller pins:

- chain ID;
- canonical lowercase block hash;
- block number;
- complete state-file SHA-256;
- absolute state-file path; and
- explicit state format.

Supported V1 baseline formats are:

- `anvil_cli_state_json`
- `anvil_dump_state_hex`

The baseline must be a regular non-symlink file owned by the current operator account, must not be group/other writable, must remain under the configured size bound, and must hash exactly to the pinned digest. Existing symlink path components are rejected.

The file bytes must also match the declared format: JSON must parse and dump-state hex must be a valid even-length `0x` hex payload.

## Finalized checkpoint contract

The checkpoint directory is private mode `0700`, owned by the current operator account, and bounded in entry count. Existing symlink path components are rejected.

Recognized direct-child names are only content-addressed V1:

- `chain2050-block-N-ID.manifest.json`
- `chain2050-block-N-ID.anvil-dump-state.hex`
- `chain2050-block-N-ID.complete-v1`

A startup-eligible checkpoint requires all three exact files.

The finalization marker is mode `0600`, owner-bound, size-bounded, and must contain exactly:

```text
VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 <checkpoint-id>
```

Only after the marker is validated does the selector parse and rebind the paired manifest and state file. The manifest and state reads are size-bounded before loading into memory.

The selector accepts exactly two checkpoint-manifest shapes from the parent primitive: the original stable-head capture and the delivery-bound capture that additionally contains `delivery_block_number`, `delivery_block_hash`, and `delivery_block_hash_verified=true`. The delivery-bound shape must use the exact nine-call read-only RPC contract, must bind a delivery height at or below the checkpoint head, and includes those fields in `checkpoint_id_sha256`.

A finalization marker without its exact state/manifest pair fails closed as `checkpoint_finalized_pair_incomplete`. Because the parent fsyncs the pair before creating the marker, this shape indicates later corruption or tamper rather than a normal interrupted capture.

## Interrupted-capture debris

An interrupted parent capture may leave:

- a state file without a manifest;
- a manifest without a state file; or
- a state/manifest pair without a `.complete-v1` marker.

When every present file has an exact valid content-addressed filename, safe type, owner, mode, and bounded size, an **unmarked** group is ignored as non-authoritative crash debris and counted in `incomplete_checkpoint_group_count`.

It is never parsed as a checkpoint, never selected, and never satisfies `minimum_block_number`.

Unknown names, symlinks, unsafe modes/ownership, oversized incomplete artifacts, malformed finalized checkpoints, wrong-chain state, finalization-marker mismatch, tamper, and ambiguous highest durable state fail closed.

## Selection

The selector combines:

1. the validated immutable baseline; and
2. every validated **finalized** checkpoint.

Candidates below `minimum_block_number` are ineligible.

The highest eligible block wins only when every durable candidate at that height has the exact same block hash and state SHA-256. Distinct durable states at the same highest block return `ambiguous_highest_durable_state` rather than choosing arbitrarily.

A checkpoint is preferred over the baseline when both represent the same exact highest durable identity.

## Output truth

A successful selection binds:

- selected kind (`baseline` or `checkpoint`);
- selected block number/hash;
- selected state SHA-256 and format;
- validated checkpoint candidate count;
- ignored incomplete checkpoint-group count;
- total durable candidate count; and
- a content-addressed selection ID.

It also fixes these fields false:

- `state_load_performed`
- `service_mutation_performed`
- `transaction_replay_performed`
- `transaction_broadcast_performed`
- `wallet_access_performed`
- `credential_access_performed`
- `money_movement_performed`

The selected state path is evidence for a later integration step; selection itself grants no startup or mutation authority.

## CLI

```text
node tools/void-private-chain2050-startup-selection-v1.mjs \
  --baseline-state ABSOLUTE_PATH \
  --baseline-state-sha256 SHA256 \
  --baseline-state-format anvil_cli_state_json \
  --baseline-block-number N \
  --baseline-block-hash 0xHASH \
  --checkpoint-root ABSOLUTE_CHECKPOINT_DIRECTORY \
  --minimum-block-number N
```

Success exits zero with one JSON selection result.

A policy/data hold exits `2` with structured hold JSON. The hold path never loads state or mutates a service.

## Proof

The focused proof re-proves the parent checkpoint contract and additionally covers:

- exact baseline selection and stale-baseline minimum rejection;
- baseline format, permissions, and canonical hash validation;
- finalized checkpoint selection;
- unmarked crash-debris tolerance without authority promotion;
- proof that unmarked debris cannot satisfy the durable minimum;
- marker-without-pair rejection;
- marker-content binding;
- bounded manifest reads;
- checkpoint state tamper and wrong-chain rejection;
- unknown root-entry rejection; and
- same-height durable ambiguity rejection.

Expected marker:

```text
VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_V1_PROOF_GREEN
```

## Integration boundary

A later separate lane may bind this selector into the deployed private RPC launcher. That integration must still prove the selected state can be loaded and independently re-verify chain ID, block number/hash, contract state, and any required economic invariants after load.

The selector alone must never be treated as proof that a service actually started from the selected bytes.

## Authority boundary

Source, proof, documentation, read-only filesystem validation, and CI only.

No deployment, restart, systemd mutation, state load, Anvil mutation, transaction replay, signer/private-key/credential access, wallet access, transaction broadcast, Work Credit or validator mutation, treasury action, or money movement is authorized by V1.
