# VOID private Chain-2050 startup selection v1

## Purpose

Prevent a private Chain-2050 RPC restart from silently loading an older durable Anvil baseline after the runtime had previously advanced beyond that baseline.

This lane is read-only. It selects which already-existing durable state artifact would be eligible for a later startup integration. It does not load state, start or stop Anvil, mutate systemd, replay a transaction, sign, broadcast, access a wallet, or move funds.

## Relationship to the checkpoint primitive

The parent checkpoint lane creates content-addressed private `anvil_dumpState` artifacts and manifests.

This startup-selection lane consumes those manifests plus one explicitly pinned immutable baseline. The selector validates every durable artifact before choosing the highest unambiguous state that satisfies the operator's minimum required block.

## Fail-closed minimum durable head

The caller supplies `minimum_block_number` from independently established durable/economic truth.

A baseline below that minimum is not an acceptable fallback merely because it is valid in isolation.

Example:

```text
baseline block = 100
required minimum = 104
validated checkpoints = none
=> HOLD durable_state_below_required_minimum
```

This is the core restart-safety rule. An older baseline cannot silently become the effective current chain after a restart when the operator has already established that later state must be durably available.

## Baseline contract

The caller pins:

- chain ID;
- block number;
- block hash;
- complete state-file SHA-256;
- absolute state-file path; and
- explicit state format.

Supported V1 baseline formats are:

- `anvil_cli_state_json`
- `anvil_dump_state_hex`

The baseline must be a regular non-symlink file owned by the current operator account and must hash exactly to the pinned digest.

## Checkpoint contract

The checkpoint directory is private mode `0700`.

Every entry must be either:

- a V1 checkpoint manifest; or
- its corresponding V1 `anvil_dumpState` state file.

Symlinks, non-files, unrecognized entries, orphan state files, malformed manifests, wrong chain ID, authority-contaminated manifests, invalid content IDs, invalid filenames, unsafe modes, malformed hex state, byte-count mismatch, or SHA mismatch fail closed.

Each checkpoint is independently rebound to the parent checkpoint primitive's exact method/authority contract before it is eligible.

## Selection

The selector combines:

1. the validated immutable baseline; and
2. every validated content-addressed checkpoint.

Candidates below `minimum_block_number` are ineligible.

The highest eligible block wins only when every durable candidate at that height has the exact same block hash and state SHA-256. Distinct durable states at the same highest block return `ambiguous_highest_durable_state` rather than choosing arbitrarily.

A checkpoint is preferred over the baseline when both represent the same exact highest durable identity.

## Output truth

A successful selection binds:

- selected kind (`baseline` or `checkpoint`);
- selected block number/hash;
- selected state SHA-256 and format;
- number of observed checkpoint/durable candidates; and
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

## Integration boundary

A later separate lane may bind this selector into the deployed private RPC launcher. That integration must still prove the selected state can be loaded and independently re-verify chain ID, block number/hash, contract state, and any required economic invariants after load.

The selector alone must never be treated as proof that a service actually started from the selected bytes.

## Authority boundary

Source, proof, documentation, read-only filesystem validation, and CI only.

No deployment, restart, systemd mutation, state load, Anvil mutation, transaction replay, signer/private-key/credential access, wallet access, transaction broadcast, Work Credit or validator mutation, treasury action, or money movement is authorized by V1.
