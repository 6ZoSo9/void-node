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
verified and the transaction reaches `COMMITTED`.

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

A publish receipt must match the intended participant state exactly.

If restart-if-active applies to an active prestate, the receipt must bind:

- exact pre-restart `InvocationID`;
- exact post-restart `InvocationID`;
- proof that the invocation changed.

If the participant was inactive, a publish receipt may not claim a restart.

A verify receipt must prove the intended state is actually observed and that
the service active/inactive state remains equal to prestate.

Both participants must verify before `COMMITTED`.

### Rollback

Rollback is explicit and content-addressed. Each participant must produce a
restore receipt bound to its exact prestate ID.

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

A published participant whose active service requires restart must advance
`InvocationID`; repeated exact receipts are idempotent, while conflicting
duplicates fail closed.

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

The function never infers success from one participant alone.

## Future live integration

This source slice does not yet edit:

- `ops/security/void-site-bundle-peer-env-persistence-proof.sh`
- `ops/mainnet/validator-crossbox-closeout.sh`

A later #2255 slice must persist the contract's intent/participant receipts
durably on the two boxes and make actual publication/restart/recovery obey this
state machine.

That integration must stage both participants before publication, preserve
exact prestates, fsync durable phase changes, recover idempotently after SSH or
process loss, and keep Git checkpoint publication strictly after two-party
commit.

## Authority boundary

The contract has no execution authority. In particular it performs no:

- SSH or network access;
- systemd or service mutation;
- validator publication;
- Git tag creation or push;
- runtime, credential, key, wallet, signer, transaction, Chain-2050, Work
  Credit, treasury, liquidity, or funds action.
