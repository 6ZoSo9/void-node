#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md"
DOC2="$REPO/docs/MAINNET0_CHECKPOINT_FINALITY_CHECKLIST.md"

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
grep -q "Checkpoint posture" "$DOC1" || { echo "[ERR] checkpoint posture section missing"; exit 1; }
grep -q "Reorg severity tiers" "$DOC1" || { echo "[ERR] reorg severity section missing"; exit 1; }
grep -q "Accepted checkpoint policy" "$DOC1" || { echo "[ERR] accepted checkpoint section missing"; exit 1; }
grep -q "Operator response sequence" "$DOC1" || { echo "[ERR] operator response section missing"; exit 1; }
grep -q "Validator expectations around checkpoints" "$DOC1" || { echo "[ERR] validator checkpoint section missing"; exit 1; }
grep -q "Definition of done" "$DOC2" || { echo "[ERR] checklist definition-of-done missing"; exit 1; }
grep -q "Immediate next tasks" "$DOC2" || { echo "[ERR] checklist next-tasks missing"; exit 1; }
echo "[ok] policy sections present"

echo
echo "=== [4] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_CHECKPOINT_FINALITY_POLICY.md").read_text()
doc2 = (repo / "docs/MAINNET0_CHECKPOINT_FINALITY_CHECKLIST.md").read_text()
print({
  "checkpoint_policy_doc": True,
  "checklist_doc": True,
  "mentions_accepted_checkpoint": "Accepted checkpoint policy" in doc1,
  "mentions_reorg_tiers": "Reorg severity tiers" in doc1,
  "mentions_operator_response": "Operator response sequence" in doc1,
  "mentions_validator_expectations": "Validator expectations around checkpoints" in doc1,
  "mentions_definition_of_done": "Definition of done" in doc2
})
PY

echo
echo "[ok] mainnet-0 checkpoint/finality sanity passed"
