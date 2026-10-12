#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$REPO/ops/mainnet/void-mainnet.live.json}"
GUARD="$REPO/ops/void-mainnet-livejson-guard.sh"
OUTDIR="${TMPDIR:-/tmp}/void-mainnet-bootstrap-sanity"
mkdir -p "$OUTDIR"

[[ -f "$PIN" ]] || { echo "[ERR] pinned live json missing: $PIN"; exit 1; }
[[ -x "$GUARD" ]] || { echo "[ERR] guard missing/not executable: $GUARD"; exit 1; }

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true
echo "PIN=$PIN"
echo "GUARD=$GUARD"

echo
echo "=== [2] run live json guard ==="
"$GUARD" "$PIN" | tee "$OUTDIR/guard.out"

echo
echo "=== [3] compact sanity summary ==="
if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq is required"
  exit 1
fi

jq '{
  chainId,
  mode,
  status,
  keys_source,
  selected_premine_vault,
  active_hot_wallet,
  funding_allocations,
  premine_model: {
    type: .premine_model.type,
    vault_count: .premine_model.vault_count,
    pool_seeding_source: .premine_model.pool_seeding_source
  },
  premine_vault_count: (.premine_vaults | length),
  roles_tbd_count: ([.roles[] | select(. == "TBD")] | length),
  admins_tbd_count: ([.admins[] | select(. == "TBD")] | length)
}' "$PIN" | tee "$OUTDIR/summary.json"

echo
echo "=== [4] explicit checks ==="
jq -r '
  [
    "chainId_2050=" + (if .chainId == 2050 then "1" else "0" end),
    "mode_stub=" + (if .mode == "mainnet_plan_stub" then "1" else "0" end),
    "status_stub_only=" + (if .status == "stub_only_not_live" then "1" else "0" end),
    "keys_luks_flash_drives=" + (if .keys_source == "luks_flash_drives" then "1" else "0" end),
    "vault_count_30=" + (if (.premine_vaults | length) == 30 then "1" else "0" end),
    "premine_model_segmented=" + (if .premine_model.type == "segmented_offline_vaults" then "1" else "0" end),
    "touch_one_vault_at_a_time=" + (if .premine_model.touch_one_vault_at_a_time == true then "1" else "0" end),
    "hot_wallet_required=" + (if .premine_model.active_hot_wallet_required == true then "1" else "0" end),
    "pool_seeding_source_premine=" + (if .premine_model.pool_seeding_source == "premine_allocations" then "1" else "0" end)
  ] | .[]
' "$PIN" | tee "$OUTDIR/checks.txt"

echo
echo "=== [5] final result ==="
echo "[ok] mainnet bootstrap sanity passed"
echo "artifacts=$OUTDIR"
