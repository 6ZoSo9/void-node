#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validateBootstrapRecordV2 } from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_RECORD_V2_MIRROR_CONTRACT_V1_VERIFY";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  let recordPath = "";
  let now = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--record") recordPath = argv[++index] || "";
    else if (arg === "--now") now = argv[++index] || "";
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/verify_void_public_bootstrap_record_v2_mirror_contract_v1.mjs --record /path/to/record.json [--now ISO-8601]");
      process.exit(0);
    } else fail(`unknown argument ${arg}`);
  }
  if (!recordPath) fail("--record is required");
  return { recordPath, now };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const target = path.resolve(options.recordPath);
  const status = fs.lstatSync(target);
  if (status.isSymbolicLink() || !status.isFile()) throw new Error("record must be one regular non-symlink file");
  if (fs.realpathSync(target) !== target) throw new Error("record path must already be canonical");
  if (status.size < 2 || status.size > 1024 * 1024) throw new Error("record file size is invalid");
  const raw = JSON.parse(fs.readFileSync(target, "utf8"));
  const nowMs = options.now ? Date.parse(options.now) : Date.now();
  if (!Number.isFinite(nowMs)) throw new Error("--now must be valid ISO-8601");
  const record = validateBootstrapRecordV2(raw, { nowMs });
  console.log(`${MARKER}_GREEN`);
  console.log(`record_id=${record.record_id}`);
  console.log(`manifest_id=${record.manifest.manifest_id}`);
  console.log(`mirror_count=${record.mirrors.length}`);
  console.log("runtime_activation_authorized=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} catch (error) {
  fail(error?.stack || error?.message || String(error));
}
