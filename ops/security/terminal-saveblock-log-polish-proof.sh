#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== terminal saveblock log polish proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source markers ==="
grep -q 'lastWrapLogAt: 0' src/index.ts
grep -q 'suppressedWrapLogs: 0' src/index.ts
grep -q 'do not spam one log line per second' src/index.ts
grep -q 'now - last > 60000' src/index.ts
grep -q 'suppressed repeated rewrap log' src/index.ts
grep -q 'state.suppressedWrapLogs = suppressed + 1' src/index.ts
grep -q 'setInterval(() => {' src/index.ts
grep -q 'install();' src/index.ts
echo "[ok] source markers present"

echo
echo "=== [2] unthrottled v2 rewrap log must be gone ==="
python3 - <<'PY'
from pathlib import Path
s = Path("src/index.ts").read_text()
bad = 'try { console.log("[terminal-saveblock-v2] rewrapped live store.saveBlock"); } catch {}'
if bad in s:
    raise SystemExit("unthrottled v2 rewrap log still present")
print("[ok] unthrottled v2 log removed")
PY

echo
echo "=== [3] local status smoke ==="
make mainnet0-status-smoke

echo "=== terminal saveblock log polish proof OK ==="
