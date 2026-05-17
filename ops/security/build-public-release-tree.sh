#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_BASE="${OUT_BASE:-/tmp/void-public-release-export}"
OUT="$OUT_BASE/$STAMP"
TREE="$OUT/tree"
REPORT="$OUT/PUBLIC_RELEASE_SANITIZATION_REPORT.txt"
SOURCE_TREEISH="${PUBLIC_RELEASE_TREEISH:-HEAD}"
SOURCE_HEAD="$(git rev-parse "$SOURCE_TREEISH")"

mkdir -p "$TREE"

echo "=== build public release tree ==="
echo "repo=$(pwd)"
echo "treeish=$SOURCE_TREEISH"
echo "head=$SOURCE_HEAD"
echo "out=$OUT"
echo "tree=$TREE"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[ERR] gitleaks is required"
  exit 2
fi

echo
echo "=== [1] export current HEAD without git history ==="
git archive --format=tar "$SOURCE_TREEISH" | tar -x -C "$TREE"

echo
echo "=== [2] remove local/runtime/generated/sensitive paths ==="
cd "$TREE"

rm -rf \
  .runtime \
  .secrets \
  .secrets2 \
  keystore \
  logs \
  cache \
  out \
  broadcast \
  data \
  data_a \
  data_b \
  data2 \
  node_modules \
  obelisk-ui/node_modules \
  .park \
  _quarantine_untracked.*

find . -type f \( \
  -name ".env" -o \
  -name ".env.*" -o \
  -name "*.pem" -o \
  -name "*.key" -o \
  -name "*.pkcs8" -o \
  -name "*.p12" -o \
  -name "*.pfx" -o \
  -name "*wallet-secrets*.json" -o \
  -name "*.agekey" -o \
  -name "*.bak" -o \
  -name "*.bak.*" -o \
  -name "*.tmp" -o \
  -name "*.orig" -o \
  -name "*.old" -o \
  -name "*.work" \
\) -delete

find . -type f \( \
  -name "index.ts.ckpt*" -o \
  -name "index.ts.broken*" -o \
  -name "*.broken.*" -o \
  -name "*.DISABLED.*" \
\) -delete

rm -f ops/systemd-effective-baseline.*.txt
rm -f src/index.js
rm -f ops/void-workcredits-devnet-pool-state.sh
rm -f ops/mainnet/*.live.json
rm -f ops/mainnet/*.deployed.json
rm -f ops/mainnet/*recovery*.json
rm -f ops/mainnet/validator-truth-upgrade-track*.json
rm -f ops/mainnet/mainnet0-validator-live-admission-readiness.current.json
rm -f ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh

rm -f config/*live*.json
rm -f config/*state*.json
rm -f config/*mainnet*.json
rm -f config/*devnet*.json

rm -f docs/*STATE*.json
rm -f docs/*DEPLOY*.json
rm -f docs/*BOOTSTRAP*.txt
rm -f docs/*BOOTSTRAP*.md
rm -f docs/*REHEARSAL*.md
rm -f docs/*ceremony*.txt
rm -f docs/*broken*.json

echo
echo "=== [2b] remove operator-specific/public-export-noise paths ==="
rm -rf \
  .nodeid \
  .nodeid-* \
  .nodekey* \
  .peerstore.json \
  backup_*.tgz \
  catchup_*.ndjson \
  export_*.ndjson \
  journal-txroot-*.txt \
  rollover_test \
  _baseline \
  ops/checkpoints \
  ops/unit-inventory \
  ops/mainnet/*.zoso.md \
  ops/mainnet/validator-status.current.yaml \
  ops/mainnet0/mainnet0-8545-epoch125-state-proof.sh

echo
echo "=== [3] write sanitization report ==="
cat > "$REPORT" <<REPORT_EOF
VOID public release sanitization report

source_repo: $(cd "${VOID_REPO:-$HOME/dev/void-node}" && pwd)
source_treeish: $SOURCE_TREEISH
source_head: $SOURCE_HEAD
generated_at: $STAMP
tree: $TREE

This tree was generated with git archive from current HEAD.
It does not contain private git history.
Runtime/local/secrets/build/proof artifacts were removed.
This tree must pass gitleaks before public release.
REPORT_EOF

cat "$REPORT"

echo
echo "=== [4] create temporary one-commit git repo for gitleaks scan ==="
(
  cd "$TREE"
  git init -q
  git config user.email "void-public-release-scan@example.invalid"
  git config user.name "VOID Public Release Scanner"
  git add -A
  git commit -q -m "sanitized public release scan tree"
)

echo
echo "=== [5] scan sanitized tree with gitleaks detect ==="
set +e
gitleaks detect \
  --source "$TREE" \
  --redact \
  --report-format json \
  --report-path "$OUT/gitleaks.sanitized.json"
RC="$?"
set -e

echo "gitleaks_rc=$RC"

if [ "$RC" != "0" ]; then
  if [ -s "$OUT/gitleaks.sanitized.json" ]; then
    echo "[warn] gitleaks returned nonzero; checking whether findings were reported"
  else
    echo "[ERR] gitleaks scan failed without a usable report"
    rm -rf "$TREE/.git"
    exit "$RC"
  fi
fi

echo
echo "=== [6] remove temporary scan git metadata ==="
rm -rf "$TREE/.git"
test ! -d "$TREE/.git"

python3 - <<'PY' "$OUT/gitleaks.sanitized.json" "$OUT/gitleaks.sanitized.summary.txt"
import json, sys
from pathlib import Path
from collections import Counter

report = Path(sys.argv[1])
summary = Path(sys.argv[2])

try:
    rows = json.loads(report.read_text() or "[]")
except Exception:
    rows = []

by_rule = Counter(r.get("RuleID") or r.get("Description") or "unknown" for r in rows)
by_file = Counter(r.get("File") or "unknown" for r in rows)

lines = [f"findings={len(rows)}", "", "[by_rule]"]
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
echo "=== [5] decision ==="
FINDINGS="$(python3 - <<'PY' "$OUT/gitleaks.sanitized.json"
import json, sys
try:
    print(len(json.load(open(sys.argv[1]))))
except Exception:
    print(0)
PY
)"

if [ "$FINDINGS" != "0" ]; then
  echo "[BLOCK] sanitized public release tree still has gitleaks findings=$FINDINGS"
  echo "out=$OUT"
  exit 1
fi

echo "[ok] sanitized public release tree is gitleaks-clean"
echo "out=$OUT"
