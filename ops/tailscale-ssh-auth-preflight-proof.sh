#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

: "${ALIEN:?set ALIEN to an explicit non-retired remote SSH target}"
TARGET_GUARD="$(printf '%s\n' "$ALIEN" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    echo "VOID_CROSSBOX_BOOTSTRAP_EXPLICIT_TARGET_V1 HOLD: retired Alienware target is forbidden" >&2
    exit 2
    ;;
esac
OUT="${OUT:-/tmp/tailscale-ssh-auth-preflight-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== Tailscale SSH auth preflight proof ==="
echo "mutation=false"
echo "remote=$ALIEN"
echo "out=$OUT"

echo
echo "=== local ready ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > "$OUT/precision-ready.json"
python3 - "$OUT/precision-ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] Precision ready")
PY

echo
echo "=== remote ssh auth and ready check ==="
set +e
ssh -o BatchMode=yes \
    -o ConnectTimeout=8 \
    -o ServerAliveInterval=5 \
    -o ServerAliveCountMax=2 \
    "$ALIEN" \
    "cd /home/zoso/dev/void-node && hostname && git rev-parse --short HEAD && git describe --tags --always --dirty && curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json" \
    > "$OUT/remote-ssh-ready.txt" 2> "$OUT/remote-ssh-ready.err"
SSH_RC=$?
set -e

echo "ssh_rc=$SSH_RC"

if [ "$SSH_RC" != "0" ]; then
  echo "tailscale_ssh_auth_preflight=false"
  echo "reason=ssh_failed_or_requires_interactive_auth"
  echo "--- ssh stderr ---"
  cat "$OUT/remote-ssh-ready.err" || true
  echo "--- ssh stdout ---"
  cat "$OUT/remote-ssh-ready.txt" || true
  exit "$SSH_RC"
fi

cat "$OUT/remote-ssh-ready.txt"

tail -n 1 "$OUT/remote-ssh-ready.txt" > "$OUT/remote-ready.json"

python3 - "$OUT/remote-ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] remote SSH auth usable and node ready")
PY

echo
echo "[ok] Tailscale SSH auth preflight proof green"
