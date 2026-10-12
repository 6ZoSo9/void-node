#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

NODE="${NODE:-http://127.0.0.1:4100}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

FAIL=0

ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

need_file(){
  local file="$1"
  local pattern="$2"
  local label="$3"
  if [ ! -f "$file" ]; then
    fail "$label: missing file $file"
    return
  fi
  if grep -qiE "$pattern" "$file"; then
    ok "$label"
  else
    fail "$label: missing pattern $pattern in $file"
  fi
}

http_check(){
  local path="$1"
  local expect_code="$2"
  local label="$3"
  local headers="$TMPDIR/headers.$(echo "$path" | tr '/?' '__').txt"
  local body="$TMPDIR/body.$(echo "$path" | tr '/?' '__').txt"
  local code

  code="$(curl -sS --max-time 8 -o "$body" -D "$headers" -w '%{http_code}' "$NODE$path" || echo "curl_failed")"

  if [ "$code" = "$expect_code" ]; then
    ok "$label status=$code"
  else
    fail "$label expected=$expect_code actual=$code"
    sed -n '1,24p' "$headers" 2>/dev/null || true
    sed -n '1,24p' "$body" 2>/dev/null || true
  fi
}

redirect_check(){
  local path="$1"
  local expect_location="$2"
  local label="$3"
  local headers="$TMPDIR/headers.$(echo "$path" | tr '/?' '__').txt"
  local body="$TMPDIR/body.$(echo "$path" | tr '/?' '__').txt"
  local code

  code="$(curl -sS --max-time 8 -o "$body" -D "$headers" -w '%{http_code}' "$NODE$path" || echo "curl_failed")"

  if [ "$code" = "302" ] && grep -qiE "^Location: ${expect_location}" "$headers"; then
    ok "$label redirects to $expect_location"
  else
    fail "$label expected 302 Location: $expect_location actual=$code"
    sed -n '1,30p' "$headers" 2>/dev/null || true
  fi
}

echo "=== public run-node support proof ==="
echo "mutation=false"

echo
echo "=== [1] runtime ready ==="
READY="$TMPDIR/ready.json"
if curl -fsS --max-time 8 "$NODE/__void/ready.json" > "$READY"; then
  python3 - "$READY" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
assert o.get("ready") is True, o
assert int(o.get("gap", -1)) == 0, o
assert int(o.get("txroot_live", 0)) == 1, o
print("[ok] ready/gap/txroot")
PY
  if [ "$?" -ne 0 ]; then FAIL=1; fi
else
  fail "ready endpoint unavailable"
fi

echo
echo "=== [2] public docs install/support anchors ==="
need_file README.md 'docs/public/quick-start.md' "README links quick-start"
need_file README.md 'docs/public/run-a-node.md' "README links run-a-node"
need_file README.md 'docs/public/windows-wsl2-quick-start.md' "README links WSL2 quick-start"
need_file README.md 'docs/public/support-runbook.md' "README links support runbook"
need_file README.md 'docs/public/participant-onboarding.md' "README links participant onboarding"
need_file README.md 'Do not share private keys|seed phrases' "README secret warning"

need_file docs/public/quick-start.md 'npm install' "quick-start npm install"
need_file docs/public/quick-start.md 'npm run build' "quick-start npm build"
need_file docs/public/quick-start.md '127\.0\.0\.1:4100/participant' "quick-start participant URL"
need_file docs/public/quick-start.md 'Do not share wallet secrets|seed phrases|private keys' "quick-start secret warning"

need_file docs/public/run-a-node.md 'npm install' "run-a-node npm install"
need_file docs/public/run-a-node.md 'npm run build' "run-a-node npm build"
need_file docs/public/run-a-node.md 'install-user-units.sh' "run-a-node user unit install"
need_file docs/public/run-a-node.md '127\.0\.0\.1:4100/participant' "run-a-node participant URL"
need_file docs/public/run-a-node.md 'Do not expose private keys|seed phrases' "run-a-node secret warning"

need_file docs/public/windows-wsl2-quick-start.md 'wsl --install' "WSL2 install command"
need_file docs/public/windows-wsl2-quick-start.md 'Ubuntu' "WSL2 Ubuntu path"
need_file docs/public/windows-wsl2-quick-start.md 'npm install' "WSL2 npm install"
need_file docs/public/windows-wsl2-quick-start.md 'npm run build' "WSL2 npm build"
need_file docs/public/windows-wsl2-quick-start.md '127\.0\.0\.1:4100/participant' "WSL2 participant URL"
need_file docs/public/windows-wsl2-quick-start.md 'Do not share wallet secrets|seed phrases|private keys' "WSL2 secret warning"

need_file docs/public/support-runbook.md 'Do not ask for secrets' "support no-secrets boundary"
need_file docs/public/support-runbook.md 'run a node' "support run-node boundary"
need_file docs/public/support-runbook.md 'open the participant page' "support participant-page boundary"
need_file docs/public/support-runbook.md 'Windows WSL2 checks' "support WSL2 checks"
need_file docs/public/support-runbook.md 'Buy VOID is guarded' "support Buy VOID boundary"
need_file docs/public/mainnet0-current-public-status.md '/ should redirect to /participant|/` should redirect to `/participant`' "current status root redirect"
need_file docs/public/mainnet0-current-public-status.md '/download.*redirect.*site/voidchain|/download` and `/voidchain` should redirect to `/site/voidchain`' "current status download redirect"
need_file docs/public/mainnet0-current-public-status.md 'Sensitive GET routes.*404' "current status sensitive 404 boundary"

echo
echo "=== [3] existing proof stack ==="
for target in \
  mainnet0-quick-start-proof \
  mainnet0-windows-wsl2-quick-start-proof \
  mainnet0-support-runbook-proof \
  public-support-route-triage-proof \
  public-download-install-journey-proof \
  participant-first-user-clarity-proof
do
  echo "--- make $target ---"
  if make "$target"; then
    ok "$target"
  else
    fail "$target"
  fi
done

echo
echo "=== [4] public route behavior ==="
redirect_check "/" "/participant" "root route"
http_check "/participant" "200" "participant page"
redirect_check "/download" "/site/voidchain" "download route"
redirect_check "/voidchain" "/site/voidchain" "voidchain route"
http_check "/site/voidchain" "200" "voidchain site"
http_check "/__void/ready.json" "200" "ready endpoint"

SITE_HEADERS="$TMPDIR/site.headers"
SITE_BODY="$TMPDIR/site.body"
curl -sS --max-time 8 -o "$SITE_BODY" -D "$SITE_HEADERS" "$NODE/site/voidchain" || true
if grep -qi '^x-void-datanet-backed: true' "$SITE_HEADERS" && grep -qi '^x-void-site-source: datanet_live_v1' "$SITE_HEADERS"; then
  ok "voidchain site is DataNet-backed"
else
  fail "voidchain site missing DataNet-backed headers"
  sed -n '1,40p' "$SITE_HEADERS" 2>/dev/null || true
fi

echo
echo "=== [5] sensitive public GET surfaces remain closed ==="
for path in \
  /__void/status \
  /__void/participant/stake/next-onboard \
  /__void/treasury \
  /__void/admin
do
  http_check "$path" "404" "sensitive route $path"
done

echo
echo "=== [6] status smoke ==="
if make mainnet0-status-smoke; then
  ok "mainnet0-status-smoke"
else
  fail "mainnet0-status-smoke"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[ok] public run-node support proof passed"
  exit 0
fi

echo "[fail] public run-node support proof failed"
exit 1
