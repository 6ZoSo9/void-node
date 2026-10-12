# Public Node Reviewer Handoff Runtime Card v1

Marker: `VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_DOC_V1`

## Purpose

This lane exposes the public reviewer handoff note as a tiny runtime card.

Routes added:

- `/public-node/reviewer-handoff-v1.json`
- `/public-node/reviewer-handoff-v1`

Visible public gateway link added:

- `Reviewer handoff →`

## Boundary

This is a runtime visibility lane only.

- runtime_card_only=true
- read_only=true
- public_intake_open_now=false
- public_mutation_open_now=false
- funding_surface_read_only=true
- datanet_evidence_read_only=true
- wallet_send_closed=true
- money_movement_closed=true
- wc_award_mutation_closed=true
- validator_admission_mutation_closed=true
- datanet_public_ingest_mutation_closed=true

It does not create a public intake form.

It does not create a mutation route.

It does not create a ledger write.

It does not send funds.

It does not admit validators.

It does not ingest DataNet objects.
