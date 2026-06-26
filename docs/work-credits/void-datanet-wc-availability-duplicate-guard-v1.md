# VOID DataNet WC Availability Duplicate Guard v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_DUPLICATE_GUARD_V1`

**Status:** Duplicate-guard/proof-only; no WC issuance.

## Purpose

This artifact defines a duplicate guard for reviewed DataNet WC availability work.

The guard helps detect repeated claims for the same DataNet availability work before any future Work Credit ledger packet exists.

This guard does not issue Work Credits by itself.

## Required Upstream State

- quest lane: `VOID_DATANET_WC_AVAILABILITY_QUEST_LANE_V1`
- evidence packet: `VOID_DATANET_WC_AVAILABILITY_EVIDENCE_PACKET_SCHEMA_V1`
- reviewer decision packet: `VOID_DATANET_WC_AVAILABILITY_REVIEWER_DECISION_PACKET_V1`
- award recommendation hold: `VOID_DATANET_WC_AVAILABILITY_AWARD_RECOMMENDATION_HOLD_V1`

## Duplicate Key

- participant identifier
- DataNet object id or content root
- claimed work actions hash
- evidence packet marker

## Allowed Guard Results

- `not_duplicate`
- `duplicate_suspected`
- `duplicate_confirmed`
- `inconclusive`

## Guard Boundary

This artifact is a guard and a signal only.

It does not:

- issue Work Credits
- write the WC ledger
- allocate VOID
- transfer VOID
- create an automatic reward
- write a duplicate registry
- mutate claim state
- automatically reject a claim
- expose private claims
- activate public mutation
- grant signer or wallet access
- authorize execution

## Future Separate Packet Required

A later WC ledger write packet would still be required before any Work Credits exist.

A duplicate guard result may inform a later reviewer or operator decision, but it is not a ledger write.
