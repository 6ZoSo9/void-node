# DataNet V31 campaign topology on ext4 v1

This stacked source/proof-only lane starts from #1488 exact accepted Draft head `9f23742730fe63e92860b6213f65aa4bfc9670c3` and assembles the full V26 **27-lifetime / peak-9** process topology using the repaired campaign-safe admitted publisher.

V31 is an evidence-generation label, not a new storage protocol. It records one ledger correction forced by the accepted #1487/#1488 behavior: S1 independently full-verifies S0 before opening its candidate even though the R0 recovery winner has already run the schedule-agnostic V25 S0 reducer before `execve()`.

## Exact inherited bindings

The campaign fixture binds:

- #1482 POSIX admission source Git blob `c4d92dcaaed8879bcd98b96e199729098712d5b4`;
- accepted #1487 S0/S1 publication fixture Git blob `ffe0df7cd6ed583bf59105e1a20be7d3483fb9f1`;
- accepted #1488 admitted publisher Git blob `0ec6b781a2a01e1f0094f27854577441f886af47`; and
- the campaign-instrumented descendant publisher Git blob `7c4d708ddee16c48fb276540e99defed02fec931`.

The only campaign instrumentation added to the admitted publisher is an optional inherited hold pipe after its structured receipt plus helper child PID reporting. With no hold fd set, the existing #1488 composition proof continues to exercise the same publication path. The instrumentation does not add a process lifetime or a helper.

## V26 topology assembled

Each natural Node 22/24/26 matrix leg uses two fresh dedicated nonsparse 384 MiB ext4 images, one for E0 and one for R0.

E0:

- the observer launches eight same-K contenders;
- exactly one acquires and seven return BUSY;
- all seven losers are reaped before the winner gate opens;
- the winning lock owner keeps the same PID across `execve()` and becomes the Node S0 publisher;
- S0 executes exactly one `fallocate` and one `ln` helper, sequentially;
- while the published winner is held, a fresh same-K acquisition remains BUSY;
- after release/exit, a fresh same-K acquisition succeeds; and
- one fresh classifier process runs the shared schedule-agnostic S0-only reducer, full reads/hash/EOF verifies S0, returns `AUTHORIZE_H1`, and does not consume H1 by schedule.

R0:

- one H0 publisher acquires root+K and becomes the Node S0 publisher in-place;
- after durable S0 and after both helpers have exited, the publisher blocks on the campaign hold while still owning the capability;
- one diagnostic collector confirms S0 metadata, S1 absence, and same-K BUSY without rereading payload bytes;
- the H0 publisher is SIGKILLed/reaped at that cut and a fresh acquisition succeeds;
- eight fresh recovery contenders race; exactly one wins and seven return BUSY;
- all seven losers are reaped before the winner proceeds;
- the winner runs the same schedule-agnostic S0-only reducer used by E0, returning `AUTHORIZE_H1` while retaining the capability;
- that same process then `execve()`s into the admitted S1 publisher;
- the S1 publisher independently full-verifies S0 again before opening its anonymous candidate, preserving the accepted #1487/#1488 publication shape;
- S1 executes exactly one `fallocate` and one `ln` helper; and
- S0/S1 remain distinct payload inodes.

Final verification uses a source-distinct process that independently full reads E0 S0 and R0 S0/S1, requiring E0 `AUTHORIZE_H1`, R0 `DENY_H1`, three distinct payload inode identities, and the exact final read ledger.

## Exact lifetime and peak arithmetic

Campaign-relevant role lifetimes are exactly 21:

- observer: 1;
- E0 contenders: 8;
- E0 classifier: 1;
- R0 H0 publisher: 1;
- R0 checkpoint collector: 1;
- R0 recovery contenders: 8; and
- source-distinct final verifier: 1.

The three successful publications each execute exactly two helpers, giving six helper lifetimes. Therefore the campaign total is **21 + 6 = 27 lifetimes**.

Peak live is **9**: observer plus eight contenders. Seven race losers are reaped before a winning publisher may launch either helper; helpers are sequential; the R0 checkpoint collector starts only after both H0 helpers have exited while the publisher is blocked on its hold pipe. No later phase can exceed the initial observer-plus-eight race.

## V31 payload ledger correction

The previous V30 campaign arithmetic was 14,347 calls / 896 MiB completed. That graph did not include the now-required independent S1-publisher S0 verification introduced by the accepted campaign-safe publication shape.

V31 retains both schedule-agnostic reducer passes and adds exactly one 1,025-call / 64 MiB S0 read/hash/EOF pass inside the S1 publisher before candidate allocation. The composed successful-path ledger is therefore:

- **15,372 calls**;
- **1,006,632,972 requested bytes**;
- **1,006,632,960 completed/returned bytes = 960 MiB**;
- 3,072 writes;
- 12,300 reads;
- 15,360 nonempty calls; and
- 12 EOF probes.

Against the unchanged 450-second E0 + R0 + final-verification phase budget, the corrected aggregate payload floor is `32/15 MiB/s` (~2.1333 MiB/s).

## Evidence

Each matrix leg creates exactly five create-only fsynced JSON evidence files under 2 MiB combined: `manifest.json`, `runtime.json`, `observer.json`, `restart-census.json`, and `aggregate.json`. The aggregate records the 27/9 topology, the corrected 960 MiB ledger, same-PID exec handoffs, one-of-eight race outcomes, R0 H0 crash release, and the S1 independent pre-allocation S0 verification.

The ext4 images are proof-run scratch artifacts only and are not claimed as retained-image, FIEMAP, cold-remount, or cold-storage evidence.

## Deliberate HOLD boundary

This lane closes only the full V26 lifetime/topology composition target. It does **not** close full #1352 storage acceptance. Still open are V24's twelve source-bound injected I/O/no-retry controls, complete external syscall-observer coverage, a source-distinct acyclic aggregate proof, retained-image/FIEMAP provenance, cold unmount/remount acceptance, the separate full cold-storage second-copy/recovery policy, physical power-loss evidence, hostile same-UID isolation, public-peer retrieval, and Chain-2050 economic/transaction authority.

Keep Draft. No Ready/merge, deployment/restart, production runtime/network mutation, credential/key/wallet/signer access, transaction, inventory, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is authorized by this lane.
