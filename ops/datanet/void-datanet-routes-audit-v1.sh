#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

FILE="src/http/datanet_routes.ts"
BASE="${BASE:-http://127.0.0.1:4100}"
[[ -f "$FILE" ]] || { echo "[ERR] missing $FILE"; exit 2; }

python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
prefix="/datanet/v1"
m=re.search(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*router\s*\)', s)
if m: prefix=m.group(1)
print("PREFIX="+prefix)
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
echo "=== [probe] POST routes (status only; tries raw octet-stream empty body) ==="
PREFIX="$(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
m=re.search(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*router\s*\)', s)
print(m.group(1) if m else "/datanet/v1")
PY
)"

mapfile -t POSTS < <(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
for p in re.findall(r'router\.post\(\s*["\']([^"\']+)["\']', s):
    print(p)
PY
)

if [[ "${#POSTS[@]}" -eq 0 ]]; then
  echo "[warn] no router.post routes found"
  exit 0
fi

for p in "${POSTS[@]}"; do
  url="$BASE$PREFIX$p"
  code="$(curl -sS -o /tmp/void-dn-audit.body.$$ -w "%{http_code}" -X POST \
    --connect-timeout 1 --max-time 3 \
    -H "Content-Type: application/octet-stream" \
    --data-binary "" \
    "$url" || true)"
  echo "POST $p -> $code"
done
rm -f /tmp/void-dn-audit.body.$$ 2>/dev/null || true
