# Runtime Route Patch Safety Preflight v1

Marker: `VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_DOC_V1`

## Purpose

This preflight records a repo rule learned from the aborted Funding Public Proof Pack v1 runtime patch.

Broad runtime route patches must not be treated as safe just because the intended JSON or HTML is simple.

Before a future runtime route patch is committed, the operator should prove:

- current branch and head are known
- source diff is inspectable
- no accidental heredoc or paste corruption remains
- no duplicate route handler was added
- no aborted route is present
- TypeScript build passes before commit
- existing relevant lane proofs still pass
- public mutation stays closed unless the lane explicitly intends otherwise

## Required posture

- prefer docs/proof-only when a runtime route is not strictly needed
- prefer tiny route patches over broad route-index edits
- prefer pre-inspection before `src/index.ts` mutation
- never ship a route after a syntax-crash without explicit recovery seal
- preserve broken diffs under `/tmp` when aborting
- restore last known green source before retrying

## Funding incident reference

The Funding Public Proof Pack v1 runtime route attempt was aborted after TypeScript syntax errors.

That lane was recovered and sealed by:

- `VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_V1_GREEN`
- `VOID_FUNDING_SAFE_PUBLIC_PACKET_V1_GREEN`
- `VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN`

The broken route was not shipped.

## Safety assertions

- runtime_patch_required=false
- docs_proof_only_preferred=true
- source_diff_required=true
- build_before_commit_required=true
- duplicate_route_check_required=true
- abort_recovery_required_after_syntax_failure=true
- public_mutation_default=false
- secrets_public=false
- wallet_send_now=false
- money_movement_now=false
