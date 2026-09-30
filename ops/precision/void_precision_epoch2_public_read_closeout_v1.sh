#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this closeout with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_PRECISION_EPOCH2_PUBLIC_READ_CLOSEOUT_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
CONFIRM_CLOSEOUT="${CONFIRM_CLOSEOUT:-}"
EXPECTED_CONFIRM="runEpoch2PublicReadCloseoutV1"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "production_rpc_contact=false"
say "raw_public_rpc_allowed=false"
say "transaction_construction=false"
say "transaction_signing=false"
say "transaction_submission=false"
say "transaction_broadcast=false"
say "authoritative_chain2050_write=false"
say "validator_mutation=false"
say "token_movement=false"
say "funds_movement=false"

test "$CONFIRM_CLOSEOUT" = "$EXPECTED_CONFIRM" ||
  die "explicit_confirmation_required:$EXPECTED_CONFIRM"

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
test -d "$ROOT/.git" || die "repo_missing"
cd "$ROOT"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "clean_worktree_required"

mkdir -p "$HOME/Downloads"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
evidence="$HOME/Downloads/void_epoch2_public_read_runtime_evidence_v1_${stamp}.json"
promotion_dir="$HOME/Downloads/void_epoch2_public_read_runtime_promotion_v1_${stamp}"

say "=== INSTALL / START READ-ONLY RUNTIME ==="
APPLY=1 \
START_SERVICES=1 \
RESTART_COMPOSITION=1 \
CONFIRM=installEpoch2PublicEconomicReadRuntimeV1 \
bash ops/mainnet0/install-void-economic-epoch2-public-read-runtime-v1.sh

say
say "=== COLLECT FRESH PUBLIC READ EVIDENCE ==="
bash ops/precision/void_precision_epoch2_public_read_runtime_evidence_v1.sh "$evidence"

test -s "$evidence" || die "evidence_missing"
evidence_sha="$(sha256sum "$evidence" | awk '{print $1}')"
evidence_id="$(jq -er '.evidence_id' "$evidence")"
evaluation="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

case "$evidence_sha" in
  [0-9a-f][0-9a-f]*) ;;
  *) die "evidence_sha_invalid" ;;
esac
test "${#evidence_sha}" = "64" || die "evidence_sha_length_invalid"
case "$evidence_id" in
  voide2pre1_*) ;;
  *) die "evidence_id_invalid" ;;
esac

say
say "=== PROMOTE PUBLIC ECONOMIC READ PATH ==="
node tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs \
  --evidence "$evidence" \
  --expected-file-sha256 "$evidence_sha" \
  --expected-evidence-id "$evidence_id" \
  --evaluation-time-utc "$evaluation" \
  --output-dir "$promotion_dir"

promotion="$promotion_dir/economic-epoch2-public-read-runtime-promotion-v1.json"
migration="$promotion_dir/economic-evm-successor-migration-candidate-v1.json"
loopback="$promotion_dir/economic-epoch2-public-read-loopback-transport-v1.json"

for file in "$promotion" "$migration" "$loopback"; do
  test -s "$file" || die "promotion_output_missing:$file"
done

say
say "=== OUTPUT HASHES ==="
sha256sum "$evidence" "$promotion" "$migration" "$loopback"

say
say "=== PROMOTION GATES ==="
jq -r '
  "production_successor_rpc_endpoint_selected=\(.gates.production_successor_rpc_endpoint_selected)",
  "live_balance_receipt_code_gateway_ready=\(.gates.live_balance_receipt_code_gateway_ready)",
  "public_balance_receipt_code_verification_ready=\(.gates.public_balance_receipt_code_verification_ready)",
  "runtime_route_active=\(.gates.runtime_route_active)",
  "public_gateway_active=\(.gates.public_gateway_active)",
  "successor_state_root_public_void_anchor_ready=\(.gates.successor_state_root_public_void_anchor_ready)",
  "authoritative_chain2050_write=\(.gates.authoritative_chain2050_write)",
  "migration_authorized=\(.gates.migration_authorized)",
  "public_activation_authorized=\(.gates.public_activation_authorized)",
  "funds_movement_authorized=\(.gates.funds_movement_authorized)"
' "$promotion"

node --input-type=module - "$migration" <<'NODE'
import fs from "node:fs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "./tools/void-economic-evm-successor-migration-v1.mjs";

const file=process.argv[2];
const candidate=JSON.parse(fs.readFileSync(file,"utf8"));
const result=classifyVoidEconomicEvmSuccessorMigrationV1(candidate);

if(result.status!=="HOLD") {
  throw new Error("unexpected_migration_status:"+String(result.status));
}
if(
  JSON.stringify(result.missing_gates)!==
  JSON.stringify(["successor_state_root_public_void_anchor_required"])
){
  throw new Error(
    "unexpected_remaining_migration_gates:"+
    JSON.stringify(result.missing_gates),
  );
}
console.log("migration_status=HOLD");
console.log("missing_gate=successor_state_root_public_void_anchor_required");
NODE

say
say "evidence_output=$evidence"
say "promotion_dir=$promotion_dir"
say "public_economic_verification_path_remaining=false"
say "successor_state_root_public_void_anchor_ready=false"
say "${MARKER}_GREEN"
