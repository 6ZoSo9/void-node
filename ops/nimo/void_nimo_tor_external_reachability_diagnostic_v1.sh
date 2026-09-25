#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_TOR_EXTERNAL_REACHABILITY_DIAGNOSTIC_V1"
REPO="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_MAIN="b3dd74142ce33ffe3c456a42822e98eee885e4d9"
TOR_UNIT="void-public-seed-tor-v1.service"
GATEWAY_UNIT="void-public-seed-tor-gateway-v1.service"
NODE_UNIT="void-nimo-tor-bootstrap-node-v4.service"
TORRC="$HOME/.config/void/tor-public-seed-v1/torrc"
DATA_ROOT="$HOME/.local/share/void/tor-public-seed-v1"
HS_DIR="$DATA_ROOT/hidden-service"
HOSTNAME_FILE="$HS_DIR/hostname"
READY="http://127.0.0.1:4100/__void/ready.json"
GATEWAY_READY="http://127.0.0.1:4111/__void/ready.json"

echo "$MARKER"
echo "repo=$REPO"
echo "expected_main=$EXPECTED_MAIN"
echo "filesystem_read_only=true"
echo "journal_read_only=true"
echo "service_action=false"
echo "signal_action=false"
echo "tor_identity_mutation=false"
echo "private_key_content_read=false"
echo "wallet_or_signer_access=false"
echo "transaction_signing=false"
echo "transaction_broadcast=false"
echo "chain2050_write=false"
echo "funds_movement=false"

for cmd in git systemctl journalctl curl ss stat sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "REFUSE: missing command: $cmd" >&2
    exit 2
  }
done

test "$(git -C "$REPO" branch --show-current)" = "main" || {
  echo "REFUSE: repository is not on main" >&2
  exit 3
}
test -z "$(git -C "$REPO" status --porcelain=v1)" || {
  echo "REFUSE: repository is dirty" >&2
  exit 3
}
echo "repo_head=$(git -C "$REPO" rev-parse HEAD)"
echo "origin_main=$(git -C "$REPO" rev-parse origin/main 2>/dev/null || true)"

echo
echo "=== UNIT STATE ==="
for unit in "$NODE_UNIT" "$GATEWAY_UNIT" "$TOR_UNIT"; do
  echo "unit=$unit"
  systemctl --user show "$unit"     -p LoadState -p ActiveState -p SubState -p MainPID     -p ExecMainStartTimestamp -p ExecMainExitTimestamp     -p NRestarts -p Result --no-pager || true
done

echo
echo "=== TOR CONFIG PUBLIC FIELDS ==="
test -f "$TORRC" || { echo "torrc_missing=true"; exit 4; }
echo "torrc_sha256=$(sha256sum "$TORRC" | awk '{print $1}')"
grep -E '^(DataDirectory|SocksPort|SafeSocks|SafeLogging|ClientOnly|RunAsDaemon|Log|HiddenServiceDir|HiddenServiceVersion|HiddenServicePort|PublishHidServDescriptors)([[:space:]]|$)' "$TORRC" || true

echo
echo "=== ONION IDENTITY METADATA ==="
test -f "$HOSTNAME_FILE" || { echo "hostname_missing=true"; exit 4; }
onion="$(tr -d '\r\n' < "$HOSTNAME_FILE")"
echo "onion_hostname=$onion"
stat -c 'hidden_service_dir_mode=%a uid=%u gid=%g mtime=%y' "$HS_DIR"
stat -c 'hostname_mode=%a uid=%u gid=%g size=%s mtime=%y' "$HOSTNAME_FILE"
for name in hs_ed25519_public_key hs_ed25519_secret_key; do
  p="$HS_DIR/$name"
  if test -e "$p"; then
    stat -c "$name mode=%a uid=%u gid=%g size=%s mtime=%y" "$p"
  else
    echo "$name=missing"
  fi
done
if test -d "$HS_DIR/authorized_clients"; then
  count="$(find "$HS_DIR/authorized_clients" -maxdepth 1 -type f | wc -l)"
  echo "authorized_clients_directory=true"
  echo "authorized_client_file_count=$count"
else
  echo "authorized_clients_directory=false"
  echo "authorized_client_file_count=0"
fi

echo
echo "=== LOOPBACK HEALTH ==="
printf 'node_ready='
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$READY" || true
echo
printf 'gateway_ready='
curl -fsS --noproxy '*' --connect-timeout 2 --max-time 5 "$GATEWAY_READY" || true
echo

echo
echo "=== LISTENERS ==="
ss -H -ltnp 2>/dev/null | grep -E '(:4100|:4111|:19051|:9050)([[:space:]]|$)' || true

echo
echo "=== NETWORK ROUTES ==="
ip -4 route show default || true
ip -6 route show default || true

echo
echo "=== USER TOR JOURNAL FILTERED ==="
journalctl --user -u "$TOR_UNIT"   --since '2026-09-24 16:00:00'   --no-pager -o short-iso 2>/dev/null |
  grep -Ei 'bootstrap|hidden|onion|descriptor|intro|rend|hsdir|upload|publish|warn|error|fail|circuit|clock|consensus' |
  tail -n 400 || true

echo
echo "=== USER TOR JOURNAL TAIL ==="
journalctl --user -u "$TOR_UNIT" -n 160 --no-pager -o short-iso 2>/dev/null || true

echo
echo "=== GATEWAY JOURNAL TAIL ==="
journalctl --user -u "$GATEWAY_UNIT" -n 100 --no-pager -o short-iso 2>/dev/null || true

echo
echo "${MARKER}_GREEN"
echo "diagnostic_only=true"
echo "next_gate=interpret_descriptor_publication_and_external_timeout"
