# DataNet Publish-Shim Peer Import Two-Box Closeout

artifact: VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_CLOSEOUT_V1
result: green

## Summary

DataNet publish-shim peer import is live-proven across Precision and Alienware.

Precision published a DataNet object through:

/datanet/v1/publish

Alienware imported that object from Precision through:

/datanet/v1/import-from-peer

Alienware then served the same dataset locally through:

/datanet/v1/fetch/:id

## Commit

commit: 7befd9fe
tag: ckpt-datanet-publish-shim-peer-import-green-20260608-142024

## Local backend proofs

Precision local marker:

VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1_GREEN

Precision local dataset:

34c8ddbaed1f6d6a3e8658d90e8211ca

Alienware local marker:

VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1_GREEN

Alienware local dataset:

2c4f28e8fa14f8b028e8f9691ada1cf7

## Two-box proof

Two-box marker:

VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_V1_GREEN

Two-box dataset:

90e5ccbda6729388c52760d6dcdc1a62

Source node:

Precision

Source peer HTTP:

http://100.122.245.125:4100

Receiving node:

Alienware

Alienware import result:

ok: true
imported: true
mode: publish_shim_peer_import_v1
marker: VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1
id_match: true
copied_to_requested_id: true
local_fetch_ok: true

## Safety

money_movement: false
validator_mutation: false
buy_void_fulfillment: false

## Final result

VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_CLOSEOUT_GREEN
