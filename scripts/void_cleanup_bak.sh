#!/usr/bin/env bash
set -euo pipefail
cd "${1:-$HOME/dev/void-node}"

echo "== inventory (.bak top 20 by size) =="
find . -type f \( -name '*.bak' -o -name '*.bak.*' -o -path './src/index.ts.*.bak*' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path './data*/*' \
  -printf '%s %p\n' | sort -nr | head -20 | awk '{printf "%8.1f MB  %s\n", $1/1048576, $2}'

echo -e "\n== total count/size =="
find . -type f \( -name '*.bak' -o -name '*.bak.*' -o -path './src/index.ts.*.bak*' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path './data*/*' \
  -printf '%s\n' | awk '{s+=$1} END{printf("count=%d  total=%.1f MB\n", NR, s/1048576)}'

echo -e "\n== DRY-RUN (files that would be deleted) =="
find . -type f \( -name '*.bak' -o -name '*.bak.*' -o -path './src/index.ts.*.bak*' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path './data*/*' -print

if [ "${DELETE:-0}" = "1" ]; then
  echo -e "\nDeleting…"
  find . -type f \( -name '*.bak' -o -name '*.bak.*' -o -path './src/index.ts.*.bak*' \) \
    -not -path './.git/*' -not -path './node_modules/*' -not -path './data*/*' -delete
  # optional: prune empty dirs
  find . -type d -empty -not -path './.git/*' -not -path './node_modules/*' -not -path './data*/*' -delete
  echo "done."
else
  echo -e "\nNothing deleted. Re-run with: DELETE=1 $0"
fi
