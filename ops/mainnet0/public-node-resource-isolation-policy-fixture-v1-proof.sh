#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-resource-isolation-policy-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_UI_V1" src/index.ts

bash ops/mainnet0/public-node-controlled-earning-simulation-fixture-v1-proof.sh > "$OUT/controlled-earning-proof.log"
grep -Fq "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_PROOF_V1_GREEN" "$OUT/controlled-earning-proof.log"

RESOURCE="$OUT/resource-isolation-policy-fixture-v1.json"
EARN="$OUT/controlled-earning-simulation-fixture-v1.json"
NONCE="$OUT/nonce-replay-protection-fixture-v1.json"
CAP="$OUT/capability-envelope-v1.json"
RUNTIME="$OUT/runtime-gate-lock.json"

curl -fsS -o "$RESOURCE" "$BASE/public-node/resource-isolation-policy-fixture-v1.json"
curl -fsS -o "$EARN" "$BASE/public-node/controlled-earning-simulation-fixture-v1.json"
curl -fsS -o "$NONCE" "$BASE/public-node/nonce-replay-protection-fixture-v1.json"
curl -fsS -o "$CAP" "$BASE/public-node/capability-envelope-v1.json"
curl -fsS -o "$RUNTIME" "$BASE/public-node/runtime-gate-lock.json"

jq empty "$RESOURCE" >/dev/null
jq empty "$EARN" >/dev/null
jq empty "$NONCE" >/dev/null
jq empty "$CAP" >/dev/null
jq empty "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_V1"' "$RESOURCE" >/dev/null
jq -e '.resource_isolation_policy_version=="v1"' "$RESOURCE" >/dev/null
jq -e '.status=="design_fixture_only"' "$RESOURCE" >/dev/null
jq -e '.design_only==true' "$RESOURCE" >/dev/null
jq -e '.executable==false' "$RESOURCE" >/dev/null
jq -e '.work_execution_open==false' "$RESOURCE" >/dev/null
jq -e '.mutation_unlocked==false' "$RESOURCE" >/dev/null
jq -e '.public_mutation_open==false' "$RESOURCE" >/dev/null
jq -e '.public_earning_open==false' "$RESOURCE" >/dev/null
jq -e '.wc_ledger_write==false' "$RESOURCE" >/dev/null
jq -e '.wc_credit_award==false' "$RESOURCE" >/dev/null
jq -e '.wc_credit_delta_now==0' "$RESOURCE" >/dev/null
jq -e '.wc_to_void_swap==false' "$RESOURCE" >/dev/null
jq -e '.validator_mutation_open==false' "$RESOURCE" >/dev/null
jq -e '.money_movement_open==false' "$RESOURCE" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$RESOURCE" >/dev/null

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$RUNTIME" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1"' "$CAP" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1"' "$NONCE" >/dev/null
jq -e '.marker=="VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1"' "$EARN" >/dev/null
jq -e '.controlled_earning_simulation_version=="v1"' "$EARN" >/dev/null
jq -e '.simulation_only==true' "$EARN" >/dev/null
jq -e '.wc_ledger_write==false' "$EARN" >/dev/null
jq -e '.wc_credit_award==false' "$EARN" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1") and index("VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1") and index("VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_V1")' "$RESOURCE" >/dev/null
jq -e '.next_gate=="operator_controlled_earning_dry_run_fixture_v1"' "$RESOURCE" >/dev/null

jq -e '.isolation_policy_schema.record_type=="void.resource_isolation_policy.v1"' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.cpu_limit_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.memory_limit_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.disk_write_limit_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.network_policy_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.timeout_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.path_allowlist_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.cleanup_required==true' "$RESOURCE" >/dev/null
jq -e '.isolation_policy_schema.operator_review_required==true' "$RESOURCE" >/dev/null

jq -e '.default_limits.memory_limit_mb==256' "$RESOURCE" >/dev/null
jq -e '.default_limits.disk_write_limit_mb==64' "$RESOURCE" >/dev/null
jq -e '.default_limits.timeout_seconds==60' "$RESOURCE" >/dev/null
jq -e '.default_limits.max_processes==4' "$RESOURCE" >/dev/null
jq -e '.default_limits.cleanup_required==true' "$RESOURCE" >/dev/null
jq -e '.default_limits.denied_paths | index("ssh") and index("wallets") and index("private_keys") and index("service_env") and index("runtime_data")' "$RESOURCE" >/dev/null

jq -e '.denied_job_classes_now | index("host_shell") and index("private_file_read") and index("wallet_send") and index("validator_mutation") and index("service_env_read") and index("long_running_daemon")' "$RESOURCE" >/dev/null
jq -e '.denied_now | index("work_execution") and index("public_mutation") and index("public_earning") and index("wc_ledger_write") and index("wc_credit_award") and index("positive_wc_credit_delta") and index("wc_to_void_swap") and index("wallet_send") and index("validator_mutation") and index("money_movement") and index("private_file_read") and index("service_env_read") and index("host_shell") and index("automatic_ledger_write")' "$RESOURCE" >/dev/null

jq -e '(.policy_cases|length)==4' "$RESOURCE" >/dev/null
jq -e 'all(.policy_cases[]; .executable_now==false and .ledger_write_allowed==false and .wc_credit_award==false and .mutation_allowed==false)' "$RESOURCE" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/resource-isolation-policy-fixture-v1.json" "/public-node/resource-isolation-policy-fixture-v1/execute"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_RESOURCE_ISOLATION_MUTATION_PROBE_V1","must_not_execute":true,"job_class":"host_shell"}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "resource_isolation_policy_fixture_green=true"
echo "resource_isolation_policy_fixture_design_only=true"
echo "resource_isolation_policy_fixture_work_execution_open=false"
echo "resource_isolation_policy_fixture_mutation_unlocked=false"
echo "resource_isolation_policy_fixture_wc_ledger_write=false"
echo "resource_isolation_policy_fixture_wc_credit_award=false"
echo "resource_isolation_policy_fixture_wc_credit_delta_now=0"
echo "resource_isolation_policy_fixture_wc_to_void_swap=false"
echo "resource_isolation_policy_fixture_cases=4"
echo "resource_isolation_policy_fixture_mutation_probes_checked=$probe_count"
echo "resource_isolation_policy_fixture_fail_closed_count=$fail_closed_count"
echo "resource_isolation_policy_fixture_next_gate=operator_controlled_earning_dry_run_fixture_v1"
echo "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_PROOF_V1_GREEN"
