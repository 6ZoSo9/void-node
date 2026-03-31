#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ACCOUNT="${ACCOUNT:-remote-user-3}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
TS_NOW="$(date +%Y%m%d-%H%M%S)"
PLAINTEXT="${PLAINTEXT:-alienware remote product proof $TS_NOW}"

REMOTE_NODE_BASE="http://${ALIEN##*@}:4100"
REMOTE_HELPER_BASE="http://${ALIEN##*@}:4312/workcredits/devnet"
REMOTE_RELAYER_BASE="http://${ALIEN##*@}:4313"

echo "=== [1] baseline ==="
echo "--- local ready ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
echo "--- remote ready ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/__void/ready.json" ; echo
echo "--- remote helper pool ---"
curl -fsS --max-time 8 "$REMOTE_HELPER_BASE/pool.json" ; echo
echo "--- remote relayer health ---"
curl -fsS --max-time 8 "$REMOTE_RELAYER_BASE/api/wc-relayer/v1/health" ; echo
echo

echo "=== [2] run full remote product flow on Alienware ==="
OUT="$(
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "cd '$HOME/dev/void-node' && ACCOUNT='$ACCOUNT' WALLET='$WALLET' PLAINTEXT='$PLAINTEXT' bash ops/wc-demo-e2e.sh"
)"
printf '%s\n' "$OUT"

echo
echo "=== [3] verify remote surfaces from Precision ==="
echo "--- remote ready after ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/__void/ready.json" ; echo
echo "--- remote datanet after ---"
curl -fsS --max-time 8 "$REMOTE_NODE_BASE/datanet/v1/status" ; echo
echo "--- remote relayer health after ---"
curl -fsS --max-time 8 "$REMOTE_RELAYER_BASE/api/wc-relayer/v1/health" ; echo
echo "--- remote quote after ---"
curl -fsS --max-time 12 \
  -H 'content-type: application/json' \
  -X POST "$REMOTE_RELAYER_BASE/api/wc-relayer/v1/quote" \
  --data "{\"side\":\"wc_to_void\",\"amount\":1,\"wallet\":\"$WALLET\"}" ; echo
echo

echo "=== [4] extract proof summary from script output ==="
TMP_OUT="/tmp/two-box-remote-product-proof.out.$$"
printf '%s\n' "$OUT" > "$TMP_OUT"
python3 - "$TMP_OUT" <<'PY'
import sys, json, pathlib
txt = pathlib.Path(sys.argv[1]).read_text()
start = txt.rfind('{\n  "ok": true,')
if start == -1:
    print("[fail] summary json block not found in output", file=sys.stderr)
    raise SystemExit(1)
tail = txt[start:]
depth = 0
end = None
for i, ch in enumerate(tail):
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end is None:
    print("[fail] could not close summary json block", file=sys.stderr)
    raise SystemExit(1)
obj = json.loads(tail[:end])
print(json.dumps(obj, indent=2))
PY
rm -f "$TMP_OUT"
echo

echo "=== [5] success ==="
echo "[ok] two-box remote product proof green"
