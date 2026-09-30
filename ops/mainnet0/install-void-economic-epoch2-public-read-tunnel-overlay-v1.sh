#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_TUNNEL_OVERLAY_INSTALL_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
TUNNEL_SERVICE="void-public-seed-named-tunnel-v1.service"
TUNNEL_UNIT="$HOME/.config/systemd/user/$TUNNEL_SERVICE"
APPLY="${APPLY:-0}"
CONFIRM="${CONFIRM:-}"
EXPECTED_CONFIRM="activateEpoch2PublicReadTunnelOverlayV1"
STATE_ROOT="$HOME/.local/state/void"
SUCCESS=0
CHANGED=0
BACKUP=""
RELEASE_DIR=""

say(){ printf '%s\n' "$*"; }
die(){ say "$MARKER HOLD: $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "required_command_missing:$1"; }

rollback(){
  if [ "$SUCCESS" = 1 ] || [ "$CHANGED" = 0 ]; then return 0; fi
  set +e
  say "$MARKER ROLLBACK_BEGIN" >&2
  if [ -n "$BACKUP" ] && [ -f "$BACKUP/tunnel-unit" ]; then
    install -m 0600 "$BACKUP/tunnel-unit" "$TUNNEL_UNIT"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user restart "$TUNNEL_SERVICE" >/dev/null 2>&1 || true
  fi
  say "$MARKER ROLLBACK_COMPLETE" >&2
}
finish(){
  local rc=$?
  trap - EXIT INT TERM
  rollback || true
  if [ "$SUCCESS" != 1 ] && [ -n "$RELEASE_DIR" ] && [ -d "$RELEASE_DIR" ]; then
    rm -rf "$RELEASE_DIR" || true
  fi
  exit "$rc"
}
trap finish EXIT INT TERM

for cmd in curl git grep install node python3 readlink seq sha256sum systemctl; do need "$cmd"; done
case "$APPLY" in 0|1) ;; *) die "APPLY_must_be_0_or_1" ;; esac

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
cd "$ROOT"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain=v1 --untracked-files=all)" || die "clean_worktree_required"

test -f "$TUNNEL_UNIT" && test ! -L "$TUNNEL_UNIT" || die "tunnel_unit_missing_or_symlinked"
systemctl --user is-active --quiet "$TUNNEL_SERVICE" || die "tunnel_service_not_active"

mapfile -t live_fields < <(python3 - "$TUNNEL_UNIT" "$HOME" <<'PY'
import pathlib,shlex,sys
unit=pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
home=sys.argv[2]
rows=[x for x in unit.splitlines() if x.startswith("ExecStart=")]
if len(rows)!=1:
    raise SystemExit("expected exactly one ExecStart")
argv=shlex.split(rows[0][len("ExecStart="):])
if "--config" not in argv:
    raise SystemExit("missing --config")
i=argv.index("--config")
if i+1>=len(argv):
    raise SystemExit("missing config argument")
cloudflared=argv[0].replace("%h",home)
config=argv[i+1].replace("%h",home)
for value in (cloudflared,config):
    if "\n" in value or "\r" in value or "\0" in value:
        raise SystemExit("unsafe path")
print(cloudflared)
print(config)
PY
)

test "${#live_fields[@]}" = 2 || die "live_tunnel_exec_parse_failed"
CLOUDFLARED="${live_fields[0]}"
SOURCE_CONFIG="${live_fields[1]}"

test -x "$CLOUDFLARED" && test ! -L "$CLOUDFLARED" || die "cloudflared_missing_or_symlinked"
test -f "$SOURCE_CONFIG" && test ! -L "$SOURCE_CONFIG" || die "source_config_missing_or_symlinked"
test "$(readlink -f "$SOURCE_CONFIG")" = "$SOURCE_CONFIG" || die "source_config_not_canonical"

curl -fsS --max-time 5 \
  http://127.0.0.1:8082/public-node/economic/epoch2/read-status-v1.json \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("marker")=="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1" and x.get("ok") is True'

mkdir -p "$STATE_ROOT"
chmod 0700 "$STATE_ROOT"
RELEASE_DIR="$(mktemp -d "$STATE_ROOT/epoch2-public-read-tunnel-overlay-v1.XXXXXXXX")"
chmod 0700 "$RELEASE_DIR"
TARGET_CONFIG="$RELEASE_DIR/cloudflared-config.yml"
MANIFEST="$RELEASE_DIR/overlay.json"

node tools/void-economic-epoch2-public-read-tunnel-overlay-v1.mjs \
  --source-config "$SOURCE_CONFIG" \
  --output-config "$TARGET_CONFIG" \
  --output-manifest "$MANIFEST"

"$CLOUDFLARED" --config "$TARGET_CONFIG" tunnel ingress validate >/dev/null

rule_service(){
  "$CLOUDFLARED" --config "$TARGET_CONFIG" tunnel ingress rule "$1"
}

for url in \
  "https://seed.nullfeed.org/health" \
  "https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json" \
  "https://seed.nullfeed.org/wc/public-earning-pilot-v1/status" \
  "https://seed.nullfeed.org/wc/public-earning-pilot-v1/claim-ticket" \
  "https://seed.nullfeed.org/wc/public-earning-pilot-v1/submit-result" \
  "https://seed.nullfeed.org/download/void-public-earn-no-node-client-v1.mjs" \
  "https://seed.nullfeed.org/datanet/v1/fetch/void-public-earn-first-work-v1"
do
  rule_service "$url" | grep -Fq 'service: http://127.0.0.1:4122' ||
    die "earn_ingress_rule_mismatch:$url"
done

for url in \
  "https://seed.nullfeed.org/public-node/economic/epoch2/read-status-v1.json" \
  "https://seed.nullfeed.org/public-node/economic/epoch2/balance-v1?address=0x470075b85352eb86f7d089fb9ba88945f12aad94" \
  "https://seed.nullfeed.org/public-node/economic/epoch2/code-v1?address=0x470075b85352eb86f7d089fb9ba88945f12aad94" \
  "https://seed.nullfeed.org/public-node/economic/epoch2/receipt-v1?tx=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
do
  rule_service "$url" | grep -Fq 'service: http://127.0.0.1:8082' ||
    die "epoch2_ingress_rule_mismatch:$url"
done

for url in \
  "https://seed.nullfeed.org/__void/ready.json" \
  "https://seed.nullfeed.org/__void/checkpoint/v1.json" \
  "https://seed.nullfeed.org/wallet"
do
  rule_service "$url" | grep -Fq 'service: http://127.0.0.1:4111' ||
    die "seed_fallback_rule_mismatch:$url"
done
rule_service "https://other.invalid/health" | grep -Fq 'service: http_status:404' ||
  die "terminal_404_rule_mismatch"

SOURCE_EPOCH2_PRESENT="$(
  node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(x.source_epoch2_rules_present===true));' "$MANIFEST"
)"

say "$MARKER"
say "source_config_sha256=$(sha256sum "$SOURCE_CONFIG" | awk '{print $1}')"
say "generated_config_sha256=$(sha256sum "$TARGET_CONFIG" | awk '{print $1}')"
say "source_epoch2_rules_present=$SOURCE_EPOCH2_PRESENT"
say "earn_origin=http://127.0.0.1:4122"
say "epoch2_origin=http://127.0.0.1:8082"
say "seed_fallback=http://127.0.0.1:4111"
say "raw_public_rpc_allowed=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "validator_mutation=false"
say "token_movement=false"
say "funds_movement=false"
say "apply=$APPLY"

if [ "$APPLY" = 0 ]; then
  SUCCESS=1
  say "${MARKER}_PLAN_GREEN"
  exit 0
fi

test "$CONFIRM" = "$EXPECTED_CONFIRM" || die "explicit_confirmation_required:$EXPECTED_CONFIRM"

if [ "$SOURCE_EPOCH2_PRESENT" = true ]; then
  if curl -fsS --max-time 8 \
    -H 'Origin: https://voidchain.org' \
    https://seed.nullfeed.org/public-node/economic/epoch2/read-status-v1.json \
    | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("marker")=="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1" and x.get("ok") is True'
  then
    SUCCESS=1
    rm -rf "$RELEASE_DIR"
    RELEASE_DIR=""
    say "${MARKER}_ALREADY_GREEN_NO_MUTATION"
    exit 0
  fi
fi

BACKUP="$(mktemp -d "$STATE_ROOT/epoch2-public-read-tunnel-overlay-v1-backup.XXXXXXXX")"
chmod 0700 "$BACKUP"
cp "$TUNNEL_UNIT" "$BACKUP/tunnel-unit"
chmod 0600 "$BACKUP/tunnel-unit"

python3 - "$TUNNEL_UNIT" "$SOURCE_CONFIG" "$TARGET_CONFIG" "$RELEASE_DIR/tunnel-unit" <<'PY'
import pathlib,sys
unit=pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
old=sys.argv[2]
new=sys.argv[3]
out=pathlib.Path(sys.argv[4])
if unit.count(old)!=1:
    raise SystemExit("source config path must occur exactly once")
updated=unit.replace(old,new)
if old in updated or new not in updated:
    raise SystemExit("tunnel unit config pointer replacement failed")
out.write_text(updated,encoding="utf-8")
PY
chmod 0600 "$RELEASE_DIR/tunnel-unit"

install -m 0600 "$RELEASE_DIR/tunnel-unit" "$TUNNEL_UNIT"
CHANGED=1
systemctl --user daemon-reload
systemctl --user restart "$TUNNEL_SERVICE"

for _ in $(seq 1 20); do
  systemctl --user is-active --quiet "$TUNNEL_SERVICE" && break
  sleep 0.5
done
systemctl --user is-active --quiet "$TUNNEL_SERVICE" || die "tunnel_service_failed_after_restart"

work="$RELEASE_DIR/public-check"
mkdir -p "$work"

code="$(
  curl -fsS --connect-timeout 3 --max-time 5 --retry 20 --retry-delay 1 --retry-max-time 25 --retry-all-errors \
    -H 'Origin: https://voidchain.org' \
    -D "$work/status.headers" \
    -o "$work/status.json" \
    -w '%{http_code}' \
    https://seed.nullfeed.org/public-node/economic/epoch2/read-status-v1.json \
    2>/dev/null || true
)"
test "$code" = 200 || die "external_epoch2_status_http_$code"
python3 - "$work/status.json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1],encoding="utf-8"))
assert x.get("ok") is True, x
assert x.get("marker")=="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1", x
assert x.get("raw_public_rpc_allowed") is False, x
assert x.get("authoritative_chain2050_write") is False, x
assert x.get("funds_movement") is False, x
PY
grep -Eqi '^access-control-allow-origin:[[:space:]]*https://voidchain\.org[[:space:]]*$' \
  "$work/status.headers" || die "external_epoch2_cors_missing"

curl -fsS --max-time 8 \
  "https://seed.nullfeed.org/public-node/economic/epoch2/balance-v1?address=0x470075b85352eb86f7d089fb9ba88945f12aad94" \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ok") is True and x.get("query_kind")=="balance" and x.get("result")=="0x0"'

curl -fsS --max-time 8 \
  "https://seed.nullfeed.org/public-node/economic/epoch2/code-v1?address=0x470075b85352eb86f7d089fb9ba88945f12aad94" \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ok") is True and x.get("query_kind")=="code" and isinstance(x.get("result"),str) and len(x["result"])>2'

receipt_code="$(
  curl -sS --max-time 8 \
    -o "$work/receipt.json" \
    -w '%{http_code}' \
    "https://seed.nullfeed.org/public-node/economic/epoch2/receipt-v1?tx=0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
)"
test "$receipt_code" = 404 || die "external_epoch2_receipt_http_$receipt_code"
python3 - "$work/receipt.json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1],encoding="utf-8"))
assert x.get("ok") is True, x
assert x.get("receipt_found") is False, x
assert x.get("live_receipt_lookup_transport_verified") is True, x
PY

curl -fsS --max-time 8 https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ok") is True and x.get("marker")=="VOID_PUBLIC_EARN_GATEWAY_V1" and x.get("enabled") is True'

curl -fsS --max-time 8 https://seed.nullfeed.org/__void/ready.json \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("ready") is True and int(x.get("gap",-1))==0'

curl -fsS --max-time 8 https://seed.nullfeed.org/__void/checkpoint/v1.json \
  | python3 -c 'import json,sys; x=json.load(sys.stdin); assert x.get("status")=="available" and isinstance(x.get("checkpoint"),dict)'

SUCCESS=1
say "release_dir=$RELEASE_DIR"
say "backup_dir=$BACKUP"
say "external_epoch2_public_read=true"
say "public_earn_preserved=true"
say "legacy_seed_fallback_preserved=true"
say "${MARKER}_GREEN"
