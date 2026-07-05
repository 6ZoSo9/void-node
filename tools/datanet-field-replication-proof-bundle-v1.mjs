#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { hostname } from "node:os";

const MARKER = "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN";
const FAIL_MARKER = "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_FAIL";

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, ".void-field-trial", "datanet-field-replication-proof-bundles");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function fail(message) {
  console.error(FAIL_MARKER);
  console.error(message);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`failed to read JSON ${path}: ${err.message}`);
  }
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walkFiles(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walkFiles(path, predicate, out);
    } else if (predicate(path)) {
      out.push({ path, mtimeMs: st.mtimeMs });
    }
  }
  return out;
}

function latestFile(dir, predicate) {
  const files = walkFiles(dir, predicate);
  files.sort((a, b) => b.mtimeMs - a.mtimeMs || b.path.localeCompare(a.path));
  return files[0]?.path || null;
}

function latestReportJson() {
  const dir = join(ROOT, ".void-field-reports");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => /^void-field-report-.*\.json$/.test(name))
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile())
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }));
  files.sort((a, b) => b.mtimeMs - a.mtimeMs || b.path.localeCompare(a.path));
  return files[0]?.path || null;
}

function containsValue(obj, value) {
  if (obj === value) return true;
  if (Array.isArray(obj)) return obj.some((item) => containsValue(item, value));
  if (obj && typeof obj === "object") {
    return Object.values(obj).some((item) => containsValue(item, value));
  }
  return false;
}

function findStringByKey(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  if (!Array.isArray(obj)) {
    for (const key of keys) {
      if (typeof obj[key] === "string" && obj[key]) return obj[key];
    }
  }
  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const value of values) {
    const found = findStringByKey(value, keys);
    if (found) return found;
  }
  return null;
}

function findBooleanByKey(obj, keys) {
  if (!obj || typeof obj !== "object") return null;
  if (!Array.isArray(obj)) {
    for (const key of keys) {
      if (typeof obj[key] === "boolean") return obj[key];
    }
  }
  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const value of values) {
    const found = findBooleanByKey(value, keys);
    if (found !== null) return found;
  }
  return null;
}

function copyIntoBundle(source, bundleDir, name) {
  if (!source || !existsSync(source)) return null;
  const dest = join(bundleDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  return {
    source_path: source,
    bundle_path: dest,
    sha256: sha256File(source),
    bytes: statSync(source).size,
  };
}

function optionalSafeServeLog(path) {
  if (!existsSync(path)) {
    return {
      path,
      found: false,
      ready_marker: false,
      green_marker: false,
      dangerous_paths_touched_false: false,
    };
  }

  const text = readFileSync(path, "utf8");
  return {
    path,
    found: true,
    sha256: sha256File(path),
    bytes: statSync(path).size,
    ready_marker: text.includes("VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY"),
    green_marker: text.includes("VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN"),
    dangerous_paths_touched_false: text.includes("dangerous_paths_touched=false"),
    host_lines: text.split(/\r?\n/).filter((line) => line.startsWith("host=")),
    port_lines: text.split(/\r?\n/).filter((line) => line.startsWith("port=")),
  };
}

const runnerReceiptPath = latestFile(
  join(ROOT, ".void-field-trial", "datanet-field-replication-runner"),
  (path) => basename(path) === "receipt.json"
);
const roundtripReceiptPath = latestFile(
  join(ROOT, ".void-field-trial", "datanet-field-object-roundtrip"),
  (path) => basename(path) === "receipt.json"
);
const fieldReportJsonPath = latestReportJson();

if (!runnerReceiptPath) fail("missing latest datanet field replication runner receipt");
if (!roundtripReceiptPath) fail("missing latest datanet field object roundtrip receipt");
if (!fieldReportJsonPath) fail("missing latest VOID field report JSON");

const fieldReportMdPath = fieldReportJsonPath.replace(/\.json$/, ".md");

const runnerReceipt = readJson(runnerReceiptPath);
const roundtripReceipt = readJson(roundtripReceiptPath);
const fieldReport = readJson(fieldReportJsonPath);

const runnerMarkerOk = containsValue(runnerReceipt, "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN");
const roundtripMarkerOk = containsValue(roundtripReceipt, "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN");
const fieldReportMarkerOk = containsValue(fieldReport, "VOID_FIELD_REPORT_V1_READY");

const runnerSha = findStringByKey(runnerReceipt, ["sha256", "object_sha256", "actual_sha256"]);
const expectedSha = findStringByKey(roundtripReceipt, ["expected_sha256"]);
const mirrorSha = findStringByKey(roundtripReceipt, ["mirror_sha256"]);
const actualSha = findStringByKey(roundtripReceipt, ["actual_sha256", "sha256"]);
const matchValue = findBooleanByKey(roundtripReceipt, ["match"]);

const roundtripShaMatch =
  matchValue === true ||
  Boolean(expectedSha && mirrorSha && actualSha && expectedSha === mirrorSha && mirrorSha === actualSha);

const runnerRoundtripShaLinked =
  !runnerSha ||
  !actualSha ||
  runnerSha === actualSha ||
  runnerSha === expectedSha ||
  runnerSha === mirrorSha;

const ok = runnerMarkerOk && roundtripMarkerOk && fieldReportMarkerOk && roundtripShaMatch && runnerRoundtripShaLinked;

if (!ok) {
  fail(
    [
      "latest proof inputs did not validate",
      `runner_marker_ok=${runnerMarkerOk}`,
      `roundtrip_marker_ok=${roundtripMarkerOk}`,
      `field_report_marker_ok=${fieldReportMarkerOk}`,
      `roundtrip_sha_match=${roundtripShaMatch}`,
      `runner_roundtrip_sha_linked=${runnerRoundtripShaLinked}`,
    ].join("\n")
  );
}

const bundleId = stamp();
const bundleDir = join(OUT_ROOT, bundleId);
mkdirSync(bundleDir, { recursive: true });

const copied = {
  runner_receipt: copyIntoBundle(runnerReceiptPath, bundleDir, "runner-receipt.json"),
  roundtrip_receipt: copyIntoBundle(roundtripReceiptPath, bundleDir, "roundtrip-receipt.json"),
  field_report_json: copyIntoBundle(fieldReportJsonPath, bundleDir, "field-report.json"),
  field_report_md: existsSync(fieldReportMdPath) ? copyIntoBundle(fieldReportMdPath, bundleDir, "field-report.md") : null,
};

const safeServeLogs = [
  optionalSafeServeLog("/tmp/void-public-node-safe-serve-8088.log"),
  optionalSafeServeLog("/tmp/void-public-node-safe-serve-8089.log"),
];

const bundle = {
  marker: MARKER,
  status: "green",
  local_only: true,
  public_safe: false,
  created_at: new Date().toISOString(),
  host: hostname(),
  bundle_id: bundleId,
  bundle_dir: bundleDir,
  inputs: {
    runner_receipt_path: runnerReceiptPath,
    roundtrip_receipt_path: roundtripReceiptPath,
    field_report_json_path: fieldReportJsonPath,
    field_report_md_path: existsSync(fieldReportMdPath) ? fieldReportMdPath : null,
  },
  copied,
  validation: {
    runner_marker_ok: runnerMarkerOk,
    roundtrip_marker_ok: roundtripMarkerOk,
    field_report_marker_ok: fieldReportMarkerOk,
    roundtrip_sha_match: roundtripShaMatch,
    runner_roundtrip_sha_linked: runnerRoundtripShaLinked,
  },
  proof: {
    runner_sha256: runnerSha,
    expected_sha256: expectedSha,
    mirror_sha256: mirrorSha,
    actual_sha256: actualSha,
    match: roundtripShaMatch,
  },
  safe_serve_logs: safeServeLogs,
  boundaries: {
    local_operator_bundle_only: true,
    writes_public_tree: false,
    wallet_movement: false,
    wc_settlement: false,
    validator_admission: false,
    public_mutation_route: false,
    ledger_write: false,
    automatic_rewards: false,
    secret_handling: false,
  },
};

const bundleJsonPath = join(bundleDir, "bundle.json");
const bundleMdPath = join(bundleDir, "bundle.md");

writeFileSync(bundleJsonPath, JSON.stringify(bundle, null, 2) + "\n");

const md = `# DataNet field replication proof bundle v1

Status: GREEN.

Marker: \`${MARKER}\`

Created: ${bundle.created_at}

Host: \`${bundle.host}\`

Bundle directory: \`${bundle.bundle_dir}\`

## Proof

- Runner marker: ${runnerMarkerOk ? "GREEN" : "FAIL"}
- Roundtrip marker: ${roundtripMarkerOk ? "GREEN" : "FAIL"}
- Field report marker: ${fieldReportMarkerOk ? "GREEN" : "FAIL"}
- SHA match: ${roundtripShaMatch ? "GREEN" : "FAIL"}
- Runner/roundtrip SHA linked: ${runnerRoundtripShaLinked ? "GREEN" : "FAIL"}

Verified SHA: \`${actualSha || expectedSha || runnerSha || "unknown"}\`

## Included files

- Runner receipt: \`${copied.runner_receipt?.bundle_path || "missing"}\`
- Roundtrip receipt: \`${copied.roundtrip_receipt?.bundle_path || "missing"}\`
- Field report JSON: \`${copied.field_report_json?.bundle_path || "missing"}\`
- Field report Markdown: \`${copied.field_report_md?.bundle_path || "missing"}\`

## Boundaries

This is a local operator bundle. It is not public-safe by default because receipts may include private tailnet URLs or hostnames.

It does not enable wallet movement, WC settlement, validator admission, public mutation routes, ledger writes, automatic rewards, or secret handling.
`;
writeFileSync(bundleMdPath, md);

console.log(MARKER);
console.log(`bundle_dir=${bundleDir}`);
console.log(`bundle_json=${bundleJsonPath}`);
console.log(`bundle_md=${bundleMdPath}`);
console.log(`runner_receipt=${runnerReceiptPath}`);
console.log(`roundtrip_receipt=${roundtripReceiptPath}`);
console.log(`field_report_json=${fieldReportJsonPath}`);
console.log(`sha256=${actualSha || expectedSha || runnerSha || ""}`);
console.log("local_only=true");
console.log("public_safe=false");
