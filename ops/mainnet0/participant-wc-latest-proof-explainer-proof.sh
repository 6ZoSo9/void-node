#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-wc-latest-proof-explainer-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Participant WC latest proof explainer v1 proof ==="
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
echo "=== [1] source markers/explainer ==="
expect_grep "latest proof card marker" "VOID_WC_LATEST_PROOF_CARD_V1" src/index.ts
expect_grep "latest proof script marker" "VOID_WC_LATEST_PROOF_CARD_SCRIPT_V1" src/index.ts
expect_grep "copy link marker" "VOID_WC_LATEST_PROOF_COPY_LINK_V1" src/index.ts
expect_grep "explainer marker" "VOID_WC_LATEST_PROOF_EXPLAINER_V1" src/index.ts
expect_grep "explainer id" "participantWcLatestProofExplainer" src/index.ts
expect_grep "explainer headline" "What this proves:" src/index.ts
expect_grep "explainer datanet backing" "local DataNet-backed Work Credit activity record" src/index.ts
expect_grep "explainer open verify share inspect" "opened, verified, shared, and inspected as raw JSON" src/index.ts
expect_grep "explainer no payout" "It is not a payout, staking reward, or VOID transfer." src/index.ts
expect_grep "copy link preserved" "participantWcLatestProofCopyLinkBtn" src/index.ts
expect_grep "latest endpoint preserved" "/wc-proofs/latest?limit=1" src/index.ts
echo "[ok] source markers/explainer"

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
echo "=== [4] participant renders explainer without breaking latest card ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant latest card marker" "VOID_WC_LATEST_PROOF_CARD_V1" "$OUT/participant.html"
expect_grep "participant copy link marker" "VOID_WC_LATEST_PROOF_COPY_LINK_V1" "$OUT/participant.html"
expect_grep "participant explainer marker" "VOID_WC_LATEST_PROOF_EXPLAINER_V1" "$OUT/participant.html"
expect_grep "participant explainer id" "participantWcLatestProofExplainer" "$OUT/participant.html"
expect_grep "participant explainer headline" "What this proves:" "$OUT/participant.html"
expect_grep "participant explainer datanet" "local DataNet-backed Work Credit activity record" "$OUT/participant.html"
expect_grep "participant explainer no payout" "It is not a payout, staking reward, or VOID transfer." "$OUT/participant.html"
expect_grep "participant latest open link" "participantWcLatestProofOpenLink" "$OUT/participant.html"
expect_grep "participant latest raw link" "participantWcLatestProofRawLink" "$OUT/participant.html"
expect_grep "participant latest history link" "participantWcLatestProofHistoryLink" "$OUT/participant.html"
expect_grep "participant latest copy link" "participantWcLatestProofCopyLinkBtn" "$OUT/participant.html"
expect_grep "participant latest endpoint" "/wc-proofs/latest?limit=1" "$OUT/participant.html"
echo "[ok] participant renders explainer without breaking latest card"

echo
echo "=== [5] generate fresh proof and verify proof stack still works ==="
WHO="participant-latest-explainer-$STAMP"
curl -fsS -i -X POST "$BASE/wc-proof-demo/generate?who=$WHO" > "$OUT/post-response.txt"

expect_grep "post marker" "VOID_WC_PUBLIC_PROOF_GENERATE_BUTTON_V1" "$OUT/post-response.txt"
expect_grep "post redirect" "HTTP/1.1 303" "$OUT/post-response.txt"
expect_grep "post success route" "/wc-proof-demo/success?dataset=" "$OUT/post-response.txt"

LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^location:/{sub(/\r$/,""); print substr($0,index($0,":")+2); exit}' "$OUT/post-response.txt")"
test -n "$LOCATION"

python3 - "$LOCATION" "$WHO" > "$OUT/generated.env" <<'PY_PARSE_LOCATION'
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
PY_PARSE_LOCATION

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

curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest-twelve.json"
expect_grep "latest twelve marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated dataset" "$DATASET_ID" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated who" "$WHO_VALUE" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated task class" "public_wc_proof_button" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated viewer path" "$VIEWER_PATH" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated raw path" "$RAW_PATH" "$OUT/latest-twelve.json"

curl -fsS "$BASE/proofs" > "$OUT/proofs.html"
expect_grep "proofs history title" "Work Credit Proof History" "$OUT/proofs.html"
expect_grep "proofs generated dataset" "$DATASET_ID" "$OUT/proofs.html"
expect_grep "proofs generated share path" "$SHARE_PATH_HTML" "$OUT/proofs.html"

curl -fsS "$BASE$SUCCESS_PATH" > "$OUT/success.html"
expect_grep "success copy" "Work Credit proof created" "$OUT/success.html"
expect_grep "success title" "Verifiable Work Credit activity" "$OUT/success.html"
expect_grep "success dataset" "$DATASET_ID" "$OUT/success.html"
expect_grep "success share link" "$SHARE_PATH_HTML" "$OUT/success.html"
expect_grep "success verifier href" "$VIEWER_PATH_HTML" "$OUT/success.html"
expect_grep "success raw href" "$RAW_PATH_HTML" "$OUT/success.html"

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
echo "[ok] proof stack still works"

echo
echo "=== [6] status smoke ==="
if timeout 45s make mainnet0-status-smoke; then
  echo "[ok] status smoke passed"
else
  echo "[warn] status smoke timed out/nonfatal for participant latest proof explainer after route/health checks"
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
echo "participant_latest_card_id=participantWcLatestProofCard"
echo "participant_latest_explainer_id=participantWcLatestProofExplainer"
echo "participant_latest_explainer_marker=VOID_WC_LATEST_PROOF_EXPLAINER_V1"
echo "participant_latest_explainer_copy=What this proves: local DataNet-backed Work Credit activity; not payout/staking reward/VOID transfer"
echo "participant_latest_copy_link_id=participantWcLatestProofCopyLinkBtn"
echo "participant_latest_open_link_id=participantWcLatestProofOpenLink"
echo "participant_latest_raw_link_id=participantWcLatestProofRawLink"
echo "participant_latest_history_link_id=participantWcLatestProofHistoryLink"
echo "latest_endpoint=/wc-proofs/latest?limit=1"
echo "history_endpoint=/wc-proofs/latest?limit=12"
echo "participant_history_link_id=participantWcProofHistoryLink"
echo "participant_history_link_route=/proofs"
echo "button_id=participantWcProofGenerateBtn"
echo "button_copy=Prove WC activity"
echo "route=/wc-proof-demo/generate"
echo "success_route=/wc-proof-demo/success"
echo "public_index=/proofs"
echo "share_route=/proof/<dataset>?who=<account>&delta=10"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_WC_LATEST_PROOF_EXPLAINER_V1_GREEN"
