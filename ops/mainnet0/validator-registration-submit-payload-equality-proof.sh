#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
OUT="${OUT:-/tmp/void-validator-submit-payload-equality.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== validator registration submit payload equality proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] fetch read-only draft ==="
curl -fsS "$BASE/__void/participant/validator-registration/draft?account=$ACC" \
  > "$OUT/draft.json"
python3 -m json.tool "$OUT/draft.json" | sed -n '1,160p'

echo
echo "=== [c] fetch blocked submit payload ==="
HTTP_CODE="$(curl -sS -o "$OUT/submit.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\"}" \
  "$BASE/__void/participant/validator-registration/submit")"
echo "submit_http_code=$HTTP_CODE"
python3 -m json.tool "$OUT/submit.json" | sed -n '1,180p'
test "$HTTP_CODE" = "501"

echo
echo "=== [d] compare draft payload vs submit payload ==="
python3 - <<'PY' "$OUT/draft.json" "$OUT/submit.json"
import json, sys

draft = json.load(open(sys.argv[1]))
submit = json.load(open(sys.argv[2]))

def die(msg):
    raise SystemExit("[ERR] " + msg)

def get(obj, path):
    cur = obj
    for p in path.split("."):
        if not isinstance(cur, dict) or p not in cur:
            die(f"missing {path}")
        cur = cur[p]
    return cur

assert draft["ok"] is True
assert draft["mutation"] is False
assert draft["sends_transaction"] is False

assert submit["ok"] is False
assert submit["mutation"] is False
assert submit["sends_transaction"] is False
assert submit["submit_allowed"] is False
assert submit["submit_blocked_reason"] == "live_wallet_execution_not_wired"
assert submit["core_gates_green"] is True
assert submit["gates"]["live_execution_wired"] is False

checks = [
    ("account", "account"),
    ("owner", "owner"),
    ("reward", "reward"),
    ("registry", "registry"),
    ("valueWei", "valueWei"),
    ("functionSignature", "functionSignature"),
    ("args.reward", "args.reward"),
    ("args.consensusKeyHash", "args.consensusKeyHash"),
    ("args.metadataHash", "args.metadataHash"),
]

for left, right in checks:
    a = get(draft, left)
    b = get(submit, right)
    if str(a).lower() != str(b).lower():
        die(f"payload mismatch {left} vs {right}: {a} != {b}")
    print(f"[ok] match {left} == {right}: {a}")

print("[ok] draft and blocked submit payloads match")
PY

echo
echo "=== [e] invalid submit still rejects ==="
HTTP_BAD="$(curl -sS -o "$OUT/submit.bad.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d '{"account":"bad"}' \
  "$BASE/__void/participant/validator-registration/submit")"
echo "bad_http_code=$HTTP_BAD"
python3 -m json.tool "$OUT/submit.bad.json"
test "$HTTP_BAD" = "400"

echo
echo "=== [f] submit gates still green ==="
ops/mainnet0/validator-registration-submit-gates-proof.sh

echo
echo "=== [g] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration submit payload equality proof green"
