# VOID public canonical checkpoint v1

## Purpose

`void-public-canonical-checkpoint-v1` defines a local, content-addressed
**blocks-only** checkpoint packet for accelerating fresh Mainnet-0 node bootstrap.

The current public follower can safely range-sync the canonical chain, but a
fresh node at nearly two million blocks performs millions of individually
durable canonical appends. Outside-machine acceptance showed that this is
correct but operationally too slow for first bootstrap.

This lane does **not** weaken SegStore WAL/fsync durability and does not add a
snapshot that bypasses canonical validation. Instead it captures already-durable
canonical `blocks.bin` generations into a separately verified packet.

## Packet format

The packet contains exactly:

```text
checkpoint.json
segments/
  00000000/blocks.bin
  00010000/blocks.bin
  ...
```

It deliberately does **not** copy:

- `wal/`
- `index.sparse`
- `meta.json`
- `heads.json` or `head.txt`
- transaction indexes or receipts
- verified peer cache
- blobs
- DataNet state
- agent state
- jobs
- Work Credit state
- wallet / Buy VOID state
- public-node fixtures
- any other `DATA_DIR` content

The sparse indexes, segment metadata, and head markers are reconstructable from
physical canonical frame truth through the existing `autoRepairDataDir` path.
The checkpoint tool verifies blocks through the repository's compiled `dist/chain`
protocol modules produced by `npm run build`, rather than maintaining a parallel validator.
The canonical repository CLI uses `sparseEvery: 16`; v1 binds that exact
reconstruction parameter.

## Capture fail-closed conditions

Capture requires:

1. exact source commit binding;
2. agreeing `head.txt`, `heads.json.head`, and `heads.json.number`;
3. the exact numeric segment directory set implied by the head;
4. regular, owner-matched, non-world-writable `blocks.bin` files;
5. no nonempty WAL file;
6. canonical Mainnet-0 validation for every frame:
   - minimal historical validation,
   - legacy-v2fs historical validation and era transition,
   - modern `validateBlockForAppend` validation;
7. byte-identical source and copied segment digests;
8. unchanged source block-file inode/size/mtime/ctime stamps through capture;
9. unchanged head markers after capture; and
10. checkpoint output outside both the repository and live `DATA_DIR`; and
11. a second full packet verification before atomic final-directory publication.

Any mismatch returns HOLD and the incomplete packet is removed.

## Checkpoint identity

`checkpoint_id` is:

```text
voidpbc1_<sha256(stable-json(manifest-without-checkpoint_id))>
```

The manifest binds:

- source SHA;
- capture time;
- head;
- canonical head era;
- modern head header hash when applicable;
- exact head-frame-body SHA-256;
- block count;
- segment count;
- total payload bytes;
- every segment's range, size, and SHA-256; and
- the fixed no-authority and reconstruction contracts.

This is content integrity, not publication authority.

## Verification

Verification rejects:

- unknown packet paths;
- symlinks or non-regular files;
- malformed or widened manifest schemas;
- checkpoint-ID mismatch;
- segment hash/size/count mismatch;
- block number gaps;
- invalid historical era transitions;
- invalid legacy blocks;
- invalid modern append semantics;
- head mismatch; and
- any non-false authority field.

## Restore boundary

V1 intentionally does not expose a live restore command.

The synthetic proof demonstrates restoration only inside a temporary fixture:
copy the packet's `blocks.bin` files into an otherwise empty data directory and
run the existing `autoRepairDataDir(..., { sparseEvery: 16 })`. The proof
requires reconstructed sparse indexes, segment metadata, and head markers.

A later restore integration must add:

- empty/new destination enforcement;
- packet verification before mutation;
- create-only staging;
- atomic data-generation selection;
- startup readiness gating;
- suffix catch-up to a fresh verified public seed; and
- outside-machine target-head acceptance.

## Publication boundary

This lane does not:

- create a live checkpoint;
- upload or serve checkpoint bytes;
- modify the public bootstrap manifest;
- deploy or restart a node;
- mutate chain data;
- grant wallet/signer/validator/treasury/Work Credit authority; or
- move funds.

A captured packet remains local evidence until a separate reviewed publication
and consumer integration explicitly authorize it.
