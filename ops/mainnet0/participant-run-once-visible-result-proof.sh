#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/dev/void-node" || exit 1

echo "=== participant Run Once visible result proof ==="

curl -fsS --max-time 8 http://127.0.0.1:4100/participant > /tmp/run-once-visible-result.html

python3 - <<'PY'
from pathlib import Path
html = Path("/tmp/run-once-visible-result.html").read_text(errors="replace")
checks = [
  "Run Once",
  "WC visible now",
  "Waiting for WC credit",
  "latestJobState",
  "latestJobMeta",
  "Last WC Reward",
  "latestDatasetReceiptHero",
  "proofSummaryCard",
  "Open Published Dataset",
  "viewer_url",
  "raw_json_url",
  "receipt_id",
]
missing = [x for x in checks if x not in html]
assert not missing, missing
print("[ok] visible Run Once result / receipt / dataset anchors present")
PY

make participant-run-once-wc-delta-proof
make mainnet0-status-smoke

echo "[ok] participant Run Once visible result proof passed"
