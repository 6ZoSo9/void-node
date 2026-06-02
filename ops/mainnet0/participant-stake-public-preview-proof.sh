#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

NODE="${NODE:-http://127.0.0.1:4100}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FAIL=0
ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

need_html(){
  local pattern="$1"
  local label="$2"
  if grep -qiE "$pattern" "$TMP/participant.html"; then
    ok "$label"
  else
    fail "$label: missing $pattern"
  fi
}

http_code(){
  local path="$1"
  curl -sS --max-time 8 -o /dev/null -w '%{http_code}' "$NODE$path" || echo "curl_failed"
}

echo "=== participant Stake public preview proof ==="
echo "mutation=false"

echo
echo "=== [1] runtime ready ==="
READY="$TMP/ready.json"
if curl -fsS --max-time 8 "$NODE/__void/ready.json" > "$READY"; then
  python3 - "$READY" <<'PY2'
import json, sys
o=json.load(open(sys.argv[1], encoding="utf-8"))
assert o.get("ready") is True, o
assert int(o.get("gap", -1)) == 0, o
assert int(o.get("txroot_live", 0)) == 1, o
print("[ok] ready/gap/txroot")
PY2
  [ "$?" -eq 0 ] || FAIL=1
else
  fail "ready endpoint unavailable"
fi

echo
echo "=== [2] participant Stake served copy ==="
if curl -fsS --max-time 8 "$NODE/participant" > "$TMP/participant.html"; then
  ok "participant page served"
else
  fail "participant page unavailable"
fi

need_html 'VOID_STAKE_PUBLIC_PREVIEW_WARNING_V1' "stake public preview warning marker"
need_html 'Preview only' "preview-only copy"
need_html 'candidate/waiting status' "candidate/waiting copy"
need_html 'do not make this wallet an active validator|does not make this wallet an active validator' "not active validator copy"
need_html 'Public active admission remains disabled' "public active admission disabled copy"
need_html 'VOID_STAKE_PUBLIC_PREVIEW_ONLY_V1' "registration preview-only marker"
need_html 'VOID_STAKE_PUBLIC_CLARITY_V1' "stake public clarity marker"
need_html 'Public Registration ≠ Active Validator Admission' "public registration not active admission"
need_html 'Submit Registration — Not Live' "submit not-live button"
need_html 'Submit Registration — Backend Gated' "backend-gated submit button"
need_html 'VOID_STAKE_OPERATOR_ACTIONS_ADVANCED_V1' "operator actions advanced marker"
need_html 'Operator-only validator controls are not part of public staking or candidate registration' "operator controls separated"

echo
echo "=== [3] sensitive/operator public GET surfaces remain closed or gated ==="
for path in   /__void/participant/stake/next-onboard   /__void/participant/validator-registration/submit-live   /__void/admin   /__void/treasury
do
  code="$(http_code "$path")"
  if [ "$code" = "404" ] || [ "$code" = "405" ] || [ "$code" = "501" ]; then
    ok "$path -> $code"
  else
    fail "$path expected closed/gated got $code"
  fi
done

echo
echo "=== [4] existing stake clarity proof ==="
if make participant-stake-clarity-proof; then
  ok "participant-stake-clarity-proof"
else
  fail "participant-stake-clarity-proof"
fi

echo
echo "=== [5] status smoke ==="
if make mainnet0-status-smoke; then
  ok "mainnet0-status-smoke"
else
  fail "mainnet0-status-smoke"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "[ok] participant Stake public preview proof passed"
  exit 0
fi

echo "[fail] participant Stake public preview proof failed"
exit 1
