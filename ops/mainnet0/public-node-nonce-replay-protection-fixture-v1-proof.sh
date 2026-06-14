#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-nonce-replay-fixture-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_UI_V1" src/index.ts

NONCE="$OUT/nonce-replay-protection-fixture-v1.json"
CAP="$OUT/capability-envelope-v1.json"
RUNTIME="$OUT/runtime-gate-lock.json"

curl -fsS -o "$NONCE" "$BASE/public-node/nonce-replay-protection-fixture-v1.json"
curl -fsS -o "$CAP" "$BASE/public-node/capability-envelope-v1.json"
curl -fsS -o "$RUNTIME" "$BASE/public-node/runtime-gate-lock.json"

jq empty "$NONCE" >/dev/null
jq empty "$CAP" >/dev/null
jq empty "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_V1"' "$NONCE" >/dev/null
jq -e '.nonce_replay_fixture_version=="v1"' "$NONCE" >/dev/null
jq -e '.status=="design_fixture_only"' "$NONCE" >/dev/null
jq -e '.phase=="guarded_mainnet_0_bootstrap"' "$NONCE" >/dev/null
jq -e '.design_only==true' "$NONCE" >/dev/null
jq -e '.executable==false' "$NONCE" >/dev/null
jq -e '.mutation_unlocked==false' "$NONCE" >/dev/null

jq -e '.public_mutation_open==false' "$NONCE" >/dev/null
jq -e '.public_earning_open==false' "$NONCE" >/dev/null
jq -e '.wc_credit_award_open==false' "$NONCE" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$NONCE" >/dev/null
jq -e '.validator_mutation_open==false' "$NONCE" >/dev/null
jq -e '.money_movement_open==false' "$NONCE" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1"' "$CAP" >/dev/null
jq -e '.design_only==true' "$CAP" >/dev/null
jq -e '.mutation_unlocked==false' "$CAP" >/dev/null

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$RUNTIME" >/dev/null
jq -e '.public_mutation_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_credit_award_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$RUNTIME" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1") and index("VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1")' "$NONCE" >/dev/null
jq -e '.next_gate=="controlled_earning_simulation_fixture_v1"' "$NONCE" >/dev/null

jq -e '.nonce_record_schema.record_type=="void.nonce_replay_record.v1"' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.expiry_required==true' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.single_use_required==true' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.body_hash_required==true' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.audience_binding_required==true' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.issuer_binding_required==true' "$NONCE" >/dev/null
jq -e '.nonce_record_schema.scope_binding_required==true' "$NONCE" >/dev/null

jq -e '.nonce_record_schema.required_fields | index("nonce_id") and index("envelope_id") and index("capability") and index("issuer") and index("subject") and index("audience") and index("scope_hash") and index("body_sha256") and index("issued_at") and index("expires_at") and index("first_seen_at") and index("consumed_at") and index("state") and index("replay_count") and index("decision")' "$NONCE" >/dev/null

jq -e '.allowed_states | index("fresh_unseen") and index("accepted_once_future") and index("replayed_rejected") and index("expired_rejected") and index("scope_mismatch_rejected") and index("body_hash_mismatch_rejected") and index("issuer_mismatch_rejected") and index("audience_mismatch_rejected")' "$NONCE" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("wc_credit_award") and index("wc_to_void_swap") and index("validator_mutation") and index("money_movement") and index("admin_operation") and index("automatic_ledger_write")' "$NONCE" >/dev/null

jq -e '(.examples|length)==4' "$NONCE" >/dev/null
jq -e 'all(.examples[]; .mutation_allowed==false and .executable==false)' "$NONCE" >/dev/null
jq -e '[.examples[].state] | index("fresh_unseen") and index("replayed_rejected") and index("expired_rejected") and index("body_hash_mismatch_rejected")' "$NONCE" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/nonce-replay-protection-fixture-v1.json" "/public-node/nonce-replay-protection-fixture-v1/submit"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_NONCE_REPLAY_MUTATION_PROBE_V1","must_not_write":true}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "nonce_replay_fixture_green=true"
echo "nonce_replay_fixture_design_only=true"
echo "nonce_replay_fixture_mutation_unlocked=false"
echo "nonce_replay_fixture_examples=4"
echo "nonce_replay_fixture_mutation_probes_checked=$probe_count"
echo "nonce_replay_fixture_fail_closed_count=$fail_closed_count"
echo "nonce_replay_fixture_next_gate=controlled_earning_simulation_fixture_v1"
echo "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_PROOF_V1_GREEN"
