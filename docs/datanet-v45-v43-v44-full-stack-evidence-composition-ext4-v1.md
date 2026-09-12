# DataNet V45 V43→V44 full-stack evidence composition on ext4 v1

V45 is a proof-only descendant of the component-accepted V44/#1504 exact head `d73512174afd4f1f0f2591b11ae6bb9955e203ba`. It closes the separate full-stack evidence-composition HOLD without changing accepted V41–V44 source.

## Composition

For each Node 22/24/26 job, one traced runner performs a single ordered chain on disposable ext4 images:

1. Run the accepted V41 generation-bound fs-verity campaign.
2. Capture the V42 canonical snapshot.
3. Suspend both device-mapper devices with `--noflush`, retain the crash images before clean unmount, require `needs_recovery`, replay the journal, and require the post-recovery V42 snapshot to remain byte-identical.
4. Run the accepted V43 verifier.
5. On that same recovered R0 filesystem and the same CLOSED record, bind FIEMAP, inode generation, record bytes, and fs-verity digest.
6. Release both mounts, mappers, and loops; mutate exactly one raw backing-image data byte; reattach R0; and require the V44 direct read and actual V41 admission read to fail with `EIO`.
7. Release and remove every disposable storage capability before the source-distinct top verifier starts.

The V43 and V44 tiers therefore share one V41 campaign and one recovered R0 image. V44 is not a parallel fixture run.

## Evidence root

The source-distinct verifier binds:

- exact Git head, tree, recursive tree-inventory digest, and direct V41–V45 blobs;
- exact Node, Python, kernel, and executable identities;
- ordered V41/V42/V43/V44 child receipts;
- the V41 27-lifetime / peak-9 / 15,372-call / 960-MiB ledger;
- pre/post recovery snapshots and superblock receipts;
- the V43→V44 CLOSED-record identity, ext4 generation, bytes, and fs-verity digest;
- every retained pre-aggregate artifact name, size, and SHA-256;
- a full `strace -f` process/helper census with measured peak process concurrency;
- direct post-run kernel checks that the unique mount/loop/mapper token is absent.

The candidate aggregate is attacked by four controls. Missing evidence, substituted evidence, a mixed head, and a premature aggregate must fail with distinct HOLD codes. The final aggregate binds the candidate and control receipts and carries its own canonical SHA-256.

## Ceilings

Each filesystem image is exactly 512 MiB. E0 and R0 namespace ceilings remain 2 and 6 entries. Recovery records remain at most 3,072 bytes. Raw corruption is exactly one byte. Initial full-run process ceilings are deliberately conservative and will be tightened only from retained exact-head traces; they are not presented as already-observed counts.

## Non-claims

V45 proves a hosted-kernel simulation and one mapped data-byte corruption case. It does not prove literal physical power loss, controller or drive volatile-cache loss, arbitrary fs-verity tree/descriptor corruption, privileged offline metadata forgery, kernel compromise, public-peer retrieval, Chain-2050 commitment/finality, deployment, or production activation.

