#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1,
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1,
  VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1,
  classifyBuyAllocationCustodyServiceBootstrapPlanV1,
} from "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const tool = path.resolve(here, "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs");
const source = readFileSync(tool, "utf8");
const fixture = VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1;
const decision = classifyBuyAllocationCustodyServiceBootstrapPlanV1(fixture);
assert.equal(decision.marker, VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1);
assert.equal(decision.status, "HOLD_SOURCE_ONLY");
assert.equal(decision.observation_trusted_as_authority, false);
assert.equal(decision.source_head_verified_against_remote, false);
assert.equal(decision.executable_unit_emitted, false);
assert.equal(decision.production_gate_ready, false);
assert.equal(decision.independent_custody_proven, false);
assert.match(decision.plan_sha256, /^sha256:[0-9a-f]{64}$/u);

const expectedHolds = [
  "HOLD_PUBLIC_RUNTIME_NO_NEW_PRIVILEGES",
  "HOLD_PUBLIC_RUNTIME_CAPABILITY_BOUNDING_SET",
  "HOLD_ROOT_OWNED_EXECUTABLE_IMPORT_CLOSURE",
  "HOLD_CURRENT_REVIEWED_SOURCE_AND_CONTRACT",
  "HOLD_DEDICATED_SYSTEM_SERVICE_INSTALL",
  "HOLD_EXACT_EXEC_START",
  "HOLD_DEDICATED_SERVICE_HARDENING",
  "HOLD_PRIVATE_AF_UNIX_SOCKET",
  "HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION",
  "HOLD_RUNTIME_SYSTEMD_POLKIT_CONTROL_DENIAL",
  "HOLD_INDEPENDENT_MONOTONIC_CUSTODY_ANCHOR",
  "HOLD_SAME_UID_JOINT_ROLLBACK",
];
assert.deepEqual(decision.reported_missing_requirements, expectedHolds);
assert.equal(decision.candidate.requested_exec_start, null);
assert.equal(decision.candidate.installable_unit_generated, false);
assert.equal(decision.candidate.socket_unit_needed, false);
assert.equal(decision.candidate.socket_activation_implemented, false);
assert.equal(decision.candidate.socket_transport, "AF_UNIX");
assert.equal(decision.candidate.socket_mode_target, "0660");
assert.equal(decision.candidate.socket_parent_mode_target, "0750");
assert.equal(decision.candidate.socket_parent_write_namespace_exception_required, true);
assert.equal(decision.candidate.socket_parent_writable_inside_service_namespace_proven, false);
assert.equal(decision.candidate.socket_parent_namespace_exception_mechanism_selected, false);
assert.equal(decision.candidate.socket_parent_namespace_exception_mechanism, null);
assert.equal(decision.candidate.systemd_manager, "system");
assert.equal(decision.candidate.public_node_systemd_manager, "user");
assert.equal(decision.candidate.service_policy_target.NoNewPrivileges, true);
assert.deepEqual(decision.candidate.service_policy_target.CapabilityBoundingSet, []);
assert.deepEqual(decision.candidate.service_policy_target.AmbientCapabilities, []);
assert.deepEqual(decision.candidate.service_policy_target.RestrictAddressFamilies, ["AF_UNIX"]);
assert.deepEqual(decision.candidate.service_policy_target.ReadWritePaths, [
  "/var/lib/void-allocation-custody-v1",
  "/var/lib/void-allocation-ledger-v1",
]);
assert.deepEqual(decision.candidate.top_level_source_imports, [
  "../dist/economic/buy_void_allocation_reservation_ledger_v1.js",
  "../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  "../dist/economic/buy_void_allocation_reservation_publication_writer_v1.js",
]);
assert.equal(decision.candidate.reviewed_compiled_transitive_closure_proven, false);
assert.equal(decision.candidate.production_gate_ready, false);

for (const key of [
  "host_read_performed", "host_write_performed", "service_file_generated",
  "service_installed", "service_started", "polkit_rule_installed", "socket_created",
  "runtime_updated_or_restarted", "mount_or_permissions_mutated", "executable_closure_proven",
  "independent_custody_proven", "runtime_integration", "transaction_construction",
  "transaction_submission", "payment_acceptance", "market_or_presale_activation",
  "wallet_or_signer_access", "funds_movement", "production_gate_ready",
]) {
  assert.equal(VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1[key], false, key);
}

const candidateAllTrue = { ...fixture };
for (const [key, value] of Object.entries(candidateAllTrue)) {
  if (typeof value === "boolean") candidateAllTrue[key] = true;
}
const forged = classifyBuyAllocationCustodyServiceBootstrapPlanV1(candidateAllTrue);
assert.deepEqual(forged.reported_missing_requirements, []);
assert.equal(forged.status, "HOLD_SOURCE_ONLY");
assert.equal(forged.observation_trusted_as_authority, false);
assert.equal(forged.production_gate_ready, false);
assert.equal(forged.executable_unit_emitted, false);
assert.equal(forged.candidate.requested_exec_start, null);

const absentSocketWrite = {
  ...candidateAllTrue,
  socket_parent_namespace_write_exception_proven: false,
};
assert.deepEqual(
  classifyBuyAllocationCustodyServiceBootstrapPlanV1(absentSocketWrite)
    .reported_missing_requirements,
  ["HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION"],
);

const absentSeparation = {
  ...candidateAllTrue,
  separate_mount_domains_observed: false,
  public_runtime_direct_storage_write_denied_observed: false,
};
assert.deepEqual(
  classifyBuyAllocationCustodyServiceBootstrapPlanV1(absentSeparation)
    .reported_missing_requirements,
  ["HOLD_SEPARATE_STORAGE_DOMAINS_NOT_OBSERVED", "HOLD_PUBLIC_RUNTIME_DIRECT_WRITE_NOT_DENIED"],
);

const reversedKeys = Object.fromEntries(Object.entries(fixture).reverse());
assert.equal(classifyBuyAllocationCustodyServiceBootstrapPlanV1(reversedKeys).plan_sha256, decision.plan_sha256);

for (const bad of [
  {},
  { ...fixture, production_gate_ready: true },
  { ...fixture, source_head_verified_against_remote: true },
  { ...fixture, public_runtime_no_new_privileges_proven: "true" },
  { ...fixture, remote_tracking_head: "not-a-commit" },
  Object.create({ ...fixture }),
  new Proxy({ ...fixture }, {}),
]) {
  assert.throws(() => classifyBuyAllocationCustodyServiceBootstrapPlanV1(bad));
}
const accessed = { ...fixture };
Object.defineProperty(accessed, "runtime_service_control_denial_proven", {
  get() { throw new Error("getter_executed"); }, enumerable: true,
});
assert.throws(() => classifyBuyAllocationCustodyServiceBootstrapPlanV1(accessed),
  /custody_bootstrap_plan_observation_accessor_rejected/u);

const run = (args) => spawnSync(process.execPath, [tool, ...args], {
  encoding: "utf8", timeout: 5000,
});
const plan = run(["--plan"]);
assert.equal(plan.status, 0, plan.stderr);
assert.deepEqual(JSON.parse(plan.stdout), decision);
const defaultPlan = run([]);
assert.equal(defaultPlan.status, 0, defaultPlan.stderr);
assert.deepEqual(JSON.parse(defaultPlan.stdout), decision);
const help = run(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /no --apply/u);
for (const args of [["--apply"], ["--plan", "--apply"], ["--install"], ["--plan", "extra"]]) {
  const refused = run(args);
  assert.equal(refused.status, 2, JSON.stringify({args, stderr: refused.stderr}));
  assert.equal(refused.stdout, "");
  assert.match(refused.stderr, /HOLD/u);
}
const syntax = spawnSync(process.execPath, ["--check", tool], {encoding: "utf8", timeout: 5000});
assert.equal(syntax.status, 0, syntax.stderr);
for (const forbidden of [
  /from "node:(?:fs|child_process|net|http|https)"/u,
  /\b(?:writeFileSync|mkdirSync|chmodSync|chownSync|execFileSync|spawnSync|systemctl|sudo)\b/u,
  /--apply[\s\S]*service\.start\(/u,
]) {
  assert.doesNotMatch(source, forbidden);
}
const canonical = v => {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
};
const { plan_sha256, ...body } = decision;
const exactId = "sha256:" + createHash("sha256").update(canonical(body)).digest("hex");
assert.equal(plan_sha256, exactId);

console.log("VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1_SOURCE_GREEN");
console.log("source_only=true");
console.log("operator_snapshot_untrusted=true");
console.log("separate_host_service_needed=true");
console.log("mutable_repo_execstart_not_emitted=true");
console.log("systemd_socket_unit_not_claimed=true");
console.log("protected_executable_import_closure_required=true");
console.log("forged_all_green_observations_still_hold=true");
console.log("apply_or_install_modes_rejected=true");
console.log("service_or_funds_mutation=false");
console.log("production_gate_ready=false");
