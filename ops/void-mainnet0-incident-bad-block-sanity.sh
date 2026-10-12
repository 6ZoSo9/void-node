#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md"
DOC2="$REPO/docs/MAINNET0_INCIDENT_BAD_BLOCK_CHECKLIST.md"

echo "=== [1] repo baseline ==="
git -C "$REPO" branch --show-current || true
git -C "$REPO" rev-parse --short HEAD || true

echo
echo "=== [2] required docs present ==="
[[ -f "$DOC1" ]] || { echo "[ERR] missing $DOC1"; exit 1; }
[[ -f "$DOC2" ]] || { echo "[ERR] missing $DOC2"; exit 1; }
echo "[ok] required docs exist"

echo
echo "=== [3] policy content checks ==="
grep -q "Severity tiers" "$DOC1" || { echo "[ERR] severity tiers section missing"; exit 1; }
grep -q "Evidence collection requirements" "$DOC1" || { echo "[ERR] evidence collection section missing"; exit 1; }
grep -q "Local rejection policy" "$DOC1" || { echo "[ERR] local rejection section missing"; exit 1; }
grep -q "Coordinated response policy" "$DOC1" || { echo "[ERR] coordinated response section missing"; exit 1; }
grep -q "Rollback / coordinated fork threshold" "$DOC1" || { echo "[ERR] rollback threshold section missing"; exit 1; }
grep -q "Validator expectations during bad-block incidents" "$DOC1" || { echo "[ERR] validator incident section missing"; exit 1; }
grep -q "Definition of done" "$DOC2" || { echo "[ERR] checklist definition-of-done missing"; exit 1; }
grep -q "Immediate next tasks" "$DOC2" || { echo "[ERR] checklist next-tasks missing"; exit 1; }
echo "[ok] policy sections present"

echo
echo "=== [4] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_INCIDENT_BAD_BLOCK_POLICY.md").read_text()
doc2 = (repo / "docs/MAINNET0_INCIDENT_BAD_BLOCK_CHECKLIST.md").read_text()
print({
  "incident_policy_doc": True,
  "checklist_doc": True,
  "mentions_severity_tiers": "Severity tiers" in doc1,
  "mentions_evidence_collection": "Evidence collection requirements" in doc1,
  "mentions_local_rejection": "Local rejection policy" in doc1,
  "mentions_coordinated_response": "Coordinated response policy" in doc1,
  "mentions_rollback_threshold": "Rollback / coordinated fork threshold" in doc1,
  "mentions_definition_of_done": "Definition of done" in doc2
})
PY

echo
echo "[ok] mainnet-0 incident/bad-block sanity passed"
