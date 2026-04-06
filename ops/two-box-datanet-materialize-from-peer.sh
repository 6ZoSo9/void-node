#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}"
WHO="${WHO:-zoso}"
LIMIT="${LIMIT:-5}"
APPLY="${APPLY:-0}"
OUT="${OUT:-/tmp/two-box-datanet-materialize-from-peer-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

usage() {
  cat <<USAGE
usage:
  $(basename "$0") [--apply] [--limit N] [--who NAME] [dataset_id ...]

defaults:
  dry-run unless --apply is passed
  --limit 5
  --who zoso

examples:
  $(basename "$0")
  $(basename "$0") --apply --limit 3
  $(basename "$0") --apply ds_123 ds_456
USAGE
}

DATASETS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --limit)
      LIMIT="${2:?missing value for --limit}"
      shift 2
      ;;
    --who)
      WHO="${2:?missing value for --who}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      DATASETS+=("$1")
      shift
      ;;
  esac
done

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
echo "=== [2] fetch current provenance truth ==="
curl -fsS --max-time 15 "$LOCAL_BASE/__void/diag/jobs-and-datanet-worker-v1.json" > "$OUT/local.worker.before.json"
ssh "$ALIEN" '
set -euo pipefail
curl -fsS --max-time 15 http://127.0.0.1:4100/__void/diag/jobs-and-datanet-worker-v1.json
' > "$OUT/remote.worker.before.json"

python3 - "$OUT/local.worker.before.json" "$OUT/remote.worker.before.json" <<'PY' | tee "$OUT/provenance.before.summary.json"
from pathlib import Path
import json, sys
local = json.loads(Path(sys.argv[1]).read_text())
remote = json.loads(Path(sys.argv[2]).read_text())
lp = local.get("provenance_v1") or {}
rp = remote.get("provenance_v1") or {}
print(json.dumps({
  "ok": True,
  "local": {
    "local_jobs_total": lp.get("local_jobs_total"),
    "local_origin_count": lp.get("local_origin_count"),
    "fetched_or_materialized_count": lp.get("fetched_or_materialized_count"),
    "last_job_id": local.get("last_job_id"),
    "last_receipt_id": local.get("last_receipt_id"),
  },
  "remote": {
    "local_jobs_total": rp.get("local_jobs_total"),
    "local_origin_count": rp.get("local_origin_count"),
    "fetched_or_materialized_count": rp.get("fetched_or_materialized_count"),
    "last_job_id": remote.get("last_job_id"),
    "last_receipt_id": remote.get("last_receipt_id"),
  }
}, indent=2))
PY

echo
echo "=== [3] gather local/remote local_jobs ids ==="
python3 - <<'PY' > "$OUT/local_jobs_local.json"
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/datanet_v1/local_jobs")
items = sorted(y.name.replace(".txt","") for y in p.glob("ds_*.txt"))
print(json.dumps(items))
PY

ssh "$ALIEN" 'bash -s' > "$OUT/local_jobs_remote.json" <<'REMOTE'
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import json
p = Path("/home/zoso/dev/void-node/data_a/datanet_v1/local_jobs")
items = sorted(y.name.replace(".txt","") for y in p.glob("ds_*.txt"))
print(json.dumps(items))
PY
REMOTE

python3 - "$OUT/local_jobs_local.json" "$OUT/local_jobs_remote.json" "$OUT/targets.json" "$LIMIT" "${DATASETS[@]-}" <<'PY'
from pathlib import Path
import json, sys
local = set(json.loads(Path(sys.argv[1]).read_text()))
remote = set(json.loads(Path(sys.argv[2]).read_text()))
out = Path(sys.argv[3])
limit = int(sys.argv[4])
explicit = [x for x in sys.argv[5:] if x]
targets = explicit if explicit else sorted(remote - local)[:limit]
summary = {
  "ok": True,
  "local_jobs_total": len(local),
  "remote_jobs_total": len(remote),
  "remote_only_count": len(remote - local),
  "targets": targets,
}
out.write_text(json.dumps(summary))
print(json.dumps(summary, indent=2))
PY

TARGET_COUNT="$(python3 - "$OUT/targets.json" <<'PY'
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
print(len(obj.get("targets") or []))
PY
)"

if [ "$TARGET_COUNT" = "0" ]; then
  echo
  echo "[ok] no targets selected"
  exit 0
fi

echo
echo "=== [4] selected targets ==="
python3 - "$OUT/targets.json" <<'PY'
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
for ds in obj.get("targets") or []:
    print(ds)
PY

if [ "$APPLY" != "1" ]; then
  echo
  echo "[dry-run] pass --apply to materialize selected datasets"
  exit 0
fi

echo
echo "=== [5] materialize selected datasets on local from peer ==="
python3 - "$OUT/targets.json" <<'PY' > "$OUT/targets.list"
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
for ds in obj.get("targets") or []:
    print(ds)
PY

while read -r DS; do
  [ -n "$DS" ] || continue
  URL="$LOCAL_BASE/datanet/consume-view/$DS?who=$(python3 - <<PY
import urllib.parse
print(urllib.parse.quote("$WHO", safe=""))
PY
)"
  echo "--- $DS ---"
  echo "$URL"
  curl -fsS --max-time 20 "$URL" > "$OUT/$DS.html"
  if [ ! -f "$HOME/dev/void-node/data_a/datanet_v1/local_jobs/$DS.txt" ]; then
    echo "[fail] local materialization missing for $DS"
    exit 1
  fi
  python3 - "$OUT/$DS.html" "$DS" <<'PY'
from pathlib import Path
import sys
html = Path(sys.argv[1]).read_text(errors="ignore")
ds = sys.argv[2]
if ds not in html:
    raise SystemExit(f"dataset id not found in html for {ds}")
print("[ok] materialized", ds)
PY
  echo
done < "$OUT/targets.list"

echo
echo "=== [6] provenance after materialization ==="
curl -fsS --max-time 15 "$LOCAL_BASE/__void/diag/jobs-and-datanet-worker-v1.json" > "$OUT/local.worker.after.json"
python3 - "$OUT/local.worker.before.json" "$OUT/local.worker.after.json" <<'PY' | tee "$OUT/provenance.after.summary.json"
from pathlib import Path
import json, sys
before = json.loads(Path(sys.argv[1]).read_text()).get("provenance_v1") or {}
after = json.loads(Path(sys.argv[2]).read_text()).get("provenance_v1") or {}
print(json.dumps({
  "ok": True,
  "before": {
    "local_jobs_total": before.get("local_jobs_total"),
    "local_origin_count": before.get("local_origin_count"),
    "fetched_or_materialized_count": before.get("fetched_or_materialized_count"),
  },
  "after": {
    "local_jobs_total": after.get("local_jobs_total"),
    "local_origin_count": after.get("local_origin_count"),
    "fetched_or_materialized_count": after.get("fetched_or_materialized_count"),
  }
}, indent=2))
PY

echo
echo "=== [7] done ==="
echo "[ok] proof bundle: $OUT"
