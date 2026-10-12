#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-reviewer-smoke-pack-runtime-pointer-closeout-seal-v1.md"

grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_CLOSEOUT_SEAL_DOC_V1' "$doc" >/dev/null
grep -F 'docs/proof-only' "$doc" >/dev/null
grep -F 'does not open public intake' "$doc" >/dev/null
grep -F 'does not open public mutation' "$doc" >/dev/null
grep -F 'does not add a runtime route' "$doc" >/dev/null
grep -F 'does not modify `src/index.ts`' "$doc" >/dev/null

grep -F 'edb6def5' "$doc" >/dev/null
grep -F 'edb6def537cb' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN' "$doc" >/dev/null
grep -F '/public-node/reviewer-handoff-v1' "$doc" >/dev/null
grep -F '/public-node/reviewer-handoff-v1.json' "$doc" >/dev/null

grep -F 'ckpt-public-reviewer-smoke-pack-runtime-pointer-v1-local-green-20260620-190447' "$doc" >/dev/null
grep -F 'ckpt-public-reviewer-smoke-pack-runtime-pointer-v1-cross-box-green-20260620-190702' "$doc" >/dev/null

grep -F 'docs_proof_only=true' "$doc" >/dev/null
grep -F 'modifies_src_index=false' "$doc" >/dev/null
grep -F 'runtime_route_added=false' "$doc" >/dev/null
grep -F 'public_literal_get_count=159' "$doc" >/dev/null
grep -F 'public_literal_get_unique_count=159' "$doc" >/dev/null
grep -F 'public_literal_get_duplicate_count=0' "$doc" >/dev/null
grep -F 'public_intake_open_now=false' "$doc" >/dev/null
grep -F 'public_mutation_open_now=false' "$doc" >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' "$doc" >/dev/null
grep -F 'literal_mutation_handler_count=118' "$doc" >/dev/null
grep -F 'ledger_write_closed=true' "$doc" >/dev/null
grep -F 'wallet_send_closed=true' "$doc" >/dev/null
grep -F 'money_movement_closed=true' "$doc" >/dev/null
grep -F 'wc_award_mutation_closed=true' "$doc" >/dev/null
grep -F 'validator_admission_mutation_closed=true' "$doc" >/dev/null
grep -F 'datanet_public_ingest_mutation_closed=true' "$doc" >/dev/null
grep -F 'cross_box_complete=true' "$doc" >/dev/null

bash ops/mainnet0/public-reviewer-smoke-pack-runtime-pointer-v1-proof.sh >/tmp/void-smoke-pointer-closeout-pointer.out
grep -F 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_V1_GREEN' /tmp/void-smoke-pointer-closeout-pointer.out >/dev/null

bash ops/mainnet0/public-reviewer-one-command-smoke-pack-closeout-seal-v1-proof.sh >/tmp/void-smoke-pointer-closeout-smoke.out
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN' /tmp/void-smoke-pointer-closeout-smoke.out >/dev/null

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-smoke-pointer-closeout-routes.out
grep -F 'public_literal_get_count=159' /tmp/void-smoke-pointer-closeout-routes.out >/dev/null
grep -F 'public_literal_get_unique_count=159' /tmp/void-smoke-pointer-closeout-routes.out >/dev/null
grep -F 'public_literal_get_duplicate_count=0' /tmp/void-smoke-pointer-closeout-routes.out >/dev/null
grep -F 'VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN' /tmp/void-smoke-pointer-closeout-routes.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-smoke-pointer-closeout-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-smoke-pointer-closeout-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-smoke-pointer-closeout-mutation.out >/dev/null

echo 'VOID_PUBLIC_REVIEWER_SMOKE_PACK_RUNTIME_POINTER_CLOSEOUT_SEAL_V1_GREEN'
