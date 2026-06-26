# VOID DataNet WC Availability Public Earn Status No-Live Summary Discovery Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_SUMMARY_DISCOVERY_HOLD_V1`

**Status:** Discovery hold only; no public index mutation, no route registry mutation, no runtime route addition, no live-route claim, no WC issuance, and no WC ledger write.

## Purpose

This artifact defines a discovery candidate for the public no-live runtime visibility summary of the DataNet WC availability earn-status card.

It makes the summary discoverable as a future public listing candidate without changing any live public index, route registry, runtime route, or runtime behavior.

## Source Summary

- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_NO_LIVE_RUNTIME_VISIBILITY_SUMMARY_HOLD_V1`
- summary status: `static_card_exists_local_runtime_not_observed_no_live_claim`
- static artifact path: `public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- intended public route: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- runtime live claim: false
- runtime route observed: false
- WC issuance status: `not_issued`
- WC ledger write status: `not_written`
- execute gate status: `held_execute_gate_closed`

## Discovery Candidate

- discovery title: `DataNet WC availability earn-status card visibility`
- discovery status: `candidate_for_future_public_index_listing_no_live_claim`
- discovery target type: `public_no_live_summary`
- discovery route candidate: `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`
- public index mutation status: `not_mutated`
- route registry mutation status: `not_mutated`
- runtime route status: `not_added`

## Public Discovery Text

DataNet availability earning status has a static public JSON card prepared in the repository. The local runtime route was not observed during the latest check because the local node service was inactive. This discovery candidate does not claim the route is live, does not issue Work Credits, and does not write the WC ledger.

## Boundary

This artifact is a discovery hold only.

It does not:

- mutate a public index
- mutate a route registry
- add a runtime route
- claim the route is live
- perform a runtime request
- start the service
- restart the service
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
