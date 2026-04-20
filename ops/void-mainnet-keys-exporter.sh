#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
OUTDIR="${OUTDIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$OUTDIR/void_mainnet_keys.prom}"
TMP="${TMP:-$OUT.$$.tmp}"
NOW="$(date +%s)"

PIN="${PIN:-$ROOT/ops/mainnet/void-mainnet.live.json}"
HINT_DIR="${HINT_DIR:-${TMPDIR:-/tmp}}"
HINT="${HINT:-$HINT_DIR/void-mainnet-keys-exporter.${USER:-user}.last}"

up=1
live_present=0
live_tracked=0
roles_ok=0
premine_schema_ok=0
LIVE=""

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing required command: $1" >&2; exit 1; }
}

need_cmd jq
need_cmd find

mkdir -p "$(dirname "$OUT")" 2>/dev/null || true
mkdir -p "$(dirname "$HINT")" 2>/dev/null || true

# [A] PIN FIRST (no heuristics)
if [ -f "$PIN" ] && [ -s "$PIN" ]; then
  LIVE="$PIN"
fi

# [B] Fallback: bounded search for real JSON (exclude scripts/backups)
if [ -z "$LIVE" ]; then
  while IFS= read -r f; do
    b="$(basename "$f")"
    case "$b" in
      *.sh|*.bash|*.zsh|*.bak.*|*.bak_*|*.fixbak.*|*.pinbak.*|*.tmp.*) continue ;;
    esac
    if jq -e '
      (
        (.roles? | type == "object") or
        (.admins? | type == "object")
      ) and (
        .chainId? == 2050 or
        .keys_source? != null or
        .premine_model? != null or
        .premine_vaults? != null
      )
    ' "$f" >/dev/null 2>&1; then
      LIVE="$f"
      break
    fi
  done < <(
    find "$ROOT" -maxdepth 6 -type f -size +10c \
      \( -name "*.live.json" -o -path "*/broadcast/*/*.json" -o -path "*/ops/*/*.json" \) \
      2>/dev/null | head -n 200
  )
fi

if [ -n "${LIVE:-}" ] && [ -f "$LIVE" ] && [ -s "$LIVE" ]; then
  live_present=1

  if jq -e '
    (
      (.roles? | type == "object") and
      (.admins? | type == "object")
    ) and (
      .chainId? == 2050 or
      .keys_source? != null or
      .premine_model? != null or
      .premine_vaults? != null
    )
  ' "$LIVE" >/dev/null 2>&1; then
    live_tracked=1
  fi

  if jq -e '
    ((.roles.AdminGate // .roles.admin_gate) != null) and
    ((.roles.UpdateGate // .roles.update_gate) != null) and
    ((.roles.ConfigGate // .roles.config_gate) != null) and
    ((.roles.ValidatorSet // .roles.validator_set) != null) and
    ((.roles.VoidToken // .roles.void_token) != null) and
    ((.roles.VoidTreasury // .roles.void_treasury) != null) and
    ((.roles.OpsTreasury // .roles.ops_treasury) != null) and
    ((.roles.RewardEngine // .roles.reward_engine) != null) and
    ((.admins.adminGateController // .admins.admin) != null) and
    ((.admins.updateGateController // .admins.update_admin) != null) and
    ((.admins.configGateController // .admins.config_admin) != null) and
    ((.admins.validatorAdmin // .admins.validator_admin) != null) and
    ((.admins.voidTreasuryAdmin // .admins.treasury_admin) != null) and
    ((.admins.opsTreasuryAdmin // .admins.ops_admin) != null) and
    ((.admins.rewardEngineAdmin // .admins.reward_admin) != null)
  ' "$LIVE" >/dev/null 2>&1; then
    roles_ok=1
  fi

  if jq -e '
    .chainId == 2050 and
    .keys_source == "luks_flash_drives" and
    (.premine_model | type == "object") and
    .premine_model.type == "segmented_offline_vaults" and
    .premine_model.vault_count == 30 and
    (.premine_vaults | type == "array") and
    ((.premine_vaults | length) == 30)
  ' "$LIVE" >/dev/null 2>&1; then
    premine_schema_ok=1
  fi

  {
    echo "LIVE=$LIVE"
    echo "size_bytes=$(wc -c <"$LIVE" 2>/dev/null || echo 0)"
    echo "live_tracked=$live_tracked"
    echo "roles_ok=$roles_ok"
    echo "premine_schema_ok=$premine_schema_ok"
    echo "roles_keys=$(jq -r '(.roles // {} | keys | join(","))' "$LIVE" 2>/dev/null || echo "")"
    echo "admins_keys=$(jq -r '(.admins // {} | keys | join(","))' "$LIVE" 2>/dev/null || echo "")"
  } >"$HINT" 2>/dev/null || true
else
  printf "%s\n" "LIVE=(none)" >"$HINT" 2>/dev/null || true
fi

health=$(( up * live_present * live_tracked * roles_ok * premine_schema_ok ))

{
  echo "# HELP void_mainnet_keys_exporter_up Safe wrapper for keys exporter (never fails)"
  echo "# TYPE void_mainnet_keys_exporter_up gauge"
  echo "void_mainnet_keys_exporter_up $up"

  echo "# HELP void_mainnet_keys_exporter_last_run_seconds Last run unix time"
  echo "# TYPE void_mainnet_keys_exporter_last_run_seconds gauge"
  echo "void_mainnet_keys_exporter_last_run_seconds $NOW"

  echo "# HELP void_mainnet_keys_livejson_present 1 if a mainnet keys/plan json was found and non-empty"
  echo "# TYPE void_mainnet_keys_livejson_present gauge"
  echo "void_mainnet_keys_livejson_present $live_present"

  echo "# HELP void_mainnet_keys_livejson_tracked 1 if json contains expected tracked structure"
  echo "# TYPE void_mainnet_keys_livejson_tracked gauge"
  echo "void_mainnet_keys_livejson_tracked $live_tracked"

  echo "# HELP void_mainnet_keys_roles_ok 1 if live json contains required roles/admins"
  echo "# TYPE void_mainnet_keys_roles_ok gauge"
  echo "void_mainnet_keys_roles_ok $roles_ok"

  echo "# HELP void_mainnet_keys_premine_schema_ok 1 if pinned live json matches LUKS + 30-vault premine schema"
  echo "# TYPE void_mainnet_keys_premine_schema_ok gauge"
  echo "void_mainnet_keys_premine_schema_ok $premine_schema_ok"

  echo "# HELP void_mainnet_keys_health Composite health (present * tracked * roles_ok * premine_schema_ok)"
  echo "# TYPE void_mainnet_keys_health gauge"
  echo "void_mainnet_keys_health $health"
} >"$TMP"

mv -f "$TMP" "$OUT"
exit 0
