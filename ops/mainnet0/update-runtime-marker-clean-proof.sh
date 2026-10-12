#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-update-runtime-marker-clean-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== update runtime marker clean proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] ready ==="
curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.json"
echo

echo
echo "=== [2] no active runtime upgrade marker files ==="
ACTIVE_MARKERS=(
  runtime/upgrade-staged.v1.json
  runtime/upgrade-apply-pending.v1.json
  runtime/upgrade-rollback-marker.v1.json
)
found_active=0
for f in "${ACTIVE_MARKERS[@]}"; do
  if [ -f "$f" ]; then
    echo "$f"
    found_active=1
  fi
done
if [ "$found_active" = "1" ]; then
  echo "[ERR] active runtime upgrade marker files still present"
  exit 1
fi
echo "[ok] no active runtime staged/pending/rollback marker files"

echo
echo "=== [3] GET stage/apply must be inactive ==="
curl -sS -w "\n%{http_code}\n" "$BASE/upgrade/stage" > "$OUT/get-stage.http"
curl -sS -w "\n%{http_code}\n" "$BASE/upgrade/apply" > "$OUT/get-apply.http"

cat "$OUT/get-stage.http"
cat "$OUT/get-apply.http"

test "$(tail -n 1 "$OUT/get-stage.http" | tr -d '\r')" = "404"
test "$(tail -n 1 "$OUT/get-apply.http" | tr -d '\r')" = "404"

python3 - "$OUT/get-stage.http" "$OUT/get-apply.http" <<'PY'
import json, pathlib, sys

def body(path):
    lines = pathlib.Path(path).read_text().splitlines()
    return json.loads("\n".join(lines[:-1]))

stage = body(sys.argv[1])
apply = body(sys.argv[2])
assert stage.get("ok") is False and stage.get("reason") == "not_staged", stage
assert apply.get("ok") is False and apply.get("reason") == "not_pending", apply
print("[ok] GET stage/apply inactive")
PY

echo
echo "=== [4] POST stage/apply must not install or stage current up-to-date manifest ==="
curl -sS -w "\n%{http_code}\n" -X POST "$BASE/upgrade/stage" > "$OUT/post-stage.http"
curl -sS -w "\n%{http_code}\n" -X POST "$BASE/upgrade/apply" > "$OUT/post-apply.http"

cat "$OUT/post-stage.http"
cat "$OUT/post-apply.http"

test "$(tail -n 1 "$OUT/post-stage.http" | tr -d '\r')" = "400"
test "$(tail -n 1 "$OUT/post-apply.http" | tr -d '\r')" = "400"

python3 - "$OUT/post-stage.http" "$OUT/post-apply.http" <<'PY'
import json, pathlib, sys

def body(path):
    lines = pathlib.Path(path).read_text().splitlines()
    return json.loads("\n".join(lines[:-1]))

stage = body(sys.argv[1])
apply = body(sys.argv[2])
assert stage.get("ok") is False and stage.get("reason") == "no_update_available", stage
assert apply.get("ok") is False and apply.get("reason") in ("not_staged", "no_update_available"), apply
print("[ok] POST stage/apply blocked safely")
PY

echo
echo "=== [5] update notification remains safe ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/update-status.json"
echo

python3 - "$OUT/update-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("update_available") is False, j
assert j.get("signature_valid") is True, j
assert j.get("installs_update") is False, j
print("[ok] update status safe")
PY

echo
echo "out=$OUT"
