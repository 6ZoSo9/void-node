#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC1="$REPO/docs/MAINNET0_VALIDATOR_FORK_POLICY.md"
DOC2="$REPO/docs/MAINNET0_VALIDATOR_FORK_POLICY_CHECKLIST.md"

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
grep -q "Validator policy" "$DOC1" || { echo "[ERR] validator section missing"; exit 1; }
grep -q "Coordinated fork policy" "$DOC1" || { echo "[ERR] coordinated fork section missing"; exit 1; }
grep -q "Checkpointing / finality posture" "$DOC1" || { echo "[ERR] checkpoint section missing"; exit 1; }
grep -q "Timestamp / block sanity policy" "$DOC1" || { echo "[ERR] timestamp section missing"; exit 1; }
grep -q "Required tracked artifacts" "$DOC1" || { echo "[ERR] tracked artifacts section missing"; exit 1; }
grep -q "Definition of done" "$DOC2" || { echo "[ERR] checklist definition-of-done missing"; exit 1; }
grep -q "Immediate next tasks" "$DOC2" || { echo "[ERR] checklist next-tasks missing"; exit 1; }
echo "[ok] policy sections present"

echo
echo "=== [4] compact summary ==="
python3 - <<'PY'
from pathlib import Path
repo = Path.cwd()
doc1 = (repo / "docs/MAINNET0_VALIDATOR_FORK_POLICY.md").read_text()
doc2 = (repo / "docs/MAINNET0_VALIDATOR_FORK_POLICY_CHECKLIST.md").read_text()
print({
  "validator_policy_doc": True,
  "checklist_doc": True,
  "mentions_coordinated_forks": "Coordinated fork policy" in doc1,
  "mentions_checkpointing": "Checkpointing / finality posture" in doc1,
  "mentions_timestamp_policy": "Timestamp / block sanity policy" in doc1,
  "mentions_incident_policy": "Bad block / invalid state policy" in doc1,
  "mentions_definition_of_done": "Definition of done" in doc2
})
PY

echo
echo "[ok] mainnet-0 validator/fork policy sanity passed"
