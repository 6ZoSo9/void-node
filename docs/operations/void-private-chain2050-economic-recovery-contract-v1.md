# VOID private Chain-2050 economic recovery contract v1

Marker: `VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1`

This source-only contract seals the fail-closed boundary for reconstructing the private Chain-2050 economic state after the durable state was found behind a confirmed Buy VOID delivery.

It does not execute a recovery. It does not connect to RPC, start a process, copy or mutate state, update a selector, publish a checkpoint, access a wallet or credential, sign or broadcast a transaction, retry fulfillment, or move funds.

## Bound incident facts

- Chain ID: `2050`.
- Last durable ancestor: block `37367`, hash `0x97b6cc60e4f909d2ecfbe62c506cb8e921368a35abcac987be97ad067fed48f3`.
- Required signed transaction sequence, pinned to historical inclusion:
  - block `37368`: `0x756da9088b49c9d447ef75822fc16fdf3969855eb65720f7569667aca28d8f00`;
  - block `37369`: `0x5830900dec5a9cd92d070ba8a542d6072aacb44af5a68b7a22ef3dc9312f7693`;
  - block `37370`: `0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6`; and
  - block `37371`: `0xcc0ed5b5cd0bb0076bab9100a7cf31b8e07488986f55d7cd87ade60bcaac9e15`.
- Already-confirmed Buy VOID delivery: block `37370`, transaction `0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6`.
- That confirmed delivery must never be fulfilled again.

The repository does not currently contain the complete public signed-transaction field evidence for all four blocks or the missing block-37369 header context. This lane therefore provides the verifier and isolated-candidate contract without claiming that the real incident evidence is already complete.

## Evidence requirements

The verifier requires one exact v1 manifest. It binds:

1. the ancestor block number and hash;
2. a SHA-256 digest of the exact state materialization at that ancestor;
3. exactly four EIP-1559/type-2 signed transaction field sets in block order;
4. each reconstructed transaction hash against the incident policy's exact
   block-aligned historical hash, plus the recovered sender;
5. the canonical confirmed-delivery transaction at block 37370; and
6. one explicit header-context record for every block.

For every signed transaction, the verifier rebuilds the raw serialized bytes in memory with the repository's existing `ethers` dependency, calculates the Ethereum transaction hash, reparses the bytes, and requires exact hash, chain, type, and recovered-sender agreement. Output contains only the transaction hash, raw-byte count, and SHA-256 digest. Raw signed bytes are neither printed nor persisted.

A block header may be `complete` only when its block hash, parent hash, timestamp, mix hash, and parent-header digest are supplied with `guessed_values=false`. Those normalized values are retained in the plan and therefore bound by its SHA-256 identifier. The current block-37369 evidence must name only its still-unknown `timestamp`, while still supplying the known mix hash and preserved block-37368 parent-header digest. The missing-header plan retains and fingerprints both known values. Guessed values and stale claims that those known fields are missing are rejected.

Complete header-shaped input does not prove historical reproduction. When all header inputs are present, the result is only `HISTORICAL_REPLAY_INPUTS_READY`, with `historical_replay_inputs_complete=true`, `bit_identical_replay_verified=false`, and `exact_historical_branch_reproduction=false`. Exact reproduction may be claimed only after a separately authorized isolated replay reproduces every original transaction hash, successful receipt, parent link, and block hash bit-identically.

If any header context is missing, the result is only `ECONOMIC_STATE_CANDIDATE_PLAN_READY` and marks the plan as an economically equivalent candidate only. Such a candidate must never be described as reproduction of the original branch.

## Isolation contract

The candidate plan is deliberately non-executable. It requires:

- an absolute unique descendant of `/tmp/void-chain2050-economic-recovery-candidate-v1` (or the platform-equivalent OS temporary root);
- a non-privileged candidate port other than production port `8545`; and
- an exact state-copy SHA-256 equal to the bound ancestor materialization digest.

The returned plan fingerprints the candidate root instead of disclosing it and unconditionally reports:

- `execution_authorized=false`;
- `execution_performed=false`;
- no production RPC, state, process, service, selector, checkpoint, wallet, signing, broadcast, retry, or money authority.

## Offline use

After the exact evidence manifest and state-copy digest are available, validate them without executing anything:

```sh
node tools/void-private-chain2050-economic-recovery-contract-v1.mjs \
  --evidence /private/offline/economic-recovery-evidence-v1.json \
  --candidate-root /tmp/void-chain2050-economic-recovery-candidate-v1/UNIQUE \
  --candidate-port 18545 \
  --state-copy-sha256 EXACT_64_HEX_SHA256
```

This reads the evidence file and prints a sanitized plan. It does not create the candidate root or contact a node.

## Separate gates

The following remain separately gated by ZoSo:

1. supplying or approving the complete incident evidence;
2. creating and executing the isolated bit-identical replay experiment from a copy of block 37367 state;
3. choosing exact-history recovery, economically equivalent recovery, or explicit non-restoration;
4. promoting any recovered state or checkpoint;
5. selecting/restarting any live Chain-2050 service; and
6. re-enabling any Buy VOID fulfillment path.
