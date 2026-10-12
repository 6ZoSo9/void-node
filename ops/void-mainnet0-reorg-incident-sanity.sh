#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_REORG_SEVERITY_THRESHOLDS.md"
DOC2="$REPO/docs/MAINNET0_OPERATOR_INCIDENT_BUNDLE.md"

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true

echo
echo "=== [2] required docs present ==="
[[ -f "$DOC1" ]] || { echo "[ERR] missing $DOC1"; exit 1; }
[[ -f "$DOC2" ]] || { echo "[ERR] missing $DOC2"; exit 1; }
echo "[ok] required docs exist"

echo
echo "=== [3] content checks ==="
grep -q "Suggested severity tiers" "$DOC1" || { echo "[ERR] severity tiers missing"; exit 1; }
grep -q "Checkpoint interaction" "$DOC1" || { echo "[ERR] checkpoint interaction missing"; exit 1; }
grep -q "Minimum incident bundle" "$DOC2" || { echo "[ERR] minimum incident bundle missing"; exit 1; }
grep -q "Strong claims require evidence" "$DOC2" || { echo "[ERR] evidence discipline section missing"; exit 1; }
grep -q "Validator communication payload" "$DOC2" || { echo "[ERR] validator payload section missing"; exit 1; }
echo "[ok] policy sections present"

echo
echo "=== [4] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_REORG_SEVERITY_THRESHOLDS.md").read_text()
doc2 = (repo / "docs/MAINNET0_OPERATOR_INCIDENT_BUNDLE.md").read_text()
print({
  "reorg_threshold_doc": True,
  "incident_bundle_doc": True,
  "mentions_tier_r3": "Tier R3" in doc1,
  "mentions_checkpoint_interaction": "Checkpoint interaction" in doc1,
  "mentions_minimum_bundle": "Minimum incident bundle" in doc2,
  "mentions_strong_claims_require_evidence": "Strong claims require evidence" in doc2,
  "mentions_validator_payload": "Validator communication payload" in doc2
})
PY

echo
echo "[ok] mainnet-0 reorg/incident sanity passed"
