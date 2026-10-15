# DataNet chunk descriptor custody v1

Marker: `VOID_DATANET_CHUNK_DESCRIPTOR_CUSTODY_V1`

## Problem

The public DataNet chunk routes historically used a pathname existence check
followed by a second pathname open for GET, and used
`fs.writeFileSync(path, body)` for PUT. A substituted symlink or pathname
generation could therefore redirect a chunk operation away from the
content-addressed object named by the request.

This is a source-level local-storage custody defect. It does not claim that the
current production chunk directory contains a malicious symlink or that a
remote caller can create arbitrary local symlinks.

## Contract

Chunk GET now:

- requires the visible leaf to be a regular non-symlink file;
- opens it with `O_NOFOLLOW` and retains that exact descriptor;
- bounds size to the route-owned 64 MiB chunk ceiling;
- snapshots the complete bounded bytes from that descriptor;
- recomputes SHA-256 over the exact snapshot and requires the request leaf;
- rechecks descriptor identity after the snapshot read; and
- sends that verified snapshot directly, so neither pathname replacement nor later same-inode mutation can change the response.

Chunk PUT now:

- preserves the existing SHA-256(body) == leaf admission check;
- refuses an existing symlink/non-file destination;
- treats an already-valid exact chunk as idempotent reuse;
- stages new bytes in a private create-exclusive file;
- fsyncs and validates the staged bytes;
- publishes with create-only hard-link semantics so an existing destination is
  never overwritten;
- preserves a mismatched substituted pathname instead of deleting a foreign
  inode after publication identity failure; and
- reopens/revalidates the published object before reporting success.

The adversarial proof replaces the visible GET pathname after snapshot
verification and proves the verified generation is served. A second adversary
keeps another writable descriptor to the same inode and mutates that inode only
after verification; the response must still contain the pre-mutation verified
snapshot. The proof also shows GET does not disclose a symlink target, PUT
cannot overwrite a symlink target, and a substituted staging/final inode is
rejected without deleting or serving the foreign bytes.

## Non-claims

Snapshot serving intentionally bounds one verified response allocation to 64 MiB; concurrency/resource admission remains a separate operational boundary.

This does not prove every DataNet manifest, receipt, MVP2, or site-bundle path
has equivalent descriptor custody. The cleanup identity check is fail-closed
for substitutions observed before cleanup, but Node's pathname `lstat` ->
`unlink` sequence is not an atomic inode-conditional unlink primitive; this
lane does not claim closure against an actor that can replace the same pathname
between those two syscalls. It does not deploy or mutate a production
runtime, wallet, signer, validator, Work Credit ledger, transaction, presale,
treasury, liquidity, or funds state.
