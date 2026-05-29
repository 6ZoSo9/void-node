#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-github-landing-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== public GitHub landing proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] README landing markers ==="
need() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$file"; then
    echo "[ERR] missing in $file: $needle"
    exit 1
  fi
  echo "[ok] $file: $needle"
}

need README.md "VOID Mainnet-0 is live"
need README.md "public_mainnet0_live / GO_PUBLIC_MAINNET0"
need README.md "VOID Mainnet-0 is public-live"

need README.md "docs/public/start-here.md"
need README.md "docs/public/quick-start.md"
need README.md "docs/public/windows-wsl2-quick-start.md"
need README.md "docs/public/run-a-node.md"
need README.md "docs/public/participant-onboarding.md"
need README.md "docs/public/mainnet0-current-public-status.md"
need README.md "docs/public/mainnet0-public-live-announcement.md"
need README.md "docs/public/support-runbook.md"
need README.md "docs/public/void-network-whitepaper.md"

test -f SECURITY.md
test -f CONTRIBUTING.md
need README.md "SECURITY.md"
need README.md "CONTRIBUTING.md"

need README.md "Public active validator admission remains disabled."
need README.md "Public validator registration remains candidate/waiting only."
need README.md "Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only."
need README.md "Future treasury spend remains separately guarded."

need README.md "/download"
need README.md "/voidchain"
need README.md "/site/voidchain"
echo "[ok] README public landing markers present"

echo
echo "=== [3] public docs index/status/support markers ==="
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0' docs/public/README.md
grep -q 'Public active validator admission remains disabled.' docs/public/README.md
grep -q 'Do not share private keys or seed phrases.' docs/public/README.md
grep -q '/download redirects to /site/voidchain' docs/public/README.md
grep -q '/voidchain redirects to /site/voidchain' docs/public/README.md

grep -q '`/` redirects to `/participant` as the public first-run entry path.' docs/public/mainnet0-current-public-status.md
grep -q 'Public support first checks' docs/public/mainnet0-current-public-status.md
grep -q 'Current public route triage' docs/public/support-runbook.md
grep -q 'Location: /participant' docs/public/support-runbook.md
grep -q 'Location: /site/voidchain' docs/public/support-runbook.md
echo "[ok] public docs index/status/support markers present"

echo
echo "=== [4] no dangerous overclaim phrases ==="
if grep -RInE \
  'public active validator admission is open|treasury spend is open|Buy VOID fulfillment is open|authority transfer is open|send funds directly|custodial sends supported|guaranteed returns|investment advice|profit guaranteed|fully decentralized and trustless' \
  README.md docs/public SECURITY.md CONTRIBUTING.md; then
  echo "[fail] dangerous overclaim phrase found"
  exit 1
fi
echo "[ok] no dangerous overclaim phrases"

echo
echo "=== [5] served route truth ==="
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
echo "[ok] /participant served"

code="$(curl -sS --max-time 8 -o "$OUT/voidchain.html" -w '%{http_code}' "$BASE/site/voidchain")"
test "$code" = "200"
grep -q 'VOID NETWORK' "$OUT/voidchain.html"
grep -q 'Quick start' "$OUT/voidchain.html"
grep -q 'Linux is the preferred path' "$OUT/voidchain.html"
grep -q 'Windows users should use WSL2' "$OUT/voidchain.html"
echo "[ok] /site/voidchain served"

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
echo "=== [7] focused public-user proofs ==="
bash ops/security/build-public-release-tree.sh
make public-readme-navigation-proof
make public-readme-live-cleanup-proof
make public-first60-user-journey-proof
make public-download-install-journey-proof
make public-support-route-triage-proof
make mainnet0-support-runbook-proof
make mainnet0-status-smoke

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "public_github_landing": "green",
  "readme_status": "public_mainnet0_live",
  "root_get": "redirects_to_participant",
  "download_get": "redirects_to_site_voidchain",
  "voidchain_get": "redirects_to_site_voidchain",
  "sensitive_get_routes": "404",
  "mutation_lanes": "not_touched",
})
PY

echo
echo "[ok] public GitHub landing proof passed"
echo "out=$OUT"
