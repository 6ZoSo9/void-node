#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public repo gitleaks current tracked proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] config exists and is narrow ==="
test -f .gitleaks.toml
grep -q 'useDefault = true' .gitleaks.toml
grep -q 'Public Ethereum address values' .gitleaks.toml
grep -q 'Public consensus key fields' .gitleaks.toml
grep -q 'condition = "AND"' .gitleaks.toml
grep -q 'adminGateMasterKey' .gitleaks.toml
echo "[ok] .gitleaks.toml markers present"

echo
echo "=== [3] generated/system/local artifacts are not tracked in proposed tree ==="
if git ls-files --error-unmatch ops/systemd-effective-baseline.20260320-053825.txt >/dev/null 2>&1; then
  if [ -e ops/systemd-effective-baseline.20260320-053825.txt ]; then
    echo "[fail] generated systemd baseline still tracked and present"
    exit 1
  fi
fi

for p in .secrets .runtime data_a cache .cache; do
  if git ls-files -- "$p" | grep -q .; then
    echo "[fail] tracked files under $p"
    git ls-files -- "$p"
    exit 1
  fi
done
echo "[ok] no tracked local runtime/secret dirs"

echo
echo "=== [4] build proposed tracked working-tree export ==="
TS="$(date +%Y%m%d-%H%M%S)"
EXPORT="/tmp/void-gitleaks-current-proof-$TS"
TREE="$EXPORT/tree"
REPORT="/tmp/void-gitleaks-current-proof-$TS.json"

rm -rf "$EXPORT"
mkdir -p "$TREE"

git ls-files -z --cached --others --exclude-standard \
  | while IFS= read -r -d '' f; do
      [ -f "$f" ] || continue
      mkdir -p "$TREE/$(dirname "$f")"
      cp "$f" "$TREE/$f"
    done

echo "tree=$TREE"

echo
echo "=== [5] scan proposed tracked tree ==="
gitleaks detect \
  --source "$TREE" \
  --no-git \
  --config .gitleaks.toml \
  --redact \
  --report-format json \
  --report-path "$REPORT"

echo "report=$REPORT"
echo "[ok] proposed tracked tree gitleaks scan passed"

echo
echo "=== [6] public baseline still green ==="
make public-repo-hardening-proof
make mainnet0-status-smoke

echo
echo "=== public repo gitleaks current tracked proof OK ==="
