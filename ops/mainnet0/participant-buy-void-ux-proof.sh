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

echo "=== participant Buy VOID UX proof ==="
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
echo "=== [2] participant Buy VOID served copy ==="
if curl -fsS --max-time 8 "$NODE/participant" > "$TMP/participant.html"; then
  ok "participant page served"
else
  fail "participant page unavailable"
fi

need_html 'Buy VOID Checkout' "Buy VOID checkout present"
need_html 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "public safety marker"
need_html 'VOID_BUY_EXPLICIT_TXREF_FULFILLMENT_V1' "explicit tx-ref fulfillment marker"
need_html 'No automatic VOID delivery' "no automatic delivery copy"
need_html 'payment confirmation is not fulfillment|payment confirmation is not VOID fulfillment' "payment confirmation not fulfillment"
need_html 'explicit VOID tx ref' "explicit VOID tx ref copy"
need_html 'exchange/custodial sends and blind direct deposits are not supported' "no exchange/custodial/blind deposits"
need_html 'Create Guided Buy Request' "guided request button"
need_html 'VOID_BUY_STATUS_CURRENT_RECEIVER_LINEAGE_V1' "current receiver lineage marker"

echo
echo "=== [3] operator/mutation surfaces stay non-public GETs ==="
for path in   /__void/operator/buy-void/fulfill   /__void/operator/buy-void/claim-tx   /__void/treasury   /__void/admin
do
  code="$(http_code "$path")"
  if [ "$code" = "404" ]; then
    ok "$path -> 404"
  else
    fail "$path expected 404 got $code"
  fi
done

echo
echo "=== [4] Buy VOID backend remains read-only/checkable ==="
if make buy-void-backend-readiness-proof; then
  ok "buy-void-backend-readiness-proof"
else
  fail "buy-void-backend-readiness-proof"
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
  echo "[ok] participant Buy VOID UX proof passed"
  exit 0
fi

echo "[fail] participant Buy VOID UX proof failed"
exit 1
