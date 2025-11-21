#!/usr/bin/env bash
set -euo pipefail

# Run from repo root
cd "$(dirname "$0")/.."

shopt -s nullglob

files=()
files+=(contracts/*.sol)
files+=(test/*.sol)
files+=(test/*.t.sol)

for f in "${files[@]}"; do
  tmp="$(mktemp)"
  if grep -q '^// SPDX-License-Identifier:' "$f"; then
    # Replace existing SPDX line
    sed '1s|^// SPDX-License-Identifier: .*|// SPDX-License-Identifier: VCL-1.0|' "$f" > "$tmp"
  else
    {
      echo '// SPDX-License-Identifier: VCL-1.0'
      cat "$f"
    } > "$tmp"
  fi
  mv "$tmp" "$f"
done
