#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DOCS=(
  "$REPO/docs/MAINNET0_VALIDATOR_FORK_POLICY.md"
  "$REPO/docs/MAINNET0_VALIDATOR_FORK_POLICY_CHECKLIST.md"
  "$REPO/docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md"
  "$REPO/docs/MAINNET0_CHECKPOINT_FINALITY_CHECKLIST.md"
  "$REPO/docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md"
  "$REPO/docs/MAINNET0_INCIDENT_BAD_BLOCK_CHECKLIST.md"
  "$REPO/docs/MAINNET0_REORG_SEVERITY_THRESHOLDS.md"
  "$REPO/docs/MAINNET0_OPERATOR_INCIDENT_BUNDLE.md"
  "$REPO/docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md"
  "$REPO/docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md"
  "$REPO/docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md"
  "$REPO/docs/MAINNET0_VALIDATOR_ACTIONS_WARNING_PAUSE_REMOVAL.md"
  "$REPO/docs/MAINNET0_CANONICAL_INCIDENT_BUNDLE_TEMPLATE.md"
)

SCRIPTS=(
  "$REPO/ops/void-mainnet0-validator-fork-policy-sanity.sh"
  "$REPO/ops/void-mainnet0-checkpoint-finality-sanity.sh"
  "$REPO/ops/void-mainnet0-incident-bad-block-sanity.sh"
  "$REPO/ops/void-mainnet0-reorg-incident-sanity.sh"
  "$REPO/ops/void-mainnet0-validator-admission-sanity.sh"
  "$REPO/ops/void-mainnet0-operator-artifacts-sanity.sh"
  "$REPO/ops/void-mainnet-bootstrap-sanity.sh"
)

ARTIFACTS=(
  "$REPO/ops/mainnet/validator-status.template.yaml"
  "$REPO/ops/mainnet/canonical-incident-bundle.template.yaml"
  "$REPO/ops/mainnet/void-mainnet.live.json"
)

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true

echo
echo "=== [2] required docs ==="
for f in "${DOCS[@]}"; do
  [[ -f "$f" ]] || { echo "[ERR] missing doc: $f"; exit 1; }
  echo "[ok] $f"
done

echo
echo "=== [3] required sanity scripts ==="
for f in "${SCRIPTS[@]}"; do
  [[ -x "$f" ]] || { echo "[ERR] missing/non-executable script: $f"; exit 1; }
  echo "[ok] $f"
done

echo
echo "=== [4] required operator templates ==="
for f in "${ARTIFACTS[@]}"; do
  [[ -f "$f" ]] || { echo "[ERR] missing artifact template: $f"; exit 1; }
  echo "[ok] $f"
done

echo
echo "=== [5] run all component sanity scripts ==="
for f in "${SCRIPTS[@]}"; do
  echo "--- running: $(basename "$f")"
  bash "$f"
  echo
done

echo "=== [6] quick yaml field checks ==="
grep -q '^validator_id:' "$REPO/ops/mainnet/validator-status.template.yaml" || { echo "[ERR] validator template missing validator_id"; exit 1; }
grep -q '^status:' "$REPO/ops/mainnet/validator-status.template.yaml" || { echo "[ERR] validator template missing status"; exit 1; }
grep -q '^incident_id:' "$REPO/ops/mainnet/canonical-incident-bundle.template.yaml" || { echo "[ERR] incident bundle missing incident_id"; exit 1; }
grep -q '^response_level:' "$REPO/ops/mainnet/canonical-incident-bundle.template.yaml" || { echo "[ERR] incident bundle missing response_level"; exit 1; }
grep -q '"mode": "mainnet_plan_stub"' "$REPO/ops/mainnet/void-mainnet.live.json" || { echo "[ERR] live json missing mainnet_plan_stub mode"; exit 1; }
grep -q '"chainId": 2050' "$REPO/ops/mainnet/void-mainnet.live.json" || { echo "[ERR] live json missing chainId 2050"; exit 1; }
echo "[ok] yaml template fields present"

echo
echo "=== [7] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
docs = [
    "docs/MAINNET0_VALIDATOR_FORK_POLICY.md",
    "docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md",
    "docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md",
    "docs/MAINNET0_REORG_SEVERITY_THRESHOLDS.md",
    "docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md",
    "docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md",
    "docs/MAINNET0_VALIDATOR_ACTIONS_WARNING_PAUSE_REMOVAL.md",
    "docs/MAINNET0_CANONICAL_INCIDENT_BUNDLE_TEMPLATE.md",
]
scripts = [
    "ops/void-mainnet0-validator-fork-policy-sanity.sh",
    "ops/void-mainnet0-checkpoint-finality-sanity.sh",
    "ops/void-mainnet0-incident-bad-block-sanity.sh",
    "ops/void-mainnet0-reorg-incident-sanity.sh",
    "ops/void-mainnet0-validator-admission-sanity.sh",
    "ops/void-mainnet0-operator-artifacts-sanity.sh",
    "ops/void-mainnet-bootstrap-sanity.sh",
]
artifacts = [
    "ops/mainnet/validator-status.template.yaml",
    "ops/mainnet/canonical-incident-bundle.template.yaml",
    "ops/mainnet/void-mainnet.live.json",
]
print({
    "docs_present": all((repo / p).exists() for p in docs),
    "sanity_scripts_present": all((repo / p).exists() for p in scripts),
    "operator_templates_present": all((repo / p).exists() for p in artifacts),
    "policy_stack_docs": len(docs),
    "sanity_scripts": len(scripts),
    "operator_templates": len(artifacts),
})
PY

echo
echo "[ok] mainnet-0 policy stack sanity passed"
