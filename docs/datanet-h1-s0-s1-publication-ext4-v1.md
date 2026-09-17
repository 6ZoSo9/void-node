# DataNet H1 S0/S1 ext4 publication primitive v1

Markers:

- `VOID_DATANET_H1_S0_S1_PUBLICATION_EXT4_V1_GREEN`
- `VOID_DATANET_H1_S0_S1_PUBLICATION_EXT4_V1_REJECTED`

Status: stacked source/proof-only lane over #1486. It removes the standalone #1483 collision-helper artifact from campaign-success topology and proves the bounded two-slot S0/S1 publication state needed before the full V23–V26 campaign is assembled. It does not advance #1352 acceptance.

## Bound contract

The source-bound fixture fixes one synthetic K, canonical leaves `datanet-<K>-s0.v1` and `datanet-<K>-s1.v1`, forbidden `datanet-<K>-s2.v1`, the 64 MiB immutable synthetic H, ext4 384 MiB hosted-image profile, and exact hash-pinned `/usr/bin/fallocate` and `/usr/bin/ln` helpers.

A successful publication performs exactly:

1. canonical namespace classification before payload allocation;
2. for S1, exact S0 inode/reservation/full-H/EOF verification **before** opening the new anonymous payload inode;
3. one anonymous `O_TMPFILE`, mode 0600 and nlink 0;
4. exactly one bounded `/usr/bin/fallocate --length 67108864 /proc/self/fd/3`;
5. exact inode-local full reservation, 1,024 positioned 65,536-byte writes, inode fsync, and a distinct 1,025-call anonymous-fd full-H/EOF rehash;
6. complete namespace/inode revalidation immediately before publication;
7. exactly one bounded `/usr/bin/ln -L -T -- /proc/self/fd/3 /proc/self/fd/4/<slot>`;
8. exact-inode/nlink/allocation verification, parent-directory fsync, and writable-FD retirement;
9. a fresh no-follow reopen plus independent 1,025-call full-H/EOF readback; and
10. terminal canonical namespace verification with S2 absent.

There is **no** test-only collision `ln` in successful campaign mode. Create-only/no-replace authority remains the first `ln` operation itself; any nonzero publication status is a failure and this source never unlinks, renames, overwrites, or cleans up a competing leaf.

## Two-slot sequence

The workflow uses one fresh dedicated nonsparse 384 MiB ext4 image per Node runtime:

- S0 run: requires an empty canonical root and publishes only S0 with one `fallocate` + one `ln`.
- S1 run: requires exactly canonical S0, full-verifies S0 before any new anonymous payload allocation, then publishes S1 with one `fallocate` + one `ln`; S0 and S1 must be distinct inodes.
- S2 run: requests slot 2 and must return the structured rejection marker with `mutation_started=false`, zero helper lifetimes and no anonymous inode opened. The harness independently proves the S0/S1 namespace/inode/content digest and filesystem free-block count are unchanged across the rejection.

This closes only the campaign-success publication-shape seam identified after #1486. It does not yet compose the #1486 exec-preserved root+K POSIX capability into this new source and does not yet instantiate V26's three admitted publications.

## Deliberate boundary

A green matrix does **not** claim:

- the complete 27-process / peak-9 campaign;
- the E0/R0 contender races, E0 classifier-only lifetime, or selected R0 crash cut;
- final composed application-I/O arithmetic;
- V24's twelve source-injected no-retry fault controls in this exact source;
- external observer completeness or source-distinct aggregate;
- FIEMAP/backing-image/cold-remount/physical-power-loss acceptance;
- hostile same-UID writer/VMA/namespace exclusion;
- public-internet peer retrieval; or
- finalized Chain-2050 content, payment, fulfillment, inventory, settlement, or economic authority.

#1484 and #1486 remain Draft prerequisites. Archive verification remains closed/no rerun. No Ready/merge, deployment/restart, production filesystem/network mutation, credential/key/wallet/signer access, transaction, Work Credit, validator, inventory funding, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is performed by this lane.
