#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-operator-ledger-entry-preview-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_DOC_V1" docs/public/public-node-operator-ledger-entry-preview-fixture-v1.md

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-operator-award-record-fixture-v1-proof.sh > "$OUT/operator-award-record-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-award-record-proof.log"

PREVIEW="$OUT/operator-ledger-entry-preview-fixture-v1.json"
RECORD="$OUT/operator-award-record-fixture-v1.json"

curl -fsS -o "$PREVIEW" "$BASE/public-node/operator-ledger-entry-preview-fixture-v1.json"
curl -fsS -o "$RECORD" "$BASE/public-node/operator-award-record-fixture-v1.json"

jq empty "$PREVIEW" >/dev/null
jq empty "$RECORD" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_V1"' "$PREVIEW" >/dev/null
jq -e '.operator_ledger_entry_preview_fixture_version=="v1"' "$PREVIEW" >/dev/null
jq -e '.status=="ledger_entry_preview_fixture_only"' "$PREVIEW" >/dev/null
jq -e '.design_only==true' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_fixture_only==true' "$PREVIEW" >/dev/null
jq -e '.preview_only==true' "$PREVIEW" >/dev/null
jq -e '.executable==false' "$PREVIEW" >/dev/null
jq -e '.mutation_unlocked==false' "$PREVIEW" >/dev/null
jq -e '.public_mutation_open==false' "$PREVIEW" >/dev/null
jq -e '.public_earning_open==false' "$PREVIEW" >/dev/null
jq -e '.public_submission_open==false' "$PREVIEW" >/dev/null
jq -e '.work_execution_open==false' "$PREVIEW" >/dev/null
jq -e '.operator_confirmation_required==true' "$PREVIEW" >/dev/null
jq -e '.operator_confirmation_present==false' "$PREVIEW" >/dev/null
jq -e '.award_record_required==true' "$PREVIEW" >/dev/null
jq -e '.award_record_green_required==true' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_created_now==false' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_created_now==false' "$PREVIEW" >/dev/null
jq -e '.ledger_record_created_now==false' "$PREVIEW" >/dev/null
jq -e '.award_record_created_now==false' "$PREVIEW" >/dev/null
jq -e '.award_created_now==false' "$PREVIEW" >/dev/null
jq -e '.wc_review_record_write==false' "$PREVIEW" >/dev/null
jq -e '.wc_decision_record_write==false' "$PREVIEW" >/dev/null
jq -e '.wc_award_record_write==false' "$PREVIEW" >/dev/null
jq -e '.wc_ledger_write==false' "$PREVIEW" >/dev/null
jq -e '.wc_credit_award==false' "$PREVIEW" >/dev/null
jq -e '.preview_wc_delta_only==true' "$PREVIEW" >/dev/null
jq -e '.preview_wc_delta==0' "$PREVIEW" >/dev/null
jq -e '.wc_credit_delta_now==0' "$PREVIEW" >/dev/null
jq -e '.wc_to_void_swap==false' "$PREVIEW" >/dev/null
jq -e '.validator_mutation_open==false' "$PREVIEW" >/dev/null
jq -e '.money_movement_open==false' "$PREVIEW" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$PREVIEW" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_V1"' "$RECORD" >/dev/null
jq -e '.award_record_fixture_only==true' "$RECORD" >/dev/null
jq -e '.award_record_created_now==false' "$RECORD" >/dev/null
jq -e '.ledger_entry_created_now==false' "$RECORD" >/dev/null
jq -e '.ledger_record_created_now==false' "$RECORD" >/dev/null
jq -e '.wc_ledger_write==false' "$RECORD" >/dev/null
jq -e '.wc_credit_award==false' "$RECORD" >/dev/null
jq -e '.wc_credit_delta_now==0' "$RECORD" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1") and index("VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1") and index("VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1") and index("VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_V1") and index("VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_V1")' "$PREVIEW" >/dev/null
jq -e '.next_gate=="operator_ledger_write_readiness_fixture_v1"' "$PREVIEW" >/dev/null

jq -e '.ledger_entry_preview_schema.record_type=="void.operator_ledger_entry_preview.v1"' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.source_award_record_required==true' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.operator_confirmation_required==true' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.preview_delta_only==true' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.ledger_entry_preview_write_allowed_in_v1==false' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.ledger_record_write_allowed_in_v1==false' "$PREVIEW" >/dev/null
jq -e '.ledger_entry_preview_schema.wc_ledger_write_allowed_in_v1==false' "$PREVIEW" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("public_earning") and index("public_submission") and index("work_execution") and index("ledger_entry_preview_write") and index("ledger_entry_write") and index("ledger_record_write") and index("wc_ledger_write") and index("wc_credit_award") and index("positive_wc_credit_delta") and index("wc_to_void_swap") and index("wallet_send") and index("validator_mutation") and index("money_movement") and index("automatic_ledger_write")' "$PREVIEW" >/dev/null
jq -e '(.preview_cases|length)==4' "$PREVIEW" >/dev/null
jq -e 'all(.preview_cases[]; .preview_wc_delta==0 and .preview_delta_only==true and .operator_confirmation_present==false and .ledger_entry_preview_created_now==false and .ledger_entry_created_now==false and .ledger_record_created_now==false and .award_record_created_now==false and .award_created_now==false and .wc_ledger_mutated_now==false and .wc_credit_award==false and .wc_to_void_swap==false)' "$PREVIEW" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/operator-ledger-entry-preview-fixture-v1.json" "/public-node/operator-ledger-entry-preview-fixture-v1/write"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_OPERATOR_LEDGER_ENTRY_PREVIEW_MUTATION_PROBE_V1","must_not_write":true,"preview_wc_delta":999}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "operator_ledger_entry_preview_fixture_green=true"
echo "operator_ledger_entry_preview_fixture_preview_only=true"
echo "operator_ledger_entry_preview_fixture_work_execution_open=false"
echo "operator_ledger_entry_preview_fixture_mutation_unlocked=false"
echo "operator_ledger_entry_preview_fixture_operator_confirmation_present=false"
echo "operator_ledger_entry_preview_fixture_ledger_entry_preview_created_now=false"
echo "operator_ledger_entry_preview_fixture_ledger_entry_created_now=false"
echo "operator_ledger_entry_preview_fixture_ledger_record_created_now=false"
echo "operator_ledger_entry_preview_fixture_award_record_created_now=false"
echo "operator_ledger_entry_preview_fixture_award_created_now=false"
echo "operator_ledger_entry_preview_fixture_wc_ledger_write=false"
echo "operator_ledger_entry_preview_fixture_wc_credit_award=false"
echo "operator_ledger_entry_preview_fixture_wc_credit_delta_now=0"
echo "operator_ledger_entry_preview_fixture_wc_to_void_swap=false"
echo "operator_ledger_entry_preview_fixture_cases=4"
echo "operator_ledger_entry_preview_fixture_mutation_probes_checked=$probe_count"
echo "operator_ledger_entry_preview_fixture_fail_closed_count=$fail_closed_count"
echo "operator_ledger_entry_preview_fixture_next_gate=operator_ledger_write_readiness_fixture_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_PROOF_V1_GREEN"
