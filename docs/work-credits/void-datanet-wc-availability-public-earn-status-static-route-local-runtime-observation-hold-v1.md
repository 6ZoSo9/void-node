# VOID DataNet WC Availability Public Earn Status Static Route Local Runtime Observation Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_LOCAL_RUNTIME_OBSERVATION_HOLD_V1`

**Status:** Local runtime observation hold only; local runtime route not observed because `void-node-live.service` was inactive and local curl failed with rc `7`.

## Purpose

This artifact records a local runtime observation attempt for the DataNet WC availability public earn-status static JSON artifact.

The observation attempt confirms the repository static artifact is present and valid, but the local runtime route was not observed.

This is not a failure of the static artifact. It only records that the local runtime service was inactive during the observation attempt.

## Observation Input

- static artifact path: `public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- intended public route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1`
- previous static artifact marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1`

## Local Observation Result

- static artifact tracked by Git: true
- static artifact JSON valid: true
- service checked: `void-node-live.service`
- service state observed: `inactive`
- service active rc: `4`
- local curl target: `http://127.0.0.1:3000/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- local curl rc: `7`
- observed JSON status: `absent_or_empty`
- runtime route observed: false
- runtime live claim: false

## Boundary

This artifact is an observation hold only.

It does not:

- start the service
- restart the service
- claim the route is live
- add a runtime route
- mutate a route registry
- mutate a public index
- change runtime behavior
- activate public mutation
- issue Work Credits
- write the WC ledger
- create a ledger line
- append to a ledger file
- allocate VOID
- transfer VOID
- approve a ledger write
- execute a ledger write
- authorize ledger write execution
- open the execute gate
- expose private objects
- move funds
