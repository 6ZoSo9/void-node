#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-download-install-journey-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== public download/install journey proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] ready ==="
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
echo "=== [4] download aliases redirect to voidchain site ==="
for path in /download /voidchain; do
  name="$(echo "$path" | tr -d '/')"
  code="$(curl -sS --max-time 8 -D "$OUT/$name.headers" -o "$OUT/$name.body" -w '%{http_code}' "$BASE$path")"
  test "$code" = "302"
  grep -qi '^Location: /site/voidchain' "$OUT/$name.headers"
  grep -q 'Found. Redirecting to /site/voidchain' "$OUT/$name.body"
  echo "[ok] $path redirects to /site/voidchain"
done

echo
echo "=== [5] served voidchain install page markers ==="
HTML="$OUT/voidchain.html"
curl -fsS --max-time 8 "$BASE/site/voidchain" > "$HTML"

needles=(
  '<title>VOID Network — voidchain.io</title>'
  'VOID NETWORK'
  'Mainnet-0 public-live'
  'DataNet-backed website'
  'Google Cloud not required'
  'Quick start'
  'git clone https://github.com/6ZoSo9/void-node'
  'cd void-node &amp;&amp; npm install &amp;&amp; npm run build'
  'Open Participant App'
  'Open local participant app'
  'Quick start docs'
  'Run a node docs'
  'docs/public/quick-start.md'
  'docs/public/run-a-node.md'
  'Linux is the preferred path'
  'Windows users should use WSL2'
  'served DataNet-first'
  'guarded actions remain proof-gated'
)

for n in "${needles[@]}"; do
  grep -q "$n" "$HTML"
  echo "[ok] $n"
done

echo
echo "=== [6] public install docs markers ==="
DOCS=(
  docs/public/quick-start.md
  docs/public/run-a-node.md
  docs/public/windows-wsl2-quick-start.md
  docs/public/README.md
)

for f in "${DOCS[@]}"; do
  test -f "$f"
  grep -q 'public_mainnet0_live' "$f"
  grep -q 'participant' "$f"
  echo "[ok] $f exists and references public status / participant path"
done

grep -q 'git clone https://github.com/6ZoSo9/void-node.git' docs/public/quick-start.md
grep -q 'npm install' docs/public/quick-start.md
grep -q 'npm run build' docs/public/quick-start.md
grep -q 'http://127.0.0.1:4100/participant' docs/public/quick-start.md
grep -q 'Public validator registration remains candidate/waiting only.' docs/public/quick-start.md
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' docs/public/quick-start.md

grep -q 'target: Linux first' docs/public/run-a-node.md
grep -q 'WSL2' docs/public/run-a-node.md
grep -q 'git clone https://github.com/6ZoSo9/void-node.git' docs/public/run-a-node.md
grep -q 'npm install' docs/public/run-a-node.md
grep -q 'npm run build' docs/public/run-a-node.md
grep -q 'http://127.0.0.1:4100/participant' docs/public/run-a-node.md

grep -q 'VOID Mainnet-0 Windows WSL2 Quick Start' docs/public/windows-wsl2-quick-start.md
grep -q 'WSL2 is acceptable for early public users' docs/public/windows-wsl2-quick-start.md
grep -q 'For serious long-running node operation, use a dedicated Linux machine.' docs/public/windows-wsl2-quick-start.md

grep -q 'quick-start.md' docs/public/README.md
grep -q 'windows-wsl2-quick-start.md' docs/public/README.md
grep -q 'run-a-node.md' docs/public/README.md
echo "[ok] public install docs preserve quick-start/Linux/WSL2/safety path"

echo
echo "=== [7] route safety spot-check ==="
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
echo "=== [8] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [9] ready after ==="
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
echo "=== [10] summary ==="
python3 - <<'PY'
print({
  "public_download_install_journey": "green",
  "download_get": "redirects_to_site_voidchain",
  "voidchain_get": "redirects_to_site_voidchain",
  "site_voidchain": "served",
  "quick_start_docs": "present",
  "linux_first": True,
  "windows_wsl2_path": True,
  "sensitive_get_routes": "404",
  "mutation_lanes": "not_touched",
})
PY

echo
echo "[ok] public download/install journey proof passed"
echo "out=$OUT"
