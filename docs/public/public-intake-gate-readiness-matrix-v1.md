# Public Intake Gate Readiness Matrix v1

Marker: `VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_DOC_V1`

## Purpose

This matrix defines what must be true before VOID opens any future public intake or mutation route.

It does not open public intake.

It does not add a runtime route.

It exists because `/public-node` is now proven read-only at the HTTP method boundary, and future mutation lanes need explicit gates instead of accidental expansion.

## Current sealed base

- head before this matrix: `cd944d7a`
- public node mutation handlers: `0`
- public literal GET duplicate routes: `0`
- public surface route audit: `VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN`
- public mutation method audit: `VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN`
- public guardrail closeout: `VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN`
- funding gateway proof: `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`

## Readiness matrix

| Gate | Current state | Required before public mutation |
|---|---:|---|
| Public route uniqueness | green | must remain green |
| Runtime route patch preflight | green | must remain green |
| Public mutation method boundary | closed | must be explicitly opened by a named gate |
| Public authentication | not open | required |
| Authorization boundary | not open | required |
| Replay / nonce protection | not open for public intake | required |
| Rate / cap policy | not open for public intake | required |
| Payload schema | not open | required |
| Abuse / spam handling | not open | required |
| Operator review boundary | required for sensitive lanes | required where applicable |
| Ledger write authority | closed | must remain operator-gated |
| Wallet send authority | closed | must remain closed unless separately proven |
| Money movement authority | closed | must remain closed unless separately proven |
| Work Credit award authority | closed | must require explicit award gate |
| Validator admission mutation | closed | must require explicit validator gate |
| DataNet public ingest mutation | closed | must require explicit ingest gate |

## Safety assertions

- docs_proof_script_only=true
- modifies_src_index=false
- runtime_route_added=false
- public_intake_open_now=false
- public_mutation_open_now=false
- public_node_mutation_handler_count_required_zero=true
- public_route_duplicate_count_required_zero=true
- auth_required_before_public_mutation=true
- authorization_required_before_public_mutation=true
- replay_nonce_required_before_public_mutation=true
- rate_cap_required_before_public_mutation=true
- payload_schema_required_before_public_mutation=true
- abuse_handling_required_before_public_mutation=true
- ledger_write_closed=true
- wallet_send_closed=true
- money_movement_closed=true
- wc_award_mutation_closed=true
- validator_admission_mutation_closed=true
- datanet_public_ingest_mutation_closed=true
- build_before_commit_required=true
- cross_box_required=true

## Closeout rule

A future public mutation lane must cite this matrix and replace the relevant `not open` gate with a specific, proven, named boundary.

Until then, `/public-node` stays read-only.
