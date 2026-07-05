#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const explicitReceipt = process.argv[2] || "";

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name === "receipt.json") acc.push({ path: p, mtimeMs: st.mtimeMs });
  }
  return acc;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(reason, extra = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(".void-field-trial", "datanet-field-object-mirror", stamp);
  mkdirSync(outDir, { recursive: true });

  const receipt = {
    marker: "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    reason,
    ...extra,
    dangerous_paths_touched: false,
  };

  const receiptPath = join(outDir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

  console.log(receipt.marker);
  console.log(`reason=${reason}`);
  console.log(`receipt=${receiptPath}`);
  process.exit(1);
}

let sourceReceiptPath = explicitReceipt;

if (!sourceReceiptPath) {
  const receipts = walk(join(".void-field-trial", "datanet-field-object-trial"))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const r of receipts) {
    try {
      const j = loadJson(r.path);
      if (j.marker === "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN" && j.match === true) {
        sourceReceiptPath = r.path;
        break;
      }
    } catch {}
  }
}

if (!sourceReceiptPath || !existsSync(sourceReceiptPath)) {
  fail("no_successful_field_object_trial_receipt_found", {
    searched: ".void-field-trial/datanet-field-object-trial",
  });
}

let sourceReceipt;
try {
  sourceReceipt = loadJson(sourceReceiptPath);
} catch (err) {
  fail("source_receipt_parse_failed", { source_receipt: sourceReceiptPath, error: err.message });
}

if (sourceReceipt.marker !== "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN" || sourceReceipt.match !== true) {
  fail("source_receipt_not_green", {
    source_receipt: sourceReceiptPath,
    source_marker: sourceReceipt.marker || null,
    source_match: sourceReceipt.match ?? null,
  });
}

const objectPath = sourceReceipt.object_path;
if (!objectPath || !existsSync(objectPath)) {
  fail("source_object_path_missing", {
    source_receipt: sourceReceiptPath,
    object_path: objectPath || null,
  });
}

const bytes = readFileSync(objectPath);
const actual = createHash("sha256").update(bytes).digest("hex");
const expected = String(sourceReceipt.expected_sha256 || sourceReceipt.actual_sha256 || "").replace(/^sha256:/, "").toLowerCase();

if (!/^[a-f0-9]{64}$/.test(expected)) {
  fail("source_receipt_missing_valid_sha256", {
    source_receipt: sourceReceiptPath,
    expected_sha256: expected,
  });
}

if (actual !== expected) {
  fail("source_object_hash_mismatch", {
    source_receipt: sourceReceiptPath,
    object_path: objectPath,
    expected_sha256: expected,
    actual_sha256: actual,
  });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dirId = `sha256-${actual}`;
const mirrorRoot = join("public", "public-node", "datanet", "field-object-mirrors");
const mirrorDir = join(mirrorRoot, dirId);
mkdirSync(mirrorDir, { recursive: true });

const mirrorObjectPath = join(mirrorDir, "object.txt");
const mirrorReceiptPath = join(mirrorDir, "receipt.json");
const latestPath = join(mirrorRoot, "latest.json");

writeFileSync(mirrorObjectPath, bytes);

const verify = createHash("sha256").update(readFileSync(mirrorObjectPath)).digest("hex");
if (verify !== actual) {
  fail("mirror_write_hash_mismatch", {
    mirror_object_path: mirrorObjectPath,
    expected_sha256: actual,
    actual_sha256: verify,
  });
}

const publicPath = `/public-node/datanet/field-object-mirrors/${dirId}/object.txt`;
const receiptPublicPath = `/public-node/datanet/field-object-mirrors/${dirId}/receipt.json`;
const base = (process.env.VOID_MIRROR_BASE_URL || "").replace(/\/+$/, "");
const mirrorUrl = base ? `${base}${publicPath}` : "";

const receipt = {
  marker: "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  source_receipt: sourceReceiptPath,
  source_object_path: objectPath,
  source_object_url: sourceReceipt.object_source || null,
  object_id: `sha256:${actual}`,
  dir_id: dirId,
  sha256: actual,
  bytes: bytes.length,
  mirror_object_path: mirrorObjectPath,
  mirror_receipt_path: mirrorReceiptPath,
  public_path: publicPath,
  receipt_public_path: receiptPublicPath,
  mirror_url: mirrorUrl,
  verified_locally: true,
  dangerous_paths_touched: false,
};

writeFileSync(mirrorReceiptPath, JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(latestPath, JSON.stringify(receipt, null, 2) + "\n");

console.log("VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN");
console.log(`source_receipt=${sourceReceiptPath}`);
console.log(`object_id=sha256:${actual}`);
console.log(`sha256=${actual}`);
console.log(`bytes=${bytes.length}`);
console.log(`mirror_object_path=${mirrorObjectPath}`);
console.log(`receipt=${mirrorReceiptPath}`);
console.log(`public_path=${publicPath}`);
console.log(`mirror_url=${mirrorUrl || "(set VOID_MIRROR_BASE_URL to print full URL)"}`);
