# DataNet H1 admitted ext4 publication v1

Marker: `VOID_DATANET_H1_ADMITTED_PUBLICATION_EXT4_V1_GREEN`

Status: stacked source/proof-only composition over #1483's focused-green ext4 publication primitive. This lane does not advance #1352 acceptance and does not touch production runtime.

## Bound prerequisites

The stack starts from #1483 accepted proof head:

`cf2ee7523771e93a412ba4650f7fb0f694c99524`

It imports #1482's accepted POSIX admission source as the exact existing Git blob:

`c4d92dcaaed8879bcd98b96e199729098712d5b4`

from #1482 head:

`a5b2261cc62ec49ac60c2b5eee834e0aa3a5a821`

The composition supervisor recomputes that Git blob identity at runtime and fails closed on drift.

## Composition contract

For the exact source-bound K and S1 on one fresh dedicated ext4 root:

1. the root begins empty;
2. the fixture creates and closes exactly one K-specific capability inode `.void-datanet-admission-<K>.lock.v1`;
3. the supervisor reopens the exact root and capability through #1482's `open_bound`, requiring root/lock identity agreement, current UID, regular non-symlink lock inode, nlink 1, mode 0600, and size 0;
4. the supervisor acquires #1482's traditional process-associated POSIX byte-range lock nonblocking and immediately revalidates the bound identities;
5. a **separate process** opens the same K capability and must report BUSY before publication; the lock-owning supervisor never opens/closes a same-inode alias while held;
6. while the supervisor continues to own its single capability FD, it launches the #1483 publication proof against the same root;
7. the Node proof accepts only the exact K capability inode as the preexisting root entry, validates its dev/inode/UID/mode/nlink/size, and requires that identity unchanged immediately before and after publication;
8. the existing #1483 reservation, 1,024-call write, fsync, distinct 1,025-call anonymous prepublication rehash, create-only link, directory fsync, collision rejection, writable-FD retirement, and independent 1,025-call postpublication readback predicates remain in force;
9. after Node returns GREEN, the supervisor revalidates its still-open root/lock descriptors and a second **separate process** must still report BUSY;
10. only then does the supervisor unlock and close its capability custody; and
11. a final fresh process must acquire the same exact K capability, proving bounded release rather than stale persistent exclusion.

The separate-process probes are required because traditional POSIX process locks have the accepted #1482 caveat that closing any same-inode descriptor in the lock-owning process can release that process's record locks.

## Deliberate exclusions

A green result proves only composition of the accepted process-owned root+K exclusion primitive with one accepted S1 reservation/create-only publication primitive on hosted Ubuntu 24.04 ext4. It does not yet prove:

- the full V23/V26 three-publication 27-lifetime topology;
- V24's source-injected no-retry fault matrix;
- E0/R0 phase budgets or the complete V29 832 MiB workload in one composed process graph;
- observer completeness or source-distinct aggregate construction;
- backing-image/FIEMAP provenance acceptance;
- cold remount or physical controller/device power-loss durability;
- hostile same-UID writer/VMA/namespace exclusion;
- public-internet peer retrieval; or
- finalized Chain-2050 content, payment, fulfillment, inventory, settlement, or economic authority.

No Ready/merge, deployment, production runtime restart, production filesystem/network mutation, credential/key/wallet/signer access, transaction, Work Credit, validator, inventory, presale activation, treasury/liquidity, scheduler, cleanup, or funds action is performed by this lane.
