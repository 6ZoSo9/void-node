#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_PEER="${LOCAL_PEER:-http://100.122.79.39:4100}"
REMOTE_PEER="${REMOTE_PEER:-http://100.93.2.116:4100}"
DROPIN_NAME="${DROPIN_NAME:-97-site-bundle-peers.conf}"
LOCAL_DROPIN="$HOME/.config/systemd/user/void-node.service.d/$DROPIN_NAME"

FAIL=0
ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

safe_peer(){
  local peer="$1"
  case "$peer" in
    http://*:4100|https://*:4100) ;;
    *) return 1 ;;
  esac
  printf '%s' "$peer" | grep -Eq '[[:space:]"'\''`;$\\]' && return 1
  return 0
}

wait_ready(){
  local label="$1"
  local url="$2"
  local i
  for i in $(seq 1 25); do
    if curl -fsS --max-time 3 "$url/__void/ready.json" >/tmp/void-ready-"$label".json 2>/dev/null; then
      python3 - "/tmp/void-ready-$label.json" "$label" <<'PY' || return 1
import json, sys
j=json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print(f"[ok] {sys.argv[2]} ready/gap/txroot")
PY
      return 0
    fi
    sleep 1
  done
  return 1
}

write_local_dropin(){
  local peer="$1"
  safe_peer "$peer" || { fail "unsafe local peer: $peer"; return; }

  mkdir -p "$(dirname "$LOCAL_DROPIN")"
  cat > "$LOCAL_DROPIN" <<EOF
[Service]
Environment=VOID_SITE_BUNDLE_PEERS=$peer
EOF

  systemctl --user daemon-reload
  systemctl --user unset-environment VOID_SITE_BUNDLE_PEERS VOID_DATANET_SITE_BUNDLE_PEERS VOID_DATANET_PEERS VOID_DRIFT_PEER 2>/dev/null || true
  systemctl --user restart void-node.service
  wait_ready local http://127.0.0.1:4100 || fail "local ready after durable peer drop-in"
}

write_remote_dropin(){
  local peer="$1"
  safe_peer "$peer" || { fail "unsafe remote peer: $peer"; return; }

  ssh "$ALIEN" "PEER='$peer' DROPIN_NAME='$DROPIN_NAME' bash -s" <<'REMOTE' || {
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

DROPIN="$HOME/.config/systemd/user/void-node.service.d/$DROPIN_NAME"
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<EOF
[Service]
Environment=VOID_SITE_BUNDLE_PEERS=$PEER
EOF

systemctl --user daemon-reload
systemctl --user unset-environment VOID_SITE_BUNDLE_PEERS VOID_DATANET_SITE_BUNDLE_PEERS VOID_DATANET_PEERS VOID_DRIFT_PEER 2>/dev/null || true
systemctl --user restart void-node.service

for i in $(seq 1 25); do
  if curl -fsS --max-time 3 http://127.0.0.1:4100/__void/ready.json >/tmp/void-ready-remote.json 2>/dev/null; then
    python3 - /tmp/void-ready-remote.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] remote ready/gap/txroot")
PY
    exit 0
  fi
  sleep 1
done

echo "[fail] remote ready after durable peer drop-in"
exit 1
REMOTE
    fail "remote drop-in install/restart"
  }
}

check_local(){
  echo
  echo "=== local durable peer env check ==="
  git status --short
  git rev-parse --short HEAD
  git describe --tags --always --dirty

  if systemctl --user show-environment | grep -qE '^VOID_SITE_BUNDLE_PEERS='; then
    fail "local transient manager env still has VOID_SITE_BUNDLE_PEERS"
  else
    ok "local transient manager env cleared"
  fi

  systemctl --user cat void-node.service | tee /tmp/void-local-unit-site-peer.txt >/dev/null
  grep -q "Environment=VOID_SITE_BUNDLE_PEERS=$LOCAL_PEER" /tmp/void-local-unit-site-peer.txt \
    && ok "local service drop-in persists peer" \
    || fail "local service drop-in missing peer"

  systemctl --user show void-node.service --property=Environment --no-pager | grep -q "VOID_SITE_BUNDLE_PEERS=$LOCAL_PEER" \
    && ok "local effective unit environment includes peer" \
    || fail "local effective unit environment missing peer"
}

check_remote(){
  echo
  echo "=== remote durable peer env check ==="
  ssh "$ALIEN" "REMOTE_PEER='$REMOTE_PEER' bash -s" <<'REMOTE' | tee /tmp/void-remote-site-peer-check.txt
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

if systemctl --user show-environment | grep -qE '^VOID_SITE_BUNDLE_PEERS='; then
  echo "[fail] remote transient manager env still has VOID_SITE_BUNDLE_PEERS"
else
  echo "[ok] remote transient manager env cleared"
fi

systemctl --user cat void-node.service | grep -F "Environment=VOID_SITE_BUNDLE_PEERS=$REMOTE_PEER" \
  && echo "[ok] remote service drop-in persists peer" \
  || echo "[fail] remote service drop-in missing peer"

systemctl --user show void-node.service --property=Environment --no-pager | grep -F "VOID_SITE_BUNDLE_PEERS=$REMOTE_PEER" \
  && echo "[ok] remote effective unit environment includes peer" \
  || echo "[fail] remote effective unit environment missing peer"

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo
REMOTE

  grep -q '\[fail\]' /tmp/void-remote-site-peer-check.txt && fail "remote peer env check failed" || ok "remote peer env checks passed"
}

echo "=== VOID site bundle peer env persistence proof ==="
echo "mutation=systemd_user_service_dropin_only"
echo "local_peer=$LOCAL_PEER"
echo "remote_peer=$REMOTE_PEER"
echo

echo "=== [1] install durable drop-ins and clear transient manager env ==="
write_local_dropin "$LOCAL_PEER"
write_remote_dropin "$REMOTE_PEER"

echo
echo "=== [2] verify durable service env on both boxes ==="
check_local
check_remote

echo
echo "=== [3] prove site bundle auto-materialization still works from durable env ==="
make void-public-site-bundle-auto-materialize-proof || FAIL=1
make void-public-site-bundle-peer-readiness-proof || FAIL=1
make void-public-site-bundle-proof || FAIL=1
make mainnet0-status-smoke || FAIL=1
make mainnet0-crossbox-status-smoke || FAIL=1

echo
echo "=== [4] summary ==="
python3 - <<PY
print({
  "site_bundle_peer_env_persistence": "green" if $FAIL == 0 else "failed",
  "mutation": "systemd_user_service_dropin_only",
  "local_peer": "$LOCAL_PEER",
  "remote_peer": "$REMOTE_PEER",
  "transient_manager_env_required": False,
  "durable_dropin": "$DROPIN_NAME"
})
PY

if [ "$FAIL" -eq 0 ]; then
  echo "[ok] VOID site bundle peer env persistence proof passed"
  exit 0
fi

echo "[fail] VOID site bundle peer env persistence proof failed"
exit 1
