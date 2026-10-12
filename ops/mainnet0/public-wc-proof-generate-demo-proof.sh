#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-wc-proof-generate-demo-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public WC proof generate demo v1 proof ==="
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
expect_grep "generator marker" "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1" ops/mainnet0/public-wc-proof-generate-demo.sh
expect_grep "proof safety money false" "money_movement=false" ops/mainnet0/public-wc-proof-generate-demo.sh
expect_grep "proof safety validator false" "validator_mutation=false" ops/mainnet0/public-wc-proof-generate-demo.sh
expect_grep "generator wc delta compat" "wc_delta: delta" ops/mainnet0/public-wc-proof-generate-demo.sh
expect_grep "generator credit delta compat" "credit_delta: delta" ops/mainnet0/public-wc-proof-generate-demo.sh
echo "[ok] source markers"

echo
echo "=== [2] build ==="
npm run build
echo "[ok] build passed"

echo
echo "=== [3] prove existing public viewer/index lane and start local server ==="
BASE="$BASE" make participant-wc-proof-viewer-proof | tee "$OUT/participant-wc-proof-viewer-proof.log"
expect_grep "participant proof green" "VOID_PARTICIPANT_WC_PROOF_VIEWER_V1_GREEN" "$OUT/participant-wc-proof-viewer-proof.log"
echo "[ok] existing public proof lane green"

echo
echo "=== [4] generate fresh local DataNet WC proof record after server/proof churn ==="
WHO="public-wc-proof-demo-$STAMP" DELTA=10 TASK_CLASS=public_wc_proof_demo \
  ops/mainnet0/public-wc-proof-generate-demo.sh | tee "$OUT/generated.env"

DATASET_ID="$(grep -m1 '^dataset_id=' "$OUT/generated.env" | cut -d= -f2-)"
WHO_VALUE="$(grep -m1 '^who=' "$OUT/generated.env" | cut -d= -f2-)"
SHARE_PATH="$(grep -m1 '^share_path=' "$OUT/generated.env" | cut -d= -f2-)"
VIEWER_PATH="$(grep -m1 '^viewer_path=' "$OUT/generated.env" | cut -d= -f2-)"
RAW_PATH="$(grep -m1 '^raw_path=' "$OUT/generated.env" | cut -d= -f2-)"
FILE="$(grep -m1 '^file=' "$OUT/generated.env" | cut -d= -f2-)"

test -n "$DATASET_ID"
test -n "$WHO_VALUE"
test -n "$SHARE_PATH"
test -n "$VIEWER_PATH"
test -n "$RAW_PATH"
test -f "$FILE"
expect_grep "generated env share path full parse" "&delta=10" "$OUT/generated.env"
expect_grep "generated env viewer path full parse" "&delta=10" "$OUT/generated.env"
expect_grep "generated env raw path full parse" "?who=$WHO_VALUE" "$OUT/generated.env"

# /wc-proofs/latest sorts by filesystem mtime and clamps limit to 12.
# Force the generated demo proof to the newest visible local-job mtime after proof-lane churn.
FUTURE_TOUCH="$(date -u -d '+5 minutes' +%Y%m%d%H%M.%S)"
touch -t "$FUTURE_TOUCH" "$FILE"
echo "forced_generated_mtime=$FUTURE_TOUCH"
stat "$FILE"
sleep 1

expect_grep "generated file marker" "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1" "$FILE"
expect_grep "generated file dataset" "$DATASET_ID" "$FILE"
expect_grep "generated file who" "$WHO_VALUE" "$FILE"
expect_grep "generated file task class" "public_wc_proof_demo" "$FILE"
expect_grep "generated file wc delta compat" '"wc_delta": 10' "$FILE"
expect_grep "generated file credit delta compat" '"credit_delta": 10' "$FILE"
expect_grep "generated file mtime compat" '"mtime_ms":' "$FILE"
expect_grep "generated file latest compat" '"latest_sort_compat": true' "$FILE"
expect_grep "generated file no money" '"money_movement": false' "$FILE"
expect_grep "generated file no wallet send" '"wallet_send": false' "$FILE"
expect_grep "generated file no validator mutation" '"validator_mutation": false' "$FILE"
echo "[ok] generated fresh proof record after proof-lane churn"

echo
echo "=== [5] restart fresh server and latest endpoint includes generated record ==="
echo "latest_query=/wc-proofs/latest?limit=12"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "clearing port 4100 before latest check pids: $PIDS"
  kill $PIDS || true
  sleep 2
fi

npm exec tsx src/index.ts > "$OUT/fresh-server.log" 2>&1 &
SERVER_PID="$!"
echo "fresh_server_pid=$SERVER_PID"

for i in $(seq 1 30); do
  if curl -fsS "$BASE/health" >/dev/null 2>&1 || curl -fsS "$BASE/participant" >/dev/null 2>&1; then
    echo "[ok] fresh server live"
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "[fail] fresh server did not become live"
    sed -n '1,220p' "$OUT/fresh-server.log" || true
    exit 1
  fi
done

# Force generated demo to newest mtime again after the fresh server starts.
FUTURE_TOUCH_2="$(date -u -d '+20 minutes' +%Y%m%d%H%M.%S)"
touch -t "$FUTURE_TOUCH_2" "$FILE"
echo "forced_generated_mtime_after_server=$FUTURE_TOUCH_2"
stat "$FILE"

generated_mtime_rank="$(python3 - "$FILE" <<'PYRANK'
import os, sys, glob
target = os.path.abspath(sys.argv[1])
rows = []
for f in glob.glob("data_a/datanet_v1/local_jobs/ds_*.txt"):
    try:
        rows.append((os.stat(f).st_mtime, os.path.abspath(f)))
    except FileNotFoundError:
        pass
rows.sort(reverse=True)
for i, (_, f) in enumerate(rows, 1):
    if f == target:
        print(i)
        break
PYRANK
)"
echo "generated_mtime_rank=$generated_mtime_rank"
if [ "$generated_mtime_rank" != "1" ]; then
  echo "[fail] generated proof is not newest local job"
  python3 - "$FILE" <<'PYTOP'
import os, sys, glob
target = os.path.abspath(sys.argv[1])
rows = []
for f in glob.glob("data_a/datanet_v1/local_jobs/ds_*.txt"):
    try:
        rows.append((os.stat(f).st_mtime, os.path.abspath(f)))
    except FileNotFoundError:
        pass
rows.sort(reverse=True)
for i, (mtime, f) in enumerate(rows[:20], 1):
    mark = " <== generated" if f == target else ""
    print(f"{i} {mtime:.3f} {f}{mark}")
PYTOP
  exit 1
fi

set +e
timeout 25s curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest.json" 2> "$OUT/latest.curl.err"
CURL_RC="$?"
set -e
echo "latest_curl_rc=$CURL_RC"
if [ "$CURL_RC" != "0" ]; then
  echo "[fail] latest endpoint curl failed"
  cat "$OUT/latest.curl.err" || true
  sed -n '1,220p' "$OUT/fresh-server.log" || true
  exit 1
fi

cat "$OUT/latest.json"
echo
expect_grep "latest endpoint marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest.json"
expect_grep "latest endpoint generated dataset" "$DATASET_ID" "$OUT/latest.json"
expect_grep "latest endpoint generated who" "$WHO_VALUE" "$OUT/latest.json"
expect_grep "latest endpoint generated task class" "public_wc_proof_demo" "$OUT/latest.json"
expect_grep "latest endpoint generated viewer path" "$VIEWER_PATH" "$OUT/latest.json"
expect_grep "latest endpoint generated raw path" "$RAW_PATH" "$OUT/latest.json"
echo "[ok] /wc-proofs/latest includes fresh generated proof"

echo
echo "=== [6] public proof surfaces include generated record ==="
curl -fsS "$BASE/proofs" > "$OUT/public-proofs-index.html"
expect_grep "public proofs index generated dataset" "$DATASET_ID" "$OUT/public-proofs-index.html"
SHARE_PATH_HTML="${SHARE_PATH//&/&amp;}"
expect_grep "public proofs index generated share path html" "$SHARE_PATH_HTML" "$OUT/public-proofs-index.html"
expect_grep "public proofs index generate demo task class" "public_wc_proof_demo" "$OUT/public-proofs-index.html"
expect_grep "public proofs open latest" "Open latest proof" "$OUT/public-proofs-index.html"
expect_grep "public proofs copy latest" "Copy latest proof" "$OUT/public-proofs-index.html"
expect_grep "public proofs raw latest" "Open latest raw JSON" "$OUT/public-proofs-index.html"
expect_grep "public proofs verify guide" "How to verify" "$OUT/public-proofs-index.html"

curl -fsS "$BASE$RAW_PATH" > "$OUT/raw.json"
expect_grep "raw generated marker" "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1" "$OUT/raw.json"
expect_grep "raw generated dataset" "$DATASET_ID" "$OUT/raw.json"
expect_grep "raw generated who" "$WHO_VALUE" "$OUT/raw.json"

curl -fsS "$BASE$VIEWER_PATH" > "$OUT/viewer.html"
expect_grep "viewer generated dataset" "$DATASET_ID" "$OUT/viewer.html"
expect_grep "viewer verify button" "Verify proof" "$OUT/viewer.html"

curl -fsS "$BASE$SHARE_PATH" > "$OUT/share-route.txt"
expect_grep "share route marker" "VOID_WC_PROOF_PUBLIC_SHARE_ROUTE_V1" "$OUT/share-route.txt"
expect_grep "share route generated viewer path" "$VIEWER_PATH" "$OUT/share-route.txt"
echo "[ok] /proofs, raw JSON, verifier, and clean /proof route include generated record"

echo
echo "=== [7] close proof truth ==="
echo "dataset_id=$DATASET_ID"
echo "who=$WHO_VALUE"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "file=$FILE"
echo "out=$OUT"
echo "latest_contract=mtime_sorted_limit_clamped_12"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1_GREEN"
