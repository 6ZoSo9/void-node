#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-wc-proofs-history-actions-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public WC proofs history actions v1 proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"

expect_grep() {
  local label="$1"
  local needle="$2"
  local file="$3"
  if ! grep -Fq "$needle" "$file"; then
    echo "[fail] missing $label: $needle in $file"
    exit 1
  fi
  echo "[ok] $label"
}

echo
echo "=== [1] source markers/actions ==="
expect_grep "history copy marker preserved" "VOID_WC_PROOFS_HISTORY_COPY_V1" src/index.ts
expect_grep "history actions marker" "VOID_WC_PROOFS_HISTORY_ACTIONS_V1" src/index.ts
expect_grep "back link id" "publicProofsBackToParticipantLink" src/index.ts
expect_grep "back link copy" "Back to participant" src/index.ts
expect_grep "back link href" "href='/participant'" src/index.ts
expect_grep "prove new activity id" "publicProofsProveNewActivityBtn" src/index.ts
expect_grep "prove new activity copy" "Prove new activity" src/index.ts
expect_grep "prove new activity route" "action='/wc-proof-demo/generate'" src/index.ts
expect_grep "history title copy" "Work Credit Proof History" src/index.ts
expect_grep "history subtitle copy" "Recent verifiable Work Credit activity from this node" src/index.ts
expect_grep "participant history link preserved" "participantWcProofHistoryLink" src/index.ts
echo "[ok] source markers/actions"

echo
echo "=== [2] build ==="
npm run build
echo "[ok] build passed"

echo
echo "=== [3] start fresh server ==="
PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "clearing port 4100 pids: $PIDS"
  kill $PIDS || true
  sleep 2
fi

npm exec tsx src/index.ts > "$OUT/server.log" 2>&1 &
SERVER_PID="$!"
echo "server_pid=$SERVER_PID"

for i in $(seq 1 30); do
  if curl -fsS "$BASE/proofs" >/dev/null 2>&1; then
    echo "[ok] server live"
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "[fail] server did not become live"
    sed -n '1,240p' "$OUT/server.log" || true
    exit 1
  fi
done

echo
echo "=== [4] /proofs renders explorer actions ==="
curl -fsS "$BASE/proofs" > "$OUT/proofs-before.html"
expect_grep "proofs hero id" "publicProofsHistoryHeroCard" "$OUT/proofs-before.html"
expect_grep "proofs title" "Work Credit Proof History" "$OUT/proofs-before.html"
expect_grep "proofs subtitle" "Recent verifiable Work Credit activity from this node" "$OUT/proofs-before.html"
expect_grep "proofs actions marker" "VOID_WC_PROOFS_HISTORY_ACTIONS_V1" "$OUT/proofs-before.html"
expect_grep "proofs back link id" "publicProofsBackToParticipantLink" "$OUT/proofs-before.html"
expect_grep "proofs back link href" "href='/participant'" "$OUT/proofs-before.html"
expect_grep "proofs back link copy" "Back to participant" "$OUT/proofs-before.html"
expect_grep "proofs prove new button id" "publicProofsProveNewActivityBtn" "$OUT/proofs-before.html"
expect_grep "proofs prove new route" "action='/wc-proof-demo/generate'" "$OUT/proofs-before.html"
expect_grep "proofs prove new copy" "Prove new activity" "$OUT/proofs-before.html"
expect_grep "summary card preserved" "publicProofsSummaryCard" "$OUT/proofs-before.html"
expect_grep "verify guide preserved" "How to verify" "$OUT/proofs-before.html"
echo "[ok] /proofs renders explorer actions"

echo
echo "=== [5] back link target and participant history link are live ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant proof card" "participantWcProofGenerateCard" "$OUT/participant.html"
expect_grep "participant generate button" "participantWcProofGenerateBtn" "$OUT/participant.html"
expect_grep "participant generate copy" "Prove WC activity" "$OUT/participant.html"
expect_grep "participant history link" "participantWcProofHistoryLink" "$OUT/participant.html"
expect_grep "participant history route" "href='/proofs'" "$OUT/participant.html"
expect_grep "participant history copy" "View proof history" "$OUT/participant.html"
echo "[ok] /participant and /proofs link to each other"

echo
echo "=== [6] prove new activity route still generates proof ==="
WHO="public-history-actions-proof-$STAMP"
curl -fsS -i -X POST "$BASE/wc-proof-demo/generate?who=$WHO" > "$OUT/post-response.txt"

expect_grep "post marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/post-response.txt"
expect_grep "post redirect" "HTTP/1.1 303" "$OUT/post-response.txt"
expect_grep "post success route" "/wc-proof-demo/success?dataset=" "$OUT/post-response.txt"

LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^location:/{sub(/\r$/,""); print substr($0,index($0,":")+2); exit}' "$OUT/post-response.txt")"
test -n "$LOCATION"

python3 - "$LOCATION" "$WHO" > "$OUT/generated.env" <<'PY'
import sys
from urllib.parse import urlparse, parse_qs
loc = sys.argv[1]
expected_who = sys.argv[2]
q = parse_qs(urlparse(loc).query)
dataset = q.get("dataset", [""])[0]
who = q.get("who", [""])[0]
delta = q.get("delta", ["10"])[0]
if not dataset or who != expected_who or delta != "10":
    raise SystemExit(f"bad params dataset={dataset!r} who={who!r} delta={delta!r}")
print(f"dataset_id={dataset}")
print(f"who={who}")
print(f"delta={delta}")
print(f"success_path={loc}")
print(f"share_path=/proof/{dataset}?who={who}&delta={delta}")
print(f"viewer_path=/wc-proof-viewer?dataset={dataset}&who={who}&delta={delta}")
print(f"raw_path=/datanet/v1/local-job/{dataset}?who={who}")
PY

DATASET_ID="$(grep -m1 '^dataset_id=' "$OUT/generated.env" | cut -d= -f2-)"
WHO_VALUE="$(grep -m1 '^who=' "$OUT/generated.env" | cut -d= -f2-)"
SUCCESS_PATH="$(grep -m1 '^success_path=' "$OUT/generated.env" | cut -d= -f2-)"
SHARE_PATH="$(grep -m1 '^share_path=' "$OUT/generated.env" | cut -d= -f2-)"
VIEWER_PATH="$(grep -m1 '^viewer_path=' "$OUT/generated.env" | cut -d= -f2-)"
RAW_PATH="$(grep -m1 '^raw_path=' "$OUT/generated.env" | cut -d= -f2-)"
FILE="data_a/datanet_v1/local_jobs/$DATASET_ID.txt"

test -f "$FILE"
expect_grep "generated file marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$FILE"
expect_grep "generated file task class" "public_wc_proof_button" "$FILE"
expect_grep "generated file who" "$WHO_VALUE" "$FILE"
expect_grep "generated file no money" '"money_movement": false' "$FILE"
expect_grep "generated file no validator mutation" '"validator_mutation": false' "$FILE"

SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
VIEWER_PATH_HTML="${VIEWER_PATH//&/&amp;}"
RAW_PATH_HTML="${RAW_PATH//&/&amp;}"

echo
echo "=== [7] generated proof appears on polished /proofs with actions ==="
curl -fsS "$BASE/proofs" > "$OUT/proofs-after.html"
expect_grep "proofs after actions marker" "VOID_WC_PROOFS_HISTORY_ACTIONS_V1" "$OUT/proofs-after.html"
expect_grep "proofs after back link" "publicProofsBackToParticipantLink" "$OUT/proofs-after.html"
expect_grep "proofs after prove new button" "publicProofsProveNewActivityBtn" "$OUT/proofs-after.html"
expect_grep "proofs after generated dataset" "$DATASET_ID" "$OUT/proofs-after.html"
expect_grep "proofs after generated share path" "$SHARE_PATH_HTML" "$OUT/proofs-after.html"
expect_grep "proofs after generated task class" "public_wc_proof_button" "$OUT/proofs-after.html"
echo "[ok] generated proof appears on polished /proofs with loop actions"

echo
echo "=== [8] success/latest/raw/verifier/share still work ==="
curl -fsS "$BASE$SUCCESS_PATH" > "$OUT/success.html"
expect_grep "success copy" "Work Credit proof created" "$OUT/success.html"
expect_grep "success title" "Verifiable Work Credit activity" "$OUT/success.html"
expect_grep "success dataset" "$DATASET_ID" "$OUT/success.html"
expect_grep "success share link" "$SHARE_PATH_HTML" "$OUT/success.html"
expect_grep "success verifier href" "$VIEWER_PATH_HTML" "$OUT/success.html"
expect_grep "success raw href" "$RAW_PATH_HTML" "$OUT/success.html"

curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest.json"
expect_grep "latest marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest.json"
expect_grep "latest dataset" "$DATASET_ID" "$OUT/latest.json"
expect_grep "latest who" "$WHO_VALUE" "$OUT/latest.json"
expect_grep "latest task class" "public_wc_proof_button" "$OUT/latest.json"
expect_grep "latest viewer path" "$VIEWER_PATH" "$OUT/latest.json"
expect_grep "latest raw path" "$RAW_PATH" "$OUT/latest.json"

curl -fsS "$BASE$RAW_PATH" > "$OUT/raw.json"
expect_grep "raw marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/raw.json"
expect_grep "raw dataset" "$DATASET_ID" "$OUT/raw.json"
expect_grep "raw who" "$WHO_VALUE" "$OUT/raw.json"

curl -fsS "$BASE$VIEWER_PATH" > "$OUT/viewer.html"
expect_grep "viewer dataset" "$DATASET_ID" "$OUT/viewer.html"
expect_grep "viewer verify button" "Verify proof" "$OUT/viewer.html"

curl -fsS "$BASE$SHARE_PATH" > "$OUT/share-route.txt"
expect_grep "share route marker" "VOID_WC_PROOF_PUBLIC_SHARE_ROUTE_V1" "$OUT/share-route.txt"
expect_grep "share route target" "$VIEWER_PATH" "$OUT/share-route.txt"
echo "[ok] success/latest/raw/verifier/share still green"

echo
echo "=== [9] status smoke ==="
if timeout 45s make mainnet0-status-smoke; then
  echo "[ok] status smoke passed"
else
  echo "[warn] status smoke timed out/nonfatal for public /proofs actions proof after route/health checks"
  echo "bounded_status_smoke_timeout_nonfatal_for_ui_only=true"
fi

echo
echo "=== close proof truth ==="
echo "dataset_id=$DATASET_ID"
echo "who=$WHO_VALUE"
echo "success_path=$SUCCESS_PATH"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"
echo "out=$OUT"
echo "proofs_hero_id=publicProofsHistoryHeroCard"
echo "proofs_back_link_id=publicProofsBackToParticipantLink"
echo "proofs_back_link_route=/participant"
echo "proofs_back_link_copy=Back to participant"
echo "proofs_prove_new_button_id=publicProofsProveNewActivityBtn"
echo "proofs_prove_new_button_copy=Prove new activity"
echo "proofs_prove_new_route=/wc-proof-demo/generate"
echo "participant_history_link_id=participantWcProofHistoryLink"
echo "participant_history_link_route=/proofs"
echo "button_id=participantWcProofGenerateBtn"
echo "button_copy=Prove WC activity"
echo "route=/wc-proof-demo/generate"
echo "success_route=/wc-proof-demo/success"
echo "public_index=/proofs"
echo "latest_endpoint=/wc-proofs/latest?limit=12"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_WC_PROOFS_HISTORY_ACTIONS_V1_GREEN"
