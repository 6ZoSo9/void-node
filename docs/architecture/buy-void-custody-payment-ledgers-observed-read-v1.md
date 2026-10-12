# Buy VOID custody payment-ledger observed read V1

Marker: `VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1`

Status: **source-only read capability / production HOLD**.

Exact source Git blob: `79eb8c39529583fffdb083173fb37b1f32075a14`.

Focused proof Git blob: `4c51d29b681d433fc3733f738f8c1a36fae9e8e1`.

## Purpose

A privilege-separated allocation service cannot trust request or
`payment_verified` bytes supplied by an IPC caller. Before a custody-side
reserve method can be enabled, the custody process needs a reviewed way to
observe the public runtime's durable `requests.jsonl` and
`operator-events.jsonl` files without following symlinks or reopening path
names between the two reads.

This module provides that read-only primitive. It does not classify a payment,
plan an allocation, acquire the payment-capacity lock, or write any state.

## Descriptor model

The caller supplies only an absolute request-directory path. That path is
**not authority**; a later service composition must bind it from protected
server configuration and independently qualify cross-UID permissions.

On Linux the reader:

1. walks every directory component through retained directory descriptors using
   `/proc/self/fd`, `O_DIRECTORY` and `O_NOFOLLOW`;
2. opens the fixed leaves `requests.jsonl` and `operator-events.jsonl`
   before reading either file;
3. pins device, inode, ownership, mode, link count, size and timestamps;
4. reads at most the opened size plus one byte so post-open growth cannot cause
   unbounded allocation;
5. revalidates both held file descriptors and both visible leaf paths after
   both reads; and
6. revalidates every held ancestor descriptor and visible ancestor path before
   returning detached Buffer copies.

A mutation to the first ledger while the second is being read therefore HOLDs.
Leaf substitution, ancestor rebinding, truncation, growth and same-window
in-place mutation also HOLD.

## Stable empty operator history

`requests.jsonl` must remain present and nonempty. A present, regular,
single-link `operator-events.jsonl` may be exactly zero bytes. That state means
only that the descriptor-bound observed operator history contains zero rows.
It is not authenticated genesis, proof that no historical payments existed,
rollback exclusion, or permission to release a cross-UID claim.

The zero-byte operator leaf still receives a one-byte preflight read. If a
writer grows it from zero to one byte after the descriptor is pinned, the
sentinel byte is observed and the read HOLDs as
`operator_changed_during_read`. A missing operator path, symlink, hard link,
replacement inode, close uncertainty, or an empty requests leaf remains HOLD.

## Deliberately narrower claim

This proves only that both files were unchanged across the retained-descriptor
**read window**. It does not prove an atomic snapshot at a single instant and
does not prevent a writer from appending immediately after the final
revalidation.

Therefore all of these remain false:

- `server_path_configuration_verified`;
- `cross_uid_permissions_qualified`;
- `cross_file_atomic_snapshot_verified`;
- `cross_file_exclusive_lock_held`;
- `payment_capacity_lock_verified`;
- `filesystem_write`;
- `custody_reserve_method_enabled`;
- `service_mounted`;
- `runtime_integration`;
- `production_allocation_mutation_ready`; and
- `funds_movement`.

The later reserve-service composition must pair this read window with the
public payment-admission serialization protocol so a second verified payment
cannot become durable while an earlier verified allocation is unresolved.

## Adversarial proof

The proof uses disposable temp files only. It requires:

- exact source identity;
- byte-exact positive reads;
- a present stable zero-byte operator history returning an empty Buffer;
- continued rejection of empty requests and missing operator paths;
- hard-link and symlink rejection;
- zero-to-one-byte operator growth rejection;
- zero Proxy/accessor execution;
- fixed leaf names;
- detection of request mutation while the operator ledger is read;
- bounded detection of post-open multi-megabyte growth;
- ancestor replacement detection;
- cleanup of retained descriptors after a mid-walk failure; and
- visible HOLD on descriptor-close failure.

Node 22, 24 and 26 must emit byte-identical proof receipts. Current PR diff
hygiene is computed from the PR merge base so an advancing base branch cannot
inject reverse changes into this lane's whitespace check.

**PROTECT THE CORE.**
