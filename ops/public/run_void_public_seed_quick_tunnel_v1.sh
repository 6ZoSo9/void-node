#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PUBLIC_SEED_QUICK_TUNNEL_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
RUNTIME_ROOT="$ROOT/.runtime/public-seed-v1"
CLOUDFLARED_VERSION="2026.7.3"
CLOUDFLARED="$RUNTIME_ROOT/cloudflared-$CLOUDFLARED_VERSION-linux-amd64"
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/download/$CLOUDFLARED_VERSION/cloudflared-linux-amd64"
CLOUDFLARED_SHA256="9d71c677db00134c1bd4144b7783486b654ad281b1ea62b4972098d19f770f17"
GATEWAY_LOG="$RUNTIME_ROOT/gateway.log"
TUNNEL_LOG="$RUNTIME_ROOT/tunnel.log"
MANIFEST_OUT="$RUNTIME_ROOT/public-bootstrap-v1.live.json"
GATEWAY_PID=""
TUNNEL_PID=""

say() { printf '%s\n' "$*"; }
hold() { say "HOLD: $*" >&2; exit 1; }

cleanup() {
  if test -n "$TUNNEL_PID"; then kill -TERM "$TUNNEL_PID" 2>/dev/null || true; fi
  if test -n "$GATEWAY_PID"; then kill -TERM "$GATEWAY_PID" 2>/dev/null || true; fi
  if test -n "$TUNNEL_PID"; then wait "$TUNNEL_PID" 2>/dev/null || true; fi
  if test -n "$GATEWAY_PID"; then wait "$GATEWAY_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

cd "$ROOT"
test "$(uname -s)" = Linux || hold "quick-tunnel helper currently supports Linux only"
case "$(uname -m)" in
  x86_64|amd64) ;;
  *) hold "quick-tunnel helper currently supports Linux x86-64 only" ;;
esac
command -v curl >/dev/null 2>&1 || hold "curl is required"
command -v sha256sum >/dev/null 2>&1 || hold "sha256sum is required"
command -v node >/dev/null 2>&1 || hold "node is required"

READY="$(curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json)" ||
  hold "local VOID readiness is unavailable"
printf 'local_ready=%s\n' "$READY"
grep -q '"ready":true' <<<"$READY" || hold "local node is not ready"
grep -q '"gap":0' <<<"$READY" || hold "local node gap is not zero"
grep -q '"txroot_live":1' <<<"$READY" || hold "local node txroot is not live"

mkdir -p "$RUNTIME_ROOT"
if ! test -x "$CLOUDFLARED" || \
   test "$(sha256sum "$CLOUDFLARED" 2>/dev/null | awk '{print $1}')" != "$CLOUDFLARED_SHA256"
then
  TMP="$RUNTIME_ROOT/.cloudflared-download.$$"
  rm -f "$TMP"
  say "[$MARKER] downloading cloudflared $CLOUDFLARED_VERSION"
  curl --fail --silent --show-error --location \
    --proto '=https' --tlsv1.2 --max-time 600 \
    "$CLOUDFLARED_URL" -o "$TMP"
  printf '%s  %s\n' "$CLOUDFLARED_SHA256" "$TMP" |
    sha256sum --check --strict - >/dev/null || hold "cloudflared SHA-256 mismatch"
  chmod 700 "$TMP"
  mv "$TMP" "$CLOUDFLARED"
fi

test "$(sha256sum "$CLOUDFLARED" | awk '{print $1}')" = "$CLOUDFLARED_SHA256" ||
  hold "installed cloudflared failed verification"

: >"$GATEWAY_LOG"
: >"$TUNNEL_LOG"
node tools/void-public-seed-gateway-v1.mjs >"$GATEWAY_LOG" 2>&1 &
GATEWAY_PID=$!

GATEWAY_GREEN=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:4111/__void/ready.json >/dev/null; then
    GATEWAY_GREEN=1
    break
  fi
  kill -0 "$GATEWAY_PID" 2>/dev/null || {
    cat "$GATEWAY_LOG" >&2
    hold "public seed gateway exited"
  }
  sleep 1
done
test "$GATEWAY_GREEN" = 1 || {
  cat "$GATEWAY_LOG" >&2
  hold "public seed gateway did not become ready"
}

"$CLOUDFLARED" tunnel \
  --url http://127.0.0.1:4111 \
  --no-autoupdate \
  >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Cloudflare Quick Tunnels publish one temporary https://*.trycloudflare.com URL.
PUBLIC_URL=""
for _ in $(seq 1 90); do
  PUBLIC_URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | tail -n 1 || true)"
  if test -n "$PUBLIC_URL"; then break; fi
  kill -0 "$TUNNEL_PID" 2>/dev/null || {
    cat "$TUNNEL_LOG" >&2
    hold "cloudflared exited before publishing a URL"
  }
  sleep 1
done

test -n "$PUBLIC_URL" || {
  cat "$TUNNEL_LOG" >&2
  hold "quick tunnel URL was not produced"
}

PUBLIC_READY="$(curl -fsS --retry 12 --retry-delay 2 --max-time 15 "$PUBLIC_URL/__void/ready.json")" ||
  hold "public readiness probe failed"
PUBLIC_HEAD="$(curl -fsS --retry 5 --retry-delay 1 --max-time 15 "$PUBLIC_URL/blocks/latest/number2.json")" ||
  hold "public head probe failed"
printf 'public_ready=%s\n' "$PUBLIC_READY"
printf 'public_head=%s\n' "$PUBLIC_HEAD"
grep -q '"ready":true' <<<"$PUBLIC_READY" || hold "public readiness is not green"
grep -q '"gap":0' <<<"$PUBLIC_READY" || hold "public readiness gap is not zero"
grep -q '"txroot_live":1' <<<"$PUBLIC_READY" || hold "public readiness txroot is not live"
grep -Eq '"number":[1-9][0-9]*' <<<"$PUBLIC_HEAD" || hold "public head is not positive"

cat >"$MANIFEST_OUT" <<JSON
{
  "schema": "void_public_bootstrap_v1",
  "network": "VOID Network",
  "chain_id": 2050,
  "status": "live_quick_tunnel_test",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "expires_at": null,
  "sync_endpoints": [
    {
      "transport": "https",
      "base": "$PUBLIC_URL",
      "priority": 10,
      "enabled": true,
      "temporary": true
    }
  ],
  "onion_endpoints": [],
  "private_tailnet_endpoints_published": false,
  "notes": "Temporary external proof endpoint. Replace with seed.voidchain.io after named-tunnel activation."
}
JSON
chmod 600 "$MANIFEST_OUT"

say "$MARKER GREEN"
say "public_seed_url=$PUBLIC_URL"
say "manifest_file=$MANIFEST_OUT"
say "gateway_pid=$GATEWAY_PID"
say "tunnel_pid=$TUNNEL_PID"
say "wallet_accessed=false"
say "validator_authority=false"
say "private_rpc_exposed=false"
say "tailnet_required_for_clients=false"
say "Keep this terminal open during the external-node proof. Press Ctrl+C to stop."

wait "$TUNNEL_PID"
