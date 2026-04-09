#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_BASE="${LOCAL_BASE:-${PUBLIC_HTTP_BASE:-http://127.0.0.1:4100}}"
REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}"
OUT="${OUT:-/tmp/two-box-datanet-provenance-diff-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== [1] local + remote truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote branch ---"
git branch --show-current
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote latest tag ---"
git describe --tags --abbrev=0 2>/dev/null || true
' | tee "$OUT/remote.truth.txt"

echo
echo
echo "=== [2] fetch worker diag provenance ==="
curl -fsS --max-time 15 "$LOCAL_BASE/__void/diag/jobs-and-datanet-worker-v1.json" > "$OUT/local.worker.json"
ssh "$ALIEN" "REMOTE_BASE='$REMOTE_BASE' bash -s" > "$OUT/remote.worker.json" <<'REMOTE'
set -euo pipefail
curl -fsS --max-time 15 "$REMOTE_BASE/__void/diag/jobs-and-datanet-worker-v1.json"
REMOTE

python3 - "$OUT/local.worker.json" "$OUT/remote.worker.json" <<'PY' | tee "$OUT/provenance-summary.json"
from pathlib import Path
import json, sys
local = json.loads(Path(sys.argv[1]).read_text())
remote = json.loads(Path(sys.argv[2]).read_text())
lp = local.get("provenance_v1") or {}
rp = remote.get("provenance_v1") or {}
summary = {
  "ok": True,
  "local": {
    "local_jobs_total": lp.get("local_jobs_total"),
    "receipt_dataset_ids_total": lp.get("receipt_dataset_ids_total"),
    "local_origin_count": lp.get("local_origin_count"),
    "fetched_or_materialized_count": lp.get("fetched_or_materialized_count"),
    "last_job_id": local.get("last_job_id"),
    "last_receipt_id": local.get("last_receipt_id"),
  },
  "remote": {
    "local_jobs_total": rp.get("local_jobs_total"),
    "receipt_dataset_ids_total": rp.get("receipt_dataset_ids_total"),
    "local_origin_count": rp.get("local_origin_count"),
    "fetched_or_materialized_count": rp.get("fetched_or_materialized_count"),
    "last_job_id": remote.get("last_job_id"),
    "last_receipt_id": remote.get("last_receipt_id"),
  }
}
print(json.dumps(summary, indent=2))
PY

echo
echo "=== [3] gather local_jobs sets ==="
python3 - <<'PY' > "$OUT/local_jobs_local.json"
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/datanet_v1/local_jobs")
items = sorted(y.name.replace(".txt", "") for y in p.glob("ds_*.txt"))
print(json.dumps(items))
PY

ssh "$ALIEN" 'bash -s' > "$OUT/local_jobs_remote.json" <<'REMOTE'
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/datanet_v1/local_jobs")
items = sorted(y.name.replace(".txt", "") for y in p.glob("ds_*.txt"))
print(json.dumps(items))
PY
REMOTE

echo
echo "=== [4] gather local-origin receipt dataset sets ==="
python3 - <<'PY' > "$OUT/receipt_datasets_local.json"
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/agent_v1/receipts.jsonl")
items = []
seen = set()
if p.exists():
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        ds = str(obj.get("dataset_id",""))
        if ds and ds not in seen:
            seen.add(ds)
            items.append(ds)
print(json.dumps(sorted(items)))
PY

ssh "$ALIEN" 'bash -s' > "$OUT/receipt_datasets_remote.json" <<'REMOTE'
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/agent_v1/receipts.jsonl")
items = []
seen = set()
if p.exists():
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        ds = str(obj.get("dataset_id",""))
        if ds and ds not in seen:
            seen.add(ds)
            items.append(ds)
print(json.dumps(sorted(items)))
PY
REMOTE

echo
echo "=== [5] diff summary ==="
python3 - "$OUT/local_jobs_local.json" "$OUT/local_jobs_remote.json" "$OUT/receipt_datasets_local.json" "$OUT/receipt_datasets_remote.json" <<'PY' | tee "$OUT/diff-summary.json"
from pathlib import Path
import json, sys

local_jobs = set(json.loads(Path(sys.argv[1]).read_text()))
remote_jobs = set(json.loads(Path(sys.argv[2]).read_text()))
local_receipts = set(json.loads(Path(sys.argv[3]).read_text()))
remote_receipts = set(json.loads(Path(sys.argv[4]).read_text()))

local_only_jobs = sorted(local_jobs - remote_jobs)
remote_only_jobs = sorted(remote_jobs - local_jobs)

local_only_local_origin = sorted((local_receipts & local_jobs) - remote_jobs)
remote_only_local_origin = sorted((remote_receipts & remote_jobs) - local_jobs)

local_fetched = sorted(local_jobs - local_receipts)
remote_fetched = sorted(remote_jobs - remote_receipts)

summary = {
  "ok": True,
  "local_jobs_total": len(local_jobs),
  "remote_jobs_total": len(remote_jobs),
  "local_only_jobs_count": len(local_only_jobs),
  "remote_only_jobs_count": len(remote_only_jobs),
  "local_only_local_origin_count": len(local_only_local_origin),
  "remote_only_local_origin_count": len(remote_only_local_origin),
  "local_fetched_or_materialized_count": len(local_fetched),
  "remote_fetched_or_materialized_count": len(remote_fetched),
  "local_only_jobs_sample": local_only_jobs[:20],
  "remote_only_jobs_sample": remote_only_jobs[:40],
  "local_only_local_origin_sample": local_only_local_origin[:20],
  "remote_only_local_origin_sample": remote_only_local_origin[:40],
  "local_fetched_or_materialized_sample": local_fetched[:20],
  "remote_fetched_or_materialized_sample": remote_fetched[:20],
}
print(json.dumps(summary, indent=2))
PY

echo
echo "=== [6] done ==="
echo "[ok] proof bundle: $OUT"
