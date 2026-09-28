# Nimo Epoch-2 signed-artifact metadata census v1

Marker: `VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1`

## Purpose

Precision's receipt-bound content sweep closed the Precision-controlled artifact
lane, but the known-lineage baseline explicitly treats Nimo and encrypted backup
media as potentially relevant off-repo signed-artifact stores.

This Nimo lane is intentionally metadata-only. It discovers the Nimo artifact
scope before any content review.

## Scope

The tool requires hostname `Nimo`, a clean `main` worktree, and the exact
VOID authority filesystem UUID
`fb57fcbe-83b1-4a69-9701-7aec4cf5396f`.

It inventories:

1. top-level user-owned `void*` directories under `$HOME/Downloads`, using
   the generic Epoch-2 metadata scanner; and
2. every direct regular file recursively under
   `/mnt/void-authority/backups` as an explicit metadata-only file.

The authority mount itself is not passed as a generic scan root. This avoids
turning ext4 system entries such as `lost+found` into operator-owned artifact
claims.

Any symlink inside the authority backup tree fails closed for separate review.
Every backup regular file must be owned by the current operator account.

## Content boundary

The tool never opens scanned artifact contents. It records only metadata
through the existing
`void-economic-epoch2-signed-artifact-metadata-census-v1.mjs` contract.

In particular, this lane does not read, decrypt, hash, parse, or print:

- encrypted keystores;
- private keys;
- seed material;
- wallet files; or
- raw signed transaction bodies.

The generated private receipts are mode `0600` and remain local to Nimo.

The tool prints only aggregate counts, candidate basenames, receipt hashes,
and safety flags. It does not promote any replay or migration gate.

## Known backup context

The retained Nimo backup procedure records that the authority backup contains
`void_fulfillment_direct_offline_signed_deployment_v1.json`, SHA-256
`dec8476d685f41c890b9b7525e37ad27a496febf76c32436d15f70b31e86e90c`,
whose Chain-2050 transaction hash is
`0x36d9763907e86f6623f2a548269211ffc8e04f69e1e05622e7486bf61708622b`.

That packet is already the known
`buy_void_fulfillment_deployment` lineage. The metadata census does not rely
on that fact to skip the rest of Nimo storage; it exists only as a later
classification anchor.

## Output

A successful run ends with:

```text
scanned_file_content_read=false
credential_content_access=false
private_key_access=false
pending_legacy_signed_transaction_census_complete=false
VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN
```

The next gate is operator review of the private Nimo metadata receipts followed
by bounded content classification of non-secret artifact files only.

## Usage

Run only from a clean, pinned Nimo `main` checkout with the exact
`VOID_AUTHORITY` filesystem mounted:

```bash
node tools/void-nimo-epoch2-signed-artifact-metadata-census-v1.mjs
```

The tool creates a new private receipt directory beneath `$HOME/Downloads`
and prints its exact path as `receipt_dir=...`. Existing receipt directories
are never reused as scan input.

No wallet/key access, signing, transaction submission/broadcast, Chain-2050
write, replay-gate promotion, token/funds movement, deployment, or activation is
authorized.
