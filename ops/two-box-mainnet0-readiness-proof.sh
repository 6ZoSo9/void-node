#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-mainnet0-readiness-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] local baseline ==="
git branch --show-current | tee "$OUT/local-branch.txt"
git rev-parse --short HEAD | tee "$OUT/local-head.txt"

echo
echo "=== [2] local runtime truth ==="
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json | tee "$OUT/local-ready.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json | tee "$OUT/local-peer-main-status.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/health | tee "$OUT/local-health.json"
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/metrics/drift4 | tee "$OUT/local-drift.prom" || true

echo
echo "=== [3] remote runtime truth ==="
ssh "$ALIEN" '
set -euo pipefail
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/ready.json
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/__void/peer-main-status.json
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/health
echo
curl -fsS --max-time 10 http://127.0.0.1:4100/metrics/drift4 || true
' | tee "$OUT/remote-runtime.txt"

echo
echo "=== [4] capture current Mainnet-0 operator artifacts ==="
sed -n '1,220p' ops/mainnet/validator-status.current.yaml | tee "$OUT/validator-status.current.yaml"
echo
sed -n '1,260p' ops/mainnet/canonical-incident-bundle.current.yaml | tee "$OUT/canonical-incident-bundle.current.yaml"

echo
echo "=== [5] run policy stack sanity ==="
bash ops/void-mainnet0-policy-stack-sanity.sh | tee "$OUT/policy-stack-sanity.txt"

echo
echo "=== [6] compact proof summary ==="
python3 - "$OUT" <<'PY'
import json, pathlib, re, sys

out = pathlib.Path(sys.argv[1])

local_ready = json.loads((out / "local-ready.json").read_text())
local_peer = json.loads((out / "local-peer-main-status.json").read_text())
local_health = json.loads((out / "local-health.json").read_text())
remote_txt = (out / "remote-runtime.txt").read_text()

# first three JSON blobs from remote output
objs = []
buf = ""
depth = 0
started = False
for ch in remote_txt:
    if ch == "{":
        depth += 1
        started = True
    if started:
        buf += ch
    if ch == "}":
        depth -= 1
        if started and depth == 0:
            objs.append(buf)
            buf = ""
            started = False
remote_ready = json.loads(objs[0]) if len(objs) > 0 else {}
remote_peer = json.loads(objs[1]) if len(objs) > 1 else {}
remote_health = json.loads(objs[2]) if len(objs) > 2 else {}

drift_text = (out / "local-drift.prom").read_text() if (out / "local-drift.prom").exists() else ""
m = re.search(r"^void_follower_drift\s+([0-9.+-]+)$", drift_text, re.M)
local_drift = float(m.group(1)) if m else None

summary = {
    "local_ready": local_ready.get("ready"),
    "remote_ready": remote_ready.get("ready"),
    "local_head": local_ready.get("head"),
    "remote_head": remote_ready.get("head"),
    "local_gap": local_ready.get("gap"),
    "remote_gap": remote_ready.get("gap"),
    "local_same_node": local_peer.get("same_node"),
    "remote_same_node": remote_peer.get("same_node"),
    "local_peer_head_gap": local_peer.get("head_gap"),
    "remote_peer_head_gap": remote_peer.get("head_gap"),
    "local_node_id": local_health.get("nodeId"),
    "remote_node_id": remote_health.get("nodeId"),
    "local_drift_metric": local_drift,
}
print(json.dumps(summary, indent=2))

assert summary["local_ready"] is True, f"local not ready: {summary}"
assert summary["remote_ready"] is True, f"remote not ready: {summary}"
assert summary["local_same_node"] is False, f"local same_node should be false: {summary}"
assert summary["remote_same_node"] is False, f"remote same_node should be false: {summary}"
assert summary["local_node_id"] and summary["remote_node_id"], f"missing node ids: {summary}"
assert summary["local_node_id"] != summary["remote_node_id"], f"node ids unexpectedly equal: {summary}"
assert summary["local_gap"] == 0, f"local gap not zero: {summary}"
assert summary["remote_gap"] == 0, f"remote gap not zero: {summary}"
assert summary["local_peer_head_gap"] == 0, f"local peer head gap not zero: {summary}"
assert summary["remote_peer_head_gap"] == 0, f"remote peer head gap not zero: {summary}"
print("[ok] two-box mainnet0 runtime readiness proof green")
PY

echo
echo "out=$OUT"
