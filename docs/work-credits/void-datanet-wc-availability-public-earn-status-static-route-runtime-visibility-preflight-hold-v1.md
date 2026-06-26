# VOID DataNet WC Availability Public Earn Status Static Route Runtime Visibility Preflight Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_RUNTIME_VISIBILITY_PREFLIGHT_HOLD_V1`

**Status:** Runtime visibility preflight hold only; no runtime claim, no route registry mutation, no public index mutation, no WC issuance, and no WC ledger write.

## Purpose

This artifact defines a preflight hold for checking future runtime visibility of the DataNet WC availability public earn-status static JSON artifact.

The preflight sits after the static route artifact hold.

It confirms the static artifact exists in the repository and is shaped for future public visibility, while not claiming that the route is live on a running node.

## Source Static Artifact

- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_STATIC_ROUTE_ARTIFACT_HOLD_V1`
- static artifact path: `public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- intended public route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- artifact status: `created_static_json_artifact`
- route registry status: `not_mutated`
- runtime route status: `not_added`
- public index status: `not_mutated`
- WC issuance status: `not_issued`
- WC ledger write status: `not_written`

## Preflight Fields

- preflight id
- preflight status
- static artifact path
- intended public route
- runtime visibility claim status
- runtime observation status
- route registry status
- public index status
- source marker
- timestamp

## Allowed Preflight Status

- `static_artifact_ready_for_future_runtime_visibility_check`
- `blocked_missing_static_artifact`
- `blocked_invalid_static_artifact`
- `blocked_unexpected_runtime_claim`
- `blocked_unexpected_route_registry_mutation`
- `blocked_unexpected_public_index_mutation`
- `blocked_unexpected_wc_issuance`
- `blocked_unexpected_ledger_write`

## Boundary

This artifact is a runtime visibility preflight hold only.

It does not:

- claim the route is live
- perform a runtime request
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
