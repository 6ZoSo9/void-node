#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-operator-controlled-earning-dry-run-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-resource-isolation-policy-fixture-v1-proof.sh > "$OUT/resource-isolation-proof.log"
grep -Fq "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_PROOF_V1_GREEN" "$OUT/resource-isolation-proof.log"

DRY="$OUT/operator-controlled-earning-dry-run-fixture-v1.json"
RESOURCE="$OUT/resource-isolation-policy-fixture-v1.json"
EARN="$OUT/controlled-earning-simulation-fixture-v1.json"
NONCE="$OUT/nonce-replay-protection-fixture-v1.json"
CAP="$OUT/capability-envelope-v1.json"
RUNTIME="$OUT/runtime-gate-lock.json"

curl -fsS -o "$DRY" "$BASE/public-node/operator-controlled-earning-dry-run-fixture-v1.json"
curl -fsS -o "$RESOURCE" "$BASE/public-node/resource-isolation-policy-fixture-v1.json"
curl -fsS -o "$EARN" "$BASE/public-node/controlled-earning-simulation-fixture-v1.json"
curl -fsS -o "$NONCE" "$BASE/public-node/nonce-replay-protection-fixture-v1.json"
curl -fsS -o "$CAP" "$BASE/public-node/capability-envelope-v1.json"
curl -fsS -o "$RUNTIME" "$BASE/public-node/runtime-gate-lock.json"

jq empty "$DRY" >/dev/null
jq empty "$RESOURCE" >/dev/null
jq empty "$EARN" >/dev/null
jq empty "$NONCE" >/dev/null
jq empty "$CAP" >/dev/null
jq empty "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_V1"' "$DRY" >/dev/null
jq -e '.operator_controlled_earning_dry_run_version=="v1"' "$DRY" >/dev/null
jq -e '.status=="dry_run_fixture_only"' "$DRY" >/dev/null
jq -e '.design_only==true' "$DRY" >/dev/null
jq -e '.dry_run_only==true' "$DRY" >/dev/null
jq -e '.executable==false' "$DRY" >/dev/null
jq -e '.mutation_unlocked==false' "$DRY" >/dev/null
jq -e '.public_mutation_open==false' "$DRY" >/dev/null
jq -e '.public_earning_open==false' "$DRY" >/dev/null
jq -e '.public_submission_open==false' "$DRY" >/dev/null
jq -e '.work_execution_open==false' "$DRY" >/dev/null
jq -e '.operator_confirmation_required==true' "$DRY" >/dev/null
jq -e '.operator_confirmation_present==false' "$DRY" >/dev/null
jq -e '.dry_run_record_created_now==false' "$DRY" >/dev/null
jq -e '.review_record_created_now==false' "$DRY" >/dev/null
jq -e '.decision_record_created_now==false' "$DRY" >/dev/null
jq -e '.award_intent_packet_created_now==false' "$DRY" >/dev/null
jq -e '.award_record_created_now==false' "$DRY" >/dev/null
jq -e '.ledger_entry_created_now==false' "$DRY" >/dev/null
jq -e '.wc_review_record_write==false' "$DRY" >/dev/null
jq -e '.wc_decision_record_write==false' "$DRY" >/dev/null
jq -e '.wc_award_record_write==false' "$DRY" >/dev/null
jq -e '.wc_ledger_write==false' "$DRY" >/dev/null
jq -e '.wc_credit_award==false' "$DRY" >/dev/null
jq -e '.wc_credit_delta_now==0' "$DRY" >/dev/null
jq -e '.wc_to_void_swap==false' "$DRY" >/dev/null
jq -e '.validator_mutation_open==false' "$DRY" >/dev/null
jq -e '.money_movement_open==false' "$DRY" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$DRY" >/dev/null

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$RUNTIME" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1"' "$CAP" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1"' "$NONCE" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1"' "$EARN" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1"' "$RESOURCE" >/dev/null
jq -e '.work_execution_open==false' "$RESOURCE" >/dev/null
jq -e '.wc_ledger_write==false' "$RESOURCE" >/dev/null
jq -e '.wc_credit_award==false' "$RESOURCE" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1") and index("VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1")' "$DRY" >/dev/null
jq -e '.next_gate=="operator_award_intent_packet_fixture_v1"' "$DRY" >/dev/null

jq -e '.dry_run_schema.record_type=="void.operator_controlled_earning_dry_run.v1"' "$DRY" >/dev/null
jq -e '.dry_run_schema.operator_confirmation_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.resource_policy_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.capability_envelope_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.nonce_replay_check_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.duplicate_check_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.source_hash_required==true' "$DRY" >/dev/null
jq -e '.dry_run_schema.ledger_write_allowed_in_v1==false' "$DRY" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("public_earning") and index("public_submission") and index("work_execution") and index("dry_run_record_write") and index("wc_review_record_write") and index("wc_decision_record_write") and index("wc_award_record_write") and index("wc_ledger_write") and index("wc_credit_award") and index("positive_wc_credit_delta") and index("wc_to_void_swap") and index("wallet_send") and index("validator_mutation") and index("money_movement") and index("automatic_ledger_write")' "$DRY" >/dev/null

jq -e '(.dry_run_cases|length)==5' "$DRY" >/dev/null
jq -e 'all(.dry_run_cases[]; .dry_run_only==true and .executable_now==false and .ledger_write_allowed==false and .award_created_now==false and .wc_ledger_mutated_now==false and .wc_credit_award==false and .wc_to_void_swap==false and .simulated_wc_delta==0 and .operator_confirmation_present==false)' "$DRY" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/operator-controlled-earning-dry-run-fixture-v1.json" "/public-node/operator-controlled-earning-dry-run-fixture-v1/execute"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_OPERATOR_CONTROLLED_EARNING_DRY_RUN_MUTATION_PROBE_V1","must_not_write":true,"wc_credit_delta_now":999}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "operator_controlled_earning_dry_run_fixture_green=true"
echo "operator_controlled_earning_dry_run_fixture_dry_run_only=true"
echo "operator_controlled_earning_dry_run_fixture_work_execution_open=false"
echo "operator_controlled_earning_dry_run_fixture_mutation_unlocked=false"
echo "operator_controlled_earning_dry_run_fixture_operator_confirmation_present=false"
echo "operator_controlled_earning_dry_run_fixture_dry_run_record_created_now=false"
echo "operator_controlled_earning_dry_run_fixture_wc_ledger_write=false"
echo "operator_controlled_earning_dry_run_fixture_wc_credit_award=false"
echo "operator_controlled_earning_dry_run_fixture_wc_credit_delta_now=0"
echo "operator_controlled_earning_dry_run_fixture_wc_to_void_swap=false"
echo "operator_controlled_earning_dry_run_fixture_cases=5"
echo "operator_controlled_earning_dry_run_fixture_mutation_probes_checked=$probe_count"
echo "operator_controlled_earning_dry_run_fixture_fail_closed_count=$fail_closed_count"
echo "operator_controlled_earning_dry_run_fixture_next_gate=operator_award_intent_packet_fixture_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_PROOF_V1_GREEN"
