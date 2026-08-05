#!/usr/bin/env bash
set -euo pipefail

: "${VPS_HOST:?missing VPS_HOST}"

VPS_USER="${VPS_USER:-zoso}"
VPS_PORT="${VPS_PORT:-8080}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/$VPS_USER/dev/void-node}"
REPO_URL="${REPO_URL:-https://github.com/6ZoSo9/void-node.git}"
VOID_SEED_UPSTREAM="${VOID_SEED_UPSTREAM:-http://100.122.79.39:4100}"
VOID_EARN_COORDINATOR_UPSTREAM="${VOID_EARN_COORDINATOR_UPSTREAM:-}"

validate_http_origin() {
  python3 - "$1" "$2" <<'PY'
import sys
from urllib.parse import urlsplit
raw = sys.argv[1].strip()
allow_empty = sys.argv[2] == "1"
if not raw and allow_empty:
    print("")
    raise SystemExit(0)
parsed = urlsplit(raw)
if parsed.scheme != "http" or not parsed.hostname:
    raise SystemExit("upstream origin must use http with a host")
if parsed.username or parsed.password or parsed.query or parsed.fragment:
    raise SystemExit("upstream origin must not contain credentials, query, or fragment")
if parsed.path not in {"", "/"}:
    raise SystemExit("upstream origin must not contain a path")
if any(ch in raw for ch in ("\n", "\r", "\x00", "'")):
    raise SystemExit("upstream origin contains forbidden characters")
print(parsed.scheme + "://" + parsed.netloc)
PY
}

VOID_SEED_UPSTREAM="$(validate_http_origin "$VOID_SEED_UPSTREAM" 0)"
VOID_EARN_COORDINATOR_UPSTREAM="$(
  validate_http_origin "$VOID_EARN_COORDINATOR_UPSTREAM" 1
)"

case "$VPS_HOST:$VPS_USER:$REMOTE_ROOT:$REPO_URL" in
  *"'"*|*$'\n'*|*$'\r'*)
    echo "deployment arguments contain forbidden characters" >&2
    exit 1
    ;;
esac

echo "=== VOID deploy VPS public seed adapter v2 ==="
echo "vps=$VPS_USER@$VPS_HOST"
echo "remote_root=$REMOTE_ROOT"
echo "port=$VPS_PORT"
echo "upstream=$VOID_SEED_UPSTREAM"
if [ -n "$VOID_EARN_COORDINATOR_UPSTREAM" ]; then
  echo "earn_coordinator_bound=true"
else
  echo "earn_coordinator_bound=false"
fi

ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "
set -euo pipefail

REMOTE_ROOT='$REMOTE_ROOT'
REPO_URL='$REPO_URL'
VPS_PORT='$VPS_PORT'
VOID_SEED_UPSTREAM='$VOID_SEED_UPSTREAM'
VOID_EARN_COORDINATOR_UPSTREAM='$VOID_EARN_COORDINATOR_UPSTREAM'

mkdir -p \"\$(dirname \"\$REMOTE_ROOT\")\"

if [ -d \"\$REMOTE_ROOT/.git\" ]; then
  cd \"\$REMOTE_ROOT\"
  git fetch --tags origin main
  git merge --ff-only origin/main
else
  git clone \"\$REPO_URL\" \"\$REMOTE_ROOT\"
  cd \"\$REMOTE_ROOT\"
  git fetch --tags origin main
fi

git describe --tags --always --dirty

VOID_NODE_ROOT=\"\$REMOTE_ROOT\" \
VOID_SEED_UPSTREAM=\"\$VOID_SEED_UPSTREAM\" \
VOID_EARN_COORDINATOR_UPSTREAM=\"\$VOID_EARN_COORDINATOR_UPSTREAM\" \
VOID_ADAPTER_HOST=0.0.0.0 \
VOID_ADAPTER_PORT=\"\$VPS_PORT\" \
START_SERVICE=1 \
bash ops/public/install-vps-public-seed-adapter-v2.sh

sleep 5

systemctl --user show void-vps-public-seed-adapter.service -p MainPID -p ActiveState -p SubState -p UnitFileState

curl -fsS --max-time 8 http://127.0.0.1:\$VPS_PORT/__void/adapter.json >/tmp/void-vps-adapter.json
python3 -m json.tool /tmp/void-vps-adapter.json >/dev/null

curl -fsS --max-time 8 http://127.0.0.1:\$VPS_PORT/__void/ready.json >/tmp/void-vps-ready.json
python3 -m json.tool /tmp/void-vps-ready.json >/dev/null

RPC_CODE=\"\$(curl -sS -o /tmp/void-vps-rpc.out -w \"%{http_code}\" --max-time 8 http://127.0.0.1:\$VPS_PORT/rpc)\"
test \"\$RPC_CODE\" = \"404\"
grep -Fq \"not_public\" /tmp/void-vps-rpc.out

if [ -n \"\$VOID_EARN_COORDINATOR_UPSTREAM\" ]; then
  curl -fsS --max-time 8 \
    http://127.0.0.1:\$VPS_PORT/__void/public-earn-gateway-v1/status.json \
    >/tmp/void-vps-earn-gateway.json
  python3 - /tmp/void-vps-earn-gateway.json <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_PUBLIC_EARN_GATEWAY_V1", j
assert j.get("enabled") is True, j
PY
fi

echo \"[ok] VPS local adapter smoke passed\"
"
