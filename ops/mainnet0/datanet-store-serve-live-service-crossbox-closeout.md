# DataNet Store & Serve Live-Service Cross-Box Closeout

artifact: VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_V1
result: cross_box_green
source_commit: 58de7d51
source_tag: ckpt-datanet-store-serve-demo-green-20260607-195742

## Feature result

The participant page now exposes a visible Store & Serve demo card.

Marker:

VOID_DATANET_STORE_SERVE_DEMO_V1

The lane proves that a VOID node can:

1. Serve the participant Store & Serve card.
2. Publish a small object through DataNet.
3. Store the object under the node DataNet directory.
4. Fetch the object back through DataNet.
5. Verify the readback metadata/root path.

## Precision proof

Precision local proof marker:

VOID_DATANET_STORE_SERVE_DEMO_V1_GREEN

Precision proof dataset:

77216c13649923c5d6ff3e40f04721a3

## Alienware runtime truth

Alienware live runtime is:

void-node-live.service

Do not use the duplicate legacy service for live cross-box proofs:

void-node.service

The old service can collide on ports 4100 and 4700 because Alienware already runs the live node through void-node-live.service.

## Alienware recovery

Alienware initially failed because the active live service was missing the public safe-runtime environment flags. The symptom was HTTP routes listening but timing out while the journal repeatedly logged terminal saveBlock rewrap activity.

The recovery added this live-service drop-in:

~/.config/systemd/user/void-node-live.service.d/96-public-safe-runtime-live.conf

Confirmed safe-runtime flags included:

- VOID_SKIP_AUTOREPAIR=1
- VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=1
- VOID_DISABLE_TERMINAL_SAVEBLOCK=1
- VOID_DISABLE_BACKGROUND_LOOPS=1
- VOID_QUARANTINE_HOT_RUNTIME=1
- VOID_DISABLE_RUNTIME_HOTPATH_V1=1
- VOID_DISABLE_RUNTIME_HOTPATH_V2=1
- VOID_DISABLE_RUNTIME_HOTPATH_V3=1
- VOID_DISABLE_RUNTIME_HOTPATH_V4=1
- VOID_DISABLE_TXROOT_PERSIST=1
- TXROOT_PERSIST=0

After restart, Alienware confirmed:

- void-node-live.service active
- /version responded at git_commit 58de7d516ad8
- /participant served VOID_DATANET_STORE_SERVE_DEMO_V1
- /datanet-demo responded
- /__void/ready.json returned ready=true, gap=0, txroot_live=1

## Alienware live-service proof

Alienware final proof marker:

VOID_DATANET_STORE_SERVE_DEMO_V1_LIVE_SERVICE_CROSSBOX_GREEN

Alienware final proof dataset:

7e899e4ecdd34a9bf75b4ff7c592c678

Alienware final proof output:

/tmp/datanet-store-serve-live-service-crossbox-20260607-154505

The DataNet publish result returned ok=true and stored:

alienware-live-service-store-serve.txt

The DataNet fetch/readback result returned ok=true for the same dataset id.

## Operational rule

For Alienware live runtime and cross-box proofs, use:

void-node-live.service

Do not restart or proof against:

void-node.service

unless the duplicate legacy service has first been intentionally cleaned up or disabled.

## Safety

money_movement: false
validator_mutation: false
buy_void_fulfillment: false
runtime_feature_scope: participant UI plus DataNet publish/fetch proof
