#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
HTTP_PORT="${HTTP_PORT:-4100}"
TS_IP="${TS_IP:-$(tailscale ip -4 2>/dev/null | head -n1)}"
PUBLIC_BASE="${PUBLIC_LOCAL_NODE_BASE:-http://${TS_IP}:${HTTP_PORT}}"
DROPIN="${DROPIN:-$HOME/.config/systemd/user/void-node.service.d/98-tailnet-http.conf}"
OUT="${OUT:-/tmp/tailnet-http-public-base-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== tailnet HTTP public base proof ==="
echo "mutation=false"
echo "alien=$ALIEN"
echo "ts_ip=$TS_IP"
echo "public_base=$PUBLIC_BASE"
echo "dropin=$DROPIN"

if [ -z "$TS_IP" ]; then
  echo "[ERR] tailscale IPv4 address missing"
  exit 1
fi

echo
echo "=== [1] systemd drop-in exists and advertises current tailnet HTTP base ==="
test -f "$DROPIN"

grep -q '^Environment=HTTP_HOST=0\.0\.0\.0$' "$DROPIN"
grep -q "^Environment=PUBLIC_HTTP_BASE=${PUBLIC_BASE}$" "$DROPIN"

systemctl --user cat void-node.service > "$OUT/systemd-cat.txt"
grep -q 'Environment=HTTP_HOST=0.0.0.0' "$OUT/systemd-cat.txt"
grep -q "Environment=PUBLIC_HTTP_BASE=${PUBLIC_BASE}" "$OUT/systemd-cat.txt"

echo "[ok] drop-in and effective systemd config present"

echo
echo "=== [2] socket is bound beyond localhost ==="
ss -ltnp > "$OUT/sockets.txt"
grep -Eq "0\.0\.0\.0:${HTTP_PORT}|\\[::\\]:${HTTP_PORT}" "$OUT/sockets.txt"

echo "[ok] HTTP socket is externally reachable on this host"

echo
echo "=== [3] local ready through localhost and tailnet base ==="
curl -fsS --max-time 8 "http://127.0.0.1:${HTTP_PORT}/__void/ready.json" > "$OUT/local-ready.json"
curl -fsS --max-time 8 "${PUBLIC_BASE}/__void/ready.json" > "$OUT/tailnet-ready.json"

python3 - "$OUT/local-ready.json" "$OUT/tailnet-ready.json" <<'PY'
import json, sys
for path in sys.argv[1:]:
    j=json.load(open(path))
    assert j.get("ready") is True, (path, j)
    assert int(j.get("gap", -1)) == 0, (path, j)
    assert int(j.get("txroot_live", 0)) == 1, (path, j)
print("[ok] local and tailnet ready are green")
PY

echo
echo "=== [4] Alienware can reach Precision public base ==="
ssh "$ALIEN" "curl -fsS --max-time 8 '${PUBLIC_BASE}/__void/ready.json'" > "$OUT/alien-reaches-precision-ready.json"

python3 - "$OUT/alien-reaches-precision-ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] Alienware can reach Precision tailnet HTTP")
PY

echo
echo "=== [5] functional backstop: participant share/open E2E ==="
PUBLIC_LOCAL_NODE_BASE="$PUBLIC_BASE" make participant-share-open-e2e-proof

echo
echo "=== [6] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - "$TS_IP" "$PUBLIC_BASE" <<'PY'
import json, sys
print(json.dumps({
  "tailnet_http_public_base_v1": "green",
  "ts_ip": sys.argv[1],
  "public_base": sys.argv[2],
  "dropin": "98-tailnet-http.conf",
  "http_host": "0.0.0.0",
  "alienware_can_reach_precision_http": True,
  "participant_share_open_e2e": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}, indent=2))
PY

echo
echo "[ok] tailnet HTTP public base proof passed"
