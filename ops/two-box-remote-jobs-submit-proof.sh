#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-remote-jobs-submit-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] local truth ==="
cd "$HOME/dev/void-node"
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true

echo
echo "=== [2] remote pre-proof truth ==="
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote branch ---"
git branch --show-current
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote latest tag ---"
git describe --tags --abbrev=0 2>/dev/null || true
echo "--- remote health ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/health
echo
echo "--- remote jobs worker diag ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/jobs-and-datanet-worker-v1.json
echo
echo "--- remote wc diag ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/wc-auto-credit-v1.json
echo
' | tee "$OUT/remote.before.txt"

echo
echo "=== [3] run remote jobs submit proof ==="
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
bash ops/jobs-submit-e2e-proof.sh
' | tee "$OUT/remote.proof.txt"

echo
echo "=== [4] remote post-proof truth ==="
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote jobs worker diag ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/jobs-and-datanet-worker-v1.json
echo
echo "--- remote wc diag ---"
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/wc-auto-credit-v1.json
echo
echo "--- remote participant ---"
curl -o /dev/null -sS -w "participant_http=%{http_code}\n" --max-time 5 http://127.0.0.1:4100/participant
' | tee "$OUT/remote.after.txt"

echo
echo "=== [5] summarize proof ids ==="
python3 - "$OUT/remote.proof.txt" <<'PY'
from pathlib import Path
import re, sys, json
txt = Path(sys.argv[1]).read_text()

jobs = re.findall(r'"job_id":\s*"([^"]+)"', txt)
rcpts = re.findall(r'"receipt_id":\s*"([^"]+)"', txt)
accts = re.findall(r'"account":\s*"([^"]*jobs-submit-proof-user[^"]*)"', txt)

summary = {
    "job_id": jobs[-1] if jobs else "",
    "receipt_id": rcpts[-1] if rcpts else "",
    "account": accts[-1] if accts else "",
    "proof_ok": "[ok] proof bundle:" in txt and '"ledger_credit_found": true' in txt and '"receipt_found": true' in txt
}
print(json.dumps(summary, indent=2))
if not summary["proof_ok"]:
    raise SystemExit("FAIL: remote jobs submit proof did not pass cleanly")
PY

echo
echo "[ok] two-box remote jobs submit proof green"
echo "[ok] proof bundle: $OUT"
