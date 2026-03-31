#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN##*@}:4100}"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-network-peer-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

echo "=== [1] local truth ==="
echo "--- local ready ---"
LOCAL_READY="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
printf '%s\n' "$LOCAL_READY"
echo "--- local health ---"
LOCAL_HEALTH="$(jget "$LOCAL_NODE_BASE/health" 5)"
printf '%s\n' "$LOCAL_HEALTH"
echo "--- local head ---"
LOCAL_HEAD="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
printf '%s\n' "$LOCAL_HEAD"
echo

echo "=== [2] remote truth ==="
echo "--- remote ready ---"
REMOTE_READY="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
printf '%s\n' "$REMOTE_READY"
echo "--- remote health ---"
REMOTE_HEALTH="$(jget "$REMOTE_NODE_BASE/health" 8)"
printf '%s\n' "$REMOTE_HEALTH"
echo "--- remote head ---"
REMOTE_HEAD="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"
printf '%s\n' "$REMOTE_HEAD"
echo

echo "=== [3] remote journal peer clues ==="
REMOTE_JOURNAL="$(
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "journalctl --user -u void-node.service -n 200 --no-pager | grep -Ei 'peer|p2p|bootstrap|connect|dial|hello|listen|4700' || true"
)"
printf '%s\n' "$REMOTE_JOURNAL"
printf '%s\n' "$REMOTE_JOURNAL" > "$OUT_DIR/remote-peer-journal.log"
echo

python3 - "$LOCAL_READY" "$REMOTE_READY" "$LOCAL_HEALTH" "$REMOTE_HEALTH" "$LOCAL_HEAD" "$REMOTE_HEAD" "$OUT_DIR/remote-peer-journal.log" <<'PY'
import json, pathlib, sys

local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_health = json.loads(sys.argv[3])
remote_health = json.loads(sys.argv[4])
local_head = int(sys.argv[5].strip())
remote_head = int(sys.argv[6].strip())
journal_text = pathlib.Path(sys.argv[7]).read_text()

local_node = str(local_health.get("nodeId") or "")
remote_node = str(remote_health.get("nodeId") or "")
local_peers = [str(x) for x in (local_health.get("peers") or [])]
remote_peers = [str(x) for x in (remote_health.get("peers") or [])]

assert local_ready.get("ready") is True, "local ready != true"
assert remote_ready.get("ready") is True, "remote ready != true"
assert local_ready.get("gap") == 0, f"local gap != 0: {local_ready.get('gap')}"
assert remote_ready.get("gap") == 0, f"remote gap != 0: {remote_ready.get('gap')}"
assert local_ready.get("txroot_live") == 1, f"local txroot_live != 1: {local_ready.get('txroot_live')}"
assert remote_ready.get("txroot_live") == 1, f"remote txroot_live != 1: {remote_ready.get('txroot_live')}"
assert local_head == remote_head, f"head mismatch: {local_head} vs {remote_head}"

assert local_node, "local nodeId missing"
assert remote_node, "remote nodeId missing"
assert remote_node in local_peers, f"remote nodeId {remote_node} not found in local peers {local_peers}"
assert local_node in remote_peers, f"local nodeId {local_node} not found in remote peers {remote_peers}"

needles = ["bootstrap", "dial", "hello", "peer", "connected"]
jt = journal_text.lower()
if not any(n in jt for n in needles):
    raise SystemExit("[fail] remote journal missing peer/bootstrap/dial/hello evidence")

print("[ok] two-box network peer proof validated")
print(json.dumps({
    "ok": True,
    "local_node_id": local_node,
    "remote_node_id": remote_node,
    "local_peers": local_peers,
    "remote_peers": remote_peers,
    "local_head": local_head,
    "remote_head": remote_head,
    "local_ready": local_ready.get("ready"),
    "remote_ready": remote_ready.get("ready"),
    "local_gap": local_ready.get("gap"),
    "remote_gap": remote_ready.get("gap"),
    "local_txroot_live": local_ready.get("txroot_live"),
    "remote_txroot_live": remote_ready.get("txroot_live"),
    "journal_has_peer_clues": True,
}, indent=2))
PY

echo
echo "=== [4] success ==="
echo "[ok] two-box network peer proof green"
