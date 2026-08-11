# VOID private Chain-2050 durable checkpoint v1

## Purpose

`void-private-chain2050-checkpoint-v1` adds the first content-addressed persistence primitive for the private Chain-2050 Anvil RPC used by bounded VOID economic tooling.

The problem addressed by this lane is restart persistence, not transaction execution. A private Anvil process can load a known baseline snapshot, accept later transactions in memory, and then return to the older baseline after a host or service restart unless a successor state is durably exported.

This primitive captures a stable live Anvil state with `anvil_dumpState`, binds it to the exact Chain-2050 head, and writes a private create-only checkpoint plus manifest outside the repository.

It does not change the currently deployed service, select a startup checkpoint, replay a transaction, reconstruct historical blocks, or move money.

## Fail-closed capture contract

A checkpoint is eligible only when all of the following are true:

- the JSON-RPC endpoint is numeric loopback HTTP with no embedded credentials;
- `eth_chainId` is exactly `2050`;
- the live block number is at least the caller-supplied minimum;
- the exact head block has a canonical 32-byte hash;
- when the caller supplies a confirmed delivery binding, that exact historical block number has the caller-pinned 32-byte receipt block hash both before and after export;
- `eth_accounts` is exactly an empty array;
- `anvil_dumpState` returns a bounded `0x` hexadecimal state payload; and
- the exact block number and hash are unchanged after the dump completes.

The head is bracketed around state export. A transaction, manual mining event, reset, reorg-like replacement, or other head transition during capture returns `HOLD` and writes no successful checkpoint receipt.

The optional confirmed-delivery binding is all-or-nothing: both `expectedDeliveryBlockNumber` and `expectedDeliveryBlockHash` are required. A missing half, a delivery block above the checkpoint head, an initial hash mismatch, or a hash change during export returns `HOLD`.

## RPC authority boundary

The V1 RPC method sequence is closed and exact:

1. `eth_chainId`
2. `eth_blockNumber`
3. `eth_getBlockByNumber`
4. `eth_accounts`
5. `anvil_dumpState`
6. `eth_blockNumber`
7. `eth_getBlockByNumber`

No signing, transaction submission, mining, impersonation, balance mutation, nonce mutation, account unlocking, snapshot loading, reset, or other chain mutation method is present.

When a confirmed delivery binding is requested, the sequence adds `eth_getBlockByNumber` for the exact delivery height immediately after each head read. The resulting nine-call sequence is also closed and exact.

The checkpoint manifest fixes:

- `chain_mutation_performed=false`
- `transaction_broadcast_performed=false`
- `wallet_access_performed=false`
- `credential_access_performed=false`
- `money_movement_performed=false`

`anvil_dumpState` is treated as a sensitive local state export. The state file is never emitted to stdout.

## Crash-consistent storage contract

The default private checkpoint root is:

```text
~/.local/state/void-private-chain2050-rpc-v1/checkpoints-v1
```

The root is mode `0700`. State, manifest, and finalization-marker files are mode `0600` and must be owned by the current operator account. Existing symlink path components are rejected.

The state payload is written byte-for-byte as returned by `anvil_dumpState`. Its SHA-256 digest, byte length, block number, block hash, exact RPC method sequence, and no-authority fields are bound into `checkpoint_id_sha256`. A delivery-bound checkpoint additionally binds `delivery_block_number`, `delivery_block_hash`, and `delivery_block_hash_verified=true` into that identity and finalized manifest.

Checkpoint publication is two-phase. State and manifest files are individually fsynced, then the checkpoint root is fsynced so that pair is durable. Only after that first directory fsync does the writer create and fsync an exact content-addressed `.complete-v1` finalization marker. The root is fsynced a second time before capture may return success.

A power loss before finalization may leave a state-only artifact or an unmarked state/manifest pair. Those artifacts are **not** checkpoints and grant no startup authority. The paired startup selector treats exact-name unmarked artifacts as non-authoritative crash debris, reports their count, and never uses them to satisfy a required durable head.

Because the state/manifest pair is directory-fsynced before the marker is created, a surviving finalization marker without its exact pair is not a normal interrupted-capture state; it indicates later tamper/corruption and fails closed. Unknown or malformed root entries also fail closed.

This preserves the key property: only a fully finalized checkpoint becomes startup-eligible, while an interrupted capture cannot become partially trusted.

## Idempotency and existing-state validation

An exact existing state file is accepted only after regular-file, owner, mode, size, and byte-equality checks.

An existing manifest is inspected with `lstat` and bounded size checks **before** it is read or parsed. Idempotent reuse then rebinds the complete closed manifest schema and every authority-bearing field, not only block/hash identifiers. The original canonical `captured_at` is preserved for an already-existing checkpoint.

Conflicting content, unexpected keys, invalid timestamps, unsafe modes, symlinks, owner mismatch, oversized files, or altered authority fields return `HOLD`.

Checkpoint state is runtime-private evidence and must not be committed to Git.

## Intended integration order

This lane deliberately stops before service mutation.

A later integration should:

1. identify the latest approved durable checkpoint at startup;
2. refuse to silently fall back behind a known required economic head;
3. load the selected state through an isolated, verified restore path;
4. capture and seal a new checkpoint after every confirmed economic mutation before any further mutation is eligible; and
5. retain the immutable economic receipts that caused the checkpoint requirement.

Clean-shutdown dumping may be added as defense in depth, but it must not be the only persistence boundary. Power loss or process termination can occur after an accepted transaction and before shutdown hooks run.

## Recovery boundary

This primitive does **not** claim that a newly constructed checkpoint is byte-identical to any state that was not previously dumped.

When historical transaction receipts exist but the corresponding Anvil state bytes were never persisted, those receipts remain historical evidence. Any later state reconstruction must be labeled as reconstruction and must not replace, rewrite, or relabel the original transaction/block evidence.

## CLI

Example capture against the local private RPC:

```bash
node tools/void-private-chain2050-checkpoint-v1.mjs \
  --rpc-url http://127.0.0.1:8545/ \
  --minimum-block-number 37371 \
  --expected-delivery-block-number 37369 \
  --expected-delivery-block-hash 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

The command prints only a sanitized manifest summary and local checkpoint paths. It does not print the state dump.

## Proof

Run:

```bash
node scripts/prove_void_private_chain2050_checkpoint_v1.mjs
```

The synthetic proof covers stable capture, confirmed-delivery hash bracketing, reset/reorg hash rejection, content addressing, exact file modes, two-phase checkpoint-root directory fsync and finalization-marker publication, exact idempotency, complete existing-manifest rebinding, symlink-path rejection, minimum-head enforcement, wrong-chain rejection, unlocked-account rejection, head-number/hash races, malformed/oversized state rejection, canonical timestamp enforcement, and both closed no-mutation RPC method sets.

Expected marker:

```text
VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1_PROOF_GREEN
```

## Authority boundary

Source, documentation, synthetic proof, and read-only CI only.

This lane does not authorize or perform a live checkpoint capture, service installation, service restart, startup-state selection, Anvil state load, transaction replay, private-key access, signer access, wallet access, validator mutation, Work Credit mutation, treasury action, transaction broadcast, or fund movement.
