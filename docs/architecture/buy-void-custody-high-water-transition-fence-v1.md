# Buy VOID custody high-water create-only transition fence v1

## Purpose

Draft #2691 proves a narrow but important failure mode in the removable
custody high-water lock staged by #2690: after the lock directory is removed,
the final parent-directory `fsync` can fail. The function correctly reports
failure, but the lock pathname may already be absent and a second process may
acquire it. A thrown release error therefore cannot be treated as proof that
exclusive ownership persists.

This source candidate avoids that entire release-uncertainty class by replacing
the future writer's reusable lock concept with a **permanent create-only
transition fence**.

Nothing in this Draft mounts a service or writes a production fence. It stages
only deterministic transition/fence planning and recovery classification.

## Permanent slot model

Every high-water mutation is defined by:

- exact prior custody high-water bytes, or bootstrap `null`;
- exact next custody high-water bytes;
- one source-composition ID embedded in the canonical V2 high-water record.

The transition slot ID is derived from the transition-fence domain plus the
exact prior high-water identity. For an existing high-water, the slot binds the
source-composition ID and exact prior SHA-256; that digest already commits to
the complete canonical prior bytes. For bootstrap there is no prior state, so
the slot uses one **global bootstrap sentinel** and deliberately does not include
the proposed source composition.

It deliberately does **not** include the proposed successor.

Therefore every competing successor from the same prior custody state maps to
the same permanent slot, and every competing first successor from an absent
bootstrap state also collides on one global bootstrap slot. The first create-only record decides the only allowed
successor for that prior state. A different later proposal encounters the same
slot with different exact record bytes and must HOLD.

The fence record is never deleted or reaped.

## Record authority

The permanent record contains only authority that can be rebound exactly:

- source-composition ID;
- exact prior high-water SHA-256, or `null` for bootstrap;
- exact next high-water SHA-256;
- next sequence/generation/tip/journal-prefix identities; and
- the complete canonical next high-water bytes as base64.

Prior sequence/generation/tip are intentionally not duplicated into the fence
record. Their exact prior bytes are represented only by the cryptographic
digest, avoiding unbound redundant metadata. The closed parser key set enforces
that choice: injected `prior_sequence`, `prior_generation`, or
`prior_tip_sha256` fields are schema-invalid rather than tolerated metadata.

The parser revalidates:

- exact closed key order/schema;
- canonical JSON bytes;
- slot ID derivation;
- exact next byte digest/base64;
- canonical V2 next high-water shape; and
- equality of every next metadata field to those exact stored bytes.

## Crash/retry semantics

A future custody service would create the permanent fence record with
`O_CREAT|O_EXCL|O_NOFOLLOW`, fsync the record and fence root, and only then
perform the separately reviewed high-water staged-write/fsync/rename/dir-fsync
protocol.

This source module does **not** implement those writes. It only classifies the
recovery states:

- current high-water equals exact prior digest → `resume_required`;
- current high-water equals exact next digest → `committed`;
- bootstrap current state is absent → `resume_required`;
- anything else → HOLD.

Because the fence is permanent, there is no lock-release operation, no
`rmdir`, and no final release fsync whose failure could reopen the slot.

A crash after fence creation but before the high-water rename therefore leaves
durable intent for the exact same transition. A crash after the high-water
commit leaves the same record as idempotent completion evidence.

## Relationship to #2690 / #2691

#2690 remains useful source evidence for private-directory descriptor binding
and cross-process exclusion tests, but its removable lock lifecycle is not
sufficient as a production recovery/fencing authority.

#2691 remains the negative proof that post-`rmdir` parent-fsync failure can
leave exclusion uncertain.

This candidate does not claim either Draft is production-qualified. It stages a
different future writer contract that does not require lock deletion at all.

## Deterministic proof

`scripts/prove_buy_void_custody_high_water_transition_fence_v1.mjs` is pure
source testing and writes no fixture state. It proves:

- exact source and #2690 parent identities are pinned;
- the module imports no filesystem API and contains no unlink/rmdir/rename/
  mkdir operation;
- every competing successor from the same prior state derives one slot;
- exact replay of the same permanent record is accepted;
- a different successor in the same slot is rejected;
- crash-before-write recovery resumes only the stored exact next bytes;
- exact committed next state is idempotently recognized;
- an unrelated observed current high-water fails closed;
- bootstrap is recoverable from absent current state;
- different source compositions competing from absent bootstrap derive the same
  permanent slot and conflicting exact records HOLD;
- exact same-state replay requires no transition fence;
- rollback, same-sequence conflict and source-composition change fail;
- tampered slot/digest and noncanonical record bytes fail.

The focused workflow runs the same proof on Node 22, 24 and 26 and requires
byte-identical receipts.

## Remaining production gates

This Draft is **not** a fence-record writer, atomic high-water writer, custody
service, IPC authentication layer, launch-signature verifier, payment
provenance verifier, or production mount.

A later privileged custody-service successor must still independently:

1. select server-owned descriptor-bound fence/high-water roots;
2. authenticate the IPC caller/principal;
3. verify the current signed launch generation and trusted server clock;
4. create/fdatasync/fsync the permanent transition record atomically;
5. recover only the exact stored transition;
6. execute and qualify the actual high-water staged-write/rename/dir-fsync;
7. bind original buyer/payment, duplicate/capacity and allocation lineage;
8. prove crash/restart behavior on the designated host; and
9. only then consider reserve/recover or authenticated POST composition.

All remain false here:

`filesystem_write_implemented=false`,
`custody_reserve_method_enabled=false`,
`custody_recover_method_enabled=false`,
`production_allocation_mutation_ready=false`,
`funds_movement=false`.

No host/service/UID/socket/permissions, real customer records, wallet/key/
signer, transaction, Chain-2050/WC, inventory/treasury/liquidity,
presale/market or funds state is accessed or changed.

**PROTECT THE CORE.**
