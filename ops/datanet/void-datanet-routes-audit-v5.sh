#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

FILE="src/http/datanet_routes.ts"
BASE="${BASE:-http://127.0.0.1:4100}"
[[ -f "$FILE" ]] || { echo "[ERR] missing $FILE"; exit 2; }

PREFIX="$(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
m=re.search(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*router\s*\)', s)
print(m.group(1) if m else "/datanet/v1")
PY
)"
echo "PREFIX=$PREFIX"

python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
posts=re.findall(r'router\.post\(\s*["\']([^"\']+)["\']', s)
gets =re.findall(r'router\.get\(\s*["\']([^"\']+)["\']', s)
puts =re.findall(r'router\.put\(\s*["\']([^"\']+)["\']', s)
deletes=re.findall(r'router\.delete\(\s*["\']([^"\']+)["\']', s)
print("POST="+("|".join(posts)))
print("GET="+("|".join(gets)))
print("PUT="+("|".join(puts)))
print("DEL="+("|".join(deletes)))
PY

echo
echo "=== [probe] GET $PREFIX/status ==="
curl -sS -D /tmp/void-dn-audit.hdr.$$ -o /tmp/void-dn-audit.body.$$ -w "code=%{http_code}\n" \
  --connect-timeout 1 --max-time 3 \
  "$BASE$PREFIX/status" || true
rg -ni '^content-type:' /tmp/void-dn-audit.hdr.$$ | head -n 1 | sed 's/\r$//' || true
head -c 240 /tmp/void-dn-audit.body.$$ 2>/dev/null | tr '\n' ' '; echo
rm -f /tmp/void-dn-audit.hdr.$$ /tmp/void-dn-audit.body.$$ 2>/dev/null || true

echo
echo "=== [probe] PUT routes (empty octet-stream; should be 400/415/409-ish, not 404) ==="
mapfile -t PUTS < <(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
for p in re.findall(r'router\.put\(\s*["\']([^"\']+)["\']', s):
    print(p)
PY
)
if [[ "${#PUTS[@]}" -eq 0 ]]; then
  echo "[warn] no router.put routes found"
  exit 0
fi
for p in "${PUTS[@]}"; do
  sp="$p"
  sp="${sp//:root/0000000000000000000000000000000000000000000000000000000000000000}"
  sp="${sp//:leaf/0000000000000000000000000000000000000000000000000000000000000000}"
  url="$BASE$PREFIX$sp"
  code="$(curl -sS -o /tmp/void-dn-audit.body.$$ -w "%{http_code}" -X PUT \
    --connect-timeout 1 --max-time 3 \
    -H "Content-Type: application/octet-stream" \
    --data-binary "" \
    "$url" || true)"
  echo "PUT $p -> $code"
done
rm -f /tmp/void-dn-audit.body.$$ 2>/dev/null || true
