#!/usr/bin/env bash
set -euo pipefail

OUT="/tmp/void-datanet-proof-bundle-public-summary-v1.out"

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const expected = "node tools/datanet-field-replication-proof-bundle-public-summary-v1.mjs";
const actual = pkg.scripts?.["datanet:field-replication:proof-bundle:public-summary"];
if (actual !== expected) {
  throw new Error(`missing/incorrect public summary script. expected ${expected}, got ${actual}`);
}
if (!fs.existsSync("tools/datanet-field-replication-proof-bundle-public-summary-v1.mjs")) {
  throw new Error("missing public summary tool");
}
NODE

tools/check_datanet_field_replication_proof_bundle_v1.sh >/tmp/void-datanet-proof-bundle-public-summary-source-bundle.out

npm run datanet:field-replication:proof-bundle:public-summary -- --label public-summary-check | tee "$OUT"

grep -q 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN' "$OUT"
grep -q '^summary_json=' "$OUT"
grep -q '^summary_md=' "$OUT"
grep -q '^public_safe=true' "$OUT"
grep -q '^private_details_redacted=true' "$OUT"
grep -q '^writes_public_tree=false' "$OUT"

summary_json="$(awk -F= '/^summary_json=/{print $2; exit}' "$OUT")"
summary_md="$(awk -F= '/^summary_md=/{print $2; exit}' "$OUT")"

test -f "$summary_json"
test -f "$summary_md"

python3 -m json.tool "$summary_json" >/tmp/void-datanet-proof-bundle-public-summary-json-ok.out

SUMMARY_JSON="$summary_json" SUMMARY_MD="$summary_md" node - <<'NODE'
const fs = require("fs");
const summary = JSON.parse(fs.readFileSync(process.env.SUMMARY_JSON, "utf8"));
const md = fs.readFileSync(process.env.SUMMARY_MD, "utf8");

if (summary.marker !== "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN") {
  throw new Error("bad summary marker");
}
if (summary.status !== "green") throw new Error("summary not green");
if (summary.public_safe !== true) throw new Error("summary public_safe must be true");
if (summary.redacted_from_local_bundle !== true) throw new Error("summary must be redacted_from_local_bundle");
if (!summary.source_bundle_sha256) throw new Error("missing source bundle sha");
if (!summary.proof_sha256) throw new Error("missing proof sha");

const forbidden = [
  "100.122.245.125",
  "100.111.171.116",
  "zoso-Precision-Tower-7810",
  "zoso-N153B",
  "/home/",
  ".void-field-trial",
  "127.0.0.1",
  "localhost",
];

for (const text of [JSON.stringify(summary), md]) {
  for (const item of forbidden) {
    if (text.includes(item)) throw new Error(`summary leaked forbidden detail: ${item}`);
  }
  if (/http:\/\/100\./.test(text)) throw new Error("summary leaked tailnet URL");
  if (/\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) throw new Error("summary leaked tailnet IP");
}

for (const [key, value] of Object.entries(summary.dangerous_authorities_enabled || {})) {
  if (value !== false) throw new Error(`dangerous authority enabled: ${key}`);
}
if (summary.boundaries?.writes_public_tree !== false) throw new Error("writes_public_tree must be false");
if (summary.boundaries?.summary_contains_private_paths !== false) throw new Error("private path boundary must be false");
if (summary.boundaries?.summary_contains_private_tailnet_urls !== false) throw new Error("private tailnet boundary must be false");
NODE

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN"
