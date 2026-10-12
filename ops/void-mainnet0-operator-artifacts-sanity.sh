#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md"
DOC2="$REPO/docs/MAINNET0_VALIDATOR_ACTIONS_WARNING_PAUSE_REMOVAL.md"
DOC3="$REPO/docs/MAINNET0_CANONICAL_INCIDENT_BUNDLE_TEMPLATE.md"

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true

echo
echo "=== [2] required docs present ==="
[[ -f "$DOC1" ]] || { echo "[ERR] missing $DOC1"; exit 1; }
[[ -f "$DOC2" ]] || { echo "[ERR] missing $DOC2"; exit 1; }
[[ -f "$DOC3" ]] || { echo "[ERR] missing $DOC3"; exit 1; }
echo "[ok] required docs exist"

echo
echo "=== [3] content checks ==="
grep -q "Required fields" "$DOC1" || { echo "[ERR] validator record required fields missing"; exit 1; }
grep -q "Warning procedure" "$DOC2" || { echo "[ERR] warning procedure missing"; exit 1; }
grep -q "Pause procedure" "$DOC2" || { echo "[ERR] pause procedure missing"; exit 1; }
grep -q "Removal procedure" "$DOC2" || { echo "[ERR] removal procedure missing"; exit 1; }
grep -q "Bundle header" "$DOC3" || { echo "[ERR] incident bundle header missing"; exit 1; }
grep -q "Decision / response" "$DOC3" || { echo "[ERR] incident bundle response section missing"; exit 1; }
echo "[ok] operator artifact sections present"

echo
echo "=== [4] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md").read_text()
doc2 = (repo / "docs/MAINNET0_VALIDATOR_ACTIONS_WARNING_PAUSE_REMOVAL.md").read_text()
doc3 = (repo / "docs/MAINNET0_CANONICAL_INCIDENT_BUNDLE_TEMPLATE.md").read_text()
print({
  "validator_status_template": True,
  "warning_pause_removal_doc": True,
  "incident_bundle_template": True,
  "mentions_required_fields": "Required fields" in doc1,
  "mentions_warning_procedure": "Warning procedure" in doc2,
  "mentions_pause_procedure": "Pause procedure" in doc2,
  "mentions_removal_procedure": "Removal procedure" in doc2,
  "mentions_bundle_header": "Bundle header" in doc3,
  "mentions_decision_response": "Decision / response" in doc3,
})
PY

echo
echo "[ok] mainnet-0 operator artifact sanity passed"
