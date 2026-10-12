#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md"
DOC2="$REPO/docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md"
CUR="$REPO/ops/mainnet/validator-status.current.yaml"

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true

echo
echo "=== [2] required docs present ==="
[[ -f "$DOC1" ]] || { echo "[ERR] missing $DOC1"; exit 1; }
[[ -f "$DOC2" ]] || { echo "[ERR] missing $DOC2"; exit 1; }
[[ -f "$CUR"  ]] || { echo "[ERR] missing $CUR"; exit 1; }
echo "[ok] required docs exist"
echo "[ok] current validator artifact exists"

echo
echo "=== [3] content checks ==="
grep -q "Admission requirements" "$DOC1" || { echo "[ERR] admission requirements missing"; exit 1; }
grep -q "Minimum admission record" "$DOC1" || { echo "[ERR] minimum admission record missing"; exit 1; }
grep -q "Pre-admission checks" "$DOC1" || { echo "[ERR] pre-admission checks missing"; exit 1; }
grep -q "Warning / pause / removal posture" "$DOC1" || { echo "[ERR] warning/pause/removal section missing"; exit 1; }
grep -q "Incident expectations for validators" "$DOC1" || { echo "[ERR] incident expectations missing"; exit 1; }
grep -q "Definition of done" "$DOC2" || { echo "[ERR] checklist definition-of-done missing"; exit 1; }
grep -q "Immediate next tasks" "$DOC2" || { echo "[ERR] checklist next-tasks missing"; exit 1; }
echo "[ok] runbook sections present"

echo
echo "=== [4] current artifact checks ==="
grep -q "^validator_id:" "$CUR" || { echo "[ERR] validator_id missing in current artifact"; exit 1; }
grep -q "^operator_label:" "$CUR" || { echo "[ERR] operator_label missing in current artifact"; exit 1; }
grep -q "^status:" "$CUR" || { echo "[ERR] status missing in current artifact"; exit 1; }
grep -q "^status_reason:" "$CUR" || { echo "[ERR] status_reason missing in current artifact"; exit 1; }
grep -q "^last_known_head:" "$CUR" || { echo "[ERR] last_known_head missing in current artifact"; exit 1; }
grep -q "^last_known_health:" "$CUR" || { echo "[ERR] last_known_health missing in current artifact"; exit 1; }
echo "[ok] current validator artifact fields present"

echo
echo "=== [5] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md").read_text()
doc2 = (repo / "docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md").read_text()
cur = (repo / "ops/mainnet/validator-status.current.yaml").read_text()
print({
  "validator_admission_runbook": True,
  "validator_admission_checklist": True,
  "validator_status_current": True,
  "mentions_admission_requirements": "Admission requirements" in doc1,
  "mentions_minimum_record": "Minimum admission record" in doc1,
  "mentions_pre_admission_checks": "Pre-admission checks" in doc1,
  "mentions_warning_pause_removal": "Warning / pause / removal posture" in doc1,
  "mentions_incident_expectations": "Incident expectations for validators" in doc1,
  "mentions_definition_of_done": "Definition of done" in doc2,
  "current_has_validator_id": "validator_id:" in cur,
  "current_has_status": "status:" in cur,
  "current_has_last_known_head": "last_known_head:" in cur
})
PY

echo
echo "[ok] mainnet-0 validator admission sanity passed"
