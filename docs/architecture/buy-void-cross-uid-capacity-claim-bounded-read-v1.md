# Buy VOID cross-UID capacity lock: bounded retained-claim read V1

## Source-only concern

The newly merged cross-UID exclusive capacity lock from
[PR #2782](https://github.com/6ZoSo9/void-node/pull/2782)
checks that the claim file is a single regular inode no larger than
4,096 bytes before parsing. The original `openAndReadLock()` then passed
its retained descriptor to `fs.readFileSync(fd)`. Node's read-file helper
can perform its own internal file-size observation and allocate based on
size after the original 4-KiB preflight. A same-UID writer able to grow
the claim during that gap could induce larger allocations before the
later metadata checks reject the changed claim. This is a conservative
resource-bound hardening gap, not evidence of a live exploit or corrupted
payment ledger.

## Narrow correction

Only `src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs`
changes production-source bytes. `readPreflightBoundedClaim(fd, expectedSize)`
reads from the **already opened and verified** descriptor using
`fs.readSync` with an explicit positional offset. A small
`Buffer.alloc(expectedSize + 1)` is the entire memory bound. The one
sentinel byte rejects unexpected growth, while early EOF rejects
truncation. The existing before/after fd inode, pathname, UID/GID,
size, mode and nlink verification and JSON schema checks are preserved.
A file that changes remains a **hard HOLD**; no fallback to permissive
parsing, new claim schema or release bypass is introduced.

## Synthetic adversary

A separate no-network, nonroot Linux Node test uses the **actual
production lock module**, not an independent simulated reader. It creates
a disposable private directory with reviewed sticky/setgid mode,
obtains/releases a normal lock, then makes a real valid lock claim via
the existing failure-retains-lock path. During the subsequent
`openAndReadLock`, the test appends 3 MiB to that disposable claim
*after its preflight stat but before its first descriptor read*. It
requires rejection **before any critical-section callback executes**,
proves the maximum consumed bytes and buffer are exactly the preflight
size plus one, and refuses any `readFileSync(numeric_fd)` call.

The focused workflow runs independently on Node 22, 24 and 26, requires
both the original cross-UID lock proof and the new adversary, and compares
all three deterministic receipts byte-for-byte. No installed web/custody
UID, privileged Linux group, production lock directory, original buyer
file or customer ledger is contacted.

## Scope and still-blocking presale gates

This is a source/CI correction only. The lock remains unmounted in
production, and its reviewed concurrent stale-reaper recovery marker and
fail-closed callback-failure policy remain unchanged. The separate
[Draft custody V2 integration #2784](https://github.com/6ZoSo9/void-node/pull/2784)
must independently verify its exact source dependency on this new lock
generation before using it. That custody service still explicitly
HOLDs on web payment-writer participation, same-lock end-to-end
payment→allocation atomicity, protected high-water and exactly-once
recovery. First-original buyer identity and Nimo deployment also remain
independent gates.

No Ready/merge/deploy, operator service, signer/keys/wallet, customer
record, real transaction, Chain-2050/WC mutation, allocation/treasury,
presale opening or funds movement.

**PROTECT THE CORE.**
