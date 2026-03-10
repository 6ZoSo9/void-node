#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[FAIL] missing command: $1"; exit 1; }; }
need curl
need jq
need rg

q() {
  local expr="$1"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$expr"
}

val() {
  jq -r '.data.result[0].value[1] // empty'
}

echo "=== [1] health ==="
H="$(curl -fsS "$BASE/health")"
echo "$H"
echo "$H" | jq -e '.ok == true and (.http|tostring) == "4100"' >/dev/null

echo
echo "=== [2] demo ai status (pre) ==="
S1="$(curl -fsS "$BASE/__void/demo/ai-status")"
echo "$S1"
echo "$S1" | jq -e '.ok == true and .health == true and .gates.agentAdvance30m == 1 and .gates.datanetPersistOk == 1 and .gates.aiPillarOk == 1' >/dev/null

PRE_AWARDED="$(echo "$S1" | jq -r '.wc.awardedTotal // 0')"

echo
echo "=== [3] run agent e2e demo ==="
bash ops/agent-e2e-demo.sh

echo
echo "=== [4] demo ai status (post) ==="
S2="$(curl -fsS "$BASE/__void/demo/ai-status")"
echo "$S2"
echo "$S2" | jq -e '.ok == true and .health == true and .gates.agentAdvance30m == 1 and .gates.datanetPersistOk == 1 and .gates.aiPillarOk == 1' >/dev/null

POST_AWARDED="$(echo "$S2" | jq -r '.wc.awardedTotal // 0')"
POST_UNIQUE5="$(echo "$S2" | jq -r '.wc.unique5m // 0')"
POST_OK5="$(echo "$S2" | jq -r '.wc.ok5m // 0')"

python3 - "$PRE_AWARDED" "$POST_AWARDED" "$POST_UNIQUE5" "$POST_OK5" <<'PY'
import sys
pre = int(float(sys.argv[1]))
post = int(float(sys.argv[2]))
u5 = int(float(sys.argv[3]))
ok5 = int(float(sys.argv[4]))
if post < pre + 3:
    raise SystemExit(f"[FAIL] awardedTotal did not advance by at least 3 (pre={pre} post={post})")
if u5 < 3:
    raise SystemExit(f"[FAIL] unique5m < 3 (got {u5})")
if ok5 != 1:
    raise SystemExit(f"[FAIL] ok5m != 1 (got {ok5})")
print(f"[ok] wc advanced pre={pre} post={post} delta={post-pre}")
PY

echo
echo "=== [5] pinned prom gates ==="
for expr in \
  'void:agent_wc_awards:adv_30m:last' \
  'void:datanet_receipts:persist:ok:last_5m' \
  'void:mainnet_ai_pillar_ok:last_5m'
do
  echo "--- $expr"
  R="$(q "$expr")"
  echo "$R"
  V="$(echo "$R" | val)"
  [ "$V" = "1" ] || { echo "[FAIL] prom gate not 1: $expr => ${V:-<empty>}"; exit 1; }
done

echo
echo "PASS"
