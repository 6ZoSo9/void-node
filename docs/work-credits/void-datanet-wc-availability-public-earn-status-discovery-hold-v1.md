# VOID DataNet WC Availability Public Earn Status Discovery Hold v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_DISCOVERY_HOLD_V1`

**Status:** Public earn-status discovery hold only; no public route mutation, no WC issuance, and no WC ledger write.

## Purpose

This artifact defines a held discovery record for the DataNet WC availability public earn-status card.

The discovery hold sits after the public earn-status card hold.

It prepares the shape of a future public discovery/index entry without creating or mutating any public route.

## Source Card

- source marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_CARD_HOLD_V1`
- card status: `public_earn_status_card_held`
- earn status: `reviewed_work_ready_for_future_operator_review_no_wc_issued`
- WC issuance status: `not_issued`
- WC ledger write status: `not_written`
- execute gate status: `held_execute_gate_closed`

## Discovery Fields

- discovery id
- discovery status
- public label
- public summary
- source card marker
- route mutation status
- index mutation status
- timestamp

## Allowed Discovery Status

- `held_for_future_public_discovery`
- `blocked_missing_public_earn_status_card`
- `blocked_unexpected_route_mutation`
- `blocked_unexpected_index_mutation`
- `blocked_unexpected_wc_issuance`
- `blocked_unexpected_ledger_write`

## Public Safety

This discovery hold must not expose:

- participant identifiers
- DataNet object ids
- content roots
- reviewer identifiers
- operator identifiers
- proposed ledger entry ids
- private object material

## Boundary

This artifact is a discovery hold only.

It does not:

- create a public route
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
