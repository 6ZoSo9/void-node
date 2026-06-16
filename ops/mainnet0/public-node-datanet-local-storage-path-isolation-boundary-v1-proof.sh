#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/local-storage-path-isolation-boundary-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-local-storage-path-isolation-boundary-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Local Storage Path Isolation Boundary v1 Proof ==="
echo "marker=VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

RESPONSE="$(curl -fsS "$ENDPOINT")"
printf '%s' "$RESPONSE" > "$OUT/local-storage-path-isolation-boundary.json"

printf '%s' "$RESPONSE" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const res = JSON.parse(input);

    const checks = [
      ["marker", res.marker === "VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_V1"],
      ["ok", res.ok === true],
      ["dataset_ids_are_public_identifiers", res.public_identifier_policy?.dataset_ids_are_public_identifiers === true],
      ["dataset_ids_are_filesystem_paths", res.public_identifier_policy?.dataset_ids_are_filesystem_paths === false],
      ["request_dataset_id_used_to_build_filesystem_path", res.public_identifier_policy?.request_dataset_id_used_to_build_filesystem_path === false],
      ["public_routes_may_emit_operator_local_storage_root", res.public_identifier_policy?.public_routes_may_emit_operator_local_storage_root === false],
      ["public_routes_may_emit_absolute_filesystem_path", res.public_identifier_policy?.public_routes_may_emit_absolute_filesystem_path === false],
      ["local_storage_root_publicly_disclosed", res.isolation_invariants?.local_storage_root_publicly_disclosed === false],
      ["absolute_filesystem_path_publicly_disclosed", res.isolation_invariants?.absolute_filesystem_path_publicly_disclosed === false],
      ["private_home_path_publicly_disclosed", res.isolation_invariants?.private_home_path_publicly_disclosed === false],
      ["operator_env_publicly_disclosed", res.isolation_invariants?.operator_env_publicly_disclosed === false],
      ["shell_command_publicly_disclosed", res.isolation_invariants?.shell_command_publicly_disclosed === false],
      ["public_read_only", res.public_safety?.public_read_only === true],
      ["ledger_write", res.public_safety?.ledger_write === false],
      ["wc_credit_award", res.public_safety?.wc_credit_award === false],
      ["shell_execution", res.public_safety?.shell_execution === false],
      ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
      ["storage_root_disclosure", res.public_safety?.storage_root_disclosure === false],
    ];

    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
      console.error("Local storage path isolation assertion failed:", failed.join(", "));
      process.exit(1);
    }
  } catch (e) {
    console.error("Failed to parse boundary response as JSON:", e.message);
    process.exit(1);
  }
});
'

HTTP_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT")"
if [ "$HTTP_CODE" -lt 400 ]; then
  echo "Security Assertion Failed: POST request was not rejected."
  exit 1
fi

# Leak scan checks concrete leaked values/patterns.
# Do not fail on policy words like "secret", "private_key", "shell_command",
# or "environment_variable" when they appear as forbidden reference labels.
if printf '%s' "$RESPONSE" | grep -E -q '"/(home|root|etc|var)/|/home/|/root/|/etc/|/var/|process\.env|child_process|spawn\(|exec\(|BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-'; then
  echo "Security Assertion Failed: concrete private path, command hook, key material, or token-like value leaked in public JSON output."
  exit 1
fi

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/local-storage-path-isolation-boundary-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_DOC_V1" docs/public/public-node-datanet-local-storage-path-isolation-boundary-v1.md

if grep -Fq "VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_UI_V1" src/index.ts; then
  echo "datanet_local_storage_path_isolation_boundary_ui_marker_present=true"
else
  echo "datanet_local_storage_path_isolation_boundary_ui_marker_present=false"
  exit 1
fi

echo "datanet_local_storage_path_isolation_boundary_route_green=true"
echo "datanet_local_storage_path_isolation_boundary_dataset_ids_are_filesystem_paths=false"
echo "datanet_local_storage_path_isolation_boundary_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_local_storage_path_isolation_boundary_local_storage_root_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_absolute_filesystem_path_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_private_home_path_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_ledger_write=false"
echo "datanet_local_storage_path_isolation_boundary_wc_credit_award=false"
echo "VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_PROOF_V1_GREEN"
