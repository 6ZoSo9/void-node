#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# 1) Should be OK now
bash scripts/check-listener-singleton.sh
# 2) Inject a duplicate banner line (non-destructive, revert at end)
LINE=$(nl -ba src/index.ts | awk '/\[listeners\.guard\] process\+events ceiling set to unlimited/{print $1; exit}')
[ -n "$LINE" ]
cp -v src/index.ts src/index.ts.bak.$(date +%s)
sed -i "${LINE}a console.error(\"[listeners.guard] process+events ceiling set to unlimited\");" src/index.ts
# 3) Our check must FAIL now
if bash scripts/check-listener-singleton.sh 2>/dev/null; then
  echo "FAIL: check should have failed with duplicate banner" >&2; exit 1
fi
# 4) Revert duplicate
git checkout -- src/index.ts || true
echo "OK: smoke test proved guard catches dupes"
