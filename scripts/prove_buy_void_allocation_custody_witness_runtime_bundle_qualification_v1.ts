#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
  classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.js";

const sha256 = (bytes: Buffer): string => "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
for (const expected of VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1) {
  assert.equal(sha256(fs.readFileSync(expected.source_path)), expected.sha256, "reviewed runtime bundle file bytes changed: " + expected.source_path);
}

const staticImport = /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']\s*;?/gmu;
const exportFrom = /(?:^|\n)\s*export\s+[\s\S]*?\s+from\s+["']([^"']+)["']\s*;?/gmu;
const dynamicImport = /import\s*\(/u;
const requireCall = /(?:^|[^A-Za-z0-9_$])require\s*\(/u;
const expectedSourcePaths = new Set(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.map((file) => file.source_path));
const queue = ["tools/void-buy-allocation-custody-witness-forced-command-v2.mjs"];
const seen = new Set<string>();
const edges: Array<{ from: string; specifier: string; to: string }> = [];
function matches(regex: RegExp, text: string): string[] {
  regex.lastIndex = 0;
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) out.push(match[1]);
  return out;
}
while (queue.length > 0) {
  const current = queue.shift()!;
  if (seen.has(current)) continue;
  seen.add(current);
  const text = fs.readFileSync(current, "utf8");
  assert.equal(dynamicImport.test(text), false, "dynamic import is not permitted: " + current);
  assert.equal(requireCall.test(text), false, "require() is not permitted: " + current);
  for (const specifier of [...matches(staticImport, text), ...matches(exportFrom, text)]) {
    if (!specifier.startsWith(".")) continue;
    const resolved = path.normalize(path.join(path.dirname(current), specifier)).replaceAll("\\", "/");
    assert.equal(fs.existsSync(resolved), true, "relative import missing: " + current + " -> " + specifier);
    edges.push({ from: current, specifier, to: resolved });
    queue.push(resolved);
  }
}
assert.deepEqual([...seen].sort(), [...expectedSourcePaths].sort(), "reviewed runtime dependency closure changed");
assert.equal(edges.length, 11);

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
  }
  throw new Error("noncanonical manifest value");
}
const fileRecords = VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.map((file) => {
  const bytes = fs.readFileSync(file.source_path);
  return { path: file.source_path, bytes: bytes.length, sha256: file.sha256.slice("sha256:".length) };
}).sort((a, b) => a.path.localeCompare(b.path));
const manifestBody = {
  schema: "void_buy_void_witness_forced_command_runtime_bundle_manifest_v1",
  marker: "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_RUNTIME_BUNDLE_MANIFEST_V1",
  version: 1,
  source_commit: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
  entry: "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
  files: fileRecords,
  edges: [...edges].sort((a, b) => (a.from + "\0" + a.specifier + "\0" + a.to).localeCompare(b.from + "\0" + b.specifier + "\0" + b.to)),
  dynamic_import_files: [],
  require_call_files: [],
};
const manifestId = "voidwfb1_" + crypto.createHash("sha256").update(canonical(manifestBody), "utf8").digest("hex");
assert.equal(manifestId, VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1);
assert.equal(sha256(Buffer.from(canonical({ ...manifestBody, manifest_id: manifestId }) + "\n", "utf8")), VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1);

const baseline = {
  schema: "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1",
  marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
  version: 1,
  manifest_id: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
  manifest_sha256: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
  source_commit: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
  files: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.map((file) => ({ path: file.installed_path, sha256: file.sha256, uid: 0, gid: 0, mode: 0o444, nlink: 1, regular_file: true, symlink: false, root_owned_parent_chain: true })),
};
const ok = classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1(baseline);
assert.equal(ok.ok, true);
if (ok.ok !== true) throw new Error(ok.reason);
assert.match(ok.qualification_id, /^voidwfbq1_[0-9a-f]{64}$/u);
assert.equal(ok.operation_performed, false);
assert.equal(ok.live_nimo_installed, false);
assert.equal(ok.external_transport_authenticated, false);
assert.equal(ok.runtime_integration, false);
assert.equal(ok.production_gate_ready, false);
assert.equal(ok.funds_movement, false);
const same = classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1(JSON.parse(JSON.stringify(baseline)));
assert.equal(same.ok, true);
if (same.ok !== true) throw new Error(same.reason);
assert.equal(same.qualification_id, ok.qualification_id);
function expectHeld(value: unknown, reason: RegExp): void {
  const result = classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1(value);
  assert.equal(result.ok, false);
  if (result.ok !== false) throw new Error("expected HOLD");
  assert.match(result.reason, reason);
}
for (const mutate of [
  (v: any) => { v.files[0].sha256 = "sha256:" + "0".repeat(64); },
  (v: any) => { v.files[0].path = "/tmp/handler.mjs"; },
  (v: any) => { v.files[0].uid = 1000; },
  (v: any) => { v.files[0].mode = 0o555; },
  (v: any) => { v.files[0].nlink = 2; },
  (v: any) => { v.files[0].symlink = true; },
]) {
  const value = JSON.parse(JSON.stringify(baseline));
  mutate(value);
  expectHeld(value, /file_invalid/u);
}
{
  const value = JSON.parse(JSON.stringify(baseline));
  value.files.reverse();
  expectHeld(value, /file_invalid/u);
}
{
  const value = JSON.parse(JSON.stringify(baseline));
  value.files.pop();
  expectHeld(value, /files_invalid/u);
}
{
  const value = JSON.parse(JSON.stringify(baseline));
  value.manifest_id = "voidwfb1_" + "0".repeat(64);
  expectHeld(value, /identity_invalid/u);
}
const trueKeys = new Set([
  "source_contract", "pure_runtime_bundle_evidence_classification", "exact_static_runtime_closure_binding", "exact_runtime_file_path_binding", "exact_runtime_file_sha256_binding", "root_owned_runtime_files_required", "mode_0444_runtime_files_required", "single_link_runtime_files_required", "symlink_runtime_files_rejected", "root_owned_parent_chain_required", "reviewed_dynamic_import_count_zero", "reviewed_require_call_count_zero", "v2_installation_qualification_still_required",
]);
for (const [key, value] of Object.entries(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V1)) assert.equal(value, trueKeys.has(key), key);
console.log(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1 + "_GREEN");
console.log("runtime_file_count=8");
console.log("runtime_edge_count=11");
console.log("dynamic_import_count=0");
console.log("require_call_count=0");
console.log("runtime_bundle_manifest_id=" + VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1);
console.log("v2_installation_qualification_still_required=true");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
