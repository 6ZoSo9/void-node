#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-controlled-earning-simulation-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_DOC_V1" docs/public/public-node-controlled-earning-simulation-fixture-v1.md

grep -Fq "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-nonce-replay-protection-fixture-v1-proof.sh > "$OUT/nonce-replay-proof.log"
grep -Fq "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_PROOF_V1_GREEN" "$OUT/nonce-replay-proof.log"

EARN="$OUT/controlled-earning-simulation-fixture-v1.json"
NONCE="$OUT/nonce-replay-protection-fixture-v1.json"
CAP="$OUT/capability-envelope-v1.json"
RUNTIME="$OUT/runtime-gate-lock.json"

curl -fsS -o "$EARN" "$BASE/public-node/controlled-earning-simulation-fixture-v1.json"
curl -fsS -o "$NONCE" "$BASE/public-node/nonce-replay-protection-fixture-v1.json"
curl -fsS -o "$CAP" "$BASE/public-node/capability-envelope-v1.json"
curl -fsS -o "$RUNTIME" "$BASE/public-node/runtime-gate-lock.json"

jq empty "$EARN" >/dev/null
jq empty "$NONCE" >/dev/null
jq empty "$CAP" >/dev/null
jq empty "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1"' "$EARN" >/dev/null
jq -e '.controlled_earning_simulation_version=="v1"' "$EARN" >/dev/null
jq -e '.status=="simulation_fixture_only"' "$EARN" >/dev/null
jq -e '.phase=="guarded_mainnet_0_bootstrap"' "$EARN" >/dev/null
jq -e '.design_only==true' "$EARN" >/dev/null
jq -e '.simulation_only==true' "$EARN" >/dev/null
jq -e '.executable==false' "$EARN" >/dev/null
jq -e '.mutation_unlocked==false' "$EARN" >/dev/null

jq -e '.public_mutation_open==false' "$EARN" >/dev/null
jq -e '.public_earning_open==false' "$EARN" >/dev/null
jq -e '.public_submission_open==false' "$EARN" >/dev/null
jq -e '.wc_review_record_write==false' "$EARN" >/dev/null
jq -e '.wc_decision_record_write==false' "$EARN" >/dev/null
jq -e '.wc_award_record_write==false' "$EARN" >/dev/null
jq -e '.wc_ledger_write==false' "$EARN" >/dev/null
jq -e '.wc_credit_award==false' "$EARN" >/dev/null
jq -e '.wc_credit_delta_now==0' "$EARN" >/dev/null
jq -e '.wc_to_void_swap==false' "$EARN" >/dev/null
jq -e '.validator_mutation_open==false' "$EARN" >/dev/null
jq -e '.money_movement_open==false' "$EARN" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$EARN" >/dev/null

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$RUNTIME" >/dev/null
jq -e '.public_mutation_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_credit_award_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1"' "$CAP" >/dev/null
jq -e '.design_only==true' "$CAP" >/dev/null
jq -e '.mutation_unlocked==false' "$CAP" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1"' "$NONCE" >/dev/null
jq -e '.design_only==true' "$NONCE" >/dev/null
jq -e '.mutation_unlocked==false' "$NONCE" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1") and index("VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1")' "$EARN" >/dev/null
jq -e '.next_gate=="resource_isolation_policy_fixture_v1"' "$EARN" >/dev/null

jq -e '.earning_decision_schema.record_type=="void.controlled_earning_simulation.v1"' "$EARN" >/dev/null
jq -e '.earning_decision_schema.positive_wc_delta_requires_operator_review==true' "$EARN" >/dev/null
jq -e '.earning_decision_schema.ledger_write_requires_future_explicit_operator_confirmation==true' "$EARN" >/dev/null
jq -e '.earning_decision_schema.duplicate_check_required==true' "$EARN" >/dev/null
jq -e '.earning_decision_schema.nonce_replay_check_required==true' "$EARN" >/dev/null
jq -e '.earning_decision_schema.source_hash_required==true' "$EARN" >/dev/null

jq -e '.earning_decision_schema.required_fields | index("simulation_id") and index("evidence_id") and index("worker_subject") and index("capability") and index("nonce_state") and index("evidence_hash") and index("utility_score") and index("verifiability_score") and index("abuse_risk_score") and index("duplicate_state") and index("operator_review_state") and index("simulated_decision") and index("simulated_wc_delta") and index("ledger_write_allowed") and index("award_created_now") and index("wc_ledger_mutated_now")' "$EARN" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("public_earning") and index("wc_review_record_write") and index("wc_decision_record_write") and index("wc_award_record_write") and index("wc_ledger_write") and index("wc_credit_award") and index("positive_wc_credit_delta") and index("wc_to_void_swap") and index("validator_mutation") and index("money_movement") and index("automatic_ledger_write")' "$EARN" >/dev/null

jq -e '(.simulation_cases|length)==5' "$EARN" >/dev/null
jq -e 'all(.simulation_cases[]; .simulated==true and .executable==false and .mutation_allowed==false and .ledger_write_allowed==false and .award_created_now==false and .wc_ledger_mutated_now==false and .wc_credit_award==false and .wc_to_void_swap==false and .simulated_wc_delta==0)' "$EARN" >/dev/null
jq -e '[.simulation_cases[].simulated_decision] | index("eligible_pending_operator_review") and index("rejected_replay") and index("rejected_expired") and index("rejected_duplicate") and index("approved_simulation_only_no_award")' "$EARN" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/controlled-earning-simulation-fixture-v1.json" "/public-node/controlled-earning-simulation-fixture-v1/submit"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_CONTROLLED_EARNING_SIMULATION_MUTATION_PROBE_V1","must_not_write":true,"wc_credit_delta_now":999}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "controlled_earning_simulation_fixture_green=true"
echo "controlled_earning_simulation_fixture_simulation_only=true"
echo "controlled_earning_simulation_fixture_mutation_unlocked=false"
echo "controlled_earning_simulation_fixture_wc_ledger_write=false"
echo "controlled_earning_simulation_fixture_wc_credit_award=false"
echo "controlled_earning_simulation_fixture_wc_credit_delta_now=0"
echo "controlled_earning_simulation_fixture_wc_to_void_swap=false"
echo "controlled_earning_simulation_fixture_cases=5"
echo "controlled_earning_simulation_fixture_mutation_probes_checked=$probe_count"
echo "controlled_earning_simulation_fixture_fail_closed_count=$fail_closed_count"
echo "controlled_earning_simulation_fixture_next_gate=resource_isolation_policy_fixture_v1"
echo "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_PROOF_V1_GREEN"
