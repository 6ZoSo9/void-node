#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-reviewer-one-command-smoke-pack-closeout-seal-v1.md"

grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_DOC_V1' "$doc" >/dev/null
grep -F 'docs/proof-only' "$doc" >/dev/null
grep -F 'does not open public intake' "$doc" >/dev/null
grep -F 'does not open public mutation' "$doc" >/dev/null
grep -F 'does not add a runtime route' "$doc" >/dev/null
grep -F 'does not modify `src/index.ts`' "$doc" >/dev/null

grep -F 'c251b378' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_CLOSEOUT_SEAL_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' "$doc" >/dev/null
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' "$doc" >/dev/null

grep -F 'ckpt-public-reviewer-one-command-smoke-pack-v1-local-green-20260620-185140' "$doc" >/dev/null
grep -F 'ckpt-public-reviewer-one-command-smoke-pack-v1-cross-box-green-20260620-185250' "$doc" >/dev/null

grep -F 'docs_proof_only=true' "$doc" >/dev/null
grep -F 'modifies_src_index=false' "$doc" >/dev/null
grep -F 'runtime_route_added=false' "$doc" >/dev/null
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

bash ops/mainnet0/public-reviewer-one-command-smoke-pack-v1-proof.sh >/tmp/void-one-command-closeout-smoke.out
grep -F 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_GREEN' /tmp/void-one-command-closeout-smoke.out >/dev/null

bash ops/mainnet0/public-reviewer-handoff-runtime-card-closeout-seal-v1-proof.sh >/tmp/void-one-command-closeout-handoff.out
grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_CLOSEOUT_SEAL_V1_GREEN' /tmp/void-one-command-closeout-handoff.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-one-command-closeout-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-one-command-closeout-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-one-command-closeout-mutation.out >/dev/null

echo 'VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_CLOSEOUT_SEAL_V1_GREEN'
