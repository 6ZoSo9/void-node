#!/usr/bin/env bash
set -euo pipefail

PORT="${VOID_PUBLIC_SUMMARY_RUNTIME_SMOKE_PORT:-$((21100 + ($$ % 700)))}"
OUT="/tmp/void-datanet-proof-bundle-public-summary-runtime-${PORT}.out"

rm -f "$OUT"

node tools/public-node-safe-serve-v1.mjs --host 127.0.0.1 --port "$PORT" >"$OUT" 2>&1 &
pid=$!

cleanup() {
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$OUT"; then
    break
  fi
  sleep 0.25
done

if ! grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$OUT"; then
  echo "safe serve did not become ready"
  cat "$OUT" || true
  exit 1
fi

grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN' "$OUT"
grep -q 'dangerous_paths_touched=false' "$OUT"

PORT="$PORT" node - <<'NODE'
const http = require("http");

const port = Number(process.env.PORT);
const proofSha = "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da";
const sourceBundleSha = "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2";

const forbidden = [
  "100.122.245.125",
  "100.111.171.116",
  "zoso-Precision-Tower-7810",
  "zoso-N153B",
  "/home/",
  ".void-field-trial",
  "127.0.0.1",
  "localhost",
  "runner_receipt=",
  "roundtrip_receipt=",
  "field_report_json=",
  "bundle_dir=",
  "summary_dir=",
  "\"safe_serve_logs\"",
  "'safe_serve_logs'",
];

function fetchPath(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({
        path,
        status: res.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    }).on("error", reject);
  });
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoPrivateDetails(label, body) {
  for (const item of forbidden) {
    assertOk(!body.includes(item), `${label} leaked private/local detail: ${item}`);
  }
  assertOk(!/http:\/\/100\./.test(body), `${label} leaked tailnet URL`);
  assertOk(!/https:\/\/100\./.test(body), `${label} leaked tailnet URL`);
  assertOk(!/\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(body), `${label} leaked tailnet IP`);
  assertOk(!/\/tmp\//.test(body), `${label} leaked /tmp path`);
}

function assertAuthoritiesFalse(obj, label) {
  assertOk(obj && typeof obj === "object", `${label} authority object missing`);
  for (const [key, value] of Object.entries(obj)) {
    assertOk(value === false, `${label} authority unexpectedly enabled: ${key}`);
  }
}

(async () => {
  const summaryHtmlPath = "/public-node/datanet/field-replication-proof-bundle-public-summary-v1.html";
  const summaryJsonPath = "/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json";
  const statusHtmlPath = "/public-node/datanet/field-replication-status-card-v1.html";
  const statusJsonPath = "/public-node/datanet/field-replication-status-card-v1.json";
  const indexPath = "/public-node/datanet/index.json";

  const summaryHtml = await fetchPath(summaryHtmlPath);
  assertOk(summaryHtml.status === 200, `${summaryHtmlPath} status ${summaryHtml.status}`);
  assertOk(summaryHtml.body.includes("DataNet field replication proof bundle public summary v1"), "summary HTML missing title");
  assertOk(summaryHtml.body.includes("VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN"), "summary HTML missing marker");
  assertOk(summaryHtml.body.includes(proofSha), "summary HTML missing proof SHA");
  assertOk(summaryHtml.body.includes(sourceBundleSha), "summary HTML missing source bundle SHA");
  assertNoPrivateDetails("summary HTML", summaryHtml.body);

  const summaryJsonRes = await fetchPath(summaryJsonPath);
  assertOk(summaryJsonRes.status === 200, `${summaryJsonPath} status ${summaryJsonRes.status}`);
  assertNoPrivateDetails("summary JSON", summaryJsonRes.body);
  const summaryJson = JSON.parse(summaryJsonRes.body);
  assertOk(summaryJson.status === "green", "summary JSON status not green");
  assertOk(summaryJson.public_safe === true, "summary JSON public_safe not true");
  assertOk(summaryJson.published_static_public_summary === true, "summary JSON published flag not true");
  assertOk(summaryJson.source_bundle_sha256 === sourceBundleSha, "summary JSON source bundle SHA mismatch");
  assertOk(summaryJson.proof_sha256 === proofSha, "summary JSON proof SHA mismatch");
  assertOk(summaryJson.validation?.private_details_redacted === true, "summary JSON redaction validation missing");
  assertOk(summaryJson.redactions?.server_log_details_redacted === true, "summary JSON server log redaction missing");
  assertOk(summaryJson.boundaries?.static_public_file_published_by_pr === true, "summary JSON static publish boundary missing");
  assertOk(summaryJson.boundaries?.runtime_public_write_enabled === false, "summary JSON runtime write boundary wrong");
  assertOk(summaryJson.boundaries?.public_mutation_route_enabled === false, "summary JSON mutation boundary wrong");
  assertOk(summaryJson.boundaries?.private_bundle_published === false, "summary JSON private bundle boundary wrong");
  assertOk(summaryJson.boundaries?.raw_receipts_published === false, "summary JSON raw receipt boundary wrong");
  assertOk(summaryJson.boundaries?.tailnet_urls_published === false, "summary JSON tailnet boundary wrong");
  assertOk(summaryJson.boundaries?.hostnames_published === false, "summary JSON hostname boundary wrong");
  assertOk(summaryJson.boundaries?.absolute_paths_published === false, "summary JSON path boundary wrong");
  assertAuthoritiesFalse(summaryJson.dangerous_authorities_enabled, "summary JSON");

  const statusHtml = await fetchPath(statusHtmlPath);
  assertOk(statusHtml.status === 200, `${statusHtmlPath} status ${statusHtml.status}`);
  assertOk(statusHtml.body.includes("proof-bundle-public-summary-v1"), "status HTML missing public summary section");
  assertOk(statusHtml.body.includes("field-replication-proof-bundle-public-summary-v1.html"), "status HTML missing public summary link");
  assertOk(statusHtml.body.includes(proofSha), "status HTML missing proof SHA");
  assertNoPrivateDetails("status HTML", statusHtml.body);

  const statusJsonRes = await fetchPath(statusJsonPath);
  assertOk(statusJsonRes.status === 200, `${statusJsonPath} status ${statusJsonRes.status}`);
  assertNoPrivateDetails("status JSON", statusJsonRes.body);
  const statusJson = JSON.parse(statusJsonRes.body);
  assertOk(statusJson.proof_bundle_public_summary_v1?.public_html_path === summaryHtmlPath, "status JSON missing public summary HTML path");
  assertOk(statusJson.proof_bundle_public_summary_v1?.proof_sha256 === proofSha, "status JSON proof SHA mismatch");
  assertAuthoritiesFalse(statusJson.proof_bundle_public_summary_v1?.dangerous_authorities_enabled, "status JSON");

  const indexRes = await fetchPath(indexPath);
  assertOk(indexRes.status === 200, `${indexPath} status ${indexRes.status}`);
  assertNoPrivateDetails("DataNet index JSON", indexRes.body);
  const indexJson = JSON.parse(indexRes.body);
  assertOk(indexJson.field_replication_proof_bundle_public_summary_v1?.public_html_path === summaryHtmlPath, "DataNet index missing public summary HTML path");
  assertOk(indexJson.field_replication_proof_bundle_public_summary_v1?.proof_sha256 === proofSha, "DataNet index proof SHA mismatch");
  assertAuthoritiesFalse(indexJson.field_replication_proof_bundle_public_summary_v1?.dangerous_authorities_enabled, "DataNet index");

  console.log("runtime public summary fetch ok");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
NODE

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_RUNTIME_V1_GREEN"
