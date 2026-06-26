#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
mkdir -p .runtime/mainnet0

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT=".runtime/mainnet0/public-buyer-earner-status-rollup-after-ci-recovery-v1-proof.${STAMP}.json"
FIXTURE="fixtures/public/public-buyer-earner-status-rollup-after-ci-recovery-v1.json"

BASE="${BASE:-http://127.0.0.1:${HTTP_PORT:-4100}}"

fetch_json() {
  local route="$1"
  local file="$2"
  curl -fsS --max-time 20 "$BASE$route" > "$file"
}

set +e
fetch_json "/public-node/self-check-snapshot.json" ".runtime/mainnet0/public-buyer-earner-self-check.${STAMP}.json"
SELF_RC="$?"
fetch_json "/public-node/route-index.json" ".runtime/mainnet0/public-buyer-earner-route-index.${STAMP}.json"
ROUTE_INDEX_RC="$?"
fetch_json "/public-node/route-manifest.json" ".runtime/mainnet0/public-buyer-earner-route-manifest.${STAMP}.json"
ROUTE_MANIFEST_RC="$?"
set -e

FIXTURE_MARKER="$(jq -r '.marker' "$FIXTURE")"

SELF_MARKER="$(jq -r '.marker // ""' ".runtime/mainnet0/public-buyer-earner-self-check.${STAMP}.json" 2>/dev/null || true)"
SELF_POLICY_POST="$(jq -r 'if (.policy | type == "object" and has("public_post_endpoint")) then (.policy.public_post_endpoint|tostring) else "missing" end' ".runtime/mainnet0/public-buyer-earner-self-check.${STAMP}.json" 2>/dev/null || true)"

set +e
jq -e '.policy.public_post_endpoint == false' ".runtime/mainnet0/public-buyer-earner-self-check.${STAMP}.json" >/dev/null 2>&1
SELF_POLICY_POST_FALSE_RC="$?"
set -e

ROUTE_INDEX_HAS_BUY="$(grep -F '/public-node/usdc-void-buy-pool' ".runtime/mainnet0/public-buyer-earner-route-index.${STAMP}.json" >/dev/null 2>&1; echo $?)"
ROUTE_INDEX_HAS_WC="$(grep -F '/public-node/wc' ".runtime/mainnet0/public-buyer-earner-route-index.${STAMP}.json" >/dev/null 2>&1; echo $?)"
ROUTE_MANIFEST_HAS_SELF="$(grep -F '/public-node/self-check-snapshot.json' ".runtime/mainnet0/public-buyer-earner-route-manifest.${STAMP}.json" >/dev/null 2>&1; echo $?)"

INDEX_RC="$(bash tools/check_index_size.sh >/dev/null 2>&1; echo $?)"
LARGE_HISTORY_RC="$(bash tools/check_large_history_baseline.sh >/dev/null 2>&1; echo $?)"
TSC_BASELINE_RC="$(bash tools/check_tsc_noemit_baseline.sh >/dev/null 2>&1; echo $?)"

python3 - "$OUT" <<PY
import json, sys

out = sys.argv[1]
ok = all([
  "$FIXTURE_MARKER" == "VOID_PUBLIC_BUYER_EARNER_STATUS_ROLLUP_AFTER_CI_RECOVERY_V1",
  "$SELF_RC" == "0",
  "$ROUTE_INDEX_RC" == "0",
  "$ROUTE_MANIFEST_RC" == "0",
  "$SELF_MARKER" == "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
  "$SELF_POLICY_POST_FALSE_RC" == "0",
  "$ROUTE_MANIFEST_HAS_SELF" == "0",
  "$INDEX_RC" == "0",
  "$LARGE_HISTORY_RC" == "0",
  "$TSC_BASELINE_RC" == "0"
])

data = {
  "marker": "VOID_PUBLIC_BUYER_EARNER_STATUS_ROLLUP_AFTER_CI_RECOVERY_V1_GREEN" if ok else "VOID_PUBLIC_BUYER_EARNER_STATUS_ROLLUP_AFTER_CI_RECOVERY_V1_RED",
  "fixture_marker": "$FIXTURE_MARKER",
  "base": "$BASE",
  "checks": {
    "self_check_reachable": "$SELF_RC" == "0",
    "route_index_reachable": "$ROUTE_INDEX_RC" == "0",
    "route_manifest_reachable": "$ROUTE_MANIFEST_RC" == "0",
    "self_check_marker": "$SELF_MARKER",
    "self_check_marker_ok": "$SELF_MARKER" == "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
    "self_check_public_post_endpoint_value": "$SELF_POLICY_POST",
    "self_check_public_post_endpoint_false_rc": int("$SELF_POLICY_POST_FALSE_RC"),
    "self_check_public_post_endpoint_false": "$SELF_POLICY_POST_FALSE_RC" == "0",
    "route_index_has_buy_pool_hint": "$ROUTE_INDEX_HAS_BUY" == "0",
    "route_index_has_wc_hint": "$ROUTE_INDEX_HAS_WC" == "0",
    "route_manifest_has_self_check": "$ROUTE_MANIFEST_HAS_SELF" == "0",
    "guard_rc": {
      "index_size": int("$INDEX_RC"),
      "large_history_baseline": int("$LARGE_HISTORY_RC"),
      "tsc_noemit_baseline": int("$TSC_BASELINE_RC")
    }
  },
  "boundary": {
    "public_read_only": True,
    "status_rollup_only": True,
    "buyer_mutation_enabled": False,
    "wc_issuance_enabled": False,
    "wc_ledger_write_enabled": False,
    "wallet_send_enabled": False,
    "automatic_fulfillment_enabled": False,
    "validator_mutation_enabled": False
  }
}

with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\\n")

print(out)
print(json.dumps(data, indent=2))
PY

jq -e '.marker == "VOID_PUBLIC_BUYER_EARNER_STATUS_ROLLUP_AFTER_CI_RECOVERY_V1_GREEN"' "$OUT" >/dev/null
