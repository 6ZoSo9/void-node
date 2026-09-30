#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_INSTALLER_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
OVERLAY="${1:-${VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY:-}}"
APPLY="${APPLY:-0}"
CONFIRM="${CONFIRM:-}"
EXPECTED_CONFIRM="activate-first-public-earn-tunnel-overlay-v1"
TUNNEL_SERVICE="void-public-seed-named-tunnel-v1.service"
SEED_SERVICE="void-public-seed-gateway-v1.service"
EARN_SERVICE="void-public-earn-gateway-v1.service"
TUNNEL_UNIT="$HOME/.config/systemd/user/$TUNNEL_SERVICE"
CLOUDFLARED="${VOID_CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
SUCCESS=0
CHANGED=0
BACKUP=""

fail() { printf '%s HOLD: %s\n' "$MARKER" "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "required command missing: $1"; }

rollback() {
  if [ "$SUCCESS" = 1 ] || [ "$CHANGED" = 0 ]; then return 0; fi
  set +e
  printf '%s ROLLBACK_BEGIN\n' "$MARKER" >&2
  if [ -n "$BACKUP" ] && [ -f "$BACKUP/tunnel-unit" ]; then
    install -m 600 -- "$BACKUP/tunnel-unit" "$TUNNEL_UNIT"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user restart "$TUNNEL_SERVICE" >/dev/null 2>&1 || true
  fi
  printf '%s ROLLBACK_COMPLETE\n' "$MARKER" >&2
}
finish() {
  local rc=$?
  trap - EXIT INT TERM
  rollback || true
  exit "$rc"
}
trap finish EXIT INT TERM

for command in curl git install node python3 readlink sha256sum systemctl; do need "$command"; done
case "$APPLY" in 0|1) ;; *) fail "APPLY must be 0 or 1" ;; esac
[ -n "$OVERLAY" ] || fail "overlay directory is required"
[ -d "$OVERLAY" ] && [ ! -L "$OVERLAY" ] || fail "overlay must be one real directory"
OVERLAY="$(cd "$OVERLAY" && pwd -P)"

cd "$ROOT"
[ "$(git branch --show-current)" = main ] || fail "repository must be on main"
[ -z "$(git status --porcelain=v1 --untracked-files=normal)" ] || fail "repository must be clean"
[ -x "$CLOUDFLARED" ] && [ ! -L "$CLOUDFLARED" ] || fail "cloudflared executable is unavailable or symlinked"

node scripts/verify_first_public_earn_tunnel_overlay_v1.mjs --overlay "$OVERLAY"

MANIFEST="$OVERLAY/overlay.json"
EXPECTED_LIVE_UNIT_SHA="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.source_tunnel_unit_sha256)' "$MANIFEST")"
EXPECTED_CLOUDFLARED_SHA="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.cloudflared.sha256)' "$MANIFEST")"
EXPECTED_SOURCE_CONFIG="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.source_config_path)' "$MANIFEST")"
EXPECTED_SOURCE_CONFIG_SHA="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(j.source_config_sha256)' "$MANIFEST")"

[ -f "$TUNNEL_UNIT" ] && [ ! -L "$TUNNEL_UNIT" ] || fail "live tunnel unit is unavailable or symlinked"
[ "$(sha256sum "$TUNNEL_UNIT" | awk '{print $1}')" = "$EXPECTED_LIVE_UNIT_SHA" ] ||
  fail "live tunnel unit no longer matches overlay source binding"
[ "$(sha256sum "$CLOUDFLARED" | awk '{print $1}')" = "$EXPECTED_CLOUDFLARED_SHA" ] ||
  fail "cloudflared binary no longer matches overlay binding"
[ -f "$EXPECTED_SOURCE_CONFIG" ] && [ ! -L "$EXPECTED_SOURCE_CONFIG" ] ||
  fail "source tunnel config is unavailable"
[ "$(sha256sum "$EXPECTED_SOURCE_CONFIG" | awk '{print $1}')" = "$EXPECTED_SOURCE_CONFIG_SHA" ] ||
  fail "source tunnel config no longer matches overlay binding"

"$CLOUDFLARED" --config "$OVERLAY/cloudflared-config.yml" tunnel ingress validate >/dev/null

rule_service() {
  "$CLOUDFLARED" --config "$OVERLAY/cloudflared-config.yml" tunnel ingress rule "$1"
}
for url in   "https://seed.nullfeed.org/health"   "https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json"   "https://seed.nullfeed.org/.well-known/void-node-public-origin-binding-v1.json"   "https://seed.nullfeed.org/wc/public-earning-pilot-v1/status"   "https://seed.nullfeed.org/wc/public-earning-pilot-v1/claim-ticket"   "https://seed.nullfeed.org/wc/public-earning-pilot-v1/submit-result"   "https://seed.nullfeed.org/download/void-public-earn-no-node-client-v1.mjs"   "https://seed.nullfeed.org/datanet/v1/fetch/void-public-earn-first-work-v1"
do
  rule_service "$url" | grep -Fq 'service: http://127.0.0.1:4122' ||
    fail "earn ingress rule mismatch: $url"
done
for url in   "https://seed.nullfeed.org/__void/ready.json"   "https://seed.nullfeed.org/__void/checkpoint/v1.json"   "https://seed.nullfeed.org/wc/redeemable?account=refused"   "https://seed.nullfeed.org/wc/public-earning-pilot-v1/operator/issue"   "https://seed.nullfeed.org/wallet"
do
  rule_service "$url" | grep -Fq 'service: http://127.0.0.1:4111' ||
    fail "seed fallback ingress rule mismatch: $url"
done

systemctl --user is-active --quiet "$SEED_SERVICE" || fail "$SEED_SERVICE must already be active"
systemctl --user is-active --quiet "$EARN_SERVICE" || fail "$EARN_SERVICE must already be active"
systemctl --user is-active --quiet "$TUNNEL_SERVICE" || fail "$TUNNEL_SERVICE must already be active"

node tools/wc-public-coordinator-readiness-v1.mjs   --base http://127.0.0.1:4122   --require-ready >/dev/null
curl -fsS --max-time 5 http://127.0.0.1:4111/__void/ready.json |
  python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ready") is True and int(x.get("gap",-1)) == 0'
curl -fsS --max-time 5 http://127.0.0.1:4111/__void/checkpoint/v1.json |
  python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("status") == "available" and isinstance(x.get("checkpoint"),dict)'

printf '%s\n' "$MARKER"
printf 'overlay=%s\n' "$OVERLAY"
printf 'source_tunnel_config_sha256=%s\n' "$EXPECTED_SOURCE_CONFIG_SHA"
printf 'earn_origin=http://127.0.0.1:4122\n'
printf 'seed_fallback=http://127.0.0.1:4111\n'
printf 'apply_requested=%s\n' "$APPLY"
printf 'ticket_issuance=false\nwc_write=false\nsettlement=false\nwallet_access=false\nfund_movement=false\n'

if [ "$APPLY" = 0 ]; then
  printf '%s PLAN_GREEN_NO_MUTATION\n' "$MARKER"
  SUCCESS=1
  exit 0
fi

[ "$CONFIRM" = "$EXPECTED_CONFIRM" ] ||
  fail "exact confirmation required: $EXPECTED_CONFIRM"

mkdir -p "$HOME/.local/state/void"
chmod 700 "$HOME/.local/state/void"
BACKUP="$(mktemp -d "$HOME/.local/state/void/first-public-earn-tunnel-overlay-v1-backup.XXXXXXXX")"
chmod 700 "$BACKUP"
cp -- "$TUNNEL_UNIT" "$BACKUP/tunnel-unit"
chmod 600 "$BACKUP/tunnel-unit"

install -m 600 -- "$OVERLAY/void-public-seed-named-tunnel-v1.service" "$TUNNEL_UNIT"
CHANGED=1
systemctl --user daemon-reload
systemctl --user restart "$TUNNEL_SERVICE"

TUNNEL_GREEN=0
for _ in $(seq 1 20); do
  if systemctl --user is-active --quiet "$TUNNEL_SERVICE"; then
    TUNNEL_GREEN=1
    break
  fi
  sleep 0.5
done
[ "$TUNNEL_GREEN" = 1 ] || fail "named tunnel did not return active"

PUBLIC_EARN_GREEN=0
for _ in $(seq 1 20); do
  if curl -fsS --max-time 5     https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json     >"$BACKUP/public-earn-status.json" 2>/dev/null &&
     python3 - "$BACKUP/public-earn-status.json" <<'PY' >/dev/null 2>&1
import json,sys
x=json.load(open(sys.argv[1],encoding="utf-8"))
assert x.get("ok") is True, x
assert x.get("marker") == "VOID_PUBLIC_EARN_GATEWAY_V1", x
assert x.get("enabled") is True, x
assert int(x.get("fixed_award_wc",-1)) == 3, x
PY
  then
    PUBLIC_EARN_GREEN=1
    break
  fi
  sleep 0.5
done
[ "$PUBLIC_EARN_GREEN" = 1 ] || fail "public earn gateway did not become reachable through tunnel overlay"

PUBLIC_PILOT_GREEN=0
for _ in $(seq 1 20); do
  if curl -fsS --max-time 5     https://seed.nullfeed.org/wc/public-earning-pilot-v1/status     >"$BACKUP/public-pilot-status.json" 2>/dev/null &&
     python3 - "$BACKUP/public-pilot-status.json" <<'PY' >/dev/null 2>&1
import json,sys
x=json.load(open(sys.argv[1],encoding="utf-8"))
claim=x.get("public_claim") or {}
assert x.get("ok") is True, x
assert x.get("marker") == "VOID_WC_PUBLIC_EARNING_PILOT_V1", x
assert x.get("coordinator_enabled") is True, x
assert x.get("executor_enabled") is False, x
assert int(x.get("fixed_award_wc",-1)) == 3, x
assert claim.get("enabled") is True and claim.get("available") is True, x
assert claim.get("server_selected_work") is True, x
assert claim.get("participant_selected_award") is False, x
PY
  then
    PUBLIC_PILOT_GREEN=1
    break
  fi
  sleep 0.5
done
[ "$PUBLIC_PILOT_GREEN" = 1 ] || fail "public earning pilot status did not become green through tunnel overlay"

curl -fsS --max-time 8   "https://seed.nullfeed.org/datanet/v1/fetch/void-public-earn-first-work-v1?who=void-first-public-earn-tunnel-overlay-v1"   >"$BACKUP/public-dataset.json"
[ "$(sha256sum "$BACKUP/public-dataset.json" | awk '{print $1}')" =   "c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea" ] ||
  fail "public dataset hash mismatch through tunnel overlay"

curl -fsS --max-time 5 https://seed.nullfeed.org/__void/ready.json |
  python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ready") is True and int(x.get("gap",-1)) == 0'
curl -fsS --max-time 5 https://seed.nullfeed.org/__void/checkpoint/v1.json |
  python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("status") == "available" and isinstance(x.get("checkpoint"),dict)'

SUCCESS=1
printf '%s ACTIVATION_GREEN\n' "$MARKER"
printf 'public_earn_ingress=true\n'
printf 'checkpoint_seed_fallback_preserved=true\n'
printf 'ticket_issued=false\nwc_written=false\nfund_movement=false\n'
