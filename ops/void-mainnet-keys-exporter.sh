#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/zoso/dev/void-node"
OUTDIR="/var/lib/node_exporter/textfile_collector"
OUT="$OUTDIR/void_mainnet_keys.prom"
TMP="$OUT.$$.tmp"
NOW="$(date +%s)"

PIN="$ROOT/ops/mainnet/void-mainnet.live.json"
HINT="/tmp/void-mainnet-keys-exporter.last"

up=1
live_present=0
live_tracked=0
roles_ok=0
premine_schema_ok=0
LIVE=""

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
    if grep -qE '(contractName|AdminGate|UpdateGate|ConfigGate|VoidTreasury|OpsTreasury|ValidatorSet|premine|roles|keys_source|premine_model|premine_vaults)' "$f" 2>/dev/null; then
      LIVE="$f"
      break
    fi
  done < <(
    find "$ROOT" -maxdepth 6 -type f -size +10c \
      \( -name "*.live.json" -o -path "*/broadcast/*/*.json" -o -path "*/ops/*/*.json" \) \
      2>/dev/null | head -n 200
  )
fi

# evaluate LIVE
if [ -n "${LIVE:-}" ] && [ -f "$LIVE" ] && [ -s "$LIVE" ]; then
  live_present=1

  # tracked: accept old role/broadcast structure OR new pinned schema
  if grep -qE '(AdminGate|UpdateGate|ConfigGate|VoidTreasury|OpsTreasury|ValidatorSet|premine|roles|contractName|transactions|transactionType|keys_source|premine_model|premine_vaults|vault_count)' "$LIVE" 2>/dev/null; then
    live_tracked=1
  fi

  need=(AdminGate UpdateGate ConfigGate VoidTreasury ValidatorSet)
  ok=1
  for k in "${need[@]}"; do
    if grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"$k\"" "$LIVE" 2>/dev/null; then
      :
    elif grep -q "\"$k\"" "$LIVE" 2>/dev/null; then
      :
    else
      ok=0
    fi
  done
  roles_ok="$ok"

  ps_ok=1
  grep -q '"chainId"[[:space:]]*:[[:space:]]*2050' "$LIVE" 2>/dev/null || ps_ok=0
  grep -q '"keys_source"[[:space:]]*:[[:space:]]*"luks_flash_drives"' "$LIVE" 2>/dev/null || ps_ok=0
  grep -q '"type"[[:space:]]*:[[:space:]]*"segmented_offline_vaults"' "$LIVE" 2>/dev/null || ps_ok=0
  grep -q '"vault_count"[[:space:]]*:[[:space:]]*30' "$LIVE" 2>/dev/null || ps_ok=0
  grep -q '"premine_vaults"' "$LIVE" 2>/dev/null || ps_ok=0
  premine_schema_ok="$ps_ok"

  {
    echo "LIVE=$LIVE"
    echo "size_bytes=$(wc -c <"$LIVE" 2>/dev/null || echo 0)"
    echo "has_admingate=$(grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"AdminGate\"" "$LIVE" 2>/dev/null || grep -q "\"AdminGate\"" "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_updategate=$(grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"UpdateGate\"" "$LIVE" 2>/dev/null || grep -q "\"UpdateGate\"" "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_configgate=$(grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"ConfigGate\"" "$LIVE" 2>/dev/null || grep -q "\"ConfigGate\"" "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_voidtreasury=$(grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"VoidTreasury\"" "$LIVE" 2>/dev/null || grep -q "\"VoidTreasury\"" "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_validatorset=$(grep -q "\"contractName\"[[:space:]]*:[[:space:]]*\"ValidatorSet\"" "$LIVE" 2>/dev/null || grep -q "\"ValidatorSet\"" "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_luks_flash_drives=$(grep -q '"keys_source"[[:space:]]*:[[:space:]]*"luks_flash_drives"' "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_segmented_offline_vaults=$(grep -q '"type"[[:space:]]*:[[:space:]]*"segmented_offline_vaults"' "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_vault_count_30=$(grep -q '"vault_count"[[:space:]]*:[[:space:]]*30' "$LIVE" 2>/dev/null && echo 1 || echo 0)"
    echo "has_premine_vaults=$(grep -q '"premine_vaults"' "$LIVE" 2>/dev/null && echo 1 || echo 0)"
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

  echo "# HELP void_mainnet_keys_livejson_tracked 1 if json contains expected role markers"
  echo "# TYPE void_mainnet_keys_livejson_tracked gauge"
  echo "void_mainnet_keys_livejson_tracked $live_tracked"

  echo "# HELP void_mainnet_keys_roles_ok 1 if json appears to contain required roles (heuristic)"
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
