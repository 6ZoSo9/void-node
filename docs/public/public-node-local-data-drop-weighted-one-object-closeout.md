# Public Node Weighted Local Data Drop One Object Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_CLOSEOUT_V1`

## What closed

Weighted Local Data Drop is no longer only an empty public surface.

This closeout records the first real live object flowing through:

1. operator-local import
2. public Local Data Drop index
3. weighted public record
4. object proof route
5. direct object fetch
6. content-address fetch

## Seed object

Object id:

`void-weighted-seed-v1.txt`

SHA-256:

`0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

The object content says that local storage can feed a weighted public record.

## Live route results

The live public node now shows:

- `/public-node/local-data-drop.json` object count: `1`
- `/public-node/local-data-drop/weighted.json` object count: `1`
- weighted records length: `1`
- object proof marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1`
- weighted marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Weighted record fields proven

The one-object proof validates:

- `verification_state=verified`
- `trust_score=0.9`
- `source_weight=0.9`
- `storage_tier=hot`
- `ai_visibility=high`
- `promotion_eligible=true`
- `suspicion_state=clean`
- `tombstone_state=active`
- `source_id=operator_local_data_drop`
- reason code `receipt_valid`
- reason code `public_read_only`

## Checkpoints

Weighted route closeout:

- commit `1498d07e`
- tag `ckpt-public-node-local-data-drop-weighted-closeout-green-20260612-002221`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CLOSEOUT_V1_GREEN`

One-object proof:

- commit `c1f9f865`
- tag `ckpt-public-node-local-data-drop-weighted-one-object-green-20260612-003252`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_V1_GREEN`

## Why this matters

This proves the storage-to-weighting loop with a real object.

VOID can now store a local public object, expose it through read-only public node routes, attach a weighted record, prove the object by SHA-256, and serve the object by both object id and content address.

This is the concrete bridge from persistent storage to ranked, agent-readable public data.
