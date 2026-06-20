#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-reviewer-one-command-smoke-pack-v1.md"

grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_DOC_V1' "$doc" >/dev/null
grep -F 'docs/proof-only' "$doc" >/dev/null
grep -F 'does not open public intake' "$doc" >/dev/null
grep -F 'does not open public mutation' "$doc" >/dev/null
grep -F 'does not add a runtime route' "$doc" >/dev/null
grep -F 'does not modify `src/index.ts`' "$doc" >/dev/null

grep -F '19deddb9' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_CLOSEOUT_SEAL_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' "$doc" >/dev/null

grep -F 'VOID_BASE_URL="${VOID_BASE_URL:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/version"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/public-node/reviewer-handoff-v1.json"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/public-node/reviewer-handoff-v1"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/public-node/funding"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/buy-void"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/public-node/datanet/explorer-v1"' "$doc" >/dev/null
grep -F 'curl -fsS "$VOID_BASE_URL/public-node/route-index.json"' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_REVIEWER_GREEN' "$doc" >/dev/null

grep -F 'docs_proof_only=true' "$doc" >/dev/null
grep -F 'modifies_src_index=false' "$doc" >/dev/null
grep -F 'runtime_route_added=false' "$doc" >/dev/null
grep -F 'public_intake_open_now=false' "$doc" >/dev/null
grep -F 'public_mutation_open_now=false' "$doc" >/dev/null
grep -F 'ledger_write_closed=true' "$doc" >/dev/null
grep -F 'wallet_send_closed=true' "$doc" >/dev/null
grep -F 'money_movement_closed=true' "$doc" >/dev/null
grep -F 'wc_award_mutation_closed=true' "$doc" >/dev/null
grep -F 'validator_admission_mutation_closed=true' "$doc" >/dev/null
grep -F 'datanet_public_ingest_mutation_closed=true' "$doc" >/dev/null

bash ops/mainnet0/public-reviewer-handoff-runtime-card-closeout-seal-v1-proof.sh >/tmp/void-smoke-pack-closeout.out
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_CLOSEOUT_SEAL_V1_GREEN' /tmp/void-smoke-pack-closeout.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-smoke-pack-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-smoke-pack-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-smoke-pack-mutation.out >/dev/null

echo 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN'
