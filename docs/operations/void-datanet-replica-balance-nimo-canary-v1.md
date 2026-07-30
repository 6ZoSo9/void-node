# VOID DataNet replica balance — Nimo canary V1

## Purpose

Provide a bounded, operator-controlled wrapper around the existing
`/datanet/v1/import-from-peer` contract so a single reviewed DataNet object can
be copied from Precision to Nimo without adding a new node mutation route.

The survey measured 149,977 DataNet-named paths and 47 live DataNet routes on
Precision, compared with zero DataNet-named paths and zero discovered live
DataNet routes on Nimo. Forensics then classified the current import contract as
actionable and found matching current-source references on both hosts.

## Source boundary

Only these files belong to the lane:

- `tools/void-datanet-replica-balance-nimo-canary-v1.mjs`
- `scripts/prove_void_datanet_replica_balance_nimo_canary_v1.mjs`
- `.github/workflows/void-datanet-replica-balance-nimo-canary-v1.yml`
- this document

No node-core, router, Buy VOID, MCP, paid-work, Work Credit, P2P activation,
Tor, wallet, settlement, treasury, validator, or signed-discovery source changes.

## Plan mode

Plan mode performs GET requests only:

```bash
node tools/void-datanet-replica-balance-nimo-canary-v1.mjs \
  --mode=plan \
  --source-base=http://127.0.0.1:4100 \
  --target-base=http://127.0.0.1:4101 \
  --dataset-id=<reviewed-dataset-id>
```

It requires source availability, classifies target presence, and prints the
exact compatibility payload without submitting it.

## Execute boundary

Execute mode requires:

```text
--confirm=import-one-datanet-replica-to-nimo
```

It accepts one explicit dataset ID, verifies the source object, requires the
target to be absent, submits one `POST /datanet/v1/import-from-peer`, and then
requires the target to fetch the same ID successfully.

The compatibility payload includes `dataset_id`, `datasetId`, `id`,
`peer_http`, `peerHttp`, `source_peer`, `sourcePeer`, `source_who`,
`sourceWho`, and `who`.

When the target already serves the dataset, execution is a duplicate-safe no-op.

## Proof

```bash
node scripts/prove_void_datanet_replica_balance_nimo_canary_v1.mjs
```

The proof uses isolated local fixture servers. It never contacts the live VOID
network and verifies plan-only default, exact confirmation enforcement,
compatibility aliases, one-object bounds, post-import fetch verification, and
duplicate-safe no-op behavior.
