#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this evidence collector with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_PRECISION_EPOCH2_PUBLIC_READ_RUNTIME_EVIDENCE_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
REPLICA_UNIT="void-economic-epoch2-successor-read-replica-v1.service"
READ_UNIT="void-economic-epoch2-public-read-runtime-v1.service"
COMPOSITION_UNIT="void-public-app-composition-gateway-v1.service"
UNIT_DIR="$HOME/.config/systemd/user"
REPLICA_UNIT_PATH="$UNIT_DIR/$REPLICA_UNIT"
READ_UNIT_PATH="$UNIT_DIR/$READ_UNIT"
COMPOSITION_DROPIN="$UNIT_DIR/$COMPOSITION_UNIT.d/70-epoch2-public-economic-read-v1.conf"
GENESIS="$HOME/.local/state/void-economic-epoch2-public-read-runtime-v1/genesis.json"
EXPECTED_GENESIS_SHA="6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941"
BLOCK_HASH="0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d"
STATE_ROOT="0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2"
TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94"
ABSENT_TX="0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
RPC_ENDPOINT="http://127.0.0.1:18552/"
READ_BASE="http://127.0.0.1:4124"
COMPOSITION_BASE="http://127.0.0.1:8082"
PUBLIC_BASE="https://seed.nullfeed.org"
OUTPUT="${1:?usage: $0 OUTPUT_JSON}"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "production_rpc_contact=false"
say "raw_public_rpc_allowed=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "funds_movement=false"

for cmd in git curl jq sha256sum systemctl python3; do
  command -v "$cmd" >/dev/null || die "required_command_missing:$cmd"
done

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
cd "$ROOT"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "clean_worktree_required"
test ! -e "$OUTPUT" || die "output_already_exists"

for unit in "$REPLICA_UNIT" "$READ_UNIT" "$COMPOSITION_UNIT"; do
  systemctl --user is-active --quiet "$unit" ||
    die "service_not_active:$unit"
done

replica_pid="$(systemctl --user show "$REPLICA_UNIT" -p MainPID --value)"
read_pid="$(systemctl --user show "$READ_UNIT" -p MainPID --value)"
composition_pid="$(systemctl --user show "$COMPOSITION_UNIT" -p MainPID --value)"
for row in \
  "replica:$replica_pid" \
  "read:$read_pid" \
  "composition:$composition_pid"
do
  name="${row%%:*}"
  pid="${row#*:}"
  case "$pid" in
    ''|*[!0-9]*) die "invalid_service_pid:$name" ;;
  esac
  test "$pid" -gt 1 || die "invalid_service_pid:$name"
done

test -f "$REPLICA_UNIT_PATH" || die "replica_unit_missing"
test -f "$READ_UNIT_PATH" || die "read_unit_missing"
test -f "$COMPOSITION_DROPIN" || die "composition_dropin_missing"
test -f "$GENESIS" || die "genesis_missing"
test "$(sha256sum "$GENESIS" | awk '{print $1}')" = "$EXPECTED_GENESIS_SHA" ||
  die "genesis_sha256_mismatch"

work="$(mktemp -d "${TMPDIR:-/tmp}/void-e2-public-read-evidence.XXXXXX")"
chmod 0700 "$work"
cleanup(){ rm -rf "$work"; }
trap cleanup EXIT INT TERM

request(){
  local base="$1"
  local path="$2"
  local body="$3"
  local headers="$4"
  local origin="${5:-}"
  local code
  if [ -n "$origin" ]; then
    code="$(curl -sS --max-time 10 \
      -H "Origin: $origin" \
      -D "$headers" \
      -o "$body" \
      -w '%{http_code}' \
      "$base$path")"
  else
    code="$(curl -sS --max-time 10 \
      -D "$headers" \
      -o "$body" \
      -w '%{http_code}' \
      "$base$path")"
  fi
  printf '%s' "$code"
}

STATUS_PATH="/public-node/economic/epoch2/read-status-v1.json"
BALANCE_PATH="/public-node/economic/epoch2/balance-v1?address=$TOKEN"
CODE_PATH="/public-node/economic/epoch2/code-v1?address=$TOKEN"
RECEIPT_PATH="/public-node/economic/epoch2/receipt-v1?tx=$ABSENT_TX"

for layer in local composition external; do
  case "$layer" in
    local) base="$READ_BASE"; origin="" ;;
    composition) base="$COMPOSITION_BASE"; origin="https://voidchain.org" ;;
    external) base="$PUBLIC_BASE"; origin="https://voidchain.org" ;;
  esac

  status_code="$(request "$base" "$STATUS_PATH" "$work/$layer-status.json" "$work/$layer-status.headers" "$origin")"
  test "$status_code" = "200" || die "$layer:status_http_$status_code"

  balance_code="$(request "$base" "$BALANCE_PATH" "$work/$layer-balance.json" "$work/$layer-balance.headers" "$origin")"
  test "$balance_code" = "200" || die "$layer:balance_http_$balance_code"

  code_code="$(request "$base" "$CODE_PATH" "$work/$layer-code.json" "$work/$layer-code.headers" "$origin")"
  test "$code_code" = "200" || die "$layer:code_http_$code_code"

  receipt_code="$(request "$base" "$RECEIPT_PATH" "$work/$layer-receipt.json" "$work/$layer-receipt.headers" "$origin")"
  test "$receipt_code" = "404" || die "$layer:receipt_http_$receipt_code"

  jq -e --arg block "$BLOCK_HASH" --arg root "$STATE_ROOT" '
    .ok == true and
    .status == "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY" and
    .block_hash == $block and
    .state_root == $root and
    .production_successor_rpc_endpoint_selected == true and
    .live_balance_receipt_code_gateway_ready == true and
    .runtime_route_active == true and
    .raw_public_rpc_allowed == false and
    .authoritative_chain2050_write == false and
    .funds_movement == false
  ' "$work/$layer-status.json" >/dev/null ||
    die "$layer:status_semantics_invalid"

  jq -e --arg block "$BLOCK_HASH" --arg root "$STATE_ROOT" --arg token "$TOKEN" '
    .ok == true and
    .query_kind == "balance" and
    .block_hash == $block and
    .state_root == $root and
    .address == $token and
    .result == "0x0" and
    .exact_block_identity_revalidated == true
  ' "$work/$layer-balance.json" >/dev/null ||
    die "$layer:balance_semantics_invalid"

  jq -e --arg block "$BLOCK_HASH" --arg root "$STATE_ROOT" --arg token "$TOKEN" '
    .ok == true and
    .query_kind == "code" and
    .block_hash == $block and
    .state_root == $root and
    .address == $token and
    (.result | type == "string") and
    (.result | startswith("0x")) and
    (.result | length > 2) and
    .exact_block_identity_revalidated == true
  ' "$work/$layer-code.json" >/dev/null ||
    die "$layer:code_semantics_invalid"

  jq -e --arg block "$BLOCK_HASH" --arg root "$STATE_ROOT" --arg tx "$ABSENT_TX" '
    .ok == true and
    .status == "LIVE_SUCCESSOR_RECEIPT_LOOKUP_VERIFIED_NOT_FOUND" and
    .receipt_found == false and
    .transaction_hash == $tx and
    .block_hash == $block and
    .state_root == $root and
    .live_receipt_lookup_transport_verified == true and
    .successful_receipt_semantics_source_proven == true
  ' "$work/$layer-receipt.json" >/dev/null ||
    die "$layer:receipt_semantics_invalid"
done

grep -Eqi '^access-control-allow-origin:[[:space:]]*https://voidchain\.org[[:space:]]*$' \
  "$work/external-status.headers" ||
  die "external_voidchain_org_cors_missing"

code_hex="$(jq -er '.result' "$work/local-code.json")"
code_sha="$(python3 - "$code_hex" <<'PY'
import hashlib,sys
v=sys.argv[1]
if not v.startswith("0x") or len(v)<=2 or len(v[2:])%2:
    raise SystemExit(2)
print(hashlib.sha256(bytes.fromhex(v[2:])).hexdigest())
PY
)"

source_commit="$(git rev-parse HEAD)"
replica_unit_sha="$(sha256sum "$REPLICA_UNIT_PATH" | awk '{print $1}')"
read_unit_sha="$(sha256sum "$READ_UNIT_PATH" | awk '{print $1}')"
composition_dropin_sha="$(sha256sum "$COMPOSITION_DROPIN" | awk '{print $1}')"

facts="$work/facts.json"
python3 - \
  "$facts" "$source_commit" \
  "$replica_pid" "$read_pid" "$composition_pid" \
  "$replica_unit_sha" "$read_unit_sha" "$composition_dropin_sha" \
  "$code_sha" <<'PY'
import json,pathlib,sys
(
  out,source_commit,
  replica_pid,read_pid,composition_pid,
  replica_unit_sha,read_unit_sha,composition_dropin_sha,
  code_sha,
)=sys.argv[1:]
value={
  "marker":"VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_FACTS_V1",
  "version":1,
  "hostname":"zoso-Precision-Tower-7810",
  "source_commit":source_commit,
  "replica_service_identity":"void-economic-epoch2-successor-read-replica-v1.service",
  "replica_service_active":True,
  "replica_main_pid":int(replica_pid),
  "read_service_identity":"void-economic-epoch2-public-read-runtime-v1.service",
  "read_service_active":True,
  "read_main_pid":int(read_pid),
  "composition_service_identity":"void-public-app-composition-gateway-v1.service",
  "composition_service_active":True,
  "composition_main_pid":int(composition_pid),
  "replica_unit_sha256":replica_unit_sha,
  "read_unit_sha256":read_unit_sha,
  "composition_dropin_sha256":composition_dropin_sha,
  "genesis_file_sha256":"6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941",
  "rpc_endpoint":"http://127.0.0.1:18552/",
  "read_base":"http://127.0.0.1:4124",
  "composition_base":"http://127.0.0.1:8082",
  "public_base":"https://seed.nullfeed.org",
  "block_number":"0x0",
  "block_hash":"0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d",
  "state_root":"0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
  "token_address":"0x470075b85352eb86f7d089fb9ba88945f12aad94",
  "live_balance_result":"0x0",
  "live_balance_read_verified":True,
  "live_code_sha256":code_sha,
  "live_code_nonempty":True,
  "live_code_read_verified":True,
  "absent_receipt_transaction_hash":"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "live_receipt_lookup_transport_verified":True,
  "live_receipt_found":False,
  "successful_receipt_semantics_source_proven":True,
  "local_status_route_accepted":True,
  "local_balance_route_accepted":True,
  "local_code_route_accepted":True,
  "local_receipt_route_accepted":True,
  "composition_status_route_accepted":True,
  "composition_balance_route_accepted":True,
  "composition_code_route_accepted":True,
  "composition_receipt_route_accepted":True,
  "external_status_route_accepted":True,
  "external_balance_route_accepted":True,
  "external_code_route_accepted":True,
  "external_receipt_route_accepted":True,
  "external_receipt_http_status":404,
  "voidchain_org_cors_verified":True,
  "raw_public_rpc_allowed":False,
  "production_successor_rpc_endpoint_selected":True,
  "live_balance_receipt_code_gateway_ready":True,
  "runtime_route_active":True,
  "public_gateway_active":True,
  "transaction_construction":False,
  "transaction_signing":False,
  "transaction_submission":False,
  "transaction_broadcast":False,
  "authoritative_chain2050_write":False,
  "wallet_access":False,
  "private_key_access":False,
  "credential_content_access":False,
  "validator_mutation":False,
  "token_movement":False,
  "funds_movement":False,
  "migration_authorized":False,
  "public_activation_authorized":False,
}
pathlib.Path(out).write_text(json.dumps(value,indent=2)+"\n",encoding="utf-8")
PY

observed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
valid_until="$(date -u -d "$observed_at + 1 hour" +%Y-%m-%dT%H:%M:%SZ)"

node tools/void-economic-epoch2-public-read-runtime-evidence-v1.mjs \
  --facts "$facts" \
  --observed-at-utc "$observed_at" \
  --valid-until-utc "$valid_until" \
  --output "$OUTPUT"

test -s "$OUTPUT" || die "evidence_output_missing"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "primary_worktree_changed"

say "replica_main_pid=$replica_pid"
say "read_main_pid=$read_pid"
say "composition_main_pid=$composition_pid"
say "live_code_sha256=$code_sha"
say "production_successor_rpc_endpoint_selected=true"
say "live_balance_receipt_code_gateway_ready=true"
say "public_balance_receipt_code_verification_ready=true"
say "runtime_route_active=true"
say "public_gateway_active=true"
say "successor_state_root_public_void_anchor_ready=false"
say "authoritative_chain2050_write=false"
say "migration_authorized=false"
say "public_activation_authorized=false"
say "funds_movement=false"
say "evidence_output=$OUTPUT"
say "${MARKER}_GREEN"
