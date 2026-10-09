# Buy VOID custody exclusive lock — post-removal fsync uncertainty disclosure

This Draft is a **synthetic fault-cut review child** of
[#2690](https://github.com/6ZoSo9/void-node/pull/2690), exact parent
`c2fbf99de1066295a93b61d4ce7fd668254ac34c`.
The parent is an UNMOUNTED, cross-process private custody lock source
candidate. Neither this Draft nor its parent is a privileged high-water
writer, authenticated IPC service or production lock deployment.

## Separate release durability question

The current `withBuyVoidCustodyHighWaterExclusiveLockV1` obtains a private
directory lock and fsyncs the parent BEFORE executing the supplied synchronous
callback. That correctly retains the lock on an error before the callback or
in the callback. After a successful callback, however, the code calls:

```js
fs.rmdirSync(privatePath);
fs.fsyncSync(heldParent.fd);
lockCreated = false;
```

The final parent fsync can fail **after the lock pathname is already gone**.
The API then throws, but another process may enter the critical section
because `mkdir(lockdir)` no longer sees the missing lock. The documentation's
statement that failures retain the lock is not guaranteed for this **specific
post-rmdir fsync failure window**. This is an ambiguity about a *candidate
unmounted primitive*, not evidence of a live VOID double reservation.

## Narrow standalone exact-source negative proof

`scripts/prove_buy_void_custody_exclusive_lock_release_fsync_fault_v1.mjs`
imports the **actual** source from #2690 and pins its precise Git blob
`1785709f55fa707c126a32f3909111d019156233`.

It creates ONE private `os.tmpdir()` fixture. Under an unprivileged Linux
UID, it patches only its **own process's** `fs.fsyncSync` or
`fs.rmdirSync` to simulate three deterministic EIO cut points:

1. First parent fsync fails before callback: callback never runs, lock
   directory remains, independent second process is refused.
2. Lock-directory `rmdirSync` fails after a successful callback:
   lock directory remains, independent second process is refused.
3. **Second** parent fsync fails after successful callback and successful
   `rmdirSync`: API throws but lock pathname is ABSENT. An independent
   Node child process can acquire the same private directory lock.

This last observation is a NEGATIVE SECURITY DISCLOSURE, not a positive
locking qualification. The three cases distinguish "callback failed" from
"release durability was uncertain after removing the exclusion token".
There is no forced real power loss, reboot, filesystem failure, or mounted
customer record. All patched globals are restored; the disposable fixture
is removed in a finally block.

Node 22/24/26 isolated workflows rerun the precise fault stages and require
byte-identical receipts. They use no npm install, Docker, network RPC, live
customer data, real custody root or signing service.

## Review and repair implications

Do not claim an absent lock represents a safe completed release merely
because the callback returned. If a later high-water writer uses this
primitive, **a failed final fsync after rmdir MUST result in explicitly
unqualified/uncertain publication state**, and a recovery coordinator needs
a persistent fence/journal or reviewed release protocol preventing a
second writer from assuming the preceding high-water is durably committed.
A naïve recreate-after-failure is not by itself race-free once the name
has become absent. A failure-safe successor needs an independently reviewed
crash, power-loss, cross-process, reentry, and durable state protocol;
this test alone does not choose or authorize such a repair.

The separate #2681 custody launch authority, #2684 descriptor observer
and #2690 private lock are still **unmounted**. Preserve production flags:
`custody_high_water_writer_implemented=false`,
`cross_uid_ipc_authenticated=false`,
`production_allocation_mutation_ready=false`,
`funds_moved=false`. No reserve/recover, Ready/merge, service,
permission/UID change, real ledger, wallet/key/signer, payment,
transaction, Chain-2050/WC, treasury/liquidity or presale opening.

**PROTECT THE CORE.**
