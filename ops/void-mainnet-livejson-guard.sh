#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$REPO/ops/mainnet/void-mainnet.live.json}"

[[ -f "$PIN" ]] || { echo "[ERR] live json missing: $PIN"; exit 1; }

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq is required"
  exit 1
fi

echo "=== [1] basic json validity ==="
jq -e . "$PIN" >/dev/null

echo "=== [2] required top-level schema ==="
jq -e '
  .chainId == 2050 and
  (.mode | type == "string") and
  (.status | type == "string") and
  .keys_source == "luks_flash_drives" and
  (.premine_model | type == "object") and
  (.selected_premine_vault | type == "object") and
  (.active_hot_wallet | type == "object") and
  (.funding_allocations | type == "object") and
  (.roles | type == "object") and
  (.admins | type == "object") and
  (.validator0 | type == "object") and
  (.pool_seeding_plan | type == "object") and
  (.premine_vaults | type == "array") and
  (.notes | type == "array")
' "$PIN" >/dev/null || { echo "[ERR] top-level schema mismatch"; exit 1; }

echo "=== [3] locked premine model invariants ==="
jq -e '
  .premine_model.type == "segmented_offline_vaults" and
  .premine_model.vault_count == 30 and
  .premine_model.vaults_live_online_by_default == false and
  .premine_model.touch_one_vault_at_a_time == true and
  .premine_model.active_hot_wallet_required == true and
  .premine_model.active_hot_wallet_should_be_small == true and
  .premine_model.pool_seeding_source == "premine_allocations" and
  (.premine_vaults | length) == 30
' "$PIN" >/dev/null || { echo "[ERR] premine model invariant failed"; exit 1; }

echo "=== [4] reject monolithic funding assumptions ==="
jq -e '
  .premine_model.type == "segmented_offline_vaults" and
  .premine_model.touch_one_vault_at_a_time == true and
  .premine_model.active_hot_wallet_required == true and
  .premine_model.pool_seeding_source == "premine_allocations" and
  (
    (.funding_allocations.treasury_allocation | tostring) == "0" or
    (.funding_allocations.treasury_allocation | tonumber) >= 0
  ) and
  (
    (.funding_allocations.pool_seeding_allocation | tostring) == "0" or
    (.funding_allocations.pool_seeding_allocation | tonumber) >= 0
  )
' "$PIN" >/dev/null || { echo "[ERR] config violates premine-vault funding assumptions"; exit 1; }

echo "=== [5] mode-aware checks ==="
MODE="$(jq -r '.mode' "$PIN")"
STATUS="$(jq -r '.status' "$PIN")"

case "$MODE" in
  mainnet_plan_stub)
    jq -e '
      .status == "stub_only_not_live" and
      .selected_premine_vault.id == "TBD" and
      .selected_premine_vault.address == "TBD" and
      .active_hot_wallet.address == "TBD" and
      .funding_allocations.hot_wallet_refill == "0" and
      .funding_allocations.treasury_allocation == "0" and
      .funding_allocations.pool_seeding_allocation == "0"
    ' "$PIN" >/dev/null || { echo "[ERR] stub mode fields inconsistent"; exit 1; }
    ;;
  rehearsal|live_broadcast|plan_only)
    echo "[info] non-stub mode detected: $MODE"
    jq -e '
      .selected_premine_vault.id != "TBD" and
      .selected_premine_vault.address != "TBD" and
      .selected_premine_vault.purpose != "TBD" and
      .active_hot_wallet.address != "TBD" and
      .funding_allocations.reward != "TBD" and
      .funding_allocations.destination != "TBD" and
      (.roles.AdminGate != "TBD") and
      (.roles.UpdateGate != "TBD") and
      (.roles.ConfigGate != "TBD") and
      (.roles.ValidatorSet != "TBD") and
      (.roles.VoidToken != "TBD") and
      (.roles.VoidTreasury != "TBD") and
      (.roles.OpsTreasury != "TBD") and
      (.roles.RewardEngine != "TBD") and
      (.admins.adminGateController != "TBD") and
      (.admins.updateGateController != "TBD") and
      (.admins.configGateController != "TBD") and
      (.admins.validatorAdmin != "TBD") and
      (.admins.voidTreasuryAdmin != "TBD") and
      (.admins.opsTreasuryAdmin != "TBD") and
      (.admins.rewardEngineAdmin != "TBD") and
      ((.premine_vaults | map(.address != "TBD") | all))
    ' "$PIN" >/dev/null || { echo "[ERR] non-stub mode still contains unresolved must-fill-before-live fields"; exit 1; }
    ;;
  *)
    echo "[ERR] invalid mode: $MODE"
    exit 1
    ;;
esac

echo "=== [6] role/admin field presence ==="
jq -e '
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
' "$PIN" >/dev/null || { echo "[ERR] required role/admin fields missing"; exit 1; }

echo "=== [7] summary ==="
jq '{
  chainId,
  mode,
  status,
  keys_source,
  selected_premine_vault,
  active_hot_wallet,
  funding_allocations,
  premine_vault_count: (.premine_vaults | length)
}' "$PIN"

echo
echo "[ok] live json guard passed: $PIN"
