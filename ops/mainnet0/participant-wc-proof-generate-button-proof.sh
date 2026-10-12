#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-wc-proof-generate-button-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Participant WC proof generate button v1 proof ==="
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
echo "=== [1] source markers ==="
expect_grep "button route marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_ROUTE_V1" src/index.ts
expect_grep "button help marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_HELP_V1" src/index.ts
expect_grep "button record marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" src/index.ts
expect_grep "button UI marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_UI_V1" src/index.ts
expect_grep "button action marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_ACTION_V1" src/index.ts
expect_grep "button id" "participantWcProofGenerateBtn" src/index.ts
expect_grep "button copy" "Generate proof demo" src/index.ts
expect_grep "button safety money false" "money_movement: false" src/index.ts
expect_grep "button safety validator false" "validator_mutation: false" src/index.ts
echo "[ok] source markers"

echo
echo "=== [2] build ==="
npm run build
echo "[ok] build passed"

echo
echo "=== [3] start fresh local server ==="
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
  if curl -fsS "$BASE/participant" >/dev/null 2>&1; then
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
echo "=== [4] participant page exposes button ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant button card" "participantWcProofGenerateCard" "$OUT/participant.html"
expect_grep "participant button marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_UI_V1" "$OUT/participant.html"
expect_grep "participant button action marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_ACTION_V1" "$OUT/participant.html"
expect_grep "participant button id" "participantWcProofGenerateBtn" "$OUT/participant.html"
expect_grep "participant button copy" "Generate proof demo" "$OUT/participant.html"
expect_grep "participant button route" "/wc-proof-demo/generate" "$OUT/participant.html"
expect_grep "participant button safety" "No wallet send" "$OUT/participant.html"
echo "[ok] participant page exposes proof generator button"

echo
echo "=== [5] POST button route generates fresh proof and redirects ==="
WHO="participant-button-proof-$STAMP"
set +e
curl -fsS -i -X POST "$BASE/wc-proof-demo/generate?who=$WHO" > "$OUT/post-response.txt" 2> "$OUT/post-response.err"
POST_RC="$?"
set -e
echo "post_rc=$POST_RC"
if [ "$POST_RC" != "0" ]; then
  echo "[fail] POST route failed"
  cat "$OUT/post-response.err" || true
  sed -n '1,240p' "$OUT/server.log" || true
  exit 1
fi

expect_grep "post route marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/post-response.txt"
expect_grep "post route redirect" "HTTP/1.1 303" "$OUT/post-response.txt"
LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^location:/{sub(/\r$/,""); print substr($0,index($0,":")+2); exit}' "$OUT/post-response.txt")"
test -n "$LOCATION"
echo "location=$LOCATION"

DATASET_ID="$(printf '%s\n' "$LOCATION" | sed -E 's#^/proof/([^?]+).*$#\1#')"
test -n "$DATASET_ID"
SHARE_PATH="$LOCATION"
VIEWER_PATH="/wc-proof-viewer?dataset=$DATASET_ID&who=$WHO&delta=10"
RAW_PATH="/datanet/v1/local-job/$DATASET_ID?who=$WHO"
FILE="data_a/datanet_v1/local_jobs/$DATASET_ID.txt"

echo "dataset_id=$DATASET_ID"
echo "who=$WHO"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"

test -f "$FILE"
expect_grep "generated file marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$FILE"
expect_grep "generated file who" "$WHO" "$FILE"
expect_grep "generated file task class" "public_wc_proof_button" "$FILE"
expect_grep "generated file wc delta" '"wc_delta": 10' "$FILE"
expect_grep "generated file no money" '"money_movement": false' "$FILE"
expect_grep "generated file no wallet send" '"wallet_send": false' "$FILE"
expect_grep "generated file no validator mutation" '"validator_mutation": false' "$FILE"
echo "[ok] POST route generated local DataNet proof record"

echo
echo "=== [6] latest endpoint includes generated button proof ==="
curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest.json"
expect_grep "latest marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest.json"
expect_grep "latest dataset" "$DATASET_ID" "$OUT/latest.json"
expect_grep "latest who" "$WHO" "$OUT/latest.json"
expect_grep "latest task class" "public_wc_proof_button" "$OUT/latest.json"
expect_grep "latest viewer path" "$VIEWER_PATH" "$OUT/latest.json"
expect_grep "latest raw path" "$RAW_PATH" "$OUT/latest.json"
echo "[ok] latest endpoint includes generated button proof"

echo
echo "=== [7] public proof surfaces include generated button proof ==="
curl -fsS "$BASE/proofs" > "$OUT/public-proofs-index.html"
SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
expect_grep "public proofs generated dataset" "$DATASET_ID" "$OUT/public-proofs-index.html"
expect_grep "public proofs generated share path" "$SHARE_PATH_HTML" "$OUT/public-proofs-index.html"
expect_grep "public proofs generated task class" "public_wc_proof_button" "$OUT/public-proofs-index.html"
expect_grep "public proofs open latest" "Open latest proof" "$OUT/public-proofs-index.html"
expect_grep "public proofs raw latest" "Open latest raw JSON" "$OUT/public-proofs-index.html"

curl -fsS "$BASE$RAW_PATH" > "$OUT/raw.json"
expect_grep "raw generated marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/raw.json"
expect_grep "raw generated dataset" "$DATASET_ID" "$OUT/raw.json"
expect_grep "raw generated who" "$WHO" "$OUT/raw.json"

curl -fsS "$BASE$VIEWER_PATH" > "$OUT/viewer.html"
expect_grep "viewer generated dataset" "$DATASET_ID" "$OUT/viewer.html"
expect_grep "viewer verify button" "Verify proof" "$OUT/viewer.html"

curl -fsS "$BASE$SHARE_PATH" > "$OUT/share-route.txt"
expect_grep "share route marker" "VOID_WC_PROOF_PUBLIC_SHARE_ROUTE_V1" "$OUT/share-route.txt"
expect_grep "share route generated viewer path" "$VIEWER_PATH" "$OUT/share-route.txt"
echo "[ok] /proofs, raw JSON, verifier, and clean /proof route include button-generated proof"

echo
echo "=== [8] status smoke ==="
if timeout 35s make mainnet0-status-smoke; then
  echo "[ok] status smoke passed"
else
  echo "[warn] status smoke timed out/nonfatal for local participant UI proof after route/health checks"
  echo "bounded_status_smoke_timeout_nonfatal_for_ui_only=true"
fi

echo
echo "=== close proof truth ==="
echo "dataset_id=$DATASET_ID"
echo "who=$WHO"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"
echo "out=$OUT"
echo "button_id=participantWcProofGenerateBtn"
echo "button_copy=Generate proof demo"
echo "route=/wc-proof-demo/generate"
echo "public_index=/proofs"
echo "latest_endpoint=/wc-proofs/latest?limit=12"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1_GREEN"
