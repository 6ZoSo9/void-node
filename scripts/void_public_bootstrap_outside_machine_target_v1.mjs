#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_OUTSIDE_MACHINE_TARGET_V1";
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_READY_BYTES = 64 * 1024;
const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

function fail(message) {
  console.error(`${MARKER}_HOLD`);
  console.error(`reason=${message}`);
  process.exit(1);
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return "";
  const value = String(process.argv[index + 1] || "").trim();
  if (!value || value.startsWith("--")) fail(`${name} requires a value`);
  return value;
}

function plainFile(file, maxBytes, label) {
  const resolved = path.resolve(file);
  let st;
  try {
    st = fs.lstatSync(resolved);
  } catch {
    fail(`${label} is missing`);
  }
  if (!st.isFile() || st.isSymbolicLink()) fail(`${label} must be one regular non-symlink file`);
  if (st.size <= 0 || st.size > maxBytes) fail(`${label} size is outside the reviewed bound`);
  return resolved;
}

function readJson(file, maxBytes, label) {
  const resolved = plainFile(file, maxBytes, label);
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error?.message || error}`);
  }
}

function exactFalseAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    fail("manifest authority is not an object");
  }
  const keys = Object.keys(authority).sort();
  const wanted = [...AUTHORITY_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(wanted)) fail("manifest authority key set mismatch");
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) fail(`manifest authority ${key} must be false`);
  }
}

function manifestIdFromResolverLog(file) {
  const resolved = plainFile(file, 256 * 1024, "resolver log");
  const ids = fs
    .readFileSync(resolved, "utf8")
    .split(/\r?\n/)
    .map((line) => /^manifest_id=(voidpbm1_[0-9a-f]{64})$/.exec(line)?.[1] || "")
    .filter(Boolean);
  if (ids.length !== 1) fail(`resolver log manifest identity count=${ids.length}`);
  return ids[0];
}

function safeHead(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    fail(`${label} must be a positive safe integer JSON number`);
  }
  return value;
}

function bindTarget() {
  const manifest = readJson(option("--manifest"), MAX_JSON_BYTES, "bootstrap manifest");
  const resolverManifestId = manifestIdFromResolverLog(option("--resolver-log"));

  if (manifest?.schema !== "void_public_bootstrap_v1") fail("bootstrap manifest schema mismatch");
  if (manifest?.network !== "VOID Network" || manifest?.chain_id !== 2050) {
    fail("bootstrap manifest network or chain mismatch");
  }
  if (manifest?.status !== "stable_https_seed") fail("bootstrap manifest is not stable_https_seed");
  if (manifest?.private_tailnet_endpoints_published !== false) {
    fail("bootstrap manifest publishes private Tailnet endpoints");
  }
  exactFalseAuthority(manifest.authority);

  const manifestId = String(manifest?.manifest_id || "");
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(manifestId)) fail("bootstrap manifest ID is malformed");
  if (resolverManifestId !== manifestId) {
    fail("verified remote manifest identity differs from exact source manifest");
  }

  const endpoints = manifest?.sync_endpoints;
  if (!Array.isArray(endpoints) || endpoints.length < 1) fail("stable manifest has no sync endpoints");
  const enabled = endpoints.filter((endpoint) => endpoint?.enabled === true);
  if (enabled.length < 1) fail("stable manifest has no enabled sync endpoint");

  const heads = [];
  const qualificationIds = [];
  for (const endpoint of enabled) {
    if (
      endpoint?.transport !== "https" ||
      endpoint?.temporary !== false ||
      typeof endpoint?.base !== "string" ||
      !endpoint.base.startsWith("https://")
    ) {
      fail("enabled stable endpoint violates HTTPS boundary");
    }
    const qid = String(endpoint?.qualification_id || "");
    if (!/^voidpsq1_[0-9a-f]{64}$/.test(qid)) fail("enabled endpoint qualification ID is malformed");
    heads.push(safeHead(endpoint?.qualified_head, "enabled endpoint qualified_head"));
    qualificationIds.push(qid);
  }

  console.log(`manifest_id=${manifestId}`);
  console.log(`qualification_ids=${[...new Set(qualificationIds)].sort().join(",")}`);
  console.log(`target_head=${Math.max(...heads)}`);
  console.log("remote_manifest_identity_bound=true");
  console.log("target_derived_from_verified_exact_source_manifest=true");
}

function checkReady() {
  const rawTarget = option("--target-head");
  if (!/^[1-9][0-9]*$/.test(rawTarget)) fail("target head must be canonical unsigned decimal");
  const targetHead = Number(rawTarget);
  if (!Number.isSafeInteger(targetHead)) fail("target head is not a safe integer");

  const body = readJson(option("--ready"), MAX_READY_BYTES, "readiness response");
  if (body?.ready !== true) fail("readiness response is not ready");
  if (typeof body?.head !== "number" || !Number.isSafeInteger(body.head) || body.head < 1) {
    fail("readiness head must be a positive safe integer JSON number");
  }
  if (body.head < targetHead) {
    fail(`readiness head ${body.head} is below verified target ${targetHead}`);
  }
  if (body?.gap !== 0) fail("readiness gap is not zero");
  if (body?.txroot_live !== 1) fail("readiness txroot_live is not one");

  console.log(`ready_head=${body.head}`);
  console.log(`target_head=${targetHead}`);
  console.log("target_head_reached=true");
  console.log(`${MARKER}_GREEN`);
}

const command = String(process.argv[2] || "");
if (command === "bind") bindTarget();
else if (command === "check-ready") checkReady();
else fail("usage: bind|check-ready");
