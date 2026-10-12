#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
RUNS="${RUNS:-2}"
REMOTE_NODE_BASE="http://${ALIEN##*@}:4100"
OUT_DIR="${OUT_DIR:-/tmp/two-box-remote-product-network-regression-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-15}" "$1"
}

echo "=== [1] remote participant/product truth ==="
ALIEN="$ALIEN" bash ops/two-box-participant-golden-path-proof.sh \
  | tee "$OUT_DIR/participant-golden-path-proof.log"

echo
echo "=== [2] remote network value summary ==="
jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=50" 20 \
  | tee "$OUT_DIR/remote-network-value-after.json" >/dev/null

python3 - "$OUT_DIR/remote-network-value-after.json" <<'PY'
import json, pathlib, sys
o = json.loads(pathlib.Path(sys.argv[1]).read_text())
recent = o.get("recent_runner_activity") or []

assert o.get("ok") is True, "remote network value summary not ok"
if int(o.get("recent_runner_activity_count") or 0) <= 0:
    print("[warn] remote recent_runner_activity_count <= 0; counts still positive")
counts = o.get("counts") or {}
assert int(counts.get("publish") or 0) > 0, "remote publish count <= 0"
assert int(counts.get("verify") or 0) > 0, "remote verify count <= 0"
assert int(counts.get("redundancy") or 0) > 0, "remote redundancy count <= 0"

publish_present = any(str(x.get("task_class") or "") == "publish" for x in recent)
verify_present = any(str(x.get("task_class") or "") == "verify" for x in recent)
redundancy_present = any(str(x.get("task_class") or "") == "redundancy" for x in recent)

if not publish_present:
    print("[warn] remote publish missing from recent_runner_activity window; counts still positive")
if not verify_present:
    print("[warn] remote verify missing from recent_runner_activity window; counts still positive")
if not redundancy_present:
    print("[warn] remote redundancy missing from recent_runner_activity window; counts still positive")

print("[ok] remote network value shows publish/verify/redundancy")
print(json.dumps({
    "ok": True,
    "recent_runner_activity_count": o.get("recent_runner_activity_count"),
    "counts": counts,
    "publish_present": any(str(x.get("task_class") or "") == "publish" for x in recent),
    "verify_present": any(str(x.get("task_class") or "") == "verify" for x in recent),
    "redundancy_present": any(str(x.get("task_class") or "") == "redundancy" for x in recent),
}, indent=2))
PY

echo
echo "=== [3] remote health after ==="
jget "$REMOTE_NODE_BASE/health" 15 | tee "$OUT_DIR/remote-health-after.json"
jget "$REMOTE_NODE_BASE/__void/ready.json" 15 | tee "$OUT_DIR/remote-ready-after.json"

python3 - "$OUT_DIR/remote-health-after.json" "$OUT_DIR/remote-ready-after.json" <<'PY'
import json, pathlib, sys
health = json.loads(pathlib.Path(sys.argv[1]).read_text())
ready = json.loads(pathlib.Path(sys.argv[2]).read_text())

assert health.get("ok") is True, "remote health not ok"
assert ready.get("ready") is True, "remote ready not true"
assert ready.get("gap") == 0, f"remote gap not zero: {ready.get('gap')}"
assert ready.get("txroot_live") == 1, f"remote txroot_live not 1: {ready.get('txroot_live')}"

print("[ok] remote post-check health/ready clean")
print(json.dumps({
    "ok": True,
    "remote_node_id": health.get("nodeId"),
    "remote_ready": ready.get("ready"),
    "remote_gap": ready.get("gap"),
    "remote_txroot_live": ready.get("txroot_live"),
}, indent=2))
PY

echo
echo "=== [4] success ==="
echo "[ok] two-box remote product + network regression proof green"
echo "out=$OUT_DIR"
