# Coupled native-gas reconciliation writer v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_WRITER_V1`

## Purpose

This contract closes the durable publication boundary between the merged
read-only reconciliation evidence resolver and the merged effective-open
native-gas liability census.

It does one narrow mutation: publish exactly one authenticated reconciliation
record for one existing presale gas liability, under the payer's existing
`gas-liability-admission-v1.queue`, then prove the effective-open reserve
changed by exactly that liability's reserved envelope.

It does not delete or rewrite the immutable liability row.

## Required existing state

The caller supplies:

- one pre-provisioned payer-domain root;
- the exact payer address;
- one exact liability ID;
- the server-controlled reconciliation resolver policy.

The payer root must already contain:

```text
payer-domain-v1.json
records/
reconciliations/
gas-liability-admission-v1.queue/
```

The writer never bootstraps missing storage. It calls
`qualifyCoupledNativeGasReconciliationStorageV1(...)` while already holding
the existing payer queue and HOLDS if qualification fails.

All root, child-directory and file reads are no-follow descriptor-bound reads.
History scans are bounded by record count, per-file bytes and total bytes, and
require exact canonical JSON serialization. The filename is also authoritative:
`records/<liability_id>.json` must contain that exact `liability_id`, and
`reconciliations/<reconciliation_id>.json` must contain that exact
`reconciliation_id`. Canonical bytes under an alternate 64-hex filename HOLD.

## Serialization and evidence order

One successful first publication follows:

```text
pin root / records / reconciliations / existing payer queue
  -> enter gas-liability-admission-v1.queue
  -> qualify reconciliation storage
  -> bind exact payer-domain bytes
  -> census immutable liabilities + reconciliations
  -> require target liability effective-open
  -> invoke #2492 exact read-only reconciliation evidence resolver
  -> re-read payer-domain and both histories
  -> require exact pre-resolution census/snapshot identity unchanged
  -> re-qualify storage
  -> create/fsync reconciliation record create-once
  -> reread immutable liability history + reconciliation history
  -> rerun #2488 effective-open census
  -> require target leaves effective-open exactly once
  -> require reserve reduction == target maximum_reserved_wei
  -> re-qualify storage
  -> return stored
```

The publication name is:

```text
reconciliations/<reconciliation_id>.json
```

and the file bytes are the exact canonical reconciliation object plus one final
newline.

Publication uses a private temporary file, file fsync, create-only hard link,
directory fsync, temp unlink, second directory fsync and exact final-byte
postcheck. The liability record remains in `records/` as immutable historical
truth.

## Replay trust model

A pre-existing reconciliation is **not** accepted merely because the pure
effective-open census says its accounting shape is valid.

The current storage qualification proves filesystem structure, not independent
writer-authenticated provenance. Therefore an idempotent retry:

1. reruns the merged #2492 evidence resolver against the immutable liability;
2. revalidates the complete payer-domain/liability/reconciliation snapshot;
3. requires the stored reconciliation ID and canonical bytes to equal the
   freshly resolved reconciliation exactly; and
4. only then returns `status=idempotent`.

A semantically valid but independently planted reconciliation with different
terminal evidence therefore HOLDS instead of silently releasing reserve.

Before returning authenticated idempotent success, the writer fsyncs the
reconciliation directory and revalidates its pinned/visible identity. This
refreshes durability for the recovery case where a canonical hard-link entry is
visible after restart but the prior process may have crashed before its
directory fsync completed. Failure to establish that durability HOLDS instead
of claiming a successful replay.

## Crash and concurrent behavior

The existing payer queue is the only mutation serialization domain. No second
reconciliation lock namespace is introduced.

Two concurrent exact requests serialize. The first may publish one record; the
second must freshly reauthenticate that exact record and return idempotent.
Exactly one reconciliation file exists.

If an error occurs after the canonical create-only hard link, the result is
`held_after_mutation` with `mutation_performed=true`. The canonical file is
left visible. A later invocation must reauthenticate it through the resolver
before accepting idempotence.

A process crash can also leave the writer's private temporary hard-link source.
While holding the same payer queue, the writer normalizes only exact
writer-owned temp names of the form
`.<reconciliation_id>.json.tmp-<pid>-<16 lowercase hex>`:

- an `nlink=1` temp has no canonical publication authority and is removed as
  an incomplete pre-link/pre-cleanup artifact after no-follow identity checks;
- an `nlink=2` temp is removed only when the exact
  `<reconciliation_id>.json` final name exists and is proven to be the same
  inode.

Cleanup is directory-fsynced and reported as a real mutation. Unknown temp
shapes, unsafe files, unexpected link counts, or a two-link temp that does not
alias its exact final name HOLD. Authenticated replay can therefore recover
from the post-link/pre-unlink crash seam without weakening the namespace
allowlist.

If liability or reconciliation history changes while the resolver performs its
read-only local/RPC evidence work, the writer HOLDS before publication.

## Effective-open accounting

The writer requires the post-publication census to preserve:

- historical liability count and identities;
- immutable liability bytes;
- historical maximum reserved wei.

It additionally requires:

- reconciled liability count increases by exactly one;
- effective-open liability count decreases by exactly one;
- target liability moves from effective-open to reconciled;
- exact reconciliation ID is present; and
- `effective_open_reserved_before - maximum_reserved_wei ==
  effective_open_reserved_after`.

No mutable `released=true` bit exists. Reserve release is derived from the
immutable admission history minus authenticated reconciliation history.

## V1 scope

This writer accepts only the currently reviewed presale reconciliation domain.
WC/VOID reconciliation remains false until a reviewed WC/VOID settlement-plan,
terminal-receipt and reconciliation authority exists.

The source authority reports filesystem read/write and reconciliation-record
publication because invoking this source function mutates its supplied private
store. It also reports `root_path_stability_proven=false`: retained descriptors
detect visible-root drift and force HOLD, but this source contract does not
prove that a same-UID actor cannot replace the payer-root pathname during an
admitted operation. That stronger property remains a host/runtime custody gate.

Merging the source does not invoke it on production state.

## Authority boundary

This lane does **not** authorize:

- reconciliation storage bootstrap;
- liability-row rewrite or deletion;
- retry execution;
- runtime mounting;
- wallet/private-key/signer access;
- transaction construction, signing or broadcast;
- Chain-2050 mutation or gas spend;
- presale or WC/VOID activation;
- inventory, treasury or liquidity movement; or
- funds movement.

The next gate after source acceptance is deliberate runtime composition and
designated-host execution under the already reviewed payer storage/custody
policy. That remains a separate authority decision.

## Verification

```bash
npx tsx scripts/prove_coupled_native_gas_reconciliation_writer_v1.ts
npm run typecheck
npm run build
git diff --check
```

The focused proof covers first publication, exact replay with fresh
reauthentication, conflicting replay evidence HOLD, resolver HOLD before
mutation, concurrent history drift HOLD, missing reconciliation storage HOLD,
post-publication failure truth, pre-link stale-temp cleanup, same-inode
post-link temp cleanup with truthful mutation reporting, filename/row identity
mismatch HOLD, recovery by authenticated idempotent replay, idempotent
directory-durability refresh, and two concurrent exact requests producing one
canonical record.
