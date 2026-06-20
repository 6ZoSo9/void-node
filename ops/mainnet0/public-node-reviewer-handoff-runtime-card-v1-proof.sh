#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-node-reviewer-handoff-runtime-card-v1.md"

grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_ROUTE_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_HTML_ROUTE_V1" "$src" >/dev/null
grep -F 'APP.get("/public-node/reviewer-handoff-v1.json"' "$src" >/dev/null
grep -F 'APP.get("/public-node/reviewer-handoff-v1"' "$src" >/dev/null
grep -F 'href="/public-node/reviewer-handoff-v1">Reviewer handoff' "$src" >/dev/null

grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1_GREEN" "$src" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN" "$src" >/dev/null
grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_CLOSEOUT_SEAL_V1_GREEN" "$src" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" "$src" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$src" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$src" >/dev/null

grep -F "runtime_card_only: true" "$src" >/dev/null
grep -F "read_only: true" "$src" >/dev/null
grep -F "public_intake_open_now: false" "$src" >/dev/null
grep -F "public_mutation_open_now: false" "$src" >/dev/null
grep -F "wallet_send_closed: true" "$src" >/dev/null
grep -F "money_movement_closed: true" "$src" >/dev/null
grep -F "wc_award_mutation_closed: true" "$src" >/dev/null
grep -F "validator_admission_mutation_closed: true" "$src" >/dev/null
grep -F "datanet_public_ingest_mutation_closed: true" "$src" >/dev/null

grep -F "VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_DOC_V1" "$doc" >/dev/null
grep -F "runtime_card_only=true" "$doc" >/dev/null
grep -F "read_only=true" "$doc" >/dev/null
grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null

echo "VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1_GREEN"
