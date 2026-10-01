#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_SITE_BUNDLE_PEER_ENV_PERSISTENCE_V1"
ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ALIEN="${ALIEN:-}"
LOCAL_PEER="${LOCAL_PEER:-}"
REMOTE_PEER="${REMOTE_PEER:-}"
CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE="${CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE:-}"
DROPIN_NAME="${DROPIN_NAME:-97-site-bundle-peers.conf}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  case "$target" in
    -*|*" "*|*
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
echo "marker=$MARKER"
echo "mutation=systemd_user_service_dropin_only"
echo "explicit_remote_target=true"
echo "retired_alienware_target=false"
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
ALIEN="$ALIEN" make void-public-site-bundle-auto-materialize-proof || FAIL=1
ALIEN="$ALIEN" make void-public-site-bundle-peer-readiness-proof || FAIL=1
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
\t'*|*
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
echo "marker=$MARKER"
echo "mutation=systemd_user_service_dropin_only"
echo "explicit_remote_target=true"
echo "retired_alienware_target=false"
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
ALIEN="$ALIEN" make void-public-site-bundle-auto-materialize-proof || FAIL=1
ALIEN="$ALIEN" make void-public-site-bundle-peer-readiness-proof || FAIL=1
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
\r'*|*
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
echo "marker=$MARKER"
echo "mutation=systemd_user_service_dropin_only"
echo "explicit_remote_target=true"
echo "retired_alienware_target=false"
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
ALIEN="$ALIEN" make void-public-site-bundle-auto-materialize-proof || FAIL=1
ALIEN="$ALIEN" make void-public-site-bundle-peer-readiness-proof || FAIL=1
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
\n'*) return 1 ;;
  esac
  [[ "$target" =~ ^([A-Za-z0-9._-]+@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

safe_peer(){
  local peer="$1"
  [[ "$peer" =~ ^https?://[A-Za-z0-9][A-Za-z0-9._-]*:4100$ ]]
}

safe_dropin_name(){
  local name="$1"
  [ "$name" != "." ] &&
  [ "$name" != ".." ] &&
  [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]
}

require_crossbox_source_parity(){
  local local_status local_head local_host local_short remote_truth remote_host remote_head
  local_status="$(git -C "$ROOT" status --porcelain=v1 --untracked-files=all)" \
    || hold "local repository status unavailable"
  [ -z "$local_status" ] || hold "local repository must be clean before mutation"
  local_head="$(git -C "$ROOT" rev-parse HEAD)" \
    || hold "local repository HEAD unavailable"
  [[ "$local_head" =~ ^[0-9a-f]{40}$ ]] || hold "local repository HEAD invalid"

  remote_truth="$(
    ssh -o BatchMode=yes -o ConnectTimeout=6 "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
printf "%s\n%s\n" "$(hostname)" "$(git rev-parse HEAD)"
'
  )" || hold "remote clean repository identity unavailable"

  remote_host="$(printf '%s\n' "$remote_truth" | sed -n '1p')"
  remote_head="$(printf '%s\n' "$remote_truth" | sed -n '2p')"
  [[ "$remote_head" =~ ^[0-9a-f]{40}$ ]] || hold "remote repository HEAD invalid"
  [ "$remote_head" = "$local_head" ] || hold "local/remote repository HEAD mismatch"

  local_host="$(hostname)"
  local_short="$(hostname -s)"
  [ -n "$remote_host" ] || hold "remote hostname missing"
  [ "$remote_host" != "$local_host" ] || hold "remote resolved to local host"
  [ "$remote_host" != "$local_short" ] || hold "remote resolved to local host"

  echo "local_source_head=$local_head"
  echo "remote_source_head=$remote_head"
  echo "remote_source_host=$remote_host"
  echo "crossbox_source_parity=true"
}

[ -n "$ALIEN" ] || hold "missing explicit ALIEN remote SSH target"
[ -n "$LOCAL_PEER" ] || hold "missing explicit LOCAL_PEER"
[ -n "$REMOTE_PEER" ] || hold "missing explicit REMOTE_PEER"
valid_ssh_target "$ALIEN" || hold "invalid explicit ALIEN SSH target"
safe_peer "$LOCAL_PEER" || hold "unsafe LOCAL_PEER"
safe_peer "$REMOTE_PEER" || hold "unsafe REMOTE_PEER"
safe_dropin_name "$DROPIN_NAME" || hold "unsafe DROPIN_NAME"

target_guard="$(printf '%s\n' "$ALIEN" "$LOCAL_PEER" "$REMOTE_PEER" | tr '[:upper:]' '[:lower:]')"
case "$target_guard" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

[ "$CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE" = "applyVoidSiteBundlePeerEnvPersistenceV1" ] \
  || hold "confirmation token required"

cd "$ROOT" || exit 1
require_crossbox_source_parity

LOCAL_DROPIN="$HOME/.config/systemd/user/void-node.service.d/$DROPIN_NAME"

FAIL=0
ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

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
echo "marker=$MARKER"
echo "mutation=systemd_user_service_dropin_only"
echo "explicit_remote_target=true"
echo "retired_alienware_target=false"
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
ALIEN="$ALIEN" make void-public-site-bundle-auto-materialize-proof || FAIL=1
ALIEN="$ALIEN" make void-public-site-bundle-peer-readiness-proof || FAIL=1
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
