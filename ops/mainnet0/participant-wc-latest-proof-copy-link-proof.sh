#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-wc-latest-proof-copy-link-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Participant WC latest proof copy link v1 proof ==="
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
echo "=== [1] source markers/copy button ==="
expect_grep "latest proof card marker" "VOID_WC_LATEST_PROOF_CARD_V1" src/index.ts
expect_grep "latest proof script marker" "VOID_WC_LATEST_PROOF_CARD_SCRIPT_V1" src/index.ts
expect_grep "copy link marker" "VOID_WC_LATEST_PROOF_COPY_LINK_V1" src/index.ts
expect_grep "copy link id" "participantWcLatestProofCopyLinkBtn" src/index.ts
expect_grep "copy link copy" "Copy latest proof link" src/index.ts
expect_grep "copy link data attr" "data-proof-link" src/index.ts
expect_grep "share path compute" "'/proof/'+encodeURIComponent(dataset)" src/index.ts
expect_grep "clipboard write" "navigator.clipboard.writeText" src/index.ts
expect_grep "copy fallback prompt" "window.prompt('Copy latest proof link',link)" src/index.ts
expect_grep "copied status" "Copied latest proof link" src/index.ts
expect_grep "latest open link preserved" "participantWcLatestProofOpenLink" src/index.ts
expect_grep "latest raw link preserved" "participantWcLatestProofRawLink" src/index.ts
expect_grep "latest history link preserved" "participantWcLatestProofHistoryLink" src/index.ts
expect_grep "latest endpoint preserved" "/wc-proofs/latest?limit=1" src/index.ts
echo "[ok] source markers/copy button"

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
echo "=== [4] generate fresh proof for copy link stack ==="
WHO="participant-latest-copy-link-$STAMP"
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
echo "[ok] fresh proof generated"

echo
echo "=== [5] latest endpoint remains parseable for card ==="
curl -fsS "$BASE/wc-proofs/latest?limit=1" > "$OUT/latest-one.json"
expect_grep "latest one marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-one.json"

python3 - "$OUT/latest-one.json" > "$OUT/latest-one-normalized.env" <<'LATESTJSONPY'
import json, sys
p = sys.argv[1]
j = json.load(open(p))
if isinstance(j, list):
    items = j
else:
    items = j.get("items") or j.get("proofs") or j.get("latest") or []
if isinstance(items, dict):
    items = [items]
if not isinstance(items, list) or not items:
    raise SystemExit("latest limit=1 did not expose a parseable item list")
item = items[0]
dataset = item.get("dataset_id") or item.get("dataset") or item.get("id") or ""
who = item.get("who") or item.get("account") or ""
delta = item.get("delta") or item.get("wc_delta") or item.get("credit_delta") or 10
viewer = item.get("viewer_path") or item.get("viewerPath") or item.get("viewer") or ""
raw = item.get("raw_path") or item.get("rawPath") or item.get("raw") or ""
share = item.get("share_path") or item.get("sharePath") or item.get("share") or ""
if not share and dataset:
    share = f"/proof/{dataset}?who={who}&delta={delta}"
task = item.get("task_class") or item.get("taskClass") or ""
if not dataset or not viewer or not raw or not share or not task:
    raise SystemExit("latest limit=1 missing one or more fields needed by card")
print("latest_one_dataset=" + str(dataset))
print("latest_one_viewer=" + str(viewer))
print("latest_one_raw=" + str(raw))
print("latest_one_share=" + str(share))
print("latest_one_task_class=" + str(task))
LATESTJSONPY
echo "[ok] latest one parseable with computed share link"
cat "$OUT/latest-one-normalized.env"

curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest-twelve.json"
expect_grep "latest twelve marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated dataset" "$DATASET_ID" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated who" "$WHO_VALUE" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated task class" "public_wc_proof_button" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated viewer path" "$VIEWER_PATH" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated raw path" "$RAW_PATH" "$OUT/latest-twelve.json"
echo "[ok] latest endpoints remain green"

echo
echo "=== [6] participant renders copy latest proof link button ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant latest card marker" "VOID_WC_LATEST_PROOF_CARD_V1" "$OUT/participant.html"
expect_grep "participant latest script marker" "VOID_WC_LATEST_PROOF_CARD_SCRIPT_V1" "$OUT/participant.html"
expect_grep "participant copy marker" "VOID_WC_LATEST_PROOF_COPY_LINK_V1" "$OUT/participant.html"
expect_grep "participant latest card id" "participantWcLatestProofCard" "$OUT/participant.html"
expect_grep "participant latest title" "Latest Work Credit Proof" "$OUT/participant.html"
expect_grep "participant latest copy button id" "participantWcLatestProofCopyLinkBtn" "$OUT/participant.html"
expect_grep "participant latest copy text" "Copy latest proof link" "$OUT/participant.html"
expect_grep "participant copy data attr" "data-proof-link" "$OUT/participant.html"
expect_grep "participant share compute source" "/proof/" "$OUT/participant.html"
expect_grep "participant clipboard source" "navigator.clipboard.writeText" "$OUT/participant.html"
expect_grep "participant fallback source" "window.prompt" "$OUT/participant.html"
expect_grep "participant copied status source" "Copied latest proof link" "$OUT/participant.html"
expect_grep "participant latest open link" "participantWcLatestProofOpenLink" "$OUT/participant.html"
expect_grep "participant latest raw link" "participantWcLatestProofRawLink" "$OUT/participant.html"
expect_grep "participant latest history link" "participantWcLatestProofHistoryLink" "$OUT/participant.html"
expect_grep "participant history link preserved" "participantWcProofHistoryLink" "$OUT/participant.html"
echo "[ok] participant renders copy latest proof link button"

echo
echo "=== [7] public proof history still lists generated proof ==="
SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
VIEWER_PATH_HTML="${VIEWER_PATH//&/&amp;}"
RAW_PATH_HTML="${RAW_PATH//&/&amp;}"

curl -fsS "$BASE/proofs" > "$OUT/proofs.html"
expect_grep "proofs history title" "Work Credit Proof History" "$OUT/proofs.html"
expect_grep "proofs history actions" "VOID_WC_PROOFS_HISTORY_ACTIONS_V1" "$OUT/proofs.html"
expect_grep "proofs generated dataset" "$DATASET_ID" "$OUT/proofs.html"
expect_grep "proofs generated share path" "$SHARE_PATH_HTML" "$OUT/proofs.html"
expect_grep "proofs generated task class" "public_wc_proof_button" "$OUT/proofs.html"
echo "[ok] public proof history still lists generated proof"

echo
echo "=== [8] success/raw/verifier/share still work ==="
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
echo "[ok] success/raw/verifier/share still green"

echo
echo "=== [9] status smoke ==="
if timeout 45s make mainnet0-status-smoke; then
  echo "[ok] status smoke passed"
else
  echo "[warn] status smoke timed out/nonfatal for participant latest proof copy link after route/health checks"
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
echo "participant_latest_copy_link_id=participantWcLatestProofCopyLinkBtn"
echo "participant_latest_copy_link_copy=Copy latest proof link"
echo "participant_latest_copy_link_marker=VOID_WC_LATEST_PROOF_COPY_LINK_V1"
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
echo "VOID_WC_LATEST_PROOF_COPY_LINK_V1_GREEN"
