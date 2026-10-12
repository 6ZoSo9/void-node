# VOID DataNet WC Availability Reviewer Decision Packet v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_REVIEWER_DECISION_PACKET_V1`

**Status:** Reviewer-decision/proof-only; no WC issuance.

## Purpose

This artifact defines the reviewer decision packet for DataNet WC availability evidence.

A reviewer may use this packet to classify a submitted DataNet availability evidence packet.

This packet does not award Work Credits by itself.

## Decision Inputs

A reviewer decision packet should reference:

- evidence packet kind
- evidence packet marker
- participant identifier
- DataNet object id or content root
- manifest hash
- root commitment
- claimed work actions
- evidence reviewer status
- reviewer id
- decision timestamp

## Allowed Decisions

- `approved_for_wc_review`
- `rejected`
- `duplicate`
- `invalid_root`
- `unavailable`
- `needs_more_evidence`

Only `approved_for_wc_review` may feed a later separate WC award recommendation packet.

## Required Reviewer Checks

A reviewer should check:

- content root was provided
- manifest hash was provided
- root commitment was provided
- chunk proof summary exists
- availability proof exists
- retrieval proof or peer observation exists
- claimed work actions are allowed
- WC boundary flags remain false
- authority boundary flags remain false
- duplicate status is considered

## Safety Boundary

This packet must explicitly state:

- it does not issue WC
- it does not write the WC ledger
- it does not allocate or transfer VOID
- it does not create an automatic reward
- it does not bypass reviewer approval
- it does not activate public mutation
- it does not grant signer or wallet access
- it does not authorize execution

## Non-goals

This artifact does not:

- implement a submission endpoint
- implement reviewer authentication
- implement WC issuance
- write a ledger
- move funds
- change DataNet storage or retrieval
- expose private objects
