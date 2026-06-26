# VOID DataNet WC Availability Public Earn Status Static Route Artifact Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1`

**Status:** Static public route artifact hold only; no route registry mutation, no runtime route, no public index mutation, no WC issuance, and no WC ledger write.

## Purpose

This artifact defines a static public JSON artifact for the DataNet WC availability earn-status card.

The static artifact sits after the route patch readiness hold.

It creates the intended public JSON content for a future route path while still keeping route registry mutation, runtime route addition, and public index mutation closed.

## Source Readiness

- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_PATCH_READINESS_HOLD_V1`
- readiness status: `ready_for_future_separate_route_patch`
- candidate route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- route patch status: `held_for_future_separate_patch`
- route registry patch status: `held_for_future_separate_patch`
- runtime route status: `not_added`
- public index patch status: `held_for_future_separate_patch`
- WC issuance status: `not_issued`
- WC ledger write status: `not_written`
- execute gate status: `held_execute_gate_closed`

## Static Artifact Path

- static artifact path: `public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- intended public route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- static artifact status: `created_static_json_artifact`
- route registry status: `not_mutated`
- runtime route status: `not_added`
- public index status: `not_mutated`

## Boundary

This artifact is a static JSON artifact hold only.

It does not:

- mutate a route registry
- add a runtime route
- mutate a public index
- change runtime behavior
- activate public mutation
- issue Work Credits
- write the WC ledger
- create a ledger line
- append to a ledger file
- allocate VOID
- transfer VOID
- create an automatic reward
- approve a ledger write
- execute a ledger write
- authorize ledger write execution
- open the execute gate
- perform a ledger mutation
- mutate claim state
- expose private objects
- grant signer or wallet access
- authorize execution
- move funds
