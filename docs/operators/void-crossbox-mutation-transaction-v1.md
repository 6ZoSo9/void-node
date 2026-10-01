# VOID cross-box mutation transaction contract v1

## Purpose

This contract is the first source-only implementation slice for issue #2255.

Merged #2246 makes the affected cross-box workflows fail closed on malformed
destinations, unsafe peer values, missing confirmation, dirty source trees, and
local/remote source-generation drift. It does **not** make their multi-box
effects crash-atomic.

This contract defines the durable state machine that a later executor must
implement before either workflow can claim transaction safety. It performs no
SSH, systemd, validator publication, service restart, Git tag/push, network,
credential, wallet, transaction, or funds action.

Marker:

`VOID_CROSSBOX_MUTATION_TRANSACTION_V1`

Confirmation:

`prepareReviewedCrossboxMutationTransactionV1`

## Two participants

Every transaction binds exactly two distinct participants:

- `local`
- `remote`

Both participants bind the same exact 40-hex repository HEAD.

The transaction ID is content-addressed over the mutation kind, source
identity, both exact prestates, and the intended state. Every state transition
also receives a content-addressed state ID.

A caller cannot change a prestate, intended state, source generation, or
participant identity without changing the transaction ID.

Every later transition/recovery read re-derives that transaction ID from the
stored immutable intent, requires the exact source-only authority object,
revalidates every stored receipt, and checks phase/receipt consistency. Merely
editing durable JSON and recomputing the outer state hash cannot turn forged
intent, widened authority, or a partial transaction into a valid terminal.

This module is a **state-machine/receipt contract**, not a host observer. The
later live executor must derive every prestate, publish, verify, and restore
receipt from independently observed filesystem/systemd/runtime truth. It must
not treat caller-declared receipt booleans or hashes as evidence by themselves.
The executor integration is responsible for binding those observations to
durable files/receipts before passing them through this contract.

## Site-bundle peer persistence prestate

For each participant the prestate includes:

- hostname;
- exact repository HEAD;
- selected drop-in existence, SHA-256, and mode;
- exact systemd manager-environment values or absence for:
  - `VOID_SITE_BUNDLE_PEERS`
  - `VOID_DATANET_SITE_BUNDLE_PEERS`
  - `VOID_DATANET_PEERS`
  - `VOID_DRIFT_PEER`
- service active/inactive truth;
- nonzero 32-hex systemd `InvocationID` when active.

The manager environment is part of prestate because the current #2246
workflow clears those variables with `systemctl --user unset-environment`.
Restoring only the drop-in file would not restore exact prior state.

The intended state binds the reviewed drop-in name, local/remote peer origins,
exact target drop-in hashes, and restart-if-active policy.

A stopped service must stay stopped. A restart receipt is required only when
the transaction explicitly permits restart-if-active and that participant was
active in prestate.

## Validator closeout prestate

For each participant the prestate includes:

- hostname;
- exact repository HEAD;
- prior `verified-current` existence and content identity;
- prior shadow/runtime identity SHA-256;
- service active/inactive truth and active `InvocationID`.

The intended state binds:

- exact validator epoch;
- bounded vault name;
- exact intended manifest-set SHA-256;
- exact checkpoint-tag name;
- proof that the checkpoint tag did not already exist;
- participant-specific restart-if-active policy.

The checkpoint tag is not part of prepare or partial commit. It becomes
eligible for publication only after both participant states are independently
verified, the transaction is otherwise ready to commit, and the executor
**re-checks that the exact checkpoint tag is still absent**. Initial tag
absence is not enough because another actor could create it while the
transaction is in flight.

## State machine

The only normal phases are:

`PREPARING -> PREPARED -> COMMITTING -> COMMITTED`

Failure recovery is:

`PREPARING|PREPARED|COMMITTING -> ROLLING_BACK -> RESTORED`

Unrecognized/conflicting durable state becomes:

`HOLD`

A partial transaction is never GREEN.

### Prepare

Each participant contributes a prepare receipt that binds:

- transaction ID;
- exact participant prestate ID;
- exact staged target state SHA-256;
- `publication_performed=false`.

Both receipts are required before commit can begin.

### Publish and verify

Before any publication-side effect, the future executor must durably record a
participant `publish_started` receipt. It binds the original prestate ID, exact
target-state SHA-256, whether restart is expected, and the pre-restart
`InvocationID` when applicable, while requiring
`publication_performed=false`.

Once that durable start exists,
`nextVoidCrossboxMutationRecoveryV1(...)` returns
`RECOVER_PUBLISH_<participant>`, not a blind publish instruction. Recovery
must re-observe the participant first. If the exact intended state/restart is
already present after a crash, it records the final publish receipt without
repeating the side effect. If the exact original prestate and invocation are
still present, it may record a `publish_no_effect` witness; that closes the
ambiguous attempt and forces rollback rather than silently retrying the same
transaction. An unresolved publish start cannot enter `ROLLING_BACK`.

A publish receipt must match the intended participant state exactly.

Immediately before publication, the live executor must re-observe the
participant prestate and bind `prestate_id_before_publish` to the original
captured prestate ID. If any drop-in/environment/validator-lineage/service
precondition has drifted since PREPARE, publication must HOLD instead of
overwriting the newer state.

If restart-if-active applies to an active prestate, the receipt must bind:

- exact pre-restart `InvocationID`;
- exact post-restart `InvocationID`;
- proof that the invocation changed.

If the participant was inactive, a publish receipt may not claim a restart.

A verify receipt must prove the intended state is actually observed and that
the service active/inactive state remains equal to prestate.

Both participants must verify before `COMMITTED`.

### Rollback

Rollback is explicit and content-addressed. Before any restore-side effect, the
future executor must durably record `restore_started` for that participant.
The start binds the exact prestate ID and, when a restart is required, the exact
post-publication `InvocationID` from which rollback must begin.

After that start is durable,
`nextVoidCrossboxMutationRecoveryV1(...)` returns
`RECOVER_RESTORE_<participant>`. If restoration/restart completed and the
process crashed before the final restore receipt was persisted, recovery must
observe the exact restored prestate and advanced InvocationID and record the
receipt **without issuing a second blind restart**. If restoration had not yet
occurred, the same observation step establishes what work remains.

Each participant must ultimately produce a restore receipt bound to its exact
prestate ID.

Site-bundle restore additionally requires:

- drop-in restored;
- manager environment restored;
- service state restored.

Validator restore additionally requires:

- prior `verified-current` lineage restored;
- prior shadow/runtime identity restored;
- service state restored.

A participant that was never published must not perform an unnecessary
recovery restart.

A published participant whose active service requires restart must form one
continuous invocation chain:

```text
prestate InvocationID
  -> publish.restart_after_invocation_id
  -> restore.restart_before_invocation_id
  -> restore.restart_after_invocation_id
```

The restore receipt's `restart_before_invocation_id` must equal that same
participant's publish `restart_after_invocation_id` exactly, and the restore
restart must advance it again. A valid-looking but unrelated InvocationID fails
closed. Repeated exact receipts are idempotent, while conflicting duplicates
fail closed.

Both participants require restore receipts before `RESTORED`.

## Recovery decisions

`nextVoidCrossboxMutationRecoveryV1(...)` returns one bounded next action:

- prepare missing participant;
- begin commit;
- publish missing participant;
- verify missing participant;
- finalize commit;
- restore missing participant;
- finalize restore;
- terminal committed/restored;
- HOLD.

The function never infers success from one participant alone. Its publish and
restore decisions deliberately distinguish:

- `BEGIN_PUBLISH_*` from `RECOVER_PUBLISH_*`;
- `BEGIN_RESTORE_*` from `RECOVER_RESTORE_*`; and
- externally proven `publish_no_effect`, which yields `BEGIN_ROLLBACK`.

That distinction is the durable crash seam: once a side-effect intent has been
persisted, recovery observes before acting instead of inferring that a missing
final receipt means the side effect never happened.

## Future live integration

This source slice does not yet edit:

- `ops/security/void-site-bundle-peer-env-persistence-proof.sh`
- `ops/mainnet/validator-crossbox-closeout.sh`

A later #2255 slice must persist the contract's intent/participant receipts
durably on the two boxes and make actual publication/restart/recovery obey this
state machine.

That integration must stage both participants before publication, preserve
exact prestates, fsync every `publish_started` / `publish_no_effect` /
`restore_started` journal transition **before** the corresponding live side
effect, re-observe the host on every `RECOVER_*` action, recover idempotently
after SSH/process/power loss, and keep Git checkpoint publication strictly
after two-party commit.

## Authority boundary

The contract has no execution authority. In particular it performs no:

- SSH or network access;
- systemd or service mutation;
- validator publication;
- Git tag creation or push;
- runtime, credential, key, wallet, signer, transaction, Chain-2050, Work
  Credit, treasury, liquidity, or funds action.
