#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);

let sourceInput = process.env.VOID_SOURCE_BASE_URL || "";
let mirrorBase = process.env.VOID_MIRROR_BASE_URL || "";

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--source" || a === "--source-base") {
    sourceInput = args[++i] || "";
  } else if (a === "--mirror" || a === "--mirror-base") {
    mirrorBase = args[++i] || "";
  } else if (!sourceInput) {
    sourceInput = a;
  } else if (!mirrorBase) {
    mirrorBase = a;
  }
}

function usage() {
  console.error("Usage:");
  console.error("  npm run datanet:field-replication:run -- <source-base-or-latest-json> <mirror-base-url>");
  console.error("");
  console.error("Example:");
  console.error("  VOID_NETWORK_HINT=cellphone-data+tailscale npm run datanet:field-replication:run -- http://100.122.245.125:8088 http://100.111.171.116:8089");
  process.exit(2);
}

if (!sourceInput || !mirrorBase) usage();

function runNode(script, scriptArgs = [], extraEnv = {}) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...scriptArgs], {
      encoding: "utf8",
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout, stderr: "" };
  } catch (err) {
    return {
      ok: false,
      stdout: String(err.stdout || ""),
      stderr: String(err.stderr || err.message || ""),
      status: err.status || 1,
    };
  }
}

function receiptPathFrom(stdout) {
  const m = stdout.match(/^receipt=(.+)$/m);
  return m ? m[1].trim() : "";
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(".void-field-trial", "datanet-field-replication-runner", stamp);
mkdirSync(outDir, { recursive: true });

function finish(receipt, code = 0) {
  const receiptPath = join(outDir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

  console.log(receipt.marker);
  console.log(`source_input=${receipt.source_input}`);
  console.log(`mirror_base=${receipt.mirror_base}`);
  console.log(`trial_receipt=${receipt.trial_receipt || ""}`);
  console.log(`mirror_receipt=${receipt.mirror_receipt || ""}`);
  console.log(`sha256=${receipt.sha256 || ""}`);
  console.log(`mirror_url=${receipt.mirror_url || ""}`);
  console.log(`next_roundtrip=${receipt.next_roundtrip_command || ""}`);
  console.log(`receipt=${receiptPath}`);
  process.exit(code);
}

for (const required of [
  "tools/datanet-field-object-trial-v1.mjs",
  "tools/datanet-field-object-mirror-v1.mjs",
]) {
  if (!existsSync(required)) {
    finish({
      marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_FAIL",
      created_at: new Date().toISOString(),
      host: hostname(),
      source_input: sourceInput,
      mirror_base: mirrorBase,
      phase: "preflight",
      error: `missing required script: ${required}`,
      dangerous_paths_touched: false,
    }, 1);
  }
}

const trial = runNode("tools/datanet-field-object-trial-v1.mjs", [sourceInput]);
const trialReceiptPath = receiptPathFrom(trial.stdout);

if (!trial.ok || !trialReceiptPath || !existsSync(trialReceiptPath)) {
  finish({
    marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    source_input: sourceInput,
    mirror_base: mirrorBase,
    phase: "trial",
    trial_ok: trial.ok,
    trial_stdout: trial.stdout,
    trial_stderr: trial.stderr,
    trial_receipt: trialReceiptPath || null,
    dangerous_paths_touched: false,
  }, 1);
}

const trialReceipt = readJson(trialReceiptPath);
if (trialReceipt.marker !== "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN" || trialReceipt.match !== true) {
  finish({
    marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    source_input: sourceInput,
    mirror_base: mirrorBase,
    phase: "trial_receipt_validate",
    trial_receipt: trialReceiptPath,
    trial_marker: trialReceipt.marker,
    trial_match: trialReceipt.match,
    dangerous_paths_touched: false,
  }, 1);
}

const mirror = runNode("tools/datanet-field-object-mirror-v1.mjs", [], {
  VOID_MIRROR_BASE_URL: mirrorBase,
});
const mirrorReceiptPath = receiptPathFrom(mirror.stdout);

if (!mirror.ok || !mirrorReceiptPath || !existsSync(mirrorReceiptPath)) {
  finish({
    marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    source_input: sourceInput,
    mirror_base: mirrorBase,
    phase: "mirror",
    trial_receipt: trialReceiptPath,
    mirror_ok: mirror.ok,
    mirror_stdout: mirror.stdout,
    mirror_stderr: mirror.stderr,
    mirror_receipt: mirrorReceiptPath || null,
    dangerous_paths_touched: false,
  }, 1);
}

const mirrorReceipt = readJson(mirrorReceiptPath);
if (mirrorReceipt.marker !== "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN") {
  finish({
    marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_FAIL",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    source_input: sourceInput,
    mirror_base: mirrorBase,
    phase: "mirror_receipt_validate",
    trial_receipt: trialReceiptPath,
    mirror_receipt: mirrorReceiptPath,
    mirror_marker: mirrorReceipt.marker,
    dangerous_paths_touched: false,
  }, 1);
}

const sha = mirrorReceipt.sha256;
const nextRoundtrip = `VOID_NETWORK_HINT=precision-to-field-tailnet npm run datanet:field-object:roundtrip -- ${mirrorBase} ${sha}`;

finish({
  marker: "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  source_input: sourceInput,
  mirror_base: mirrorBase,
  phase: "trial_and_mirror",
  trial_receipt: trialReceiptPath,
  mirror_receipt: mirrorReceiptPath,
  trial_object_source: trialReceipt.object_source,
  mirror_url: mirrorReceipt.mirror_url,
  object_id: mirrorReceipt.object_id,
  sha256: sha,
  bytes: mirrorReceipt.bytes,
  match: true,
  next_roundtrip_command: nextRoundtrip,
  dangerous_paths_touched: false,
}, 0);
