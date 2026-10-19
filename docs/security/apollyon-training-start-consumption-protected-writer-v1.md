# Apollyon training-start protected consumption writer v1

Marker: `VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1`

Status: **source/test candidate only; no Xiphos installation or training authority**.

## Purpose

This gate supplies the bounded create-once persistence primitive required by the
accepted #3333 one-time training-start consumption contract. It is stacked on
accepted #3351 so the source chain remains continuous, but it does not implement
the separately reserved trainer-release mechanism.

The writer accepts only:

1. one exact #3333 persisted training-start consumption record; and
2. one already-open caller-retained directory file descriptor.

The caller selects the already-open directory capability by FD; this gate does
not prove that capability came from the protected Xiphos store. It accepts no
store pathname string, final filename, service name, socket, UID/GID selection,
trainer-release token, or arbitrary bytes.

## Directory boundary

The supplied directory FD is not trusted as protected-store evidence.

Before use, the module requires Linux, an open directory FD >= 3, current-euid
ownership, exact mode 0700 and a live linked directory. It immediately opens
`/proc/self/fd/<n>` into a module-owned CLOEXEC directory FD, proves that copy
has the same dev/inode/owner/group/mode as the caller FD, and revalidates the
caller FD before proceeding. All later slot access uses only the owned FD.

Accordingly:

```text
protected_consumption_store_origin_proven=false
unique_authorization_claim_slot_protected_origin_proven=false
unique_authorization_claim_slot_revalidation_performed=false
current_store_generation_revalidation_performed=false
```

A future Xiphos integration must establish those facts before calling this
primitive.

## Derived slot namespace

The final leaf is derived only from the exact authorization-wide
`training_start_consumption_slot_id` validated by #3333:

```text
training-start-consumption-v1-<64 lowercase hex>.json
```

The caller chooses the directory capability, but cannot choose or override the
child leaf. Read/write scope is exactly that one derived child beneath the
supplied directory FD.

## Create-once publication

If the slot is absent, publication is:

1. revalidate the owned directory dev/inode/owner/group/mode and 0700 policy at the mutation boundary;
2. open the derived final leaf with `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
3. require the created regular file is owned by the effective UID, mode 0600
   and link count 1;
4. write the exact canonical #3333 record bytes plus one LF;
5. file `fsync`;
6. retain the created file descriptor and exact inode generation;
7. revalidate the owned directory and `fsync` the directory;
8. reopen/reread the visible final leaf through the owned directory FD and
   revalidate canonical bytes plus #3333 record identity;
9. prove the visible final pathname still names the exact created inode and the
   retained created descriptor has not drifted.

Only then may the source function return
`training_start_consumption_created_durable`.

## Existing slot and crash behavior

An exact pre-existing record means **already consumed**. It is never reusable
training admission and is never rewritten.

Any malformed, partial, oversized, symlinked, hard-linked, non-0600 or different
record occupying the derived slot fails closed. This module never unlinks,
renames, truncates, replaces or repairs a final slot.

Therefore a crash-partial visible final record is a permanent HOLD for this
gate. Recovery cannot silently convert an indeterminate prior publication into
a fresh attempt. There is no automatic retry.

## Deliberate non-authority

This source candidate does not:

- create directories, accounts, groups, units or sockets;
- select a Xiphos pathname;
- prove the supplied directory came from the protected store;
- reread/revalidate the current #3357 protected authorization winner;
- revalidate the current claim-store generation;
- release or start a trainer;
- execute model/training/candidate-weight work;
- access private keys, sign, use wallets, submit transactions or move funds.

It may read one derived slot and may create exactly one derived final record
under the caller-retained directory FD. That bounded filesystem capability is
the only positive mutation authority.

The next host integration must revalidate the protected #3357 winner, exact
durable claim/store generation and protected directory origin immediately before
invoking this writer, then separately satisfy the accepted #3351 release gate.

PROTECT THE CORE.

## October 19 current-parent reconciliation

This generation is a non-force merge-forward over current #3351
`9e1da5dbb1ae12114a26506fbf1c6bc56780b98f`. The protected-writer source remains byte-identical at
`a08927b7b16884a9bf0c28328047afdab49649ea`. The focused proof now binds
the current #3333 consumption source
`42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3`, current authorization-slot
source `c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8`, and current claim-service
candidate `87019ae1245a2054407dd47835b0b7a891d4d9a2`.

Protected-store origin, current store-generation and protected-winner
revalidation, trainer release, training, credentials, transactions, and funds
authority remain false/unperformed.

## October 19 — inert writer-input preflight (stacked child)

The protected writer is a reusable source-only filesystem mutation primitive.
Its previous `publishApollyonTrainingStartConsumptionProtectedV1()` and
`classifyApollyonTrainingStartConsumptionProtectedSlotV1()` called
`structuredClone(input)` before inspecting the input's own property
descriptors. Native structured cloning invokes enumerable JavaScript getters.
The historical proof even expected a caller-owned getter to execute once
during a successful publication. That expectation is unsafe for a later
privileged writer boundary.

Both entry points now require an exact two-field plain data envelope before
directory-FD access. The supplied persisted consumption record is separately
snapshotted from its 26 exact own enumerable data descriptors, permitting
only bounded 1..256-character strings, primitive booleans, and safe integers.
Active/revoked proxies, accessors, nested objects, coercion hooks, hidden or
symbol fields, unknown fields, and 4096-key amplification fail closed before
any historical validator clone or filesystem access. The exported slot-leaf
derivation helper uses the same prevalidation.

The disposable proof checks that malformed input cannot execute a getter,
proxy trap, implicit coercion, or clone a caller-owned object, and that neither
public operation creates a slot on malformed input. The accepted complete
canonical #3333 record and exact one-attempt semantics are unchanged.

This child does not select/prove the protected Xiphos directory capability;
that remains a separate privileged host gate. No service, training, credential,
key, wallet or funds authority is gained. **PROTECT THE CORE.**

## October 19 — existing-slot held-inode and bounded-read repair

The existing-slot classification path now treats the visible slot pathname as
adversarial between metadata inspection and data access.

After the initial bounded regular-file check, the writer opens the leaf with
Linux `O_PATH|O_NOFOLLOW|O_CLOEXEC`, revalidates that admitted inode against
the visible generation, and data-opens only `/proc/self/fd/<held-path-fd>`
with `O_NONBLOCK|O_CLOEXEC`. A raced FIFO, device, symlink or other special
inode therefore cannot become a blocking or side-effecting visible-path data
open.

The actual FD read is independently bounded to a fixed
`MAX_RECORD_BYTES+1` buffer. Growth beyond 64 KiB is rejected without
`readFileSync` or an unbounded allocation. Held data FD, held O_PATH FD and
visible pathname identities are revalidated after the read.

Disposable regressions replace a valid slot with a FIFO at the admission seam
and grow a valid regular file at its first read. They require zero visible-path
data opens, a maximum read request of 64 KiB + 1, and fail-closed rejection.

Current repaired writer blob:
`473b4148e6bcb755bb8bf7c6af890150a9f43efe`.

## October 19 — both existing-slot read descriptors close on uncertainty

The existing-slot reader already admits the visible record through a retained
`O_PATH` descriptor, then opens a nonblocking, size-bounded data descriptor
from that held inode. Before this repair, the `finally` block closed the data
descriptor before the `O_PATH` descriptor. An error from the first
`closeSync` skipped the second close entirely, potentially accumulating
retained inode descriptors across rejected reads. A failed close does not
establish whether the kernel released that FD.

`closeExistingReadFds` now independently attempts both owned descriptor
closes **once each**, records the first error as the cause, and raises
`apollyon_training_start_writer_existing_read_close_uncertain` if either
close fails. No ambiguous close is retried and no positive
`already_consumed` or `created_durable` result escapes cleanup
uncertainty.

Disposable tests simulate EIO **after a real kernel close** for the data FD,
path FD, and both FDs. They check that each close was attempted exactly once,
that read-only classification and existing-slot publication fail closed,
that the full FD set is unchanged, and that stored bytes/filenames are
unchanged. They do not simulate every possible kernel close failure.

This is a source-only resource-ownership repair. Protected directory origin,
current store/winner/claim admission, consumed-slot publication authority,
trainer release, training, credentials, keys and funds authority remain false.

## October 19 — duplicated directory rejection cleanup uncertainty

If validation rejects after the caller-retained directory FD has been
duplicated, a close failure on that module-owned duplicate is now surfaced as
`apollyon_training_start_writer_owned_directory_close_uncertain`.
The close is attempted exactly once; ambiguous cleanup is never retried or
silently discarded.

Disposable proof forces the post-duplication caller-directory revalidation to
fail, then injects EIO after a real kernel close of the owned duplicate. Both
public writer entrypoints must fail closed, attempt that close exactly once,
and leave the process FD set unchanged.

This remains source-only cleanup hardening and grants no protected-store,
publication, trainer, training, credential, transaction, or funds authority.
