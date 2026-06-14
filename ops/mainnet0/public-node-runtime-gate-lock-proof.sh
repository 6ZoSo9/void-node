#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-runtime-gate-lock-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "VOID_RUNTIME_GATE_LOCK_PROOF_V1"

grep -Fq "VOID_RUNTIME_GATE_LOCK_DOC_V1" docs/public/public-node-runtime-gate-lock.md

ok_status() {
  case "$1" in
    401|403|404|405) return 0 ;;
    *) return 1 ;;
  esac
}

json_get() {
  local path="$1"
  local name="$2"
  local file="$OUT/$name.json"
  local code
  code="$(curl -sS -o "$file" -w "%{http_code}" "$BASE$path")"
  test "$code" = "200"
  jq empty "$file" >/dev/null
}

html_get() {
  local path="$1"
  local name="$2"
  local file="$OUT/$name.html"
  local code
  code="$(curl -sS -o "$file" -w "%{http_code}" "$BASE$path")"
  test "$code" = "200"
}

# Public read path preservation.
json_get "/version" "version"
html_get "/public-node" "public-node"
json_get "/public-node/risk-register.json" "risk-register"
json_get "/public-node/runtime-gate-lock.json" "runtime-gate-lock"

jq -e '.marker=="VOID_RUNTIME_GATE_LOCK_V1"' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.public_read_allowed==true' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.public_mutation_open==false' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.public_earning_open==false' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.wc_credit_award_open==false' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.wc_to_void_swap_open==false' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.validator_mutation_open==false' "$OUT/runtime-gate-lock.json" >/dev/null
jq -e '.money_movement_open==false' "$OUT/runtime-gate-lock.json" >/dev/null

# Mutating method death probes.
methods=(POST PUT PATCH DELETE)
targets=(
  "/public-node"
  "/public-node/risk-register.json"
  "/public-node/runtime-gate-lock.json"
  "/public-node/data-weight-record.json"
  "/public-node/local-data-drop.json"
  "/public-node/local-data-drop/ingest"
  "/public-node/wc/award"
  "/public-node/wc/ledger-write"
  "/public-node/validator/register"
  "/public-node/admin"
  "/public-node/runtime-gate-lock-fuzz-$RANDOM-$RANDOM"
)

probe_count=0
fail_closed_count=0

for method in "${methods[@]}"; do
  for path in "${targets[@]}"; do
    probe_count=$((probe_count + 1))
    body='{"marker":"VOID_RUNTIME_GATE_LOCK_MUTATION_PROBE_V1","must_not_write":true}'
    response="$OUT/probe-${probe_count}.body"
    code="$(curl -sS -X "$method" \
      -H "Content-Type: application/json" \
      --data "$body" \
      -o "$response" \
      -w "%{http_code}" \
      "$BASE$path" || true)"

    sha="$(printf "%s" "$body" | sha256sum | awk '{print $1}')"
    rsha="$(sha256sum "$response" 2>/dev/null | awk '{print $1}' || true)"

    printf '%s\n' \
      "{\"sanitized_probe_id\":\"probe_${probe_count}\",\"route_family\":\"public_runtime_gate_lock\",\"method\":\"$method\",\"status_code\":\"$code\",\"payload_sha256\":\"$sha\",\"payload_size\":${#body},\"response_sha256\":\"$rsha\",\"expected_gate_state\":\"fail_closed\",\"actual_result\":\"$code\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
      >> "$OUT/private-evidence.jsonl"

    if ok_status "$code"; then
      fail_closed_count=$((fail_closed_count + 1))
    else
      echo "VOID_RUNTIME_GATE_LOCK_VIOLATION_RED"
      echo "failed_method=$method"
      echo "failed_path=$path"
      echo "failed_status=$code"
      echo "private_evidence=$OUT/private-evidence.jsonl"
      exit 1
    fi
  done
done

echo "runtime_gate_lock_green=true"
echo "public_read_routes_checked=4"
echo "mutation_probes_checked=$probe_count"
echo "fail_closed_count=$fail_closed_count"
echo "private_evidence=$OUT/private-evidence.jsonl"
echo "VOID_RUNTIME_GATE_LOCK_V1_GREEN"
