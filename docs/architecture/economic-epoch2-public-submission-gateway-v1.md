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

Replay-result normalization is included in the same monotonic deadline. A
proxy-backed result cannot consume quickly and then stall structural inspection
past the deadline while still producing a successful admission. Deadline
classification also takes precedence when normalization ends in an invalid
result: the gateway samples elapsed time after inspection before deciding
whether the result shape itself is invalid.

The gateway also requires a trusted clock provider. It reads time before intent
verification and again after atomic replay consumption. If the intent expires
while the replay-store operation is in flight, admission fails closed after the
digest has been consumed; no execution authority is returned.

Replay consumption must complete within an explicit caller-supplied timeout of
1-5,000 ms. The effective timeout is the smaller of that requested value and
the signed intent's remaining lifetime. The gateway converts timer or monotonic
elapsed-time expiry into `atomic_replay_consume_timeout`.

The gateway deliberately does not expose an `AbortSignal` to the external
adapter: exceptions thrown by third-party abort listeners cannot therefore
escape as process-level errors. The adapter receives the numeric timeout and
must treat late completion as non-authoritative; admission has already failed
closed.

Because a synchronously blocking adapter can prevent the event-loop timer from
running, the trusted clock also supplies a synchronous monotonic millisecond
reading. The gateway measures elapsed monotonic time immediately around
`consumeIfFresh` and independently rejects any result that returns at or after
the effective deadline.

The trusted clock is also required to be synchronous and monotonic across the
admission call. Promise/thenable-returning clock providers are rejected before
their value can enter the signed-intent decision; rejected promises are
explicitly quenched so adapter failure cannot escape as an unhandled rejection.
A backwards observation fails closed.

The gateway deliberately does **not** call an external replay-store
`has(digest)` precheck. Such a precheck cannot be authoritative and introduces
an unnecessary adapter/race boundary. The signed-intent verifier receives a
local non-authoritative empty observation surface, and the exact digest replay
decision is made only by the later atomic `consumeIfFresh`.

The consume adapter has exactly two valid semantic tuples:

- fresh: `{consumed:true, already_consumed:false, atomic:true}`;
- replay: `{consumed:false, already_consumed:true, atomic:true}`.

Every contradictory or non-atomic tuple is adapter corruption and yields
`atomic_replay_consume_result_invalid`; it is never relabeled as a normal
client replay. Structural inspection of adapter results is also contained. A proxy or
descriptor trap that reaches gateway normalization becomes
`atomic_replay_consume_result_invalid` instead of escaping a raw adapter
exception. A **revoked proxy returned from an async adapter** may fail earlier
during JavaScript Promise assimilation while its `then` property is read; that
case is classified at the consume boundary as
`atomic_replay_consume_failed`.

The signed intent itself is snapshotted once before verification from the exact
plain-object key set and enumerable data descriptors. Accessors, symbol keys,
shape drift, revoked proxies, or trapping structural operations fail closed as
`signed_intent_snapshot_invalid`. The immutable snapshot is then used for
signature verification, expiry calculation, and replay metadata so no signed
field is reread from caller-controlled state.

Trusted-clock and replay-store structural validation follows the same rule:
structural traps are normalized directly to explicit gateway HOLDs without
inspecting the thrown object.

Production durability/cancellation semantics of the backing store remain a
separate runtime proof.

## Concurrency boundary

The proof drives two simultaneous admissions through a replay adapter whose
ordinary `has()` view is deliberately stale. The atomic `consumeIfFresh`
operation permits exactly one admission and rejects the other as replay.

This proves the source contract requires atomic consumption at the gateway seam.
It does not prove that a production durable replay-store implementation exists.

## Input bounds

The gateway accepts at most 256 allowlisted targets. It validates the array
length data descriptor first and then inspects only own data descriptors for
indices `0..length-1`. It never enumerates caller-reported keys, so oversized
or proxy-inflated property sets cannot force attacker-sized `ownKeys` or full
descriptor expansion at this boundary.

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
