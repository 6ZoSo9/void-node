#!/usr/bin/env node
// Read-only, deterministic SOURCE projection. No real UID switch, no anchor read.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const GATE = "src/economic/buy_void_coupled_launch_gate_v1.mjs";
const SERVICE = "tools/void-buy-allocation-custody-service-v1.mjs";
const GATE_BLOB = "e0402744ae51bb7bda2dc1e2038aae217d868ed9";
const SERVICE_BLOB = "a53ed0c6c506b3c30a5d219a72295740b7a6761f";
const MARKER = "VOID_BUY_VOID_CROSS_UID_LAUNCH_ANCHOR_PROJECTION_V1";
const rel = ".local/state/void-node-authority-v1";
const dataDir = "/synthetic/data";

function blobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes).digest("hex");
}
function sourceBytes(file, expected) {
  const absolute = path.resolve(file);
  const st = fs.lstatSync(absolute);
  assert.ok(st.isFile() && !st.isSymbolicLink() &&
    st.size > 0 && st.size < 1024 * 1024, "source file shape");
  const bytes = fs.readFileSync(absolute);
  assert.equal(bytes.length, st.size, "source size changed");
  assert.equal(blobSha1(bytes), expected, "fixed reviewed source blob drift");
  return bytes.toString("utf8");
}
function extract(source, first, last) {
  const start = source.indexOf(first);
  assert.ok(start >= 0, "reviewed function start absent");
  assert.equal(source.indexOf(first, start + 1), -1, "duplicate function start");
  const end = source.indexOf(last, start + first.length);
  assert.ok(end > start && end - start < 4500, "reviewed function end absent");
  const body = source.slice(start, end).trimEnd();
  assert.ok(body.endsWith("}"), "function closing brace");
  return body.replace(/^export /u, "");
}
const gate = sourceBytes(GATE, GATE_BLOB);
const svc = sourceBytes(SERVICE, SERVICE_BLOB);
assert.match(gate, /import \{ userInfo \} from "node:os"/u);
assert.match(gate, /function readBuyLaunchGenerationJournalV1\(/u);
assert.match(gate, /export async function withBuyLaunchRequestAuthorityMutationV1\(/u);
assert.match(gate, /return withBuyLaunchGenerationAuthorityLockV1\(/u);
assert.match(gate, /const currentGate = readBuyLaunchGateV1\(/u);
const anchorFn = extract(gate,
  "export function buyLaunchGenerationExternalAnchorPathV1() {",
  "\n\nexport function buyLaunchGenerationAuthorityLockPathV1()");
const lockFn = extract(gate,
  "export function buyLaunchGenerationAuthorityLockPathV1() {",
  "\n\nfunction buyLaunchGenerationPathsV1(");
const pathsFn = extract(gate,
  "function buyLaunchGenerationPathsV1(env = process.env) {",
  "\n\nasync function withBuyLaunchGenerationAuthorityLockV1(");
const reviewed = [anchorFn, lockFn, pathsFn].join("\n\n");
assert.ok(reviewed.includes('userInfo().homedir'), "anchor must bind OS account home");
assert.ok(!reviewed.includes("process.env.HOME"), "HOME override must not silently select authority");
assert.ok(svc.includes("reserve_method_enabled: false"), "reserve not safely held");
assert.ok(svc.includes("verified_payment_provenance_independently_bound: false"),
  "custody payment provenance not held");
assert.ok(svc.includes("allocation_custody_service_verified_payment_provenance_not_bound"),
  "custody reserve denial missing");
assert.ok(svc.includes("allocation_custody_service_verified_payment_recovery_not_bound"),
  "custody recovery denial missing");

function simulate(projectedOsHome, ambientHome) {
  // The actual fixed-source functions execute ONLY against injected synthetic
  // os.userInfo and path objects. They cannot access real files or user data.
  const context = vm.createContext({
    userInfo: () => ({homedir: projectedOsHome}),
    path,
    process: {env:{HOME:ambientHome,DATA_DIR:dataDir}}
  });
  const projected = vm.runInContext(
    reviewed + "\n({anchor:buyLaunchGenerationExternalAnchorPathV1()," +
      "lock:buyLaunchGenerationAuthorityLockPathV1()," +
      "paths:buyLaunchGenerationPathsV1({DATA_DIR:" +
      JSON.stringify(dataDir) + "})})",
    context,{timeout:1000}
  );
  return JSON.parse(JSON.stringify(projected));
}
const operator = simulate("/synthetic/operator-home","/synthetic/shared-home");
const custody = simulate("/synthetic/custody-home","/synthetic/shared-home");
const operatorOtherHomeEnv = simulate("/synthetic/operator-home",
  "/synthetic/custody-home");

assert.equal(operator.anchor,
  path.join("/synthetic/operator-home",rel,
    "buy-void-coupled-live-generation-anchor-v1.jsonl"));
assert.equal(custody.anchor,
  path.join("/synthetic/custody-home",rel,
    "buy-void-coupled-live-generation-anchor-v1.jsonl"));
assert.notEqual(operator.anchor,custody.anchor);
assert.notEqual(operator.lock,custody.lock);
assert.equal(operator.paths.journalPath,custody.paths.journalPath);
assert.notEqual(operator.paths.anchorPath,custody.paths.anchorPath);
assert.notEqual(operator.paths.intentPath,custody.paths.intentPath);
assert.deepEqual(operator,operatorOtherHomeEnv,
  "changing HOME must not select a different OS-account authority anchor");

// A payload-shaped "verified" boolean/anchor path is not an authenticated
// bridge. Until the service independently validates original journal,
// external anchor, launch lease and ownership under a reviewed IPC policy,
// every cross-account write/recovery authority remains false.
const decision = Object.freeze({
  schema: "void_buy_void_cross_uid_launch_anchor_projection_v1",
  marker: MARKER,
  version: 1,
  source_only: true,
  simulated_distinct_os_homes: true,
  same_data_dir_does_not_bind_external_anchors: true,
  process_env_HOME_override_supported: false,
  public_operator_authentication_performed: false,
  custody_account_identity_attested: false,
  real_external_anchor_read: false,
  real_authority_signature_verified: false,
  real_generation_lease_verified: false,
  cross_uid_launch_generation_bound: false,
  canonical_durable_payment_provenance_bound: false,
  custody_reserve_or_recover_enabled: false,
  production_allocation_mutation_ready: false,
  payment_or_allocation_append_performed: false,
  service_start_or_permission_change: false,
  wallet_or_signer_access: false,
  chain_or_wc_mutation: false,
  presale_or_market_activation: false,
  funds_moved: false,
});
assert.equal(decision.cross_uid_launch_generation_bound, false);
assert.equal(decision.custody_reserve_or_recover_enabled, false);
assert.equal(decision.production_allocation_mutation_ready, false);
console.log(MARKER + "_GREEN");
console.log("original_launch_source_git_blob_pinned=true");
console.log("custody_reserve_and_recovery_source_HOLD_preserved=true");
console.log("synthetic_operator_vs_custody_anchor_paths_differ=true");
console.log("same_DATA_DIR_does_not_share_external_anchor=true");
console.log("HOME_environment_override_does_not_rebind_OS_user_anchor=true");
console.log("cross_uid_launch_generation_bound=false");
console.log("canonical_durable_payment_provenance_bound=false");
console.log("custody_reserve_or_recover_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("real_external_anchor_read=false");
console.log("real_customer_data_access=false");
console.log("service_start_or_permission_change=false");
console.log("presale_or_market_activation=false");
console.log("funds_moved=false");
