#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/participant-datanet-object-browser-link-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== Participant DataNet object browser link proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=participant_datanet_object_browser_link_proof"
echo "money_movement=false"
echo "validator_mutation=false"

expect_grep() {
  local name="$1"
  local pattern="$2"
  local file="$3"
  if ! grep -q "$pattern" "$file"; then
    echo "[fatal] missing $name"
    echo "pattern=$pattern"
    echo "file=$file"
    exit 1
  fi
  echo "[ok] $name"
}

echo
echo "=== [1] source markers ==="
expect_grep "participant object browser link marker" "VOID_PARTICIPANT_DATANET_OBJECT_BROWSER_LINK_V1" src/index.ts
expect_grep "participant object browser link id" "homeDatanetObjectBrowserLink" src/index.ts
expect_grep "view object browser copy" "View Object Browser" src/index.ts
expect_grep "local/imported object copy" "View local/imported DataNet objects carried by this node" src/index.ts
expect_grep "datanet demo href" 'href="/datanet-demo"' src/index.ts

echo
echo "=== [2] live readiness ==="
curl -fsS --max-time 15 "$BASE/__void/ready.json" > "$OUT/ready.json"
cat "$OUT/ready.json"
echo
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot_live")
PY

echo
echo "=== [3] served participant markers ==="
curl -fsS --max-time 20 "$BASE/participant" > "$OUT/participant.html"
expect_grep "served participant object browser link marker" "VOID_PARTICIPANT_DATANET_OBJECT_BROWSER_LINK_V1" "$OUT/participant.html"
expect_grep "served participant object browser link id" "homeDatanetObjectBrowserLink" "$OUT/participant.html"
expect_grep "served view object browser copy" "View Object Browser" "$OUT/participant.html"
expect_grep "served local/imported object copy" "View local/imported DataNet objects carried by this node" "$OUT/participant.html"

echo
echo "=== [4] linked demo route still serves object browser ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served datanet demo object browser marker" "VOID_DATANET_DEMO_OBJECT_BROWSER_V1" "$OUT/datanet-demo.html"
expect_grep "served datanet demo object browser renderer" "VOID_DATANET_DEMO_OBJECT_BROWSER_RENDER_V1" "$OUT/datanet-demo.html"
expect_grep "served datanet objects route use" "/datanet/v1/objects?limit=50" "$OUT/datanet-demo.html"

echo
echo "VOID_PARTICIPANT_DATANET_OBJECT_BROWSER_LINK_V1_GREEN"
echo "out=$OUT"
