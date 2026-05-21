#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-home-launch-strip.html"

echo "=== participant Home launch strip proof ==="

echo
echo "=== [1] source markers ==="
grep -q 'VOID_HOME_TOPSTRIP_LAUNCH_NOGO_V1' src/index.ts
grep -q 'topStripLaunch' src/index.ts
grep -q 'Public launch: NO-GO preview' src/index.ts
grep -q 'VOID_HOME_MAINNET0_NOGO_CLARITY_V1' src/index.ts
echo "[ok] source has launch strip and Home NO-GO clarity"

echo
echo "=== [2] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 4

echo
echo "=== [3] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-home-launch-strip-ready.json
echo
python3 - /tmp/void-home-launch-strip-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] served participant HTML ==="
curl -fsS "$BASE/participant" > "$HTML"
grep -q 'VOID_HOME_TOPSTRIP_LAUNCH_NOGO_V1' "$HTML"
grep -q 'topStripLaunch' "$HTML"
grep -q 'Public launch: NO-GO preview' "$HTML"
grep -q 'public launch is still NO-GO' "$HTML"
grep -q 'validator registration is candidate/waiting only' "$HTML"
echo "[ok] served launch strip is present"

echo
echo "=== [5] launch posture remains fail-closed ==="
grep -q '^decision: NO_GO$' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^launch_approval: false$' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^mutation_allowed: false$' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q 'Public validator admission remains candidate_only_for_mainnet0' ops/mainnet/mainnet0-current-baseline.current.md
grep -q 'Public active validator admission remains disabled' ops/mainnet/mainnet0-current-baseline.current.md
echo "[ok] launch docs remain NO-GO"

echo
echo "[ok] participant Home launch strip proof passed"
