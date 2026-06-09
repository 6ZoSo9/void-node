#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/participant-wc-proof-viewer-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== participant WC proof viewer proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=ui_viewer_only_existing_local_job"
echo "money_movement=false"
echo "validator_mutation=false"
echo

expect_grep() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -Fq "$pattern" "$file"; then
    echo "[ok] $label"
  else
    echo "[fail] missing $label pattern=$pattern file=$file" >&2
    exit 1
  fi
}

echo "=== [1] source markers ==="
expect_grep "viewer route marker" "VOID_WC_PROOF_VIEWER_ROUTE_V1" src/index.ts
expect_grep "viewer render marker" "VOID_WC_PROOF_VIEWER_RENDER_V1" src/index.ts
expect_grep "viewer client marker" "VOID_WC_PROOF_VIEWER_CLIENT_V1" src/index.ts
expect_grep "copy link marker" "VOID_WC_PROOF_VIEWER_COPY_LINK_V1" src/index.ts
expect_grep "latest proofs route marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" src/index.ts
expect_grep "latest proofs card marker" "VOID_PARTICIPANT_WC_LATEST_PROOFS_LIST_V1" src/index.ts
expect_grep "latest proofs client marker" "VOID_PARTICIPANT_WC_LATEST_PROOFS_CLIENT_V1" src/index.ts
expect_grep "latest proofs actions marker" "VOID_PARTICIPANT_WC_LATEST_PROOFS_ACTIONS_V1" src/index.ts
expect_grep "participant viewer link marker" "VOID_PARTICIPANT_WC_PROOF_VIEWER_LINK_V1" src/index.ts
expect_grep "stable raw marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_STABLE_LOCAL_JOB_V1" src/index.ts
expect_grep "viewer path" "/wc-proof-viewer?dataset=" src/index.ts
expect_grep "raw local-job path" "/datanet/v1/local-job/" src/index.ts
expect_grep "safety copy" "no wallet send" src/index.ts
echo

echo "=== [2] build ==="
npm run build
echo "[ok] build passed"
echo

echo "=== [3] restart/health ==="
systemctl --user stop void-node-live.service || true
systemctl --user kill --kill-who=all --signal=SIGKILL void-node-live.service || true
sleep 2
for port in 4100 4700; do
  pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "clearing port $port pids: $pids"
    for pid in $pids; do kill -KILL "$pid" || true; done
  fi
done
systemctl --user daemon-reload || true
systemctl --user start void-node-live.service
sleep 6
curl -fsS --max-time 10 "$BASE/health" > "$OUT/health.json"
python3 - "$OUT/health.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert int(j.get("http", 0)) == 4100, j
print("[ok] health/http live")
PY
echo

echo "=== [4] served participant has viewer link contract ==="
curl -fsS --max-time 20 "$BASE/participant" > "$OUT/participant.html"
expect_grep "served viewer link marker" "VOID_PARTICIPANT_WC_PROOF_VIEWER_LINK_V1" "$OUT/participant.html"
expect_grep "served viewer path" "/wc-proof-viewer?dataset=" "$OUT/participant.html"
expect_grep "served latest proofs card" "VOID_PARTICIPANT_WC_LATEST_PROOFS_LIST_V1" "$OUT/participant.html"
expect_grep "served latest proofs client" "VOID_PARTICIPANT_WC_LATEST_PROOFS_CLIENT_V1" "$OUT/participant.html"
expect_grep "served latest proofs actions" "VOID_PARTICIPANT_WC_LATEST_PROOFS_ACTIONS_V1" "$OUT/participant.html"
expect_grep "served latest proofs copy action" "wcLatestProofCopyBtn" "$OUT/participant.html"
expect_grep "served latest proofs raw action" "Open raw JSON" "$OUT/participant.html"
expect_grep "served stable raw marker" "VOID_PARTICIPANT_WC_RECEIPT_DETAIL_LINK_STABLE_LOCAL_JOB_V1" "$OUT/participant.html"
echo

echo "=== [5] choose latest existing local DataNet job ==="
python3 - "$OUT/shape.json" <<'PY'
import json, pathlib, re, sys
root = pathlib.Path("data_a/datanet_v1/local_jobs")
files = sorted(root.glob("ds_*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
assert files, "no local job files found"
for f in files:
    ds = f.stem
    txt = f.read_text(errors="replace")
    who = "zoso"
    try:
        payload = json.loads(txt)
        who = str(payload.get("account") or payload.get("who") or who)
    except Exception:
        m = re.search(r'"account"\s*:\s*"([^"]+)"', txt)
        if m:
            who = m.group(1)
    if ds.startswith("ds_") and who:
        shape = {
            "dataset_id": ds,
            "who": who,
            "viewer_path": "/wc-proof-viewer?dataset=" + ds + "&who=" + who + "&delta=10",
            "raw_path": "/datanet/v1/local-job/" + ds + "?who=" + who,
            "file": str(f),
        }
        open(sys.argv[1], "w").write(json.dumps(shape, indent=2, sort_keys=True))
        print(json.dumps(shape, indent=2, sort_keys=True))
        break
else:
    raise SystemExit("no usable local job found")
PY

DATASET_ID="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["dataset_id"])' "$OUT/shape.json")"
WHO="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["who"])' "$OUT/shape.json")"
VIEWER_PATH="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["viewer_path"])' "$OUT/shape.json")"
RAW_PATH="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["raw_path"])' "$OUT/shape.json")"

echo "dataset_id=$DATASET_ID"
echo "who=$WHO"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo

echo "=== [5b] latest WC proofs endpoint resolves ==="
curl -fsS --max-time 20 "$BASE/wc-proofs/latest?limit=5" > "$OUT/latest-proofs.json"
expect_grep "latest proofs endpoint marker" "VOID_WC_PROOFS_LATEST_ROUTE_V1" "$OUT/latest-proofs.json"
expect_grep "latest proofs endpoint viewer path" "/wc-proof-viewer?dataset=" "$OUT/latest-proofs.json"
expect_grep "latest proofs endpoint raw path" "/datanet/v1/local-job/" "$OUT/latest-proofs.json"
expect_grep "latest proofs endpoint task class" "task_class" "$OUT/latest-proofs.json"
expect_grep "latest proofs endpoint delta" "delta" "$OUT/latest-proofs.json"
echo "[ok] latest WC proofs endpoint resolves"

echo "=== [6] raw local-job JSON resolves ==="
curl -fsS --max-time 20 "$BASE$RAW_PATH" > "$OUT/raw.json"
python3 - "$OUT/raw.json" "$DATASET_ID" "$WHO" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
dataset=sys.argv[2]
who=sys.argv[3]
blob=json.dumps(j, sort_keys=True)
assert dataset in blob, j
assert who in blob, j
assert j.get("ok") is True, j
print("[ok] raw local-job JSON contains dataset/who")
PY
echo

echo "=== [7] proof viewer resolves ==="
curl -fsS --max-time 20 "$BASE$VIEWER_PATH" > "$OUT/viewer.html"
expect_grep "viewer render marker served" "VOID_WC_PROOF_VIEWER_RENDER_V1" "$OUT/viewer.html"
expect_grep "viewer client marker served" "VOID_WC_PROOF_VIEWER_CLIENT_V1" "$OUT/viewer.html"
expect_grep "copy link marker served" "VOID_WC_PROOF_VIEWER_COPY_LINK_V1" "$OUT/viewer.html"
expect_grep "copy proof button served" "Copy proof link" "$OUT/viewer.html"
expect_grep "permalink card served" "wcProofPermalink" "$OUT/viewer.html"
expect_grep "viewer title" "WC Proof Viewer" "$OUT/viewer.html"
expect_grep "viewer dataset" "$DATASET_ID" "$OUT/viewer.html"
expect_grep "viewer raw path" "/datanet/v1/local-job/" "$OUT/viewer.html"
expect_grep "viewer safety" "no wallet send" "$OUT/viewer.html"
echo

echo "=== [8] status smoke ==="
BASE="$BASE" make mainnet0-status-smoke
echo "[ok] status smoke passed"
echo

echo "VOID_PARTICIPANT_WC_PROOF_VIEWER_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "out=$OUT"
