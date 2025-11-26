#!/usr/bin/env bash
set -euo pipefail

echo "[keys-preflight] repo=\$(pwd)"

ROOT="\$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "\$ROOT"

FAIL=0

echo "[keys-preflight] checking for keys+treasury design doc..."
if [[ ! -f docs/VOID-MAINNET-KEYS-AND-TREASURY.md ]]; then
  echo "[keys-preflight] ERROR: docs/VOID-MAINNET-KEYS-AND-TREASURY.md missing."
  FAIL=1
else
  echo "[keys-preflight] OK: keys+treasury plan present."
fi

echo
echo "[keys-preflight] checking for tracked *.key files..."
if git ls-files '*.key' >/dev/null 2>&1 && [[ -n "\$(git ls-files '*.key')" ]]; then
  echo "[keys-preflight] ERROR: tracked .key files found:"
  git ls-files '*.key'
  FAIL=1
else
  echo "[keys-preflight] OK: no tracked .key files."
fi

echo
echo "[keys-preflight] scanning for obvious private key / mnemonic fields in mainnet docs..."
MAINNET_DOC_GLOB="docs/VOID-MAINNET-*"
shopt -s nullglob
MATCHED_FILES=(\$MAINNET_DOC_GLOB)
shopt -u nullglob

if (( \${#MATCHED_FILES[@]} == 0 )); then
  echo "[keys-preflight] no docs/VOID-MAINNET-* files yet; skipping content scan."
else
  BAD_HITS=0
  for f in "\${MATCHED_FILES[@]}"; do
    if grep -nE '"(privateKey|secretKey|mnemonic|seed)"' "\$f" >/dev/null 2>&1; then
      echo "[keys-preflight] ERROR: possible raw key/seed fields in \$f:"
      grep -nE '"(privateKey|secretKey|mnemonic|seed)"' "\$f" || true
      BAD_HITS=1
    fi
    if grep -nE '0x[0-9a-fA-F]{64}' "\$f" >/dev/null 2>&1; then
      echo "[keys-preflight] WARNING: 64-hex values in \$f (check they are not private keys):"
      grep -nE '0x[0-9a-fA-F]{64}' "\$f" || true
    fi
    if grep -n 'test test test test test test test test test test test junk' "\$f" >/dev/null 2>&1; then
      echo "[keys-preflight] ERROR: found standard test mnemonic in \$f"
      BAD_HITS=1
    fi
  done

  if (( BAD_HITS > 0 )); then
    echo "[keys-preflight] ERROR: potential secrets or test mnemonics in mainnet docs; fix before pushing."
    FAIL=1
  else
    echo "[keys-preflight] OK: no obvious secret fields in docs/VOID-MAINNET-*."
  fi
fi

echo
echo "[keys-preflight] summary:"
if (( FAIL == 0 )); then
  echo "[keys-preflight] RESULT: OK (no tracked .key files, keys plan present, no obvious secrets in mainnet docs)"
else
  echo "[keys-preflight] RESULT: FAIL (see errors above)"
fi

exit "\$FAIL"
