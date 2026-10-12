#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-capability-envelope-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_DOC_V1" docs/public/public-node-capability-envelope-v1.md

grep -Fq "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_UI_V1" src/index.ts

CAP="$OUT/capability-envelope-v1.json"
RUNTIME="$OUT/runtime-gate-lock.json"

curl -fsS -o "$CAP" "$BASE/public-node/capability-envelope-v1.json"
curl -fsS -o "$RUNTIME" "$BASE/public-node/runtime-gate-lock.json"

jq empty "$CAP" >/dev/null
jq empty "$RUNTIME" >/dev/null

jq -e '.marker=="VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_V1"' "$CAP" >/dev/null
jq -e '.capability_envelope_version=="v1"' "$CAP" >/dev/null
jq -e '.status=="design_fixture_only"' "$CAP" >/dev/null
jq -e '.phase=="guarded_mainnet_0_bootstrap"' "$CAP" >/dev/null
jq -e '.design_only==true' "$CAP" >/dev/null
jq -e '.executable==false' "$CAP" >/dev/null
jq -e '.mutation_unlocked==false' "$CAP" >/dev/null

jq -e '.public_mutation_open==false' "$CAP" >/dev/null
jq -e '.public_earning_open==false' "$CAP" >/dev/null
jq -e '.wc_credit_award_open==false' "$CAP" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$CAP" >/dev/null
jq -e '.validator_mutation_open==false' "$CAP" >/dev/null
jq -e '.money_movement_open==false' "$CAP" >/dev/null

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$RUNTIME" >/dev/null
jq -e '.public_mutation_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_credit_award_open==false' "$RUNTIME" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$RUNTIME" >/dev/null
jq -e '.validator_mutation_open==false' "$RUNTIME" >/dev/null
jq -e '.money_movement_open==false' "$RUNTIME" >/dev/null

jq -e '.depends_on | index("VOID_RUNTIME_GATE_LOCK_V1")' "$CAP" >/dev/null
jq -e '.next_gate=="nonce_replay_protection_fixture_v1"' "$CAP" >/dev/null
jq -e '.envelope_schema.envelope_type=="void.capability_envelope.v1"' "$CAP" >/dev/null
jq -e '.envelope_schema.chain_id==2050' "$CAP" >/dev/null
jq -e '.envelope_schema.nonce_required==true' "$CAP" >/dev/null
jq -e '.envelope_schema.replay_protection_required==true' "$CAP" >/dev/null
jq -e '.envelope_schema.expiry_required==true' "$CAP" >/dev/null
jq -e '.envelope_schema.body_hash_required==true' "$CAP" >/dev/null

jq -e '.envelope_schema.required_fields | index("version") and index("chain_id") and index("capability") and index("subject") and index("issuer") and index("audience") and index("scope") and index("nonce") and index("issued_at") and index("expires_at") and index("body_sha256") and index("signature")' "$CAP" >/dev/null

jq -e '.denied_now | index("public_mutation") and index("wc_credit_award") and index("wc_to_void_swap") and index("validator_mutation") and index("money_movement") and index("admin_operation")' "$CAP" >/dev/null

jq -e '(.examples|length)==3' "$CAP" >/dev/null
jq -e 'all(.examples[]; .mutation_allowed==false and .executable==false)' "$CAP" >/dev/null

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

probe_count=0
fail_closed_count=0
for method in POST PUT PATCH DELETE; do
  for path in "/public-node/capability-envelope-v1.json" "/public-node/capability-envelope-v1/submit"; do
    probe_count=$((probe_count + 1))
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data '{"marker":"VOID_CAPABILITY_ENVELOPE_MUTATION_PROBE_V1","must_not_write":true}' \
      -o "$OUT/probe-$probe_count.body" \
      -w "%{http_code}" \
      "$BASE$path" || true)"
    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      exit 1
    fi
  done
done

echo "capability_envelope_green=true"
echo "capability_envelope_design_only=true"
echo "capability_envelope_mutation_unlocked=false"
echo "capability_envelope_examples=3"
echo "capability_envelope_mutation_probes_checked=$probe_count"
echo "capability_envelope_fail_closed_count=$fail_closed_count"
echo "capability_envelope_next_gate=nonce_replay_protection_fixture_v1"
echo "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_PROOF_V1_GREEN"
