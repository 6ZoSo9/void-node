#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
JSON="/tmp/void-local-data-drop-weighted-current-capability.json"

echo "=== VOID Public Node Local Data Drop Weighted Current Capability Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CURRENT_CAPABILITY_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"

curl -fsS "$BASE/public-node/local-data-drop/weighted.json" -o "$JSON"

python3 - "$JSON" "$SHA" <<'PY'
import json
import sys

path, sha = sys.argv[1], sys.argv[2]
data = json.load(open(path, encoding="utf-8"))

if data.get("object_count") != 3:
    raise SystemExit(f"bad object_count: {data.get('object_count')!r}")

records = data.get("weighted_records") or []
match = next((r for r in records if r.get("object_id") == "live-import-demo-002.txt"), None)
if not match:
    raise SystemExit("missing live-import-demo-002.txt")

checks = {
    "sha256": sha,
    "verification_state": "verified",
    "freshness_state": "fresh",
    "suspicion_state": "clean",
}
for key, expected in checks.items():
    if match.get(key) != expected:
        raise SystemExit(f"bad {key}: {match.get(key)!r}")

for key in ["object_href", "content_address_href", "proof_href"]:
    value = match.get(key, "")
    if not value:
        raise SystemExit(f"missing {key}")

if "live-import-demo-002.txt" not in match["object_href"]:
    raise SystemExit("object_href missing object id")

if sha not in match["content_address_href"]:
    raise SystemExit("content_address_href missing sha")

if sha not in match["proof_href"]:
    raise SystemExit("proof_href missing sha")

print("weighted_current_capability_verified=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CURRENT_CAPABILITY_V1_GREEN"
