# Alienware Duplicate Service Disabled Closeout

artifact: VOID_ALIENWARE_DUPLICATE_SERVICE_DISABLED_CLOSEOUT_V1
result: green

Status: retired historical evidence
Current authority: none
Live service recheck: prohibited

Alienware is permanently retired. This closeout records a historical service
cleanup and does not assert any present-tense service state on the active fleet.

## Historical summary

Alienware had two user services capable of owning the same VOID runtime ports:

- `void-node-live.service`
- `void-node.service`

At the recorded checkpoint, the intended live runtime was:

`void-node-live.service`

The duplicate legacy service was:

`void-node.service`

The duplicate legacy service was disabled on Alienware so it no longer started
from `default.target` and no longer collided on ports 4100 and 4700.

## Proven historical Alienware state

`void-node-live.service enabled: enabled`
`void-node-live.service active: active`

`void-node.service enabled: disabled`
`void-node.service active: inactive`

Ports 4100 and 4700 were owned by the live service node process at that
observation window.

## Historical sanity checks

Alienware live ready endpoint returned:

`ready: true`
`head: 1856587`
`gap: 0`
`txroot_live: 1`

Alienware `/version` returned commit:

`134274a7bd9d`

Alienware participant page served marker:

`VOID_DATANET_STORE_SERVE_DEMO_V1`

## Guard proof

The historical guard proof passed after disabling the duplicate service:

`VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_GREEN`

It recorded:

- `void-node-live.service` active;
- duplicate `void-node.service` inactive; and
- live readiness responding.

These are dated facts, not current operational instructions.

## Retired operational rule

Do not start, restart, inspect, or otherwise infer current runtime state through
these Alienware artifacts. The proof scripts are history-only and any nonzero
`LIVE_SERVICE_CHECK` must fail closed with:

`VOID_RETIRED_ALIENWARE_LIVE_SERVICE_CHECK_HOLD_V1`

Current active-fleet operations belong to Precision, Nimo, and Xiphos runbooks.

## Safety

`money_movement: false`
`validator_mutation: false`
`buy_void_fulfillment: false`
`runtime_scope: historical service cleanup and proof guard only`
