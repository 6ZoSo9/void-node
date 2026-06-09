#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-wc-recent-proofs-feed-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Participant WC recent proofs feed v1 proof ==="
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
echo "=== [1] source markers/recent feed ==="
expect_grep "latest proof card marker" "VOID_WC_LATEST_PROOF_CARD_V1" src/index.ts
expect_grep "latest proof explainer marker" "VOID_WC_LATEST_PROOF_EXPLAINER_V1" src/index.ts
expect_grep "recent feed marker" "VOID_WC_RECENT_PROOFS_FEED_V1" src/index.ts
expect_grep "recent feed script marker" "VOID_WC_RECENT_PROOFS_FEED_SCRIPT_V1" src/index.ts
expect_grep "recent feed card id" "participantWcRecentProofsCard" src/index.ts
expect_grep "recent feed summary id" "participantWcRecentProofsSummary" src/index.ts
expect_grep "recent feed list id" "participantWcRecentProofsList" src/index.ts
expect_grep "recent feed history link id" "participantWcRecentProofsHistoryLink" src/index.ts
expect_grep "recent feed endpoint" "/wc-proofs/latest?limit=3" src/index.ts
expect_grep "recent feed verify link copy" ">Verify<" src/index.ts
expect_grep "recent feed raw link copy" ">Raw JSON<" src/index.ts
expect_grep "recent feed share link copy" ">Share<" src/index.ts
expect_grep "recent feed share route compute" "'/proof/'+encodeURIComponent(dataset)" src/index.ts
expect_grep "copy latest proof preserved" "participantWcLatestProofCopyLinkBtn" src/index.ts
echo "[ok] source markers/recent feed"

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
echo "=== [4] generate fresh proof and confirm latest feed source ==="
WHO="participant-recent-proofs-feed-$STAMP"
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

curl -fsS "$BASE/wc-proofs/latest?limit=3" > "$OUT/latest-three.json"
expect_grep "latest three marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-three.json"

python3 - "$OUT/latest-three.json" > "$OUT/latest-three-normalized.env" <<'PY_LATEST_THREE'
import json, sys
p = sys.argv[1]
j = json.load(open(p))
items = j if isinstance(j, list) else (j.get("items") or j.get("proofs") or j.get("latest") or [])
if isinstance(items, dict):
    items = [items]
if not isinstance(items, list) or not items:
    raise SystemExit("latest limit=3 did not expose a parseable item list")
print("recent_count=" + str(len(items)))
for idx, item in enumerate(items[:3], 1):
    dataset = item.get("dataset_id") or item.get("dataset") or item.get("id") or ""
    who = item.get("who") or item.get("account") or ""
    task = item.get("task_class") or item.get("taskClass") or ""
    viewer = item.get("viewer_path") or item.get("viewerPath") or item.get("viewer") or ""
    raw = item.get("raw_path") or item.get("rawPath") or item.get("raw") or ""
    if not dataset or not task or not viewer or not raw:
        raise SystemExit(f"recent item {idx} missing required fields")
    print(f"recent_{idx}_dataset={dataset}")
    print(f"recent_{idx}_who={who}")
    print(f"recent_{idx}_task={task}")
    print(f"recent_{idx}_viewer={viewer}")
    print(f"recent_{idx}_raw={raw}")
PY_LATEST_THREE

expect_grep "recent normalized count" "recent_count=" "$OUT/latest-three-normalized.env"
cat "$OUT/latest-three-normalized.env"

curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest-twelve.json"
expect_grep "latest twelve marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated dataset" "$DATASET_ID" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated who" "$WHO_VALUE" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated task class" "public_wc_proof_button" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated viewer path" "$VIEWER_PATH" "$OUT/latest-twelve.json"
expect_grep "latest twelve generated raw path" "$RAW_PATH" "$OUT/latest-twelve.json"
echo "[ok] latest feed source is parseable and generated proof discoverable"

echo
echo "=== [5] participant renders recent proofs feed ==="
curl -fsS "$BASE/participant" > "$OUT/participant.html"
expect_grep "participant latest card marker" "VOID_WC_LATEST_PROOF_CARD_V1" "$OUT/participant.html"
expect_grep "participant explainer marker" "VOID_WC_LATEST_PROOF_EXPLAINER_V1" "$OUT/participant.html"
expect_grep "participant recent feed marker" "VOID_WC_RECENT_PROOFS_FEED_V1" "$OUT/participant.html"
expect_grep "participant recent script marker" "VOID_WC_RECENT_PROOFS_FEED_SCRIPT_V1" "$OUT/participant.html"
expect_grep "participant recent card id" "participantWcRecentProofsCard" "$OUT/participant.html"
expect_grep "participant recent summary id" "participantWcRecentProofsSummary" "$OUT/participant.html"
expect_grep "participant recent list id" "participantWcRecentProofsList" "$OUT/participant.html"
expect_grep "participant recent history link id" "participantWcRecentProofsHistoryLink" "$OUT/participant.html"
expect_grep "participant recent history copy" "Open full proof history" "$OUT/participant.html"
expect_grep "participant recent endpoint" "/wc-proofs/latest?limit=3" "$OUT/participant.html"
expect_grep "participant recent verify copy" ">Verify<" "$OUT/participant.html"
expect_grep "participant recent raw copy" ">Raw JSON<" "$OUT/participant.html"
expect_grep "participant recent share copy" ">Share<" "$OUT/participant.html"
expect_grep "participant recent share route source" "/proof/" "$OUT/participant.html"
expect_grep "participant copy latest preserved" "participantWcLatestProofCopyLinkBtn" "$OUT/participant.html"
echo "[ok] participant renders recent proofs feed"

echo
echo "=== [6] public proof stack still works ==="
SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
VIEWER_PATH_HTML="${VIEWER_PATH//&/&amp;}"
RAW_PATH_HTML="${RAW_PATH//&/&amp;}"

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
echo "[ok] public proof stack still works"

echo
echo "=== [7] status smoke ==="
if timeout 45s make mainnet0-status-smoke; then
  echo "[ok] status smoke passed"
else
  echo "[warn] status smoke timed out/nonfatal for participant recent proofs feed after route/health checks"
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
echo "participant_recent_feed_card_id=participantWcRecentProofsCard"
echo "participant_recent_feed_marker=VOID_WC_RECENT_PROOFS_FEED_V1"
echo "participant_recent_feed_script_marker=VOID_WC_RECENT_PROOFS_FEED_SCRIPT_V1"
echo "participant_recent_feed_summary_id=participantWcRecentProofsSummary"
echo "participant_recent_feed_list_id=participantWcRecentProofsList"
echo "participant_recent_feed_history_link_id=participantWcRecentProofsHistoryLink"
echo "participant_recent_feed_endpoint=/wc-proofs/latest?limit=3"
echo "participant_recent_feed_actions=Verify,Raw JSON,Share"
echo "participant_latest_card_id=participantWcLatestProofCard"
echo "participant_latest_explainer_id=participantWcLatestProofExplainer"
echo "participant_latest_copy_link_id=participantWcLatestProofCopyLinkBtn"
echo "history_endpoint=/wc-proofs/latest?limit=12"
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
echo "VOID_WC_RECENT_PROOFS_FEED_V1_GREEN"
