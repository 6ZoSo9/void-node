#!/usr/bin/env bash
set -euo pipefail

fixture_dir=".void-field-trial/field-report-bounded-check"
out="/tmp/void-field-report-bounded-v1.out"

rm -rf "$fixture_dir"
mkdir -p "$fixture_dir"

for i in $(seq -w 1 120); do
  printf 'field-report-bounded-check-%s\n' "$i" > "$fixture_dir/artifact-$i.txt"
done

VOID_FIELD_REPORT_MAX_ARTIFACTS=25 VOID_FIELD_REPORT_ROOTS="$fixture_dir" npm run void:field-report | tee "$out"

grep -q 'VOID_FIELD_REPORT_V1_READY' "$out"
grep -q '^json=' "$out"
grep -q '^md=' "$out"
grep -q '^artifacts=25' "$out"
grep -q '^truncated=true' "$out"

json_path="$(awk -F= '/^json=/{print $2; exit}' "$out")"
md_path="$(awk -F= '/^md=/{print $2; exit}' "$out")"

test -f "$json_path"
test -f "$md_path"

python3 -m json.tool "$json_path" >/tmp/void-field-report-bounded-json-ok.out

REPORT_JSON="$json_path" node - <<'NODE'
const fs = require("fs");
const report = JSON.parse(fs.readFileSync(process.env.REPORT_JSON, "utf8"));
if (report.marker !== "VOID_FIELD_REPORT_V1_READY") throw new Error("bad report marker");
if (report.status !== "ready") throw new Error("bad report status");
if (report.bounds.max_artifacts !== 25) throw new Error("max artifact bound mismatch");
if (report.bounds.included_artifacts !== 25) throw new Error("included artifact count mismatch");
if (report.bounds.total_candidates < 120) throw new Error("total candidates too low");
if (report.bounds.truncated !== true) throw new Error("expected truncated=true");
if (!Array.isArray(report.artifacts)) throw new Error("artifacts missing");
if (report.artifacts.length !== 25) throw new Error("artifact array not bounded");
const text = JSON.stringify(report);
if (text.includes("field-report-bounded-check-120") && report.artifacts.length > 25) {
  throw new Error("report included too many artifacts");
}
NODE

echo "VOID_FIELD_REPORT_BOUNDED_V1_GREEN"
