# Buy VOID protected allocation preflight — read-only, source only

## Purpose

The existing dedicated custody service already implements strict bounded
AF_UNIX framing and inspection; its `reserve` and `recover` methods intentionally
HOLD because caller-supplied payment verification and inventory claims are
not equivalent to an independently fsynced `payment_verified` event.
The production operator verified-payment route also still uses a payment-only
writer rather than the unmounted verified-to-allocation dispatcher.
Enabling either prematurely risks buyer money without durable token allocation.

This new Draft fills one **observation** gap without changing those live
boundaries: it reads both private allocation roots under descriptor-pinned
Linux paths without invoking `snapshotBuyVoidAllocationReservationPublicationWriterV1`,
which may *recover and write* interrupted allocation state.

## Exact source-only boundary

`observeBuyVoidCustodyAllocationRootsReadOnlyV1` accepts only exact two-field
plain data config: `ledger_root` and `high_water_root`. It rejects Proxies,
accessors, extra/symbol fields, noncanonical paths, nested/shared roots, and
nonprivate current-UID storage. Linux `/proc/self/fd` + `O_NOFOLLOW` protects
all directory components and fixed leaf names; leaf regular-file identity,
mode 0600, nlink=1, owner UID, size limits, open fd vs visible pathname and
mtime/ctime are checked before/after the complete read window. No caller
chooses a filename or a write path. It never creates/reaps temp files,
recovers publication intents, takes a publication lock or mutates disks.

The separate `previewBuyVoidCustodyReserveFromPrivateFilesReadOnlyV1`
composes the already reviewed payment/launch descriptor readers and this
new allocation-root reader. Before calling the existing **signed-launch V2
reserve planner**, it requires a canonical ledger/high-water binding via the
original allocation high-water classifier. It returns only fixed HOLD reasons
for unavailable inputs or failed signature/planning logic. Even if all
source predicates eventually pass it returns an explicitly **unmounted
preview HOLD**, never a right to publish an allocation. Candidate/receipt
bytes are not returned to callers.

The real `planBuyVoidCustodyReserveFromObservedBytesV1` still validates signed
launch authority, durable verified-payment replay, finite pool, allocation
lineage, source composition, and request-to-activation receipt bindings.
Neither this read-only composition nor any caller green flags can override
those checks.

## Negative executable checks

The source-blobs-pinned Linux proof uses only private 0700/0600 OS-temporary
files and checks actual descriptor-bound allocation/high-water reads, fixed
leaf names, inode stability, private UID/mode and no hardlinks/symlinks.
A same-bytes high-water pathname swap during the read window must HOLD.

A second proof invokes the **actual three source readers**, canonical
allocation ledger/high-water binder, and reserve planner with inert,
deliberately unsigned journal/receipt evidence. The readers and allocation
pair bind, but signed launch admission must remain HOLD. Corrupt allocation
high-water, missing activation evidence, caller green claims, arbitrary
clock, Proxies and executable getters HOLD without invoking callbacks.
Node 22, 24, 26 must emit identical receipts.

## Remaining money/launch gates — no authority implied

This source has **no cross-root atomic snapshot, installed trusted server
paths, dedicated UID qualification, dual-root writer lock, authenticated
cross-UID IPC, service mounted reserve/recover, trusted operator principal,
live source-generation signature acceptance, production allocation mutation,
WC/VOID market inventory/custody proof, bounded canary or presale activation**.
It does not establish independent witness rollback safety or qualify
recovery of an ambiguous interrupted publication; a private root read is an
observation, not a durability attestation.

The next separately reviewed production composition must acquire the exact
shared payment-capacity and allocation publication serialization authority
under an authenticated dedicated custody principal, verify a fsynced payment
and unique replay lineage, recover any pending allocation intent, revalidate
the latest monotonic dual-root state, and durably reserve **before** exposing
a success result or admitting real buyer funds.

`custody_reserve_method_enabled=false`
`cross_root_atomic_snapshot_proven=false`
`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_moved=false`

Do not merge/deploy/enable a custody method or access live buyer files
because these source-only proofs pass. **PROTECT THE CORE.**

## Non-authority CI compatibility: reviewed runtime builtin and V5 ancestor

The current V2 verified-payment executable source uses Node's built-in
`node:util` (`util.types.isProxy`) to reject executable caller objects.
The historical V1 closure scanner previously rejected this literal import
while the V5 candidate already included it. The successor scanner adds
**only** `node:util` to its external allowlist, with independent negative
tests for `node:child_process`, `node:vm`, `node:module`, dynamic,
escaping, nonliteral and CommonJS loader imports. Historical V1
source-head/tree labels and locked historical manifest bytes are unchanged.

The V5 candidate's source parent is now exact
`22a30e3ffad6047a472488104c769140bd050878`.
The historical predecessor `3533626d7167c98ba8d65d2c423b460b1a3199fc`
is verified to be a Git ancestor before the workflow accepts the current
source parent. Nothing changes accepted V4 manifest hashes, source-lock
fingerprints, dynamic-tool nonauthority or launch flags.
