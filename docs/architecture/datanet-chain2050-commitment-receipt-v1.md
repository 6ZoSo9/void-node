# DataNet Chain-2050 commitment receipt verifier v1

Status: source-only candidate

Marker:

```text
VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1_PROOF_GREEN
```

## Purpose

This lane closes one bounded gap between the source-only
`DatanetContentCommitmentRegistryV1` contract and PR #1464.

The contract can emit a `ContentCommitted` event, but #1464 must not treat a
caller-written transaction hash or log index as Chain-2050 truth. This verifier
accepts already-observed RPC-shaped data and proves that one exact successful
receipt/log really carries the expected DataNet commitment.

It deliberately stops before network finality.

## Verified boundary

The verifier requires:

1. chain ID exactly `2050`;
2. a configured commitment-registry address;
3. an object ID satisfying the same bounded identifier contract as #1464;
4. `objectIdSha256 = SHA256(UTF8(object_id))`;
5. exact expected content SHA-256 and byte length;
6. an exact transaction hash and log index;
7. two identical successful receipt observations;
8. an exact log from the configured registry at that log index;
9. ABI decoding as
   `ContentCommitted(bytes32,bytes32,uint64,uint256)`;
10. event object digest, content digest, byte length, and committed block equal
    the expected commitment and receipt block;
11. two canonical block observations whose number/hash bind exactly to the
    receipt; and
12. identical block number/hash/parent hash across revalidation.

Receipt logs are bounded, every log must carry an exact transaction/block
binding, removed logs are rejected, and duplicate log indices are rejected.

## Output for #1464

A GREEN decision can supply these source-backed fields:

```text
chain_id
object_id
content_sha256
byte_length
commitment_transaction_hash
commitment_log_index
observed commitment block height/hash
```

The first six match the non-checkpoint portion of #1464's commitment reference.
The observed block height/hash is evidence for the next checkpoint-membership
lane.

## What this does not prove

The following remain hard false:

```text
durable_checkpoint_binding_verified=false
accepted_checkpoint_membership_verified=false
fork_choice_verified=false
peer_quorum_verified=false
chain_finality_verified=false
authority_ready_for_1464=false
```

In particular, the private Chain-2050 checkpoint tool's
`checkpoint_finalized=true` means its state/manifest pair was durably sealed
for crash-consistent startup selection. It is not by itself validator consensus,
fork choice, peer quorum, or Mainnet-0 accepted-checkpoint authority.

The Mainnet-0 checkpoint policy currently defines accepted checkpoints as an
operator-recognized canonical posture. Until that posture has a machine-readable
source that binds this exact commitment block into an accepted canonical
history, #1464 must keep `chain_finality_verified=false`.

## Runtime separation

This module performs no RPC call. A later runtime adapter may obtain the two
receipt observations and two canonical block observations using a closed,
read-only method set such as:

```text
eth_chainId
eth_getTransactionReceipt
eth_getBlockByNumber
eth_getTransactionReceipt
eth_getBlockByNumber
```

That adapter must preserve bounded response sizes, loopback/server-controlled
RPC policy where applicable, total deadlines, and the same no-mutation
authority posture.

## Authority boundary

Source and synthetic proof only.

No deployment, runtime route mount, service mutation, checkpoint capture,
filesystem write, credential/key/wallet access, signing, transaction
construction, transaction broadcast, Chain-2050 mutation, or money movement is
authorized or performed by this lane.
