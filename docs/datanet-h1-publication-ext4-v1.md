# DataNet H1 ext4 publication primitive v1

Marker: `VOID_DATANET_H1_PUBLICATION_EXT4_V1_GREEN`

Status: source/proof only. This is a corrected V26 publication-primitive lane following #1352 V29 ledger reconciliation. It is not the complete V23–V29 composition and does not advance any #1352 acceptance bit.

## Source-bound control

`fixtures/datanet-h1-publication-ext4-v1.json` binds:

- one synthetic stable quota key K and the exact V27 S1 name `datanet-<K>-s1.v1`;
- 67,108,864 payload bytes and 65,536-byte positioned application I/O;
- the SHA-256 of the all-zero 64 MiB synthetic payload;
- an ext4 384 MiB hosted-image profile;
- absolute `/usr/bin/fallocate` and `/usr/bin/ln` helper paths;
- SHA-256 `aeb8fd4c49875dd053ea120966a7ad227ff4adeb31e04418ed8c96ebf8044e72` for `/usr/bin/fallocate`;
- SHA-256 `059a363e62adcc10e14e55b5c82df6945509303eb32370b02c461311329ad261` for `/usr/bin/ln`;
- 5,000 ms helper timeout and 8 KiB stderr ceiling;
- exact one-publication write/prepublication-read/postpublication-read ledgers; and
- V29's composed 13,322-call / 872,415,242-requested / 872,415,232-completed successful-path ledger.

The two helper hashes were observed identically across the prior #1480 Node 22/24/26 Ubuntu 24.04.5 runner jobs. This lane fails closed if either binary changes; it does not silently accept a runner-image helper replacement.

## Reservation and publication proof

The workflow constructs a fresh nonsparse 402,653,184-byte image, formats it ext4, mounts it only for the focused proof, creates one empty store directory, and passes that directory to the Node proof. The Node proof then:

1. opens the store root no-follow, verifies ext4 magic `0xef53`, and records the free-block baseline **before the anonymous candidate inode exists**;
2. opens one anonymous `O_TMPFILE` below the retained root, mode 0600, nlink 0, size 0, then records the post-creation free-block state;
3. bounds any candidate-creation free-block charge to at most one ext4 filesystem block instead of silently discarding it from reservation accounting;
4. launches exactly one bounded absolute `/usr/bin/fallocate --length 67108864 /proc/self/fd/3` with the anonymous payload fd inherited only as child fd 3;
5. requires the exact anonymous inode identity, owner UID, mode 0600, nlink 0, exact length, and at least 64 MiB of `st_blocks` allocation;
6. requires the **combined** candidate-creation plus `fallocate` free-block delta, measured from the pre-candidate baseline, to reconcile exactly to the reserved anonymous inode's `st_blocks`; this is exact accounting, not a tolerance window;
7. writes exactly 1,024 positioned 65,536-byte payload calls, fsyncs the anonymous inode, and requires no unexplained additional ext4 block loss;
8. performs V26's distinct **pre-publication anonymous-fd full rehash**: 1,025 reads, 67,108,865 requested bytes, 67,108,864 returned bytes, including the exact one-byte EOF probe;
9. revalidates the anonymous inode and missing exact S1 destination;
10. launches exactly one bounded absolute `/usr/bin/ln -L -T -- /proc/self/fd/3 /proc/self/fd/4/<S1>` with payload fd 3 and retained root fd 4;
11. verifies that S1 is the exact anonymous inode, directory-fsyncs the root, and runs one test-only duplicate-link attempt proving the occupied destination is not replaceable;
12. closes the writable payload fd; and
13. freshly opens S1 read-only/no-follow and performs a separate 1,025-call full-H/EOF post-publication readback.

The original first run correctly falsified a narrower accounting window: starting the delta only after `O_TMPFILE` creation undercounted the reserved inode by exactly one 4,096-byte ext4 block. The source therefore moved the baseline earlier; it did not add a 4 KiB tolerance. The successful publication itself uses exactly one `fallocate` helper lifetime and one `ln` helper lifetime. The duplicate-link collision probe is explicitly test-only and is not counted as a second admitted publication.

## V29 correction retained

The pre-publication anonymous-fd rehash is deliberately a real payload read pass. Reusing the write-stream hash would not prove the fsynced anonymous inode's current bytes/EOF; reusing the post-link readback would erase V26's before-publication check. Consequently this source does not use V24's older 10,247-call / 640 MiB total as the V26-composed ledger.

The full composed source generation, when built, must account exactly 13,322 application payload calls: 3,072 writes plus 10,250 reads; 13,312 nonempty operations plus 10 EOF probes; 872,415,242 requested bytes and 872,415,232 completed/returned bytes (832 MiB). Existing E0/R0/final phase deadlines imply a 416/225 MiB/s aggregate floor.

## Deliberate exclusions

A green run proves only the hosted reservation/create-only-publication primitive on the bound Ubuntu/ext4 runner generation. It does **not** yet prove:

- composition with #1482's process-owned root+K POSIX admission capability;
- the full three-publication V29 ledger or V23/V26 27-lifetime topology;
- V24's twelve source-injected no-retry fault controls in this exact source;
- observer completeness or the source-distinct acyclic aggregate;
- V24 backing-image provenance acceptance or FIEMAP extent provenance;
- cold remount or physical controller/device power-loss durability;
- public-internet peer retrieval;
- hostile same-UID writer/VMA/namespace exclusion; or
- any finalized Chain-2050 content, payment, fulfillment, inventory, settlement, or economic authority.

No deployment, production runtime, node restart, network mutation, key/wallet/signer access, transaction, Work Credit, validator, inventory funding, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is performed by this lane.
