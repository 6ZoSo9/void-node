#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-operator-award-intent-packet-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-operator-controlled-earning-dry-run-fixture-v1-proof.sh > "$OUT/operator-dry-run-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-dry-run-proof.log"

INTENT="$OUT/operator-award-intent-packet-fixture-v1.json"
DRY="$OUT/operator-controlled-earning-dry-run-fixture-v1.json"

curl -fsS -o "$INTENT" "$BASE/public-node/operator-award-intent-packet-fixture-v1.json"
curl -fsS -o "$DRY" "$BASE/public-node/operator-controlled-earning-dry-run-fixture-v1.json"

jq empty "$INTENT" >/dev/null
jq empty "$DRY" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_V1"' "$INTENT" >/dev/null
jq -e '.operator_award_intent_packet_version=="v1"' "$INTENT" >/dev/null
jq -e '.status=="intent_packet_fixture_only"' "$INTENT" >/dev/null
jq -e '.design_only==true' "$INTENT" >/dev/null
jq -e '.intent_packet_only==true' "$INTENT" >/dev/null
jq -e '.executable==false' "$INTENT" >/dev/null
jq -e '.mutation_unlocked==false' "$INTENT" >/dev/null
jq -e '.public_mutation_open==false' "$INTENT" >/dev/null
jq -e '.public_earning_open==false' "$INTENT" >/dev/null
jq -e '.public_submission_open==false' "$INTENT" >/dev/null
jq -e '.work_execution_open==false' "$INTENT" >/dev/null
jq -e '.operator_confirmation_required==true' "$INTENT" >/dev/null
jq -e '.operator_confirmation_present==false' "$INTENT" >/dev/null
jq -e '.dry_run_required==true' "$INTENT" >/dev/null
jq -e '.dry_run_green_required==true' "$INTENT" >/dev/null
jq -e '.award_intent_packet_created_now==false' "$INTENT" >/dev/null
jq -e '.award_record_created_now==false' "$INTENT" >/dev/null
jq -e '.ledger_entry_created_now==false' "$INTENT" >/dev/null
jq -e '.wc_review_record_write==false' "$INTENT" >/dev/null
jq -e '.wc_decision_record_write==false' "$INTENT" >/dev/null
jq -e '.wc_award_record_write==false' "$INTENT" >/dev/null
jq -e '.wc_ledger_write==false' "$INTENT" >/dev/null
jq -e '.wc_credit_award==false' "$INTENT" >/dev/null
jq -e '.proposed_wc_delta_only==true' "$INTENT" >/dev/null
jq -e '.proposed_wc_delta==0' "$INTENT" >/dev/null
jq -e '.wc_credit_delta_now==0' "$INTENT" >/dev/null
jq -e '.wc_to_void_swap==false' "$INTENT" >/dev/null
jq -e '.validator_mutation_open==false' "$INTENT" >/dev/null
jq -e '.money_movement_open==false' "$INTENT" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$INTENT" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1"' "$DRY" >/dev/null
jq -e '.dry_run_only==true' "$DRY" >/dev/null
jq -e '.wc_ledger_write==false' "$DRY" >/dev/null
jq -e '.wc_credit_award==false' "$DRY" >/dev/null
jq -e '.wc_credit_delta_now==0' "$DRY" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1") and index("VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1") and index("VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1")' "$INTENT" >/dev/null
jq -e '.next_gate=="operator_award_record_fixture_v1"' "$INTENT" >/dev/null

jq -e '.intent_packet_schema.record_type=="void.operator_award_intent_packet.v1"' "$INTENT" >/dev/null
jq -e '.intent_packet_schema.source_dry_run_required==true' "$INTENT" >/dev/null
jq -e '.intent_packet_schema.operator_confirmation_required==true' "$INTENT" >/dev/null
jq -e '.intent_packet_schema.proposed_delta_preview_only==true' "$INTENT" >/dev/null
jq -e '.intent_packet_schema.award_record_write_allowed_in_v1==false' "$INTENT" >/dev/null
jq -e '.intent_packet_schema.ledger_write_allowed_in_v1==false' "$INTENT" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("public_earning") and index("public_submission") and index("work_execution") and index("award_intent_packet_write") and index("award_record_write") and index("ledger_entry_write") and index("wc_ledger_write") and index("wc_credit_award") and index("positive_wc_credit_delta") and index("wc_to_void_swap") and index("wallet_send") and index("validator_mutation") and index("money_movement") and index("automatic_ledger_write")' "$INTENT" >/dev/null
jq -e '(.packet_cases|length)==4' "$INTENT" >/dev/null
jq -e 'all(.packet_cases[]; .proposed_wc_delta==0 and .proposed_delta_preview_only==true and .operator_confirmation_present==false and .award_intent_packet_created_now==false and .award_record_created_now==false and .ledger_entry_created_now==false and .wc_ledger_mutated_now==false and .wc_credit_award==false and .wc_to_void_swap==false)' "$INTENT" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/operator-award-intent-packet-fixture-v1.json" "/public-node/operator-award-intent-packet-fixture-v1/write"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_OPERATOR_AWARD_INTENT_PACKET_MUTATION_PROBE_V1","must_not_write":true,"proposed_wc_delta":999}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "operator_award_intent_packet_fixture_green=true"
echo "operator_award_intent_packet_fixture_intent_packet_only=true"
echo "operator_award_intent_packet_fixture_work_execution_open=false"
echo "operator_award_intent_packet_fixture_mutation_unlocked=false"
echo "operator_award_intent_packet_fixture_operator_confirmation_present=false"
echo "operator_award_intent_packet_fixture_award_intent_packet_created_now=false"
echo "operator_award_intent_packet_fixture_award_record_created_now=false"
echo "operator_award_intent_packet_fixture_ledger_entry_created_now=false"
echo "operator_award_intent_packet_fixture_wc_ledger_write=false"
echo "operator_award_intent_packet_fixture_wc_credit_award=false"
echo "operator_award_intent_packet_fixture_wc_credit_delta_now=0"
echo "operator_award_intent_packet_fixture_wc_to_void_swap=false"
echo "operator_award_intent_packet_fixture_cases=4"
echo "operator_award_intent_packet_fixture_mutation_probes_checked=$probe_count"
echo "operator_award_intent_packet_fixture_fail_closed_count=$fail_closed_count"
echo "operator_award_intent_packet_fixture_next_gate=operator_award_record_fixture_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1_GREEN"
