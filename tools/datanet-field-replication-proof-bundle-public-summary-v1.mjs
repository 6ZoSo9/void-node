#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";

const MARKER = "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_GREEN";
const FAIL_MARKER = "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_V1_FAIL";
const INPUT_MARKER = "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN";

const ROOT = process.cwd();
const DEFAULT_BUNDLE_ROOT = join(ROOT, ".void-field-trial", "datanet-field-replication-proof-bundles");
const DEFAULT_OUT_ROOT = join(ROOT, ".void-field-trial", "datanet-field-replication-proof-bundle-public-summaries");

function usage() {
  console.log(`Usage:
  npm run datanet:field-replication:proof-bundle:public-summary -- [options]

Options:
  --bundle-json <path>   Local proof bundle JSON to summarize. Defaults to latest local bundle.json.
  --out-root <path>      Output root for public-safe summaries.
  --label <label>        Optional non-private label for summary directory.
  --help                 Show this help.

The generated summary is public-safe by content, but it is written locally under .void-field-trial by default.
`);
}

function fail(message) {
  console.error(FAIL_MARKER);
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    bundleJson: null,
    outRoot: DEFAULT_OUT_ROOT,
    label: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    const next = () => {
      const value = argv[++i];
      if (!value) fail(`missing value for ${arg}`);
      return value;
    };

    if (arg === "--bundle-json") opts.bundleJson = next();
    else if (arg === "--out-root") opts.outRoot = next();
    else if (arg === "--label") opts.label = next();
    else fail(`unknown argument: ${arg}`);
  }

  return opts;
}

function resolveInputPath(path) {
  if (!path) return null;
  const expanded = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function latestBundleJson() {
  if (!existsSync(DEFAULT_BUNDLE_ROOT)) return null;

  const out = [];
  for (const dirName of readdirSync(DEFAULT_BUNDLE_ROOT)) {
    const candidate = join(DEFAULT_BUNDLE_ROOT, dirName, "bundle.json");
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      out.push({ path: candidate, mtimeMs: statSync(candidate).mtimeMs });
    }
  }

  out.sort((a, b) => b.mtimeMs - a.mtimeMs || b.path.localeCompare(a.path));
  return out[0]?.path || null;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`failed to read JSON ${path}: ${err.message}`);
  }
}

function publicSafetyScan(label, text) {
  const forbiddenLiterals = [
    "100.122.245.125",
    "100.111.171.116",
    "zoso-Precision-Tower-7810",
    "zoso-N153B",
    "/home/",
    "\\home\\",
    ".void-field-trial",
    "127.0.0.1",
    "localhost",
  ];

  for (const item of forbiddenLiterals) {
    if (text.includes(item)) {
      fail(`${label} contains forbidden private/local detail: ${item}`);
    }
  }

  const forbiddenPatterns = [
    /http:\/\/100\./,
    /https:\/\/100\./,
    /\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    /\/tmp\//,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      fail(`${label} contains forbidden private/local pattern: ${pattern}`);
    }
  }
}

function assertFalseAuthorities(obj, prefix = "authority") {
  if (!obj || typeof obj !== "object") fail(`${prefix} object missing`);
  for (const [key, value] of Object.entries(obj)) {
    if (value !== false) {
      fail(`${prefix}.${key} must be false`);
    }
  }
}

const opts = parseArgs(process.argv.slice(2));
const bundleJsonPath = resolveInputPath(opts.bundleJson) || latestBundleJson();
if (!bundleJsonPath) fail("missing --bundle-json and no latest bundle.json found");
if (!existsSync(bundleJsonPath)) fail(`bundle JSON not found: ${bundleJsonPath}`);

const bundleBytes = readFileSync(bundleJsonPath);
const bundle = readJson(bundleJsonPath);
const sourceBundleSha256 = sha256Bytes(bundleBytes);

if (bundle.marker !== INPUT_MARKER) fail("input bundle marker mismatch");
if (bundle.status !== "green") fail("input bundle status must be green");
if (bundle.local_only !== true) fail("input bundle must be local_only=true");
if (bundle.public_safe !== false) fail("input bundle must be public_safe=false");
if (bundle.proof?.match !== true) fail("input bundle proof match must be true");
if (bundle.validation?.runner_marker_ok !== true) fail("runner marker validation must be true");
if (bundle.validation?.roundtrip_marker_ok !== true) fail("roundtrip marker validation must be true");
if (bundle.validation?.field_report_marker_ok !== true) fail("field report marker validation must be true");
if (bundle.validation?.roundtrip_sha_match !== true) fail("roundtrip SHA validation must be true");
if (bundle.validation?.runner_roundtrip_sha_linked !== true) fail("runner/roundtrip SHA link validation must be true");

const proofSha =
  bundle.proof?.actual_sha256 ||
  bundle.proof?.expected_sha256 ||
  bundle.proof?.mirror_sha256 ||
  bundle.proof?.runner_sha256;

if (!proofSha || typeof proofSha !== "string") fail("missing proof SHA from bundle");

if (bundle.boundaries?.local_operator_bundle_only !== true) {
  fail("input bundle local_operator_bundle_only boundary must be true");
}
if (bundle.boundaries?.writes_public_tree !== false) {
  fail("input bundle writes_public_tree boundary must be false");
}

const authorityFlags = {};
for (const key of [
  "wallet_movement",
  "wc_settlement",
  "validator_admission",
  "public_mutation_route",
  "ledger_write",
  "automatic_rewards",
  "secret_handling",
]) {
  authorityFlags[key] = bundle.boundaries?.[key] === true;
}

assertFalseAuthorities(authorityFlags, "dangerous_authorities_enabled");

const safeLabel = opts.label ? opts.label.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) : "";
if (safeLabel) publicSafetyScan("label", safeLabel);

const summaryId = safeLabel ? `${stamp()}-${safeLabel}` : stamp();
const outRoot = resolveInputPath(opts.outRoot || DEFAULT_OUT_ROOT);
const summaryDir = join(outRoot, summaryId);
mkdirSync(summaryDir, { recursive: true });

const summary = {
  marker: MARKER,
  status: "green",
  public_safe: true,
  local_summary_file: true,
  redacted_from_local_bundle: true,
  created_at: new Date().toISOString(),
  summary_id: summaryId,
  label: safeLabel || null,
  source_bundle_sha256: sourceBundleSha256,
  proof_sha256: proofSha,
  proof_markers: {
    runner: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN",
    roundtrip: "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN",
    field_report: "VOID_FIELD_REPORT_V1_READY",
    bundle: INPUT_MARKER,
  },
  validation: {
    runner_marker_ok: true,
    roundtrip_marker_ok: true,
    field_report_marker_ok: true,
    roundtrip_sha_match: true,
    runner_roundtrip_sha_linked: true,
  },
  input_modes: {
    runner_receipt: bundle.input_mode?.runner_receipt || null,
    roundtrip_receipt: bundle.input_mode?.roundtrip_receipt || null,
    field_report_json: bundle.input_mode?.field_report_json || null,
    field_report_md: bundle.input_mode?.field_report_md || null,
  },
  redactions: {
    private_tailnet_addresses_redacted: true,
    hostnames_redacted: true,
    absolute_paths_redacted: true,
    local_receipt_paths_redacted: true,
    safe_serve_logs_redacted: true,
  },
  dangerous_authorities_enabled: authorityFlags,
  boundaries: {
    writes_public_tree: false,
    local_operator_bundle_source: true,
    summary_contains_private_paths: false,
    summary_contains_private_tailnet_urls: false,
  },
  omitted_from_summary: [
    "host",
    "bundle_dir",
    "inputs",
    "copied",
    "safe_serve_logs",
    "receipt paths",
    "absolute local paths",
    "private tailnet URLs",
    "private hostnames",
  ],
};

const summaryJsonText = JSON.stringify(summary, null, 2) + "\n";

const summaryMdText = `# DataNet field replication proof bundle public summary v1

Status: GREEN.

Marker: \`${MARKER}\`

Public-safe: \`true\`

Source bundle SHA-256: \`${sourceBundleSha256}\`

Verified proof SHA-256: \`${proofSha}\`

## Markers

- Runner: \`${summary.proof_markers.runner}\`
- Roundtrip: \`${summary.proof_markers.roundtrip}\`
- Field report: \`${summary.proof_markers.field_report}\`
- Bundle: \`${summary.proof_markers.bundle}\`

## Validation

- Runner marker: GREEN
- Roundtrip marker: GREEN
- Field report marker: GREEN
- Roundtrip SHA match: GREEN
- Runner/roundtrip SHA linked: GREEN

## Redactions

Private tailnet addresses, hostnames, absolute paths, local receipt paths, and safe-serve logs are redacted.

## Boundaries

This summary does not enable wallet movement, WC settlement, validator admission, public mutation routes, ledger writes, automatic rewards, or secret handling.
`;

publicSafetyScan("summary JSON", summaryJsonText);
publicSafetyScan("summary Markdown", summaryMdText);

const summaryJsonPath = join(summaryDir, "summary.json");
const summaryMdPath = join(summaryDir, "summary.md");

writeFileSync(summaryJsonPath, summaryJsonText);
writeFileSync(summaryMdPath, summaryMdText);

console.log(MARKER);
console.log(`summary_dir=${summaryDir}`);
console.log(`summary_json=${summaryJsonPath}`);
console.log(`summary_md=${summaryMdPath}`);
console.log(`source_bundle_sha256=${sourceBundleSha256}`);
console.log(`proof_sha256=${proofSha}`);
console.log("public_safe=true");
console.log("private_details_redacted=true");
console.log("writes_public_tree=false");
