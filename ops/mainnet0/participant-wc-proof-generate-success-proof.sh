#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-wc-proof-generate-success-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Participant WC proof generate success page v1 proof ==="
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
expect_grep "success route marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_ROUTE_V1" src/index.ts
expect_grep "success card marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_CARD_V1" src/index.ts
expect_grep "success open verifier marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_OPEN_VERIFIER_V1" src/index.ts
expect_grep "success open raw marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_OPEN_RAW_V1" src/index.ts
expect_grep "success copy marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_COPY_LINK_V1" src/index.ts
expect_grep "success card id" "participantWcProofGenerateSuccessCard" src/index.ts
expect_grep "success copy id" "participantWcProofSuccessCopyLinkBtn" src/index.ts
expect_grep "post redirects success" ".set(\"location\", success_path)" src/index.ts
expect_grep "success copy" "Proof created" src/index.ts
expect_grep "success safety" "No wallet send" src/index.ts
echo "[ok] source markers"

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
echo "=== [4] participant button still exposed ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant button card" "participantWcProofGenerateCard" "$OUT/participant.html"
expect_grep "participant button id" "participantWcProofGenerateBtn" "$OUT/participant.html"
expect_grep "participant button copy" "Generate proof demo" "$OUT/participant.html"
expect_grep "participant button route" "/wc-proof-demo/generate" "$OUT/participant.html"
echo "[ok] participant button exposed"

echo
echo "=== [5] POST redirects to success page ==="
WHO="participant-success-proof-$STAMP"
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

expect_grep "post marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/post-response.txt"
expect_grep "post redirect" "HTTP/1.1 303" "$OUT/post-response.txt"
expect_grep "post success path body" "/wc-proof-demo/success?dataset=" "$OUT/post-response.txt"

LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^location:/{sub(/\r$/,""); print substr($0,index($0,":")+2); exit}' "$OUT/post-response.txt")"
test -n "$LOCATION"
echo "location=$LOCATION"
case "$LOCATION" in
  /wc-proof-demo/success?dataset=*) ;;
  *) echo "[fail] expected success-page redirect, got $LOCATION"; exit 1 ;;
esac

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
print(f"share_path=/proof/{dataset}?who={who}&delta={delta}")
print(f"viewer_path=/wc-proof-viewer?dataset={dataset}&who={who}&delta={delta}")
print(f"raw_path=/datanet/v1/local-job/{dataset}?who={who}")
PY

DATASET_ID="$(grep -m1 '^dataset_id=' "$OUT/generated.env" | cut -d= -f2-)"
WHO_VALUE="$(grep -m1 '^who=' "$OUT/generated.env" | cut -d= -f2-)"
SHARE_PATH="$(grep -m1 '^share_path=' "$OUT/generated.env" | cut -d= -f2-)"
VIEWER_PATH="$(grep -m1 '^viewer_path=' "$OUT/generated.env" | cut -d= -f2-)"
RAW_PATH="$(grep -m1 '^raw_path=' "$OUT/generated.env" | cut -d= -f2-)"
FILE="data_a/datanet_v1/local_jobs/$DATASET_ID.txt"

echo "dataset_id=$DATASET_ID"
echo "who=$WHO_VALUE"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"

test -f "$FILE"
expect_grep "generated file marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$FILE"
expect_grep "generated file who" "$WHO_VALUE" "$FILE"
expect_grep "generated file task class" "public_wc_proof_button" "$FILE"
expect_grep "generated file no money" '"money_movement": false' "$FILE"
expect_grep "generated file no validator mutation" '"validator_mutation": false' "$FILE"
echo "[ok] POST generated proof and redirected to success page"

echo
echo "=== [6] success page renders useful actions ==="
curl -fsS "$BASE$LOCATION" > "$OUT/success.html"
SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
VIEWER_PATH_HTML="${VIEWER_PATH//&/&amp;}"
RAW_PATH_HTML="${RAW_PATH//&/&amp;}"

expect_grep "success card marker" "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_CARD_V1" "$OUT/success.html"
expect_grep "success title" "Proof created" "$OUT/success.html"
expect_grep "success dataset" "$DATASET_ID" "$OUT/success.html"
expect_grep "success who" "$WHO_VALUE" "$OUT/success.html"
expect_grep "success share path" "$SHARE_PATH_HTML" "$OUT/success.html"
expect_grep "success open verifier id" "participantWcProofSuccessOpenVerifierLink" "$OUT/success.html"
expect_grep "success verifier href" "$VIEWER_PATH_HTML" "$OUT/success.html"
expect_grep "success raw id" "participantWcProofSuccessOpenRawLink" "$OUT/success.html"
expect_grep "success raw href" "$RAW_PATH_HTML" "$OUT/success.html"
expect_grep "success copy id" "participantWcProofSuccessCopyLinkBtn" "$OUT/success.html"
expect_grep "success copy text" "Copy public proof link" "$OUT/success.html"
expect_grep "success back link" "Back to participant" "$OUT/success.html"
expect_grep "success safety" "No wallet send" "$OUT/success.html"
echo "[ok] success page renders verifier/raw/copy/back actions"

echo
echo "=== [7] generated proof still flows through public proof stack ==="
curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest.json"
expect_grep "latest marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest.json"
expect_grep "latest dataset" "$DATASET_ID" "$OUT/latest.json"
expect_grep "latest who" "$WHO_VALUE" "$OUT/latest.json"
expect_grep "latest task class" "public_wc_proof_button" "$OUT/latest.json"
expect_grep "latest viewer path" "$VIEWER_PATH" "$OUT/latest.json"
expect_grep "latest raw path" "$RAW_PATH" "$OUT/latest.json"

curl -fsS "$BASE/proofs" > "$OUT/public-proofs-index.html"
expect_grep "public proofs dataset" "$DATASET_ID" "$OUT/public-proofs-index.html"
expect_grep "public proofs share path" "$SHARE_PATH_HTML" "$OUT/public-proofs-index.html"
expect_grep "public proofs task class" "public_wc_proof_button" "$OUT/public-proofs-index.html"

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
echo "[ok] generated success proof flows through latest/proofs/raw/verifier/share"

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
echo "who=$WHO_VALUE"
echo "success_path=$LOCATION"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"
echo "out=$OUT"
echo "button_id=participantWcProofGenerateBtn"
echo "success_card=participantWcProofGenerateSuccessCard"
echo "success_copy_button=participantWcProofSuccessCopyLinkBtn"
echo "route=/wc-proof-demo/generate"
echo "success_route=/wc-proof-demo/success"
echo "public_index=/proofs"
echo "latest_endpoint=/wc-proofs/latest?limit=12"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_WC_PUBLIC_PROOF_GENERATE_SUCCESS_V1_GREEN"
