#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1"
LEGACY_MARKER="VOID_CROSSBOX_BOOTSTRAP_EXPLICIT_TARGET_V1"
ROOT="${VOID_REPO:-$HOME/dev/void-node}"
ALIEN="${ALIEN:-}"
: "${ALIEN:?set ALIEN to an explicit non-retired remote SSH target}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

[ -n "$ALIEN" ] || hold "missing explicit ALIEN remote SSH target"
valid_ssh_target "$ALIEN" || hold "ALIEN must be a destination-only SSH alias or user@host"

TARGET_GUARD="$(printf '%s\n' "$ALIEN" | tr '[:upper:]' '[:lower:]')"
case "$TARGET_GUARD" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

cd "$ROOT" || hold "repository root unavailable"

OUT="${OUT:-/tmp/tailscale-ssh-auth-preflight-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== Tailscale SSH auth preflight proof ==="
echo "marker=$MARKER"
echo "mutation=false"
echo "remote=$ALIEN"
echo "out=$OUT"

echo
echo "=== local ready ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > "$OUT/precision-ready.json"
python3 - "$OUT/precision-ready.json" <<'PY'
import json, sys
value=json.load(open(sys.argv[1]))
assert value.get("ready") is True, value
assert int(value.get("gap", -1)) == 0, value
assert int(value.get("txroot_live", 0)) == 1, value
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
value=json.load(open(sys.argv[1]))
assert value.get("ready") is True, value
assert int(value.get("gap", -1)) == 0, value
assert int(value.get("txroot_live", 0)) == 1, value
print("[ok] remote SSH auth usable and node ready")
PY

echo
echo "[ok] Tailscale SSH auth preflight proof green"
