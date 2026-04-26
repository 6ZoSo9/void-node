#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

OUT="${OUT:-/tmp/void-public-release-secret-gate.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== public release secret gate ==="
echo "repo=$(pwd)"
echo "out=$OUT"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[ERR] gitleaks is required for public release secret gate"
  exit 2
fi

echo
echo "=== [1] git truth ==="
git branch --show-current | tee "$OUT/branch.txt"
git rev-parse HEAD | tee "$OUT/head.txt"
git status --short | tee "$OUT/status.txt"

echo
echo "=== [2] run gitleaks over full repo history ==="
set +e
gitleaks detect \
  --source "$PWD" \
  --redact \
  --report-format json \
  --report-path "$OUT/gitleaks.json"
RC="$?"
set -e

echo "gitleaks_rc=$RC" | tee "$OUT/gitleaks.rc.txt"

echo
echo "=== [3] summarize findings without secrets ==="
python3 - <<'PY' "$OUT/gitleaks.json" "$OUT/summary.txt"
import json, sys
from collections import Counter, defaultdict
from pathlib import Path

report = Path(sys.argv[1])
summary = Path(sys.argv[2])

if not report.exists():
    rows = []
else:
    try:
        rows = json.loads(report.read_text() or "[]")
    except Exception:
        rows = []

by_rule = Counter((r.get("RuleID") or r.get("Description") or "unknown") for r in rows)
by_file = Counter((r.get("File") or "unknown") for r in rows)

lines = []
lines.append(f"findings={len(rows)}")
lines.append("")
lines.append("[by_rule]")
for k, v in by_rule.most_common(50):
    lines.append(f"{v}\t{k}")
lines.append("")
lines.append("[by_file]")
for k, v in by_file.most_common(100):
    lines.append(f"{v}\t{k}")

summary.write_text("\n".join(lines) + "\n")
print(summary.read_text())
PY

echo
echo "=== [4] decision ==="
FINDINGS="$(python3 - <<'PY' "$OUT/gitleaks.json"
import json, sys
try:
    print(len(json.load(open(sys.argv[1]))))
except Exception:
    print(0)
PY
)"

if [ "$FINDINGS" != "0" ]; then
  echo "[BLOCK] public release is blocked: gitleaks findings=$FINDINGS"
  echo "[BLOCK] classify, rotate/revoke real secrets, remove risky artifacts, or add narrow reviewed allowlists only for proven false positives."
  exit 1
fi

echo "[ok] public release secret gate green"
