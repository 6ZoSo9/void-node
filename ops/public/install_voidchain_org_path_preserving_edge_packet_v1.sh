#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_INSTALLER_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
PACKET_DIR="${1:-${VOIDCHAIN_ORG_PATH_EDGE_PACKET_DIR:-}}"
START_EDGE="${VOIDCHAIN_ORG_PATH_EDGE_START:-0}"
UNIT_NAME="voidchain-org-path-preserving-edge-v1.service"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
EDGE_ORIGIN="http://127.0.0.1:8080"

say() { printf '%s\n' "$*"; }
hold() { say "HOLD: $*" >&2; exit 1; }
cleanup() { rm -f "${TMP_READY:-}" "${TMP_ADAPTER:-}" "${TMP_RPC:-}" "${TMP_ROOT:-}"; }
trap cleanup EXIT

case "$START_EDGE" in
  0|1) ;;
  *) hold "VOIDCHAIN_ORG_PATH_EDGE_START must be 0 or 1" ;;
esac

test "$(id -u)" != 0 || hold "install as the intended non-root service user"
test -n "$PACKET_DIR" || hold "packet directory is required"
test -d "$PACKET_DIR" && test ! -L "$PACKET_DIR" || hold "packet directory must be one real directory"
PACKET_DIR="$(cd "$PACKET_DIR" && pwd -P)"

for command in node install systemctl curl grep mktemp; do
  command -v "$command" >/dev/null 2>&1 || hold "required command not found: $command"
done

cd "$ROOT"
node scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs \
  --packet "$PACKET_DIR" \
  --repo-root "$ROOT"

if test "$START_EDGE" = 1; then
  TMP_ROOT="$(mktemp)"
  TMP_READY="$(mktemp)"
  TMP_ADAPTER="$(mktemp)"
  TMP_RPC="$(mktemp)"

  ROOT_CODE="$(curl -sS -o "$TMP_ROOT" -w '%{http_code}' --max-time 10 "$EDGE_ORIGIN/")" \
    || hold "existing public edge root is unreachable"
  test "$ROOT_CODE" = 200 || hold "existing public edge root is not 200"

  READY_CODE="$(curl -sS -o "$TMP_READY" -w '%{http_code}' --max-time 10 "$EDGE_ORIGIN/__void/ready.json")" \
    || hold "existing public edge readiness is unreachable"
  test "$READY_CODE" = 200 || hold "existing public edge readiness is not 200"
  node - "$TMP_READY" <<'NODE'
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (body.ready !== true) process.exit(71);
NODE

  ADAPTER_CODE="$(curl -sS -o "$TMP_ADAPTER" -w '%{http_code}' --max-time 10 "$EDGE_ORIGIN/__void/adapter.json")" \
    || hold "existing public edge adapter identity is unreachable"
  test "$ADAPTER_CODE" = 200 || hold "existing public edge adapter identity is not 200"
  grep -Fq 'void_public_seed_adapter' "$TMP_ADAPTER" \
    || hold "existing public edge adapter identity marker is missing"

  RPC_CODE="$(curl -sS -o "$TMP_RPC" -w '%{http_code}' --max-time 10 "$EDGE_ORIGIN/rpc")" \
    || hold "existing public edge RPC rejection probe failed"
  test "$RPC_CODE" = 404 || hold "existing public edge exposed /rpc"
  grep -Fq 'not_public' "$TMP_RPC" || hold "existing public edge /rpc rejection body mismatch"

  say "$MARKER ORIGIN_PREFLIGHT_GREEN"
  say "root_200=true"
  say "ready_true=true"
  say "adapter_identity=true"
  say "rpc_blocked=true"
fi

mkdir -p "$SYSTEMD_USER_DIR"
install -m 600 -- "$PACKET_DIR/$UNIT_NAME" "$SYSTEMD_USER_DIR/$UNIT_NAME"
systemctl --user daemon-reload

say "$MARKER INSTALLED"
say "packet_dir=$PACKET_DIR"
say "unit=$SYSTEMD_USER_DIR/$UNIT_NAME"
say "edge_origin=$EDGE_ORIGIN"
say "tailscale_funnel_changed=false"
say "dns_changed=false"

if test "$START_EDGE" = 1; then
  systemctl --user enable "$UNIT_NAME" >/dev/null
  systemctl --user restart "$UNIT_NAME"
  sleep 3
  systemctl --user is-active --quiet "$UNIT_NAME" || {
    systemctl --user status --no-pager "$UNIT_NAME" >&2 || true
    hold "path-preserving edge service did not remain active"
  }
  say "$MARKER ACTIVATED"
  say "service_started=true"
  say "next_step=bind_and_verify_dns_tls_separately"
else
  say "service_started=false"
  say "service_enabled=false"
fi

systemctl --user show "$UNIT_NAME" -p UnitFileState -p ActiveState -p SubState || true
say "northwest_forwarding_changed=false"
say "credentials_contents_read=false"
say "node_runtime_changed=false"
say "wallet_authority=false"
say "signer_authority=false"
say "validator_authority=false"
say "work_credit_authority=false"
say "treasury_authority=false"
say "money_movement_authority=false"
