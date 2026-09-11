# DataNet V30 campaign topology / ext4 proof v1

Status: bounded source/proof candidate only. This document does not advance #1352 acceptance, Ready/merge, deployment, production runtime, presale, transaction, treasury, validator, Work Credit, or Chain-2050 authority.

## Binding

This stacked lane is based on accepted prerequisite #1484 head `acdef1efa884cb52dfee01c5230aeb7ff8fbd918` and the exact accepted POSIX admission source Git blob `c4d92dcaaed8879bcd98b96e199729098712d5b4`.

The campaign implements the V23/V25/V26/V27/V28 topology using the payload-ledger correction recorded by #1352 review `5173807194` (V30). V30 supersedes only V29's incomplete 832 MiB arithmetic. V25's fresh E0 classifier remains mandatory, so the literal V25+V26 successful-path graph is 14,347 calls / 939,524,107 requested / 939,524,096 completed-returned bytes = exactly 896 MiB.

The stacked source delta is exactly twelve additive files: one fixture, one Node publication source, seven Python campaign/role/runtime/verifier modules, one boundary document and one focused workflow. The modular split is source organization only; it does not add process lifetimes or weaken the exact topology.

## Two retained-in-run ext4 roots

The workflow creates two independent nonsparse 384 MiB ext4 images for each Node 22/24/26 matrix leg and mounts a single empty store root on each:

- E0: empty-start race; one of eight contenders publishes H0 into fixed `S0`.
- R0: one H0 publisher reaches the durable S0 cut and is killed/reaped while holding the root+K capability; eight fresh recovery contenders then race and one publishes H1 into fixed `S1`.

The image files exist for the duration of the proof but are not uploaded as retained artifacts. Therefore this lane does **not** claim the full V23 retained-image evidence requirement or cold-remount evidence.

## Fixed namespace and admission

For immutable K, payload leaves are exactly:

- `datanet-<lowercase_hex64(K)>-s0.v1`
- `datanet-<lowercase_hex64(K)>-s1.v1`

The capability inode is exactly `.void-datanet-admission-<K>.lock.v1` and is precreated before admission begins. Admission is the accepted process-associated POSIX record lock primitive from #1482/#1484, bound to exact root `(st_dev,st_ino)`, exact capability `(st_dev,st_ino)`, UID, nlink=1, mode 0600 and size 0.

## Process-lifetime topology

The proof accounts for exactly 27 campaign process lifetimes:

| role | lifetimes |
| --- | ---: |
| observer / orchestrator | 1 |
| E0 contenders | 8 |
| fresh E0 classifier | 1 |
| R0 H0 publisher | 1 |
| checkpoint diagnostic collector | 1 |
| R0 recovery contenders | 8 |
| source-distinct final verifier | 1 |
| `/usr/bin/fallocate` helpers | 3 |
| `/usr/bin/ln` helpers | 3 |
| **total** | **27** |

Peak live campaign processes are exactly 9: observer + eight contenders. A winner cannot pass its publication gate until all seven losers in that race have exited and been reaped. Each publication executes `fallocate` and `ln` sequentially, so helper execution cannot increase the peak above 9.

A winning Python contender does not spawn a Node publisher. It clears `FD_CLOEXEC` only on its sole capability FD and publication-hold FD, closes race-control descriptors, then `execve`s the Node publication source. `exec` preserves the winning process lifetime/PID and the traditional process-owned POSIX lock. The Node source proves that exactly one FD in the holder refers to the capability inode and deliberately never closes that FD; process exit or SIGKILL is the release boundary.

## E0 paired-history control

After the E0 winner publishes S0, retires writable custody and exits, one fresh Python process reconstructs the S0-only state using a schedule-agnostic reducer and performs a distinct 1,025-call full read/hash/EOF pass. It returns `AUTHORIZE_H1` but E0 intentionally does not consume that decision, so S1 remains absent by schedule.

The reducer takes no E0/R0 schedule label, collector memory, prior terminal receipt, process ancestry, or other disposable history.

## R0 crash cut and recovery

The R0 H0 publisher acquires the exact root+K capability and `exec`s into the same publication source for S0. After the source reports durable create-only publication, directory fsync, writable-FD retirement and post-publication readback, it blocks while retaining the capability.

A fresh diagnostic collector verifies the exact S0 inode/metadata cut and independently observes the root+K capability as BUSY without adding another payload read pass. The publisher is then killed with SIGKILL and reaped. The observer must immediately acquire/release the same capability, proving crash release before the recovery race begins.

Eight fresh recovery contenders race. Exactly one acquires. All seven losers must exit and be reaped before the winner continues. The winner invokes the same Python S0-only reducer used by E0, performs the distinct R0 1,025-call full S0 read/hash/EOF pass, returns `AUTHORIZE_H1`, revalidates the held capability, and then `exec`s into Node to publish S1.

## Three actual ext4 publications

Each admitted publication performs:

1. exact helper identity/SHA-256 validation;
2. exact root and sole capability-FD validation;
3. one anonymous `O_TMPFILE` inode, mode 0600, nlink=0;
4. exactly one bounded `/usr/bin/fallocate --length 67108864 /proc/self/fd/3` helper;
5. inode-local `st_blocks * 512 >= 67108864` full-reservation predicate;
6. exactly 1,024 positioned 65,536-byte payload writes;
7. payload-fd fsync;
8. distinct 1,025-call anonymous-fd full rehash including one-byte EOF probe;
9. exactly one create-only `/usr/bin/ln -L -T -- /proc/self/fd/3 /proc/self/fd/4/<slot>` helper;
10. same-inode/nlink=1 verification and parent-directory fsync;
11. writable payload-FD retirement;
12. distinct 1,025-call no-follow post-publication full readback including EOF probe.

There is no test-only collision `ln` helper in this campaign source, because V26's exact topology permits two helper lifetimes per successful publication: one `fallocate` and one `ln`.

## Corrected V30 payload ledger

| payload phase | calls | requested | completed/returned |
| --- | ---: | ---: | ---: |
| three payload writes | 3,072 | 201,326,592 | 201,326,592 |
| three pre-publication anonymous-fd rehashes | 3,075 | 201,326,595 | 201,326,592 |
| three post-publication readbacks | 3,075 | 201,326,595 | 201,326,592 |
| paired fresh E0 + R0 S0 classifications | 2,050 | 134,217,730 | 134,217,728 |
| source-distinct final verifier, three payloads | 3,075 | 201,326,595 | 201,326,592 |
| **total** | **14,347** | **939,524,107** | **939,524,096** |

The total is 3,072 writes + 11,275 reads, with 14,336 nonempty 65,536-byte operations and exactly 11 one-byte EOF probes. Completed payload I/O is exactly 896 MiB. Under the unchanged 450-second E0+R0+final payload budget, the derived floor is `896/450 = 448/225 = 1.991111... MiB/s`.

The proof also enforces E0 <=120s, R0 <=210s, final verification <=120s, aggregate publication <=60s, and outer wall <=600s.

## Five create-only evidence files

A separate empty evidence directory receives exactly five create-only, fsynced JSON files with combined size below 2 MiB:

- `manifest.json`
- `runtime.json`
- `observer.json`
- `restart-census.json`
- `aggregate.json`

The final verifier is a separate source file/process and rereads all three payloads independently. E0 terminates as canonical S0-only / `AUTHORIZE_H1`; R0 terminates as canonical S0+S1 / `DENY_H1`.

## Deliberate HOLD boundary

This lane does not claim full #1352 storage acceptance. In particular it leaves false/open:

- V24's twelve source-bound injected I/O controls and zero-retry proof;
- a complete external syscall observer and source-distinct acyclic aggregate topology;
- retained 384 MiB image artifacts after the run;
- FIEMAP physical-extent provenance;
- cold unmount/remount verification;
- physical-power-loss evidence;
- hostile same-UID isolation;
- public-peer retrieval;
- Chain-2050 economic/transaction authority.

Filesystem-wide free-block observations are retained only as contextual evidence and are never attributed one-for-one to a single inode. The acceptance gate remains the inode-local reservation predicate.
