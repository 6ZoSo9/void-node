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

1. open the derived final leaf with `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
2. require the created regular file is owned by the effective UID, mode 0600
   and link count 1;
3. write the exact canonical #3333 record bytes plus one LF;
4. file `fsync`;
5. retain the created file descriptor and exact inode generation;
6. revalidate the owned directory and `fsync` the directory;
7. reopen/reread the visible final leaf through the owned directory FD and
   revalidate canonical bytes plus #3333 record identity;
8. prove the visible final pathname still names the exact created inode and the
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
