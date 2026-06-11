# VOID Public Node Weighted Local Data Drop v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_DOC_V1`

## Purpose

Weighted Local Data Drop v1 maps actual operator-local public data drop objects into Data Weight Record-style records.

This is the bridge from:

`stored object`

to:

`weighted object record`

## Public route

`/public-node/local-data-drop/weighted.json`

Route marker:

`VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Behavior

If local data drop contains objects, the route emits one weighted record per object.

If local data drop is empty, the route returns a clean empty state:

`no_operator_local_data_drop_objects_present`

## Policy boundary

This route is public read-only.

It does not accept public uploads, mutate data, move money, send wallet transactions, execute swaps, fulfill Buy VOID requests, mutate validators, or claim to be consensus/network truth.

## Doctrine

Persistent does not mean equal priority.

Actual local objects can be preserved while being weighted by receipt validity, verification state, storage tier, AI visibility, trust score, and promotion eligibility.
