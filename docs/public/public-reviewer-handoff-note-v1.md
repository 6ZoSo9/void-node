# Public Reviewer Handoff Note v1

Marker: `VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DOC_V1`

## Purpose

This note gives a human reviewer a short checklist for inspecting VOID public evidence.

It is a docs/proof-only reviewer note.

It does not open public intake.

It does not open public mutation.

It does not add a runtime route.

It does not modify `src/index.ts`.

## Sealed base

- head before this note: `d7092bd7`
- runtime commit before this note: `d7092bd7f661`
- reviewer evidence closeout: `VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_V1_GREEN`
- reviewer evidence packet: `VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN`
- public safety index: `VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN`
- public mutation boundary: `VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN`
- funding gateway proof: `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`

## Reviewer checklist

A reviewer should inspect:

- `/version`
- `/public-node`
- `/public-node/funding`
- `/buy-void`
- `/public-node/datanet/explorer-v1`
- `/public-node/route-index`

A reviewer should verify:

- deployed git commit matches the expected head
- public evidence routes are readable
- funding information is read-only
- DataNet evidence is inspectable
- route/index surfaces are discoverable
- public intake is not open
- public mutation is not open
- `/public-node` mutation handlers are zero

## Claims allowed

- VOID has public evidence surfaces.
- VOID has reviewer-facing safety documentation.
- VOID has a read-only funding information surface.
- VOID has a DataNet Explorer evidence surface.
- VOID currently keeps public intake closed.
- VOID currently keeps public mutation closed.

## Claims not allowed

- Public earning is open.
- Public Work Credit awards are automatic.
- Public DataNet ingest is open.
- Public validator admission is open.
- Funding triggers automatic VOID delivery.
- VOID performs public wallet sends.
- VOID performs public money movement.

## Safety assertions

- docs_proof_only=true
- modifies_src_index=false
- runtime_route_added=false
- public_reviewer_note_only=true
- public_intake_open_now=false
- public_mutation_open_now=false
- funding_surface_read_only=true
- datanet_evidence_read_only=true
- wallet_send_closed=true
- money_movement_closed=true
- wc_award_mutation_closed=true
- validator_admission_mutation_closed=true
- datanet_public_ingest_mutation_closed=true
- build_before_commit_required=true
- cross_box_required=true

## Closeout

This note is safe to hand to a reviewer as plain-language inspection guidance.

It does not authorize public writes, awards, ingest, validator admission, wallet sends, money movement, or automatic VOID delivery.
