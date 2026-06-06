#!/usr/bin/env bash
set -euo pipefail

HOST="${VOID_EDGE_HOST:-100.122.79.39}"
SSH_USER="${VOID_SSH_USER:-zoso}"
EDGE_PORT="${VOID_EDGE_PORT:-8080}"

echo "=== VOID Alienware Funnel public seed v1 ==="
echo "host=$HOST"
echo "edge_port=$EDGE_PORT"

ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_USER@$HOST" "
set -euo pipefail

echo '=== verify edge adapter before funnel ==='
curl -fsS --max-time 8 http://127.0.0.1:$EDGE_PORT/__void/adapter.json >/tmp/void-edge-adapter.json
python3 -m json.tool /tmp/void-edge-adapter.json >/dev/null

curl -fsS --max-time 8 http://127.0.0.1:$EDGE_PORT/__void/ready.json >/tmp/void-edge-ready.json
python3 -m json.tool /tmp/void-edge-ready.json >/dev/null

RPC_CODE=\"\$(curl -sS -o /tmp/void-edge-rpc.out -w '%{http_code}' --max-time 8 http://127.0.0.1:$EDGE_PORT/rpc)\"
test \"\$RPC_CODE\" = '404'
grep -Fq 'not_public' /tmp/void-edge-rpc.out

echo '[ok] local edge safe before funnel'

echo
echo '=== start tailscale funnel ==='
tailscale funnel --bg $EDGE_PORT

echo
echo '=== funnel status ==='
tailscale funnel status
tailscale funnel status --json >/tmp/void-funnel-status.json || true
cat /tmp/void-funnel-status.json 2>/dev/null || true
"

echo
echo "=== derive Funnel URL ==="
FUNNEL_URL="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_USER@$HOST" '
set -euo pipefail
tailscale funnel status 2>/dev/null | grep -Eo "https://[^ ]+" | head -1 || true
')"

if [ -z "$FUNNEL_URL" ]; then
  echo "[fail] could not derive Funnel URL from tailscale funnel status"
  echo "Run manually on Alienware: tailscale funnel status"
  exit 1
fi

FUNNEL_URL="${FUNNEL_URL%/}"
echo "FUNNEL_URL=$FUNNEL_URL"

echo
echo "=== public proof through Funnel URL ==="
PUBLIC_SEED_BASE="$FUNNEL_URL" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo
echo "[ok] Alienware Funnel public seed v1 green"
