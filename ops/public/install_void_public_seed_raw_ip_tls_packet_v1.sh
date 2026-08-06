#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_INSTALL_V1"
CONFIRM="${VOID_PUBLIC_SEED_INSTALL_CONFIRM:-}"
START="${VOID_PUBLIC_SEED_START_SERVICES:-0}"
APPLY_FIREWALL="${VOID_PUBLIC_SEED_APPLY_FIREWALL:-0}"
PACKET="${1:-}"
REPO_ROOT="${2:-$PWD}"

hold() {
  printf '%s_FAIL: %s\n' "$MARKER" "$*" >&2
  exit 1
}

test "$(id -u)" = 0 || hold "installer must run as root"
test "$CONFIRM" = "install-raw-ip-tls-ingress-v1" ||
  hold "explicit confirmation token is required"
test -n "$PACKET" && test -d "$PACKET" && test ! -L "$PACKET" ||
  hold "packet directory is missing or symlinked"
test -d "$REPO_ROOT" && test ! -L "$REPO_ROOT" ||
  hold "repository root is missing or symlinked"

PACKET="$(readlink -f "$PACKET")"
REPO_ROOT="$(readlink -f "$REPO_ROOT")"

test -d "$REPO_ROOT/.git" || hold "repository root is not a Git checkout"
PACKET_SOURCE="$(
  node -e '
    const fs = require("node:fs");
    const packet = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (!/^[0-9a-f]{40}$/.test(String(packet.source_sha || ""))) process.exit(1);
    process.stdout.write(packet.source_sha);
  ' "$PACKET/packet.json"
)" || hold "packet source SHA is invalid"
test "$(git -C "$REPO_ROOT" rev-parse HEAD)" = "$PACKET_SOURCE" ||
  hold "repository head does not match packet source"
test -z "$(git -C "$REPO_ROOT" status --porcelain=v1)" ||
  hold "repository must be completely clean"

node "$REPO_ROOT/scripts/verify_void_public_seed_raw_ip_tls_packet_v1.mjs" "$PACKET"

if ! getent passwd voidseed >/dev/null; then
  useradd --system --home-dir /var/lib/void-public-seed --create-home \
    --shell /usr/sbin/nologin voidseed
fi
test "$(getent passwd voidseed | cut -d: -f7)" = "/usr/sbin/nologin" ||
  hold "voidseed account has unexpected shell"

install -d -o root -g root -m 0755 /usr/local/libexec
install -d -o voidseed -g voidseed -m 0700 \
  /var/lib/void-public-seed \
  /var/lib/void-public-seed/acme-webroot \
  /var/lib/void-public-seed/acme-webroot/.well-known \
  /var/lib/void-public-seed/acme-webroot/.well-known/acme-challenge \
  /var/lib/void-public-seed/tls \
  /var/lib/void-public-seed/tls/current
install -d -o root -g root -m 0755 /etc/systemd/system /etc/nftables.d

install -o root -g root -m 0755 \
  "$PACKET/void-public-seed-ip-tls-proxy-v1.mjs" \
  /usr/local/libexec/void-public-seed-ip-tls-proxy-v1.mjs
install -o root -g root -m 0644 \
  "$PACKET/void-public-seed-gateway-v1.mjs" \
  /usr/local/libexec/void-public-seed-gateway-v1.mjs
install -o root -g root -m 0755 \
  "$PACKET/void-public-seed-ip-cert-deploy-hook-v1.sh" \
  /usr/local/libexec/void-public-seed-ip-cert-deploy-hook-v1.sh

cmp -s -- \
  "$PACKET/void-public-seed-ip-tls-proxy-v1.mjs" \
  /usr/local/libexec/void-public-seed-ip-tls-proxy-v1.mjs ||
  hold "installed TLS proxy differs from verified packet"
cmp -s -- \
  "$PACKET/void-public-seed-gateway-v1.mjs" \
  /usr/local/libexec/void-public-seed-gateway-v1.mjs ||
  hold "installed gateway differs from verified packet"
cmp -s -- \
  "$PACKET/void-public-seed-ip-cert-deploy-hook-v1.sh" \
  /usr/local/libexec/void-public-seed-ip-cert-deploy-hook-v1.sh ||
  hold "installed certificate hook differs from verified packet"

for unit in \
  void-public-seed-gateway-v1.service \
  void-public-seed-ip-tls-proxy-v1.service \
  void-public-seed-ip-cert-renew-v1.service \
  void-public-seed-ip-cert-renew-v1.timer
do
  install -o root -g root -m 0644 "$PACKET/$unit" "/etc/systemd/system/$unit"
done

install -o root -g root -m 0600 \
  "$PACKET/nftables-void-public-seed-v1.conf" \
  /etc/nftables.d/void-public-seed-v1.conf

systemd-analyze verify \
  /etc/systemd/system/void-public-seed-gateway-v1.service \
  /etc/systemd/system/void-public-seed-ip-tls-proxy-v1.service \
  /etc/systemd/system/void-public-seed-ip-cert-renew-v1.service \
  /etc/systemd/system/void-public-seed-ip-cert-renew-v1.timer

systemctl daemon-reload
systemctl enable void-public-seed-gateway-v1.service
systemctl enable void-public-seed-ip-tls-proxy-v1.service
systemctl enable void-public-seed-ip-cert-renew-v1.timer

if test "$APPLY_FIREWALL" = 1; then
  nft -c -f /etc/nftables.d/void-public-seed-v1.conf
  nft list table inet void_public_seed_v1 >/dev/null 2>&1 &&
    nft delete table inet void_public_seed_v1
  nft -f /etc/nftables.d/void-public-seed-v1.conf
fi

if test "$START" = 1; then
  systemctl start void-public-seed-gateway-v1.service
  systemctl start void-public-seed-ip-tls-proxy-v1.service
fi

printf '%s\n' \
  "${MARKER}_GREEN" \
  "services_started=$([ "$START" = 1 ] && echo true || echo false)" \
  "firewall_applied=$([ "$APPLY_FIREWALL" = 1 ] && echo true || echo false)" \
  "certificate_requested=false" \
  "manifest_published=false" \
  "credentials_accessed=false" \
  "wallet_signer_validator_wc_money_authority=0"
