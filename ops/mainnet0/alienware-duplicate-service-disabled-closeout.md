# Alienware Duplicate Service Disabled Closeout

artifact: VOID_ALIENWARE_DUPLICATE_SERVICE_DISABLED_CLOSEOUT_V1
result: green

## Summary

Alienware had two user services capable of owning the same VOID runtime ports:

- void-node-live.service
- void-node.service

The correct live runtime is:

void-node-live.service

The duplicate legacy service is:

void-node.service

The duplicate legacy service was disabled on Alienware so it no longer starts from default.target and no longer collides on ports 4100 and 4700.

## Proven final Alienware state

void-node-live.service enabled: enabled
void-node-live.service active: active

void-node.service enabled: disabled
void-node.service active: inactive

Ports 4100 and 4700 were owned by the live service node process.

## Sanity checks

Alienware live ready endpoint returned:

ready: true
head: 1856587
gap: 0
txroot_live: 1

Alienware /version returned commit:

134274a7bd9d

Alienware participant page served marker:

VOID_DATANET_STORE_SERVE_DEMO_V1

## Guard proof

The live guard proof passed after disabling the duplicate service:

VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_GREEN

The guard proved:

- void-node-live.service active
- duplicate void-node.service inactive
- live ready endpoint responding

## Operational rule

Alienware cross-box proofs should use:

void-node-live.service

Do not start or restart:

void-node.service

unless the duplicate service is intentionally re-enabled for a controlled migration.

## Safety

money_movement: false
validator_mutation: false
buy_void_fulfillment: false
runtime_scope: service cleanup and proof guard only
