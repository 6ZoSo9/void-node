# Economic epoch-2 public submission gateway core v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1`

Status: source-only admission core. The public route is inactive.

## Purpose

Chain ID 2050 is shared by the archived epoch-1 economic EVM and the clean
epoch-2 successor. Chain ID alone therefore cannot provide execution-epoch
domain separation.

The gateway core composes the existing EIP-712 epoch-2 signed-intent verifier
with an atomic replay-consumption boundary.

An admission is source-valid only after:

1. the signed intent verifies against Chain 2050, execution epoch 2, the exact
   gateway identity, policy generation, signer, nonce, timestamps, target,
   zero native value, bounded gas, and calldata hash;
2. the target is in a bounded explicit allowlist;
3. calldata is within the source gateway input bound; and
4. the external replay store atomically reports one fresh consumption of the
   verified typed-data digest.

A pre-check followed by a later non-atomic replay write is not accepted.

The gateway also requires a trusted clock provider. It reads time before intent
verification and again after atomic replay consumption. If the intent expires
while the replay-store operation is in flight, admission fails closed after the
digest has been consumed; no execution authority is returned.

Replay consumption must complete within an explicit caller-supplied timeout of
1-5,000 ms. The gateway supplies an `AbortSignal` and converts deadline expiry
into `atomic_replay_consume_timeout`. Production durability/cancellation
semantics of the backing store remain a separate runtime proof.

## Concurrency boundary

The proof drives two simultaneous admissions through a replay adapter whose
ordinary `has()` view is deliberately stale. The atomic `consumeIfFresh`
operation permits exactly one admission and rejects the other as replay.

This proves the source contract requires atomic consumption at the gateway seam.
It does not prove that a production durable replay-store implementation exists.

## Input bounds

The gateway accepts at most 256 allowlisted targets.

Calldata text length is rejected before canonical-hex scanning, and decoded
calldata is bounded to 744,750 bytes. That is the maximum theoretical calldata
size compatible with the source policy's 3,000,000 gas ceiling under the
minimum 4-gas-per-byte calldata cost after the 21,000 intrinsic transaction
cost. Actual executable calldata may be smaller depending on byte contents and
execution cost.

The underlying signed-intent parser also bounds decimal string length before
`BigInt` conversion according to the corresponding uint64/uint256 maximum.

## Gate effect

The source composition proves:

`execution_epoch_bound_in_public_gateway=true`

It also records:

- `signed_submission_source_primitive_proven=true`;
- `atomic_replay_digest_consumed=true`;
- `durable_replay_store_verified=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `pending_legacy_signed_transaction_census_complete=false`; and
- `cross_epoch_replay_protection_proven=false`.

The last three replay gates are intentionally not inferred from an HTTP/EIP-712
intent envelope because a legacy raw EIP-155 Chain-2050 transaction has no
execution-epoch field.

## Authority boundary

The core keeps all live authority closed:

- runtime route inactive;
- public submission closed;
- no RPC call;
- no transaction construction/signing/submission/broadcast;
- no wallet/private-key/credential access;
- no authoritative Chain-2050 write;
- no token or funds movement;
- no migration authority; and
- no public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_public_submission_gateway_v1.mjs
```
