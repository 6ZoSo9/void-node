# VOID DataNet WC Availability Public Earn Status Route Candidate Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_ROUTE_CANDIDATE_HOLD_V1`

**Status:** Public earn-status route candidate hold only; no route creation, no route registry mutation, no WC issuance, and no WC ledger write.

## Purpose

This artifact defines a held route candidate for the DataNet WC availability public earn-status card.

The route candidate sits after the public earn-status discovery hold.

It prepares the intended public route shape for a future route/index patch without creating the route, modifying the route registry, or changing runtime behavior.

## Source Discovery

- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_DISCOVERY_HOLD_V1`
- discovery status: `held_for_future_public_discovery`
- route mutation status: `not_mutated`
- index mutation status: `not_mutated`
- WC issuance status: `not_issued`
- WC ledger write status: `not_written`
- execute gate status: `held_execute_gate_closed`

## Candidate Route

- candidate route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- candidate content kind: `public_earn_status_card`
- route status: `candidate_held_not_created`
- registry status: `not_mutated`
- runtime status: `not_added`

## Allowed Route Candidate Status

- `candidate_held_not_created`
- `blocked_missing_discovery_hold`
- `blocked_unexpected_route_creation`
- `blocked_unexpected_registry_mutation`
- `blocked_unexpected_runtime_route`
- `blocked_unexpected_wc_issuance`
- `blocked_unexpected_ledger_write`

## Public Safety

This route candidate hold must not expose:

- participant identifiers
- DataNet object ids
- content roots
- reviewer identifiers
- operator identifiers
- proposed ledger entry ids
- private object material

## Boundary

This artifact is a route candidate hold only.

It does not:

- create a public route
- add a runtime route
- mutate a route registry
- mutate a public index
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
