# VOID DataNet WC Availability Evidence Packet Schema v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_EVIDENCE_PACKET_SCHEMA_V1`

**Status:** Schema/example/proof-only; no WC issuance.

## Purpose

This artifact defines the evidence packet shape for the DataNet WC Availability Quest Lane.

A participant may use this packet to submit reviewable evidence that they helped make a DataNet object available, verifiable, mirrored, pinned, or retrievable.

This packet does not award Work Credits by itself.

## Evidence Packet

A valid packet records:

- participant identifier
- DataNet object id or content root
- manifest hash
- root commitment
- chunk count
- chunk proof summary
- availability proof
- retrieval proof or peer observation
- claimed work actions
- timestamp
- reviewer status

## Allowed Reviewer States

- `draft`
- `submitted`
- `needs_review`
- `approved_for_wc_review`
- `rejected`
- `duplicate`
- `invalid_root`
- `unavailable`

Only `approved_for_wc_review` may feed a later separate WC award decision packet.

## Required Safety Boundary

The packet must explicitly state:

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

- implement submission routes
- implement public mutation
- implement reviewer approval
- implement WC issuance
- change DataNet storage or retrieval
- expose private objects
