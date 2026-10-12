#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-demo-002-status.md"
BEFORE="/tmp/void-live-import-demo-002-before.json"
FRESH="/tmp/void-live-import-demo-002-fresh.json"
IMPORT_OUT="/tmp/void-live-import-demo-002-import.out"
PLAN_OUT="/tmp/void-live-import-demo-002-target-plan.out"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"

echo "=== VOID Public Node Local Data Drop Live Import Demo 002 Status Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -f "$BEFORE"
test -f "$FRESH"
test -f "$IMPORT_OUT"
test -f "$PLAN_OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_STATUS_V1" "$DOC"
grep -Fq "/home/zoso/dev/void-node/data_a" "$DOC"
grep -Fq "live-import-demo-002.txt" "$DOC"
grep -Fq "$SHA" "$DOC"
grep -Fq "before object count: \`2\`" "$DOC"
grep -Fq "after object count: \`3\`" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY" "$PLAN_OUT"
grep -Fq "route_data_dir=/home/zoso/dev/void-node/data_a" "$PLAN_OUT"
grep -Fq "current_live_object_count=2" "$PLAN_OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED" "$IMPORT_OUT"
grep -Fq "imported_object_id=live-import-demo-002.txt" "$IMPORT_OUT"
grep -Fq "imported_sha256=$SHA" "$IMPORT_OUT"
grep -Fq "imported_count=1" "$IMPORT_OUT"

python3 - <<'PY'
import json

sha = "264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"

before = json.load(open("/tmp/void-live-import-demo-002-before.json", encoding="utf-8"))
fresh = json.load(open("/tmp/void-live-import-demo-002-fresh.json", encoding="utf-8"))

if before.get("object_count") != 2:
    raise SystemExit(f"bad before object_count: {before.get('object_count')!r}")

if fresh.get("object_count") != 3:
    raise SystemExit(f"bad fresh object_count: {fresh.get('object_count')!r}")

records = fresh.get("weighted_records") or []
match = None
for rec in records:
    if rec.get("object_id") == "live-import-demo-002.txt":
        match = rec
        break

if not match:
    raise SystemExit("missing live-import-demo-002.txt weighted record")

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

if sha not in match.get("content_address_href", ""):
    raise SystemExit("content_address_href missing sha")

if sha not in match.get("proof_href", ""):
    raise SystemExit("proof_href missing sha")

print("demo_002_weighted_record_verified=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_STATUS_V1_GREEN"
