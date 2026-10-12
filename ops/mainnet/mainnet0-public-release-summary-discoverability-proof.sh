#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

ROOT="README.md"
PUB="docs/public/README.md"
SUMMARY="docs/public/mainnet0-public-release-status-summary.md"

echo "=== Mainnet-0 public release summary discoverability proof ==="
echo "mutation=false"
echo

echo "=== [1] required files ==="
test -f "$ROOT"
test -f "$PUB"
test -f "$SUMMARY"
echo "[ok] required docs exist"
echo

echo "=== [2] root README discovery ==="
grep -q 'Mainnet-0 public release status summary' "$ROOT"
grep -q 'docs/public/mainnet0-public-release-status-summary.md' "$ROOT"
grep -q 'what is safe now' "$ROOT"
grep -q 'what remains guarded' "$ROOT"
grep -q 'current Mainnet-0 safety line' "$ROOT"
echo "[ok] root README links public release status summary"
echo

echo "=== [3] public docs README discovery ==="
grep -q 'Mainnet-0 public release status summary' "$PUB"
grep -q 'mainnet0-public-release-status-summary.md' "$PUB"
grep -q 'safe-now actions' "$PUB"
grep -q 'guarded actions' "$PUB"
grep -q 'current safety line' "$PUB"
echo "[ok] public docs README links public release status summary"
echo

echo "=== [4] summary proof remains green ==="
make mainnet0-public-release-status-summary-proof
echo

echo "=== [5] current status/trust/onboarding proofs ==="
make mainnet0-current-public-status-proof
make public-trust-boundary-stack-proof
make mainnet0-public-onboarding-pack-proof
make mainnet0-status-smoke
echo

echo "=== [6] no obvious secret material in touched docs ==="
if grep -RInE '(PRIVATE KEY|BEGIN .*PRIVATE|keystore|mnemonic|secret=|password=|api[_-]?key=)' "$ROOT" "$PUB" "$SUMMARY"; then
  echo "[ERR] possible secret-like material found"
  exit 1
fi
echo "[ok] no obvious secret-like material found"
echo

echo "=== [7] summary ==="
python3 - <<'PY'
summary = {
  "public_release_summary_discoverability": "green",
  "root_readme_link": True,
  "public_docs_readme_link": True,
  "summary_doc": "docs/public/mainnet0-public-release-status-summary.md",
  "public_trust_boundary_stack": "green",
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] Mainnet-0 public release summary discoverability proof passed"
