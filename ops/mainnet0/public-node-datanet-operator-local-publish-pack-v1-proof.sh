#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/operator-local-publish-pack-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-operator-local-publish-pack-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$OUT/source/nested" "$OUT/published"

echo "=== VOID Public Node DataNet Operator Local Publish Pack v1 Proof ==="
echo "marker=VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

printf 'hello from VOID DataNet local publish proof\n' > "$OUT/source/README.txt"
printf '{"ok":true,"fixture":"operator-local-publish-v1"}\n' > "$OUT/source/nested/metadata.json"

RESPONSE="$(curl -fsS "$ENDPOINT")"
printf '%s' "$RESPONSE" > "$OUT/operator-local-publish-pack.json"

printf '%s' "$RESPONSE" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
const res = JSON.parse(input);
const checks = [
["marker", res.marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1"],
["ok", res.ok === true],
["script_path", res.operator_script?.path === "ops/mainnet0/datanet-operator-local-publish-v1.sh"],
["operator_terminal_only", res.operator_script?.mode === "operator_terminal_only"],
["accepts_public_http_mutation", res.operator_script?.accepts_public_http_mutation === false],
["manifest_marker", res.output_manifest?.marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1"],
["includes_absolute_source_path", res.output_manifest?.includes_absolute_source_path === false],
["includes_operator_home_path", res.output_manifest?.includes_operator_home_path === false],
["includes_local_storage_root", res.output_manifest?.includes_local_storage_root === false],
["terminal_only", res.safety?.terminal_only === true],
["public_post_upload", res.safety?.public_post_upload === false],
["public_mutation", res.safety?.public_mutation === false],
["source_path_disclosed", res.safety?.source_path_disclosed === false],
["local_storage_root_disclosed", res.safety?.local_storage_root_disclosed === false],
["ledger_write", res.safety?.ledger_write === false],
["wc_credit_award", res.safety?.wc_credit_award === false],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
console.error("Operator local publish pack route assertion failed:", failed.join(", "));
process.exit(1);
}
});
'

PUBLISH_OUTPUT="$(ops/mainnet0/datanet-operator-local-publish-v1.sh --dataset-id datanet-local-publish-proof-fixture-v1 --source "$OUT/source" --out-root "$OUT/published")"

printf '%s\n' "$PUBLISH_OUTPUT" > "$OUT/publish-output.txt"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish-output.txt"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish-output.txt"
grep -Fq "absolute_paths_in_manifest=false" "$OUT/publish-output.txt"
grep -Fq "ledger_write=false" "$OUT/publish-output.txt"
grep -Fq "wc_credit_award=false" "$OUT/publish-output.txt"

MANIFEST="$OUT/published/datanet-local-publish-proof-fixture-v1/manifest.json"
test -f "$MANIFEST"

node - "$MANIFEST" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const manifest = JSON.parse(raw);
const checks = [
["marker", manifest.marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1"],
["dataset_id", manifest.dataset_id === "datanet-local-publish-proof-fixture-v1"],
["object_count", manifest.object_count === 2],
["objects", Array.isArray(manifest.objects) && manifest.objects.length === 2],
["content_root_sha256", typeof manifest.content_root_sha256 === "string" && /^[a-f0-9]{64}$/.test(manifest.content_root_sha256)],
["terminal_only", manifest.public_safety?.terminal_only === true],
["public_mutation", manifest.public_safety?.public_mutation === false],
["source_path_disclosed", manifest.public_safety?.source_path_disclosed === false],
["absolute_source_path_disclosed", manifest.public_safety?.absolute_source_path_disclosed === false],
["operator_home_path_disclosed", manifest.public_safety?.operator_home_path_disclosed === false],
["local_storage_root_disclosed", manifest.public_safety?.local_storage_root_disclosed === false],
["ledger_write", manifest.public_safety?.ledger_write === false],
["wc_credit_award", manifest.public_safety?.wc_credit_award === false],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
console.error("Generated manifest assertion failed:", failed.join(", "));
process.exit(1);
}
NODE

if grep -Fq "$OUT/source" "$MANIFEST"; then
echo "Security Assertion Failed: source path leaked into generated manifest."
exit 1
fi

python3 - "$MANIFEST" <<'PYLEAK'
import pathlib
import re
import sys

raw = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

literal_needles = [
    "/home/",
    "/root/",
    "/etc/",
    "/var/",
    "process.env",
    "child_process",
    "spawn(",
    "exec(",
]

regex_patterns = [
    r"BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY",
    r"AKIA[0-9A-Z]{16}",
    r"ghp_[A-Za-z0-9_]{20,}",
    r"xox[baprs]-",
]

for needle in literal_needles:
    if needle in raw:
        print("Security Assertion Failed: private path or command hook leaked into generated manifest.")
        print(f"matched_literal={needle}")
        sys.exit(1)

for pattern in regex_patterns:
    if re.search(pattern, raw):
        print("Security Assertion Failed: key material or token-like value leaked into generated manifest.")
        print(f"matched_pattern={pattern}")
        sys.exit(1)
PYLEAK

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/operator-local-publish-pack-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_DOC_V1" docs/public/public-node-datanet-operator-local-publish-pack-v1.md

if grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_UI_V1" src/index.ts; then
echo "datanet_operator_local_publish_pack_ui_marker_present=true"
else
echo "datanet_operator_local_publish_pack_ui_marker_present=false"
exit 1
fi

HTTP_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT")"
if [ "$HTTP_CODE" -lt 400 ]; then
echo "Security Assertion Failed: POST request was not rejected."
exit 1
fi

echo "datanet_operator_local_publish_pack_route_green=true"
echo "datanet_operator_local_publish_pack_script_green=true"
echo "datanet_operator_local_publish_pack_generated_manifest_green=true"
echo "datanet_operator_local_publish_pack_object_count=2"
echo "datanet_operator_local_publish_pack_public_safe_manifest_written=true"
echo "datanet_operator_local_publish_pack_absolute_paths_in_manifest=false"
echo "datanet_operator_local_publish_pack_operator_home_path_in_manifest=false"
echo "datanet_operator_local_publish_pack_local_storage_root_in_manifest=false"
echo "datanet_operator_local_publish_pack_public_mutation=false"
echo "datanet_operator_local_publish_pack_ledger_write=false"
echo "datanet_operator_local_publish_pack_wc_credit_award=false"
echo "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_PROOF_V1_GREEN"
