# VOID Public Node Data Weight Record v1 Closeout

Marker: `VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_CLOSEOUT_DOC_V1`

## Status

Data Weight Record v1 is source/docs/proof-rollup green and live-proof green.

Live server proof passed after deliberate live process cleanup.

## Final checkpoint chain

- Source/build green: `ckpt-public-node-data-weight-record-source-build-green-20260611-233542`
- Source proof green: `ckpt-public-node-data-weight-record-source-proof-green-20260611-233624`
- Local Data Drop pointer green: `ckpt-public-node-data-weight-record-pointer-green-20260611-233801`
- Route Manifest pointer green: `ckpt-public-node-route-manifest-data-weight-pointer-green-20260611-233933`
- Rollup proof green: `ckpt-public-node-data-weight-record-rollup-green-20260611-234153`
- README pointer green: `ckpt-public-node-data-weight-record-readme-pointer-green-20260611-234318`
- Live proof green: `ckpt-public-node-data-weight-record-live-proof-green-20260611-234858`

## What this added

Data Weight Record v1 gives VOID a public schema for ranking stored data after it enters the public-node local storage lane.

It separates:

- existence
- verification state
- freshness
- duplicate status
- suspicion state
- tombstone state
- storage tier
- AI visibility
- trust score
- promotion eligibility

## Doctrine

Persistent does not mean equal priority.

VOID can preserve data without treating every object as equally trusted, equally fresh, equally visible to AI, or equally eligible for promotion.

## Public route

`/public-node/data-weight-record.json`

Route marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1`

## Proofs

Primary source rollup proof:

`ops/mainnet0/public-node-data-weight-record-rollup-proof.sh`

Expected marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROLLUP_V1_GREEN`

README pointer proof:

`ops/mainnet0/public-node-data-weight-record-readme-pointer-proof.sh`

Expected marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1_GREEN`

## Safety boundary

This lane is public read-only.

It does not:

- accept public uploads
- mutate data
- move money
- send wallet transactions
- execute WC to VOID swaps
- fulfill Buy VOID requests
- mutate validators
- claim to be consensus/network truth


## Live proof update

Marker: `VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_LIVE_PROOF_CLOSEOUT_UPDATE_V1`

The live server proof is no longer pending.

Live proof tag:

`ckpt-public-node-data-weight-record-live-proof-green-20260611-234858`

Live proof marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1_GREEN`
