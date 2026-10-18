#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  PARENT_PLAN_ID,
  testOnlyAssertLivePolicyV1,
  testOnlyAssertSecondControlV1,
  testOnlyAssertInstallationEvidenceV1,
  testOnlyAssertObservedFileMatchesV1,
  testOnlyAssertDurabilityContractV1,
} from "../ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const COLLECTOR_REL =
  "ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v1.ts";
const COLLECTOR_BLOB = "216928e1810cb25ce1c331e2edfece629fff76cf";

const PARENT_PLAN_REL =
  "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json";
const PARENT_PLAN_BLOB = "ad68175e629fd1cf90180db3a904f84834314fdd";
const PARENT_PROOF_REL =
  "scripts/prove_buy_void_presale_host_evidence_collection_plan_v1.py";
const PARENT_PROOF_BLOB = "295adeea32bc1723b290f7e07e4186e2e6e8e9be";
const PARENT_DOC_REL =
  "docs/operators/buy-void-presale-host-evidence-collection-plan-v1.md";
const PARENT_DOC_BLOB = "4f5d8a5db1cf1b82991962f5bf90a231c96c6f76";
const PARENT_WORKFLOW_REL =
  ".github/workflows/buy-void-presale-host-evidence-collection-plan-v1.yml";
const PARENT_WORKFLOW_BLOB = "9e7070f89235a3aa401a2c23a5dd3dbafc6a3703";

const INSTALLATION_EVIDENCE_REL =
  "tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
const INSTALLATION_EVIDENCE_BLOB =
  "c0c86bc1687fc9a3cb9313b5a68029c35c6a9a63";

const DURABILITY_CONTRACT = Object.freeze({
  "tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs":
    "eef7c4e1db7401ba82fda96aa1e8da40c1981b7d",
  "scripts/prove_buy_void_allocation_custody_live_durability_rollback_contract_v1.mjs":
    "7ced5fb56a22cd546aab30c466021b01b1c6a84d",
  "docs/architecture/buy-void-allocation-custody-live-durability-rollback-contract-v1.md":
    "16a8a755888abd7b9ad4f0377468d6a403f80a70",
  ".github/workflows/buy-void-allocation-custody-live-durability-rollback-contract-v1.yml":
    "b3426f40577ff1ca1bbab8ca46232ae1ca0a8148",
});

const PRIMITIVES = Object.freeze({
  "src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts":
    "2d5fc24498b569f20701445d6214a8ca31e4f701",
  "tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs":
    "cf40d9d4a19d138d74aee849a6c02f96ee362dbb",
  "src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts":
    "97180cc03e3f1b2f9935191ac6aafe4b15307708",
});

function gitBlob(raw: Buffer): string {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(raw.length) + "\0", "utf8"))
    .update(raw)
    .digest("hex");
}

function pin(relative: string, expected: string): Buffer {
  const file = path.join(ROOT, ...relative.split("/"));
  const before = fs.lstatSync(file);
  assert.ok(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    relative,
  );
  const raw = fs.readFileSync(file);
  const after = fs.lstatSync(file);
  assert.equal(after.dev, before.dev, relative + ":dev");
  assert.equal(after.ino, before.ino, relative + ":ino");
  assert.equal(after.size, before.size, relative + ":size");
  assert.equal(after.mtimeMs, before.mtimeMs, relative + ":mtime");
  assert.equal(after.ctimeMs, before.ctimeMs, relative + ":ctime");
  assert.equal(raw.length, before.size, relative + ":short");
  assert.equal(gitBlob(raw), expected, relative + ":blob");
  return raw;
}

const source = pin(COLLECTOR_REL, COLLECTOR_BLOB).toString("utf8");
const parentPlan = JSON.parse(
  pin(PARENT_PLAN_REL, PARENT_PLAN_BLOB).toString("utf8"),
);
pin(PARENT_PROOF_REL, PARENT_PROOF_BLOB);
pin(PARENT_DOC_REL, PARENT_DOC_BLOB);
pin(PARENT_WORKFLOW_REL, PARENT_WORKFLOW_BLOB);
const installationObserverSource = pin(
  INSTALLATION_EVIDENCE_REL,
  INSTALLATION_EVIDENCE_BLOB,
).toString("utf8");
for (const required of [
  'from "node:child_process"',
  "spawnSync(",
  'runText("/usr/bin/stat"',
  '"/usr/bin/lsblk"',
]) {
  assert.ok(installationObserverSource.includes(required), required);
}
for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "unlinkSync",
  "rmSync",
  "mkdirSync",
  "chmodSync",
  "chownSync",
  "O_WRONLY",
  "O_RDWR",
  "O_CREAT",
  "systemctl",
  "/usr/bin/sudo",
  "node:net",
  "node:http",
  "node:https",
  "fetch(",
]) {
  assert.equal(
    installationObserverSource.includes(forbidden),
    false,
    "installation_observer_forbidden:" + forbidden,
  );
}
for (const [relative, blob] of Object.entries(PRIMITIVES)) {
  pin(relative, blob);
}
for (const [relative, blob] of Object.entries(DURABILITY_CONTRACT)) {
  pin(relative, blob);
}

assert.equal(PARENT_PLAN_ID, parentPlan.plan_id);
assert.equal(
  PARENT_PLAN_ID,
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab",
);
assert.equal(
  MARKER,
  "VOID_BUY_VOID_PRESALE_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1",
);
assert.equal(
  parentPlan.evidence_lanes?.allocation_custody_storage_and_rollback?.required,
  true,
);
assert.equal(
  parentPlan.evidence_lanes?.allocation_custody_storage_and_rollback
    ?.evidence_collected,
  false,
);

for (const required of [
  "inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1",
  "inspectBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1",
  "assertInstallationEvidence(installationBefore)",
  "assertInstallationEvidence(installationAfter)",
  "assertObservedFileMatches(",
  "installationBefore.qualification_id !== installationAfter.qualification_id",
  "classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1",
  "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  "live-read-replay-v1.jsonl",
  "live-read-replay-high-water-v1.json",
  "stableReadAbsolute(",
  "fs.constants.O_RDONLY | O_NOFOLLOW",
  "sameStat(opened, after)",
  "sameStat(after, visible)",
  "assertLivePolicy(livePolicy)",
  "assertSecondControl(secondControl)",
  "classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1",
  "assertDurabilityContract(durabilityContract)",
  "reviewed_source_generation_binding_required: true",
  "controlled_live_challenge_required: true",
  "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
  "livePolicy.normalized?.installation_high_water_sha256",
  '!("normalized" in secondControl) || !secondControl.normalized',
  "const secondControlNormalized = secondControl.normalized;",
  "secondControlNormalized.replay_high_water_sha256",
  "secondControlNormalized.source_hostname",
  "ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED",
  "live_policy_enforcement_proven: false",
  "live_rollback_test_performed: false",
  "live_durable_storage_proven: false",
  "rollback_resistance_proven: false",
  "protected_high_water_custody_proven: false",
  "independent_custody_proven: false",
  "filesystem_write_performed: false",
  "process_execution_performed: true",
  "process_execution_read_only_contract: true",
  "transitive_storage_identity_helper_execution_required: true",
  "installation_storage_generation_bound: true",
  "network_contact_performed: false",
  "public_presale_activation: false",
  "funds_movement: false",
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "replaceSync",
  "unlinkSync",
  "rmSync",
  "mkdirSync",
  "chmodSync",
  "chownSync",
  "O_WRONLY",
  "O_RDWR",
  "O_CREAT",
  "O_EXCL",
  "node:child_process",
  "spawn(",
  "spawnSync(",
  "exec(",
  "execSync(",
  "execFile(",
  "execFileSync(",
  "node:http",
  "node:https",
  "node:net",
  "node:dgram",
  "fetch(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

const goodInstallation: Record<string, unknown> = {
  ok: true,
  status: "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",
  qualification_id: "voidwlrie1_" + "1".repeat(64),
  normalized: {
    high_water_sha256: "sha256:" + "2".repeat(64),
    journal_file: {},
    high_water_file: {},
  },
  operation_performed: false,
  storage_domain_classification_green: true,
  live_storage_observation_proven: true,
  distinct_local_storage_domains_proven: true,
  distinct_parent_block_devices_proven: true,
  canonical_journal_high_water_binding_proven: true,
  no_pending_publication_intent_observed: true,
  double_census_stability_proven: true,
  live_durable_storage_proven: false,
  rollback_resistance_proven: false,
  protected_high_water_custody_proven: false,
  independent_custody_proven: false,
  runtime_integration: false,
  production_gate_ready: false,
  funds_movement: false,
};
testOnlyAssertInstallationEvidenceV1(goodInstallation);

for (const [key, value] of [
  ["storage_domain_classification_green", false],
  ["live_storage_observation_proven", false],
  ["distinct_local_storage_domains_proven", false],
  ["distinct_parent_block_devices_proven", false],
  ["canonical_journal_high_water_binding_proven", false],
  ["no_pending_publication_intent_observed", false],
  ["double_census_stability_proven", false],
  ["live_durable_storage_proven", true],
  ["rollback_resistance_proven", true],
  ["protected_high_water_custody_proven", true],
  ["independent_custody_proven", true],
  ["runtime_integration", true],
  ["production_gate_ready", true],
  ["funds_movement", true],
] as const) {
  assert.throws(
    () =>
      testOnlyAssertInstallationEvidenceV1({
        ...goodInstallation,
        [key]: value,
      }),
    /allocation_custody_installation_evidence_hold/u,
    "installation_evidence_boundary_not_rejected:" + key,
  );
}

const stableObserved = {
  path: "/tmp/current.json",
  bytes: Buffer.from("{}\n", "utf8"),
  sha256:
    "sha256:" +
    crypto.createHash("sha256").update(Buffer.from("{}\n", "utf8")).digest("hex"),
  dev: 2050,
  ino: 12345,
  uid: 0,
  gid: 0,
  mode: 0o600,
  nlink: 1,
  size: 3,
  mtime_ms: 1,
  ctime_ms: 1,
};
const normalizedObserved = {
  path: stableObserved.path,
  dev: String(stableObserved.dev),
  ino: String(stableObserved.ino),
  sha256: stableObserved.sha256,
  bytes: stableObserved.size,
  uid: stableObserved.uid,
  gid: stableObserved.gid,
  mode: stableObserved.mode,
  nlink: stableObserved.nlink,
  regular_file: true,
  symlink: false,
};
testOnlyAssertObservedFileMatchesV1(
  stableObserved,
  normalizedObserved,
  stableObserved.path,
);
for (const [key, value] of [
  ["dev", "9999"],
  ["ino", "9999"],
  ["sha256", "sha256:" + "0".repeat(64)],
  ["bytes", 4],
  ["mode", 0o644],
  ["nlink", 2],
] as const) {
  assert.throws(
    () =>
      testOnlyAssertObservedFileMatchesV1(
        stableObserved,
        { ...normalizedObserved, [key]: value },
        stableObserved.path,
      ),
    /allocation_custody_test_file_generation_mismatch/u,
    "file_generation_mismatch_not_rejected:" + key,
  );
}

const goodPolicy: Record<string, unknown> = {
  ok: true,
  status: "LIVE_ROLLBACK_POLICY_OBSERVED",
  operation_performed: false,
  root_owned_policy_file_observed: true,
  rollback_independence_policy_qualified: true,
  installation_storage_rebound: true,
  bounded_policy_freshness_checked: true,
  policy_file_installation_proven: true,
  live_policy_observation_proven: true,
  verification_clock_authority_proven: false,
  policy_generation_monotonicity_proven: false,
  live_policy_enforcement_proven: false,
  live_rollback_test_performed: false,
  live_durable_storage_proven: false,
  rollback_resistance_proven: false,
  protected_high_water_custody_proven: false,
  independent_custody_proven: false,
  production_gate_ready: false,
  funds_movement: false,
};
testOnlyAssertLivePolicyV1(goodPolicy);

for (const [key, value] of [
  ["root_owned_policy_file_observed", false],
  ["rollback_independence_policy_qualified", false],
  ["policy_file_installation_proven", false],
  ["live_policy_observation_proven", false],
  ["live_policy_enforcement_proven", true],
  ["live_rollback_test_performed", true],
  ["live_durable_storage_proven", true],
  ["rollback_resistance_proven", true],
  ["protected_high_water_custody_proven", true],
  ["independent_custody_proven", true],
  ["production_gate_ready", true],
  ["funds_movement", true],
] as const) {
  assert.throws(
    () => testOnlyAssertLivePolicyV1({ ...goodPolicy, [key]: value }),
    /allocation_custody_live_policy_hold/u,
    "policy_boundary_not_rejected:" + key,
  );
}

const goodSecond: Record<string, unknown> = {
  ok: true,
  status: "rollback_second_control_composed",
  operation_performed: false,
  reviewed_live_rollback_policy_receipt_bound: true,
  reviewed_external_custody_qualification_bound: true,
  same_replay_high_water_bound: true,
  same_precision_storage_identity_bound: true,
  rollback_independence_policy_qualified: true,
  live_policy_observation_proven: true,
  policy_file_installation_proven: true,
  external_transport_authenticated: true,
  external_witness_storage_proven: true,
  live_remote_read_performed: true,
  live_remote_append_performed: true,
  external_second_control_domain_qualified: true,
  external_second_control_policy_binding_proven: true,
  post_cycle_live_policy_observation_bound: true,
  live_policy_enforcement_proven: false,
  live_rollback_test_performed: false,
  live_durable_storage_proven: false,
  rollback_resistance_proven: false,
  protected_high_water_custody_proven: false,
  independent_custody_proven: false,
  runtime_integration: false,
  production_gate_ready: false,
  funds_movement: false,
};
testOnlyAssertSecondControlV1(goodSecond);

for (const [key, value] of [
  ["reviewed_live_rollback_policy_receipt_bound", false],
  ["reviewed_external_custody_qualification_bound", false],
  ["same_replay_high_water_bound", false],
  ["same_precision_storage_identity_bound", false],
  ["external_transport_authenticated", false],
  ["external_witness_storage_proven", false],
  ["live_remote_read_performed", false],
  ["live_remote_append_performed", false],
  ["external_second_control_domain_qualified", false],
  ["external_second_control_policy_binding_proven", false],
  ["post_cycle_live_policy_observation_bound", false],
  ["live_policy_enforcement_proven", true],
  ["live_rollback_test_performed", true],
  ["live_durable_storage_proven", true],
  ["rollback_resistance_proven", true],
  ["protected_high_water_custody_proven", true],
  ["independent_custody_proven", true],
  ["runtime_integration", true],
  ["production_gate_ready", true],
  ["funds_movement", true],
] as const) {
  assert.throws(
    () => testOnlyAssertSecondControlV1({ ...goodSecond, [key]: value }),
    /allocation_custody_second_control_hold/u,
    "second_control_boundary_not_rejected:" + key,
  );
}

const goodContract: Record<string, unknown> = {
  status: "source_prerequisites_bound_controlled_challenge_required",
  reason: "reviewed_prerequisites_bound",
  source_contract_ready: true,
  reviewed_prerequisites_bound: true,
  missing_prerequisites: [],
  read_only_collection_sufficient: false,
  controlled_live_challenge_required: true,
  live_durable_storage_proven: false,
  rollback_resistance_proven: false,
  protected_high_water_custody_proven: false,
  independent_custody_proven: false,
  production_gate_ready: false,
  host_execution_authorized: false,
  storage_mutation_authorized: false,
  rollback_test_authorized: false,
  payment_acceptance_authorized: false,
  public_presale_activation_authorized: false,
  wc_void_market_activation_authorized: false,
  transaction_submission_authorized: false,
  treasury_or_liquidity_action_authorized: false,
  funds_movement: false,
  production_host_evidence_authority: false,
  next_action:
    "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
};
testOnlyAssertDurabilityContractV1(goodContract);

for (const [key, value] of [
  ["source_contract_ready", false],
  ["reviewed_prerequisites_bound", false],
  ["read_only_collection_sufficient", true],
  ["controlled_live_challenge_required", false],
  ["live_durable_storage_proven", true],
  ["rollback_resistance_proven", true],
  ["protected_high_water_custody_proven", true],
  ["independent_custody_proven", true],
  ["production_gate_ready", true],
  ["host_execution_authorized", true],
  ["storage_mutation_authorized", true],
  ["rollback_test_authorized", true],
  ["public_presale_activation_authorized", true],
  ["funds_movement", true],
] as const) {
  assert.throws(
    () => testOnlyAssertDurabilityContractV1({ ...goodContract, [key]: value }),
    /allocation_custody_durability_contract_hold/u,
    "durability_contract_boundary_not_rejected:" + key,
  );
}

console.log(MARKER + "_PROOF_GREEN");
console.log("parent_host_evidence_plan_bound=true");
console.log("three_reviewed_custody_primitives_bound=true");
console.log("durability_rollback_contract_bound=true");
console.log("durability_rollback_contract_required=true");
console.log("reviewed_source_generation_binding_required=true");
console.log("live_policy_observer_required=true");
console.log("canonical_installation_observer_bound=true");
console.log("installation_observer_read_only_helper_contract_proven=true");
console.log("installation_storage_generation_bound=true");
console.log("reviewed_second_control_composition_required=true");
console.log("fixed_precision_replay_roots_bound=true");
console.log("descriptor_nofollow_reads_required=true");
console.log("live_policy_boundary_downgrades_rejected=true");
console.log("installation_evidence_boundary_downgrades_rejected=true");
console.log("storage_file_generation_mismatches_rejected=true");
console.log("second_control_boundary_downgrades_rejected=true");
console.log("durability_contract_boundary_downgrades_rejected=true");
console.log("controlled_live_challenge_required=true");
console.log("filesystem_write_performed=false");
console.log("collector_direct_process_execution_absent=true");
console.log("transitive_storage_identity_helper_execution_required=true");
console.log("process_execution_read_only_contract=true");
console.log("network_contact_performed=false");
console.log("live_policy_enforcement_proven=false");
console.log("live_rollback_test_performed=false");
console.log("live_durable_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
console.log("production_host_evidence_authority=false");
console.log(
  "next_action=SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
);
