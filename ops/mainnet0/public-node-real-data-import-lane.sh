#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
CONFIRM_LIVE_IMPORT="${CONFIRM_LIVE_IMPORT:-false}"
MAX_FILES="${MAX_FILES:-100}"
OUT="${OUT:-/tmp/public-node-real-data-import-lane-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "source_dir=${SRC:-unset}"
echo "local_base=$LOCAL_BASE"
echo "confirm_live_import=$CONFIRM_LIVE_IMPORT"
echo "max_files=$MAX_FILES"
echo "out=$OUT"

if [ -z "$SRC" ]; then
  echo "ERROR: usage: $0 /path/to/source-folder"
  exit 2
fi

if [ ! -d "$SRC" ]; then
  echo "ERROR: source directory not found: $SRC"
  exit 3
fi

SRC="$(cd "$SRC" && pwd)"
echo "source_dir_resolved=$SRC"

test -x ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh
test -x ops/mainnet0/public-node-local-data-drop-import-dir.sh
test -x ops/mainnet0/public-node-local-data-drop-verify-manifest.sh
test -x ops/mainnet0/public-node-local-data-drop-verify-object.sh

ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh > "$OUT/data-dir-detect.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY" "$OUT/data-dir-detect.log"

ROUTE_DATA_DIR="$(sed -n 's/^route_data_dir=//p' "$OUT/data-dir-detect.log" | tail -n 1)"
if [ -z "$ROUTE_DATA_DIR" ]; then
  echo "ERROR: route data dir not detected"
  exit 4
fi

echo "route_data_dir=$ROUTE_DATA_DIR"
echo "planned_import_command=DATA_DIR=\"$ROUTE_DATA_DIR\" MAX_FILES=\"$MAX_FILES\" ops/mainnet0/public-node-local-data-drop-import-dir.sh \"$SRC\""

curl -fsS "$LOCAL_BASE/public-node/local-data-drop/weighted.json" > "$OUT/before-weighted.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/manifest.json" > "$OUT/before-manifest.json"

python3 - "$SRC" "$OUT/before-weighted.json" "$OUT/before-manifest.json" "$OUT" "$MAX_FILES" <<'PYPLAN'
import hashlib, json, re, sys
from pathlib import Path

src = Path(sys.argv[1])
weighted = json.loads(Path(sys.argv[2]).read_text())
manifest = json.loads(Path(sys.argv[3]).read_text())
out = Path(sys.argv[4])
max_files = int(sys.argv[5])

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
assert manifest.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"
assert manifest.get("manifest_root_marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1"

existing = {o.get("object_id") for o in manifest.get("objects", [])}
files = sorted([p for p in src.rglob("*") if p.is_file()])
assert files, "source directory has no regular files"
assert len(files) <= max_files, f"source file count exceeds MAX_FILES={max_files}"

planned = []
seen = set()

for f in files:
    rel = f.relative_to(src).as_posix()
    object_id = re.sub(r"[/\\]+", "__", rel)
    object_id = re.sub(r"[^A-Za-z0-9._-]", "_", object_id)

    assert object_id, f"empty object_id for {rel}"
    assert object_id not in seen, f"source object_id collision: {object_id}"
    assert object_id not in existing, f"live object already exists: {object_id}"
    seen.add(object_id)

    data = f.read_bytes()
    planned.append({
        "relpath": rel,
        "object_id": object_id,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
    })

(out / "planned-imports.json").write_text(json.dumps(planned, indent=2, sort_keys=True) + "\n")
(out / "planned-object-ids.txt").write_text("\n".join(x["object_id"] for x in planned) + "\n")
(out / "planned-sha256.txt").write_text("\n".join(x["sha256"] for x in planned) + "\n")
(out / "before-count.txt").write_text(str(manifest.get("object_count")) + "\n")
(out / "source-count.txt").write_text(str(len(planned)) + "\n")

print("plan_checks=green")
print(f"before_object_count={manifest.get('object_count')}")
print(f"source_file_count={len(planned)}")
for item in planned:
    print(f"planned_object_id={item['object_id']}")
    print(f"planned_sha256={item['sha256']}")
PYPLAN

echo "no_public_upload=true"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"

if [ "$CONFIRM_LIVE_IMPORT" != "true" ]; then
  echo "live_import_skipped=true"
  echo "set_CONFIRM_LIVE_IMPORT_true_to_mutate_live_public_node=true"
  echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_V1_PLAN_GREEN"
  exit 0
fi

DATA_DIR="$ROUTE_DATA_DIR" MAX_FILES="$MAX_FILES" ops/mainnet0/public-node-local-data-drop-import-dir.sh "$SRC" | tee "$OUT/import.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED" "$OUT/import.log"

curl -fsS "$LOCAL_BASE/public-node/local-data-drop/weighted.json" > "$OUT/after-weighted.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/manifest.json" > "$OUT/after-manifest.json"

python3 - "$OUT" <<'PYCHECK'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
planned = json.loads((out / "planned-imports.json").read_text())
before_count = int((out / "before-count.txt").read_text().strip())
source_count = int((out / "source-count.txt").read_text().strip())
weighted = json.loads((out / "after-weighted.json").read_text())
manifest = json.loads((out / "after-manifest.json").read_text())

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
assert manifest.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"

after_count = int(manifest.get("object_count"))
assert after_count == before_count + source_count, f"object_count mismatch: before={before_count} source={source_count} after={after_count}"

manifest_by_id = {o["object_id"]: o for o in manifest.get("objects", [])}
weighted_by_id = {r["object_id"]: r for r in weighted.get("weighted_records", [])}

for item in planned:
    mid = manifest_by_id.get(item["object_id"])
    assert mid, f"missing imported object in manifest: {item['object_id']}"
    assert mid.get("sha256") == item["sha256"]
    assert mid.get("bytes") == item["bytes"]
    assert mid.get("receipt_marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
    assert mid.get("receipt_valid_for_current_object") is True
    assert mid.get("object_href")
    assert mid.get("content_address_href")
    assert mid.get("proof_href")

    wr = weighted_by_id.get(item["object_id"])
    assert wr, f"missing imported object in weighted records: {item['object_id']}"
    assert wr.get("sha256") == item["sha256"]
    assert wr.get("verification_state") == "verified"
    assert wr.get("storage_tier") == "hot"
    assert wr.get("ai_visibility") == "high"
    assert wr.get("promotion_eligible") is True

print("after_import_checks=green")
print(f"before_object_count={before_count}")
print(f"source_file_count={source_count}")
print(f"after_object_count={after_count}")
PYCHECK

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/after-external-base-url.json"

python3 - "$OUT" <<'PYCANON'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
external = json.loads((out / "after-external-base-url.json").read_text())
weighted = json.loads((out / "after-weighted.json").read_text())
manifest = json.loads((out / "after-manifest.json").read_text())
planned = json.loads((out / "planned-imports.json").read_text())

base = external.get("effective_base_url", "").rstrip("/")
assert base and base != "http://127.0.0.1:4100"

manifest_by_id = {o["object_id"]: o for o in manifest.get("objects", [])}
weighted_by_id = {r["object_id"]: r for r in weighted.get("weighted_records", [])}

lines = []
for item in planned:
    oid = item["object_id"]
    sha = item["sha256"]
    m = manifest_by_id.get(oid)
    w = weighted_by_id.get(oid)
    assert m, f"missing manifest object: {oid}"
    assert w, f"missing weighted object: {oid}"

    assert m.get("object_href") == f"{base}/public-node/local-data-drop/{oid}"
    assert m.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
    assert m.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"

    assert w.get("object_href") == f"{base}/public-node/local-data-drop/{oid}"
    assert w.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
    assert w.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"

    lines.append(f"{oid}\t{sha}\t{item['bytes']}")

(out / "planned-fetch.tsv").write_text("\n".join(lines) + "\n")
print("canonical_href_checks=green")
print(f"effective_base_url={base}")
PYCANON

while IFS=$'\t' read -r OBJECT_ID SHA BYTES; do
  [ -n "$OBJECT_ID" ] || continue

  curl -fsS "$LOCAL_BASE/public-node/local-data-drop/proof/$SHA.json" > "$OUT/proof-$SHA.json"
  curl -fsS "$LOCAL_BASE/public-node/local-data-drop/by-sha256/$SHA" > "$OUT/object-by-sha-$SHA.bin"
  curl -fsS "$LOCAL_BASE/public-node/local-data-drop/$OBJECT_ID" > "$OUT/object-by-id-$SHA.bin"

  FETCHED_BY_SHA="$(sha256sum "$OUT/object-by-sha-$SHA.bin" | awk '{print $1}')"
  FETCHED_BY_ID="$(sha256sum "$OUT/object-by-id-$SHA.bin" | awk '{print $1}')"

  test "$FETCHED_BY_SHA" = "$SHA"
  test "$FETCHED_BY_ID" = "$SHA"

  python3 - "$OUT/proof-$SHA.json" "$OBJECT_ID" "$SHA" <<'PYPROOF'
import json, sys
from pathlib import Path

proof = json.loads(Path(sys.argv[1]).read_text())
object_id = sys.argv[2]
sha = sys.argv[3]

assert proof.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1"
assert proof.get("object_id") == object_id
assert proof.get("sha256") == sha
assert proof.get("receipt_sha256") == sha
assert proof.get("receipt_valid_for_current_object") is True
assert proof.get("public_upload") is False
assert proof.get("operator_local_import_only") is True
assert proof.get("public_read_only") is True
assert proof.get("trusted_as_network_truth") is False
print("local_object_fetch_checks=green")
PYPROOF

  echo "verified_imported_object_id=$OBJECT_ID"
  echo "verified_imported_sha256=$SHA"
done < "$OUT/planned-fetch.tsv"

echo "manifest_verify_green=local_fetch_plus_canonical_href"
echo "object_verifier_chain_green=local_fetch_plus_canonical_href"
echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_V1_GREEN"
