# Public Surface Route Registry Safety Audit v1

Marker: `VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_DOC_V1`

## Purpose

This audit adds a docs/proof/script-only guard for future public route work.

It exists because public routes are now important enough that accidental duplicate handlers, abandoned runtime patches, route-index drift, or unsafe public mutation patterns should be caught before another route expansion is committed.

## Scope

This lane does not modify `src/index.ts`.

It audits the current public surface source for:

- duplicate literal public GET route handlers
- accidental reintroduction of the aborted funding proof-pack runtime route
- accidental conversion of docs/proof-only funding packets into runtime routes
- presence of required public funding/dashboard/triad markers
- dangerous public mutation handler patterns under `/public-node`

## Required existing guardrails

- `VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN`
- `VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN`
- `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`

## Safety assertions

- docs_proof_script_only=true
- modifies_src_index=false
- runtime_route_added=false
- public_mutation_default=false
- duplicate_public_get_route_check_required=true
- aborted_runtime_route_absent_required=true
- docs_only_routes_must_not_be_runtime_routes=true
- route_index_drift_risk_acknowledged=true
- build_before_commit_required=true

## Closeout rule

Before future `/public-node` route expansion, run this audit and the runtime route patch safety preflight.

If this audit fails, do not patch runtime routes until the failure is understood and sealed.
