#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

CFG="ops/mainnet/void-mainnet.live.json"
ART="ops/void-mainnet-plan-artifact-v1.sh"

PLAN_FILES=(
  "/root/void-mainnet-plan/plan.latest.txt"
  "/root/void-mainnet-plan/plan.txt"
  "/root/void-mainnet-plan/plan.latest"
)

# (1) config must exist
if [[ ! -f "$CFG" ]]; then
  echo "config_not_found: $CFG"
  exit 1
fi

# (2) config must be valid JSON and match pinned stub shape (do NOT print it)
if command -v jq >/dev/null 2>&1; then
  jq -e . "$CFG" >/dev/null 2>&1 || { echo "bad_roles: invalid_json"; exit 1; }
  jq -e '
    .chainId == 2050 and
    .mode == "mainnet_plan_stub" and
    .status == "stub_only_not_live" and
    .keys_source == "luks_flash_drives" and
    .premine_model.type == "segmented_offline_vaults" and
    .premine_model.vault_count == 30 and
    (.premine_vaults | length) == 30
  ' "$CFG" >/dev/null 2>&1 || { echo "bad_roles: pinned_stub_schema_mismatch"; exit 1; }
fi

# (3) artifact script must exist + be executable
if [[ ! -x "$ART" ]]; then
  echo "plan_sim_failed: missing_or_not_exec: $ART"
  exit 1
fi

TMP="$(mktemp)"
set +e
"$ART" >"$TMP" 2>&1
RC="$?"
set -e

if [[ "$RC" -eq 0 ]]; then
  rm -f "$TMP"
  exit 0
fi

# Accept expected PLAN revert marker either in captured stdout OR in known plan files.
if grep -q "RUN_STUB_ONLY" "$TMP" 2>/dev/null || grep -q "STUB_ONLY" "$TMP" 2>/dev/null || grep -q "stub_only" "$TMP" 2>/dev/null; then
  rm -f "$TMP"
  exit 0
fi

for f in "${PLAN_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    if grep -q "RUN_STUB_ONLY" "$f" 2>/dev/null || grep -q "STUB_ONLY" "$f" 2>/dev/null || grep -q "stub_only" "$f" 2>/dev/null; then
      rm -f "$TMP"
      exit 0
    fi
  fi
done

rm -f "$TMP"
echo "plan_sim_failed: artifact rc= (no RUN_STUB_ONLY marker in stdout or plan.latest; but if plan.latest contains RUN_STUB_ONLY, this should have exited 0)"
exit 1
