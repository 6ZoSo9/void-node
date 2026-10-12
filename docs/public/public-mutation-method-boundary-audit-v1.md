# Public Mutation Method Boundary Audit v1

Marker: `VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_DOC_V1`

## Purpose

This audit proves the current `/public-node` runtime surface remains read-only at the HTTP method boundary.

It exists because future public contribution, funding, DataNet, Work Credit, or validator lanes may eventually need carefully gated mutation routes. Before any such lane opens, the project needs a simple proof that the current public surface has no accidental public mutation handlers.

## Scope

This lane is docs/proof/script only.

It does not modify `src/index.ts`.

It audits `src/index.ts` for literal public mutation route handlers using:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

under `/public-node`.

## Required existing guardrails

- `VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN`
- `VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN`
- `VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN`
- `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`

## Expected current state

- head before this audit: `100a901f`
- public mutation method count under `/public-node`: `0`
- public mutation default: false
- public runtime surface: read-only

## Safety assertions

- docs_proof_script_only=true
- modifies_src_index=false
- runtime_route_added=false
- public_mutation_default=false
- public_post_routes_allowed_now=false
- public_put_routes_allowed_now=false
- public_patch_routes_allowed_now=false
- public_delete_routes_allowed_now=false
- public_node_mutation_route_count_required_zero=true
- funding_public_surface_read_only=true
- datanet_public_mutation_open_now=false
- work_credit_public_mutation_open_now=false
- validator_public_mutation_open_now=false
- money_movement_now=false
- wallet_send_now=false
- build_before_commit_required=true
- cross_box_required=true

## Closeout rule

If a future lane intentionally opens a public mutation route, it must not silently bypass this audit.

It should create a new explicit mutation gate with:

- route name
- method
- allowed payload
- authentication or authorization boundary
- replay/nonce policy
- rate/cap policy
- operator review boundary if needed
- proof that unrelated public mutation remains closed

