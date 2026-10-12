#!/usr/bin/env bash
set -euo pipefail

PORT="${VOID_SAFE_SERVE_RUNTIME_SMOKE_PORT:-$((18000 + ($$ % 1000)))}"
OUT="/tmp/void-datanet-safe-serve-runbook-discovery-runtime-${PORT}.out"

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
const forbidden = [
  "100.122.245.125",
  "100.111.171.116",
  "zoso-Precision-Tower-7810",
  "zoso-N153B",
];

function fetchPath(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          path,
          status: res.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
          headers: res.headers,
        });
      });
    }).on("error", reject);
  });
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoPrivateDetails(label, body) {
  for (const item of forbidden) {
    assertOk(!body.includes(item), `${label} leaked private detail: ${item}`);
  }
  assertOk(!/http:\/\/100\./.test(body), `${label} leaked tailnet URL`);
}

(async () => {
  const htmlPath = "/public-node/datanet/field-replication-safe-serve-runbook-v1.html";
  const jsonPath = "/public-node/datanet/field-replication-safe-serve-runbook-v1.json";
  const statusHtmlPath = "/public-node/datanet/field-replication-status-card-v1.html";
  const statusJsonPath = "/public-node/datanet/field-replication-status-card-v1.json";
  const indexPath = "/public-node/datanet/index.json";

  const runbookHtml = await fetchPath(htmlPath);
  assertOk(runbookHtml.status === 200, `${htmlPath} status ${runbookHtml.status}`);
  assertOk(runbookHtml.body.includes("DataNet field replication safe serve runbook v1"), "runbook HTML missing title");
  assertOk(runbookHtml.body.includes("VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY"), "runbook HTML missing safe serve marker");
  assertOk(runbookHtml.body.includes("VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN"), "runbook HTML missing runner marker");
  assertOk(runbookHtml.body.includes("VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN"), "runbook HTML missing roundtrip marker");
  assertOk(runbookHtml.body.includes("dangerous_paths_touched=false"), "runbook HTML missing safe boundary");
  assertNoPrivateDetails("runbook HTML", runbookHtml.body);

  const runbookJsonRes = await fetchPath(jsonPath);
  assertOk(runbookJsonRes.status === 200, `${jsonPath} status ${runbookJsonRes.status}`);
  assertNoPrivateDetails("runbook JSON", runbookJsonRes.body);
  const runbookJson = JSON.parse(runbookJsonRes.body);
  assertOk(runbookJson.status === "green", "runbook JSON status not green");
  assertOk(runbookJson.public_html_path === htmlPath, "runbook JSON public_html_path mismatch");
  assertOk(runbookJson.public_json_path === jsonPath, "runbook JSON public_json_path mismatch");
  assertOk(runbookJson.private_tailnet_details_redacted === true, "runbook JSON redaction flag not true");
  for (const [key, value] of Object.entries(runbookJson.dangerous_authorities_enabled || {})) {
    assertOk(value === false, `runbook JSON dangerous authority enabled: ${key}`);
  }

  const statusHtml = await fetchPath(statusHtmlPath);
  assertOk(statusHtml.status === 200, `${statusHtmlPath} status ${statusHtml.status}`);
  assertOk(statusHtml.body.includes("safe-serve-runbook-discovery-v1"), "status HTML missing discovery section");
  assertOk(statusHtml.body.includes("field-replication-safe-serve-runbook-v1.html"), "status HTML missing runbook link");
  assertNoPrivateDetails("status HTML", statusHtml.body);

  const statusJsonRes = await fetchPath(statusJsonPath);
  assertOk(statusJsonRes.status === 200, `${statusJsonPath} status ${statusJsonRes.status}`);
  assertNoPrivateDetails("status JSON", statusJsonRes.body);
  const statusJson = JSON.parse(statusJsonRes.body);
  assertOk(
    statusJson.safe_serve_runbook_discovery_v1?.public_html_path === htmlPath,
    "status JSON missing runbook discovery html path"
  );

  const indexRes = await fetchPath(indexPath);
  assertOk(indexRes.status === 200, `${indexPath} status ${indexRes.status}`);
  assertNoPrivateDetails("DataNet index JSON", indexRes.body);
  const indexJson = JSON.parse(indexRes.body);
  assertOk(
    indexJson.field_replication_safe_serve_runbook_v1?.public_html_path === htmlPath,
    "DataNet index missing runbook public html path"
  );

  console.log("runtime fetch ok");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
NODE

echo "VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_DISCOVERY_RUNTIME_V1_GREEN"
