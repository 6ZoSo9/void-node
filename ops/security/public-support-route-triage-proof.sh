#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-support-route-triage-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

STATUS="docs/public/mainnet0-current-public-status.md"
SUPPORT="docs/public/support-runbook.md"

echo "=== public support route triage proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] doc markers ==="
grep -q 'Public support first checks' "$STATUS"
grep -q '`/` redirects to `/participant` as the public first-run entry path.' "$STATUS"
grep -q 'Sensitive GET routes' "$STATUS"
grep -q 'Public validator registration remains candidate/waiting only.' "$STATUS"
grep -q 'Buy VOID remains guided-only' "$STATUS"

grep -q 'Current public route triage' "$SUPPORT"
grep -q 'Location: /participant' "$SUPPORT"
grep -q 'Location: /site/voidchain' "$SUPPORT"
grep -q 'Do not treat public-live status as permission to use guarded mutation lanes.' "$SUPPORT"
grep -q 'proof-gated' "$SUPPORT"
echo "[ok] support/status route triage docs present"

echo
echo "=== [3] build ==="
npm run build

echo
echo "=== [4] ready ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"
cat "$OUT/ready.json"
echo
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
assert int(j.get("head", 0)) > 0, j
print("[ok] ready/head/gap/txroot")
PY

echo
echo "=== [5] public route triage ==="
code="$(curl -sS --max-time 8 -D "$OUT/root.headers" -o "$OUT/root.body" -w '%{http_code}' "$BASE/")"
test "$code" = "302"
grep -qi '^Location: /participant' "$OUT/root.headers"
echo "[ok] / redirects to /participant"

for path in /download /voidchain; do
  name="$(echo "$path" | tr -d '/')"
  code="$(curl -sS --max-time 8 -D "$OUT/$name.headers" -o "$OUT/$name.body" -w '%{http_code}' "$BASE$path")"
  test "$code" = "302"
  grep -qi '^Location: /site/voidchain' "$OUT/$name.headers"
  echo "[ok] $path redirects to /site/voidchain"
done

code="$(curl -sS --max-time 8 -o "$OUT/participant.html" -w '%{http_code}' "$BASE/participant")"
test "$code" = "200"
grep -q 'VOID Participant' "$OUT/participant.html"
grep -q 'Start Here' "$OUT/participant.html"
grep -q 'Open Wallet' "$OUT/participant.html"
echo "[ok] /participant served Wallet-first public app"

code="$(curl -sS --max-time 8 -o "$OUT/voidchain.html" -w '%{http_code}' "$BASE/site/voidchain")"
test "$code" = "200"
grep -q 'Quick start' "$OUT/voidchain.html"
grep -q 'Linux is the preferred path' "$OUT/voidchain.html"
grep -q 'Windows users should use WSL2' "$OUT/voidchain.html"
echo "[ok] /site/voidchain served install path"

echo
echo "=== [6] sensitive route safety ==="
for path in \
  /__void/status \
  /__void/participant/stake/next-onboard \
  /__void/operator/buy-void/fulfill \
  /__void/operator/buy-void/claim-tx \
  /__void/treasury \
  /__void/admin; do
  code="$(curl -sS --max-time 8 -o "$OUT/safety.body" -w '%{http_code}' "$BASE$path")"
  if [ "$code" != "404" ]; then
    echo "[ERR] expected 404 for $path, got $code"
    exit 1
  fi
  echo "[ok] $path -> 404"
done

echo
echo "=== [7] existing public support/status smoke proofs ==="
make mainnet0-support-runbook-proof
make mainnet0-status-smoke

echo
echo "=== [8] ready after ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready-after.json"
cat "$OUT/ready-after.json"
echo
python3 - "$OUT/ready-after.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "public_support_route_triage": "green",
  "root_get": "redirects_to_participant",
  "download_get": "redirects_to_site_voidchain",
  "voidchain_get": "redirects_to_site_voidchain",
  "support_docs": "updated",
  "sensitive_get_routes": "404",
  "mutation_lanes": "not_touched",
})
PY

echo
echo "[ok] public support route triage proof passed"
echo "out=$OUT"
