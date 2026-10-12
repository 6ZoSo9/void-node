#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-operator-ledger-write-readiness-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_DOC_V1" docs/public/public-node-operator-ledger-write-readiness-fixture-v1.md

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-operator-ledger-entry-preview-fixture-v1-proof.sh > "$OUT/operator-ledger-entry-preview-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-ledger-entry-preview-proof.log"

READY="$OUT/operator-ledger-write-readiness-fixture-v1.json"
curl -fsS -o "$READY" "$BASE/public-node/operator-ledger-write-readiness-fixture-v1.json"
jq empty "$READY" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_V1"' "$READY" >/dev/null
jq -e '.status=="ledger_write_readiness_fixture_only"' "$READY" >/dev/null
jq -e '.state=="blocked_not_ready_for_ledger_write"' "$READY" >/dev/null
jq -e '.design_only==true' "$READY" >/dev/null
jq -e '.readiness_fixture_only==true' "$READY" >/dev/null
jq -e '.readiness_only==true' "$READY" >/dev/null
jq -e '.executable==false' "$READY" >/dev/null
jq -e '.mutation_unlocked==false' "$READY" >/dev/null
jq -e '.public_mutation_open==false' "$READY" >/dev/null
jq -e '.public_earning_open==false' "$READY" >/dev/null
jq -e '.public_submission_open==false' "$READY" >/dev/null
jq -e '.work_execution_open==false' "$READY" >/dev/null
jq -e '.operator_confirmation_present==false' "$READY" >/dev/null
jq -e '.ledger_entry_preview_required==true' "$READY" >/dev/null
jq -e '.ledger_entry_preview_green_required==true' "$READY" >/dev/null
jq -e '.source_hash_chain_required==true' "$READY" >/dev/null
jq -e '.source_hash_chain_green==false' "$READY" >/dev/null
jq -e '.ready_for_ledger_write==false' "$READY" >/dev/null
jq -e '.ready_for_credit_award==false' "$READY" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$READY" >/dev/null
jq -e '.ledger_record_created_now==false' "$READY" >/dev/null
jq -e '.ledger_entry_created_now==false' "$READY" >/dev/null
jq -e '.ledger_entry_preview_created_now==false' "$READY" >/dev/null
jq -e '.award_record_created_now==false' "$READY" >/dev/null
jq -e '.award_created_now==false' "$READY" >/dev/null
jq -e '.wc_ledger_write==false' "$READY" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$READY" >/dev/null
jq -e '.wc_credit_award==false' "$READY" >/dev/null
jq -e '.wc_credit_delta_now==0' "$READY" >/dev/null
jq -e '.wc_to_void_swap==false' "$READY" >/dev/null
jq -e '.wallet_send==false' "$READY" >/dev/null
jq -e '.buy_void_fulfillment==false' "$READY" >/dev/null
jq -e '.validator_mutation_open==false' "$READY" >/dev/null
jq -e '.money_movement_open==false' "$READY" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$READY" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_design_v1"' "$READY" >/dev/null
jq -e '.readiness_conditions.explicit_operator_ledger_write_confirmation_present==false' "$READY" >/dev/null
jq -e '.readiness_conditions.ledger_write_runbook_exists==false' "$READY" >/dev/null
jq -e '.readiness_conditions.ledger_write_runbook_proof_green==false' "$READY" >/dev/null
jq -e '.readiness_blocks | index("source_hash_chain_not_green") and index("duplicate_ledger_entry_check_not_green") and index("explicit_operator_ledger_write_confirmation_missing") and index("ledger_write_runbook_absent")' "$READY" >/dev/null
jq -e '.denied_now | index("ledger_write_allowed") and index("ledger_entry_write") and index("ledger_record_write") and index("wc_ledger_write") and index("wc_credit_award") and index("wc_to_void_swap") and index("wallet_send") and index("buy_void_fulfillment") and index("validator_mutation") and index("money_movement") and index("automatic_ledger_write")' "$READY" >/dev/null
jq -e '(.readiness_cases|length)==4' "$READY" >/dev/null
jq -e 'all(.readiness_cases[]; .ready_for_ledger_write==false and .ledger_write_allowed_now==false and .ledger_record_created_now==false and .wc_ledger_mutated_now==false and .wc_credit_delta_now==0 and .wc_credit_award==false and .wc_to_void_swap==false)' "$READY" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/operator-ledger-write-readiness-fixture-v1.json" "/public-node/operator-ledger-write-readiness-fixture-v1/write"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" -H "Content-Type: application/json" --data '{"must_not_write":true,"wc_credit_delta_now":999}' -o "$OUT/probe-$probe_count.body" -w "%{http_code}" "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "operator_ledger_write_readiness_fixture_green=true"
echo "operator_ledger_write_readiness_fixture_readiness_only=true"
echo "operator_ledger_write_readiness_fixture_state=blocked_not_ready_for_ledger_write"
echo "operator_ledger_write_readiness_fixture_ready_for_ledger_write=false"
echo "operator_ledger_write_readiness_fixture_ledger_write_allowed_now=false"
echo "operator_ledger_write_readiness_fixture_source_hash_chain_green=false"
echo "operator_ledger_write_readiness_fixture_explicit_confirmation_present=false"
echo "operator_ledger_write_readiness_fixture_ledger_write_runbook_exists=false"
echo "operator_ledger_write_readiness_fixture_ledger_write_runbook_proof_green=false"
echo "operator_ledger_write_readiness_fixture_ledger_record_created_now=false"
echo "operator_ledger_write_readiness_fixture_wc_ledger_write=false"
echo "operator_ledger_write_readiness_fixture_wc_ledger_mutated_now=false"
echo "operator_ledger_write_readiness_fixture_wc_credit_award=false"
echo "operator_ledger_write_readiness_fixture_wc_credit_delta_now=0"
echo "operator_ledger_write_readiness_fixture_wc_to_void_swap=false"
echo "operator_ledger_write_readiness_fixture_cases=4"
echo "operator_ledger_write_readiness_fixture_mutation_probes_checked=$probe_count"
echo "operator_ledger_write_readiness_fixture_fail_closed_count=$fail_closed_count"
echo "operator_ledger_write_readiness_fixture_next_gate=operator_ledger_write_runbook_design_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_PROOF_V1_GREEN"
