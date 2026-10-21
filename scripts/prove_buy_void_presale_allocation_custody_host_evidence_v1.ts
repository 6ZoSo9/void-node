#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  PARENT_PLAN_ID,
  testOnlyAssertLivePolicyV1,
  testOnlyAssertSecondControlV1,
  testOnlyAssertCrossReceiptBindingV1,
  testOnlyAssertInstallationEvidenceV1,
  testOnlyAssertStorageGenerationTripleV1,
  testOnlyAssertObservedFileMatchesV1,
  testOnlyAssertDurabilityContractV1,
  testOnlySafeHoldReasonV1,
  testOnlyStableReadAbsoluteV1,
} from "../ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const COLLECTOR_REL =
  "ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v1.ts";
const COLLECTOR_BLOB = "30b8674e27816d74997844fa55269fc72e0bea6b";

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
  "classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1",
  "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  "live-read-replay-v1.jsonl",
  "live-read-replay-high-water-v1.json",
  "stableReadAbsolute(",
  "fs.constants.O_RDONLY | O_NOFOLLOW | fs.constants.O_NONBLOCK",
  "sameStat(opened, after)",
  "sameStat(after, visible)",
  "const livePolicyNormalized = assertLivePolicy(livePolicy)",
  "assertSecondControl(secondControl)",
  "classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1",
  "assertDurabilityContract(durabilityContract)",
  "reviewed_source_generation_binding_required: true",
  "controlled_live_challenge_required: true",
  "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
  "livePolicy.installation_high_water_sha256",
  "const secondControlNormalized = assertSecondControl(secondControl)",
  "assertCrossReceiptBinding(",
  "secondControl.replay_high_water_sha256",
  "secondControl.source_hostname",
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
  "assertStorageGenerationTripleV1(",
  "livePolicy.installation_qualification_id",
  "livePolicy.installation_high_water_sha256",
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

const goodPolicyNormalized: Record<string, unknown> = {
  schema: "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_receipt_v1",
  marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1",
  version: 1,
  parent_marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1",
  policy_path: "/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json",
  policy_file_sha256: "sha256:" + "a".repeat(64),
  policy_file_uid: 0, policy_file_gid: 0, policy_file_mode: 0o444, policy_file_nlink: 1,
  installation_qualification_id: "voidwlrie1_" + "1".repeat(64),
  installation_high_water_sha256: "sha256:" + "2".repeat(64),
  parent_policy_qualification_id: "voidwlrrq1_" + "3".repeat(64),
  policy_fingerprint_sha256: "sha256:" + "4".repeat(64),
  policy_generation: "1", host_id: "zoso-Precision-Tower-7810",
  verification_now_ms: 1_791_393_507_504,
};
const goodPolicy: Record<string, unknown> = {
  ok: true, status: "LIVE_ROLLBACK_POLICY_OBSERVED", operation_performed: false,
  root_owned_policy_file_observed: true, rollback_independence_policy_qualified: true,
  installation_storage_rebound: true, bounded_policy_freshness_checked: true,
  policy_file_installation_proven: true, live_policy_observation_proven: true,
  verification_clock_authority_proven: false, policy_generation_monotonicity_proven: false,
  live_policy_enforcement_proven: false, live_rollback_test_performed: false,
  live_durable_storage_proven: false, rollback_resistance_proven: false,
  protected_high_water_custody_proven: false, independent_custody_proven: false,
  production_gate_ready: false, funds_movement: false, normalized: goodPolicyNormalized,
};
testOnlyAssertLivePolicyV1(goodPolicy);

// Three-way binding proves the inner live-policy storage generation belongs
// to the same outer installation/high-water generation. Outer A->A alone
// would accept an ABA transition A->B->A during the policy observation.
testOnlyAssertStorageGenerationTripleV1(
  goodInstallation, goodPolicy, goodInstallation,
);
const installationOther = {
  ...goodInstallation,
  qualification_id: "voidwlrie1_" + "9".repeat(64),
};
const storageTriadBadCases: Array<[string, unknown, unknown, unknown]> = [
  ["policy_installation_aba", goodInstallation, {
    ...goodPolicy,
    normalized: {
      ...goodPolicyNormalized,
      installation_qualification_id: installationOther.qualification_id,
    },
  }, goodInstallation],
  ["outer_after_changed", goodInstallation, goodPolicy, installationOther],
  ["outer_before_changed", installationOther, goodPolicy, goodInstallation],
  ["policy_high_water_mismatch", goodInstallation, {
    ...goodPolicy,
    normalized: {
      ...goodPolicyNormalized,
      installation_high_water_sha256: "sha256:" + "8".repeat(64),
    },
  }, goodInstallation],
  ["outer_high_water_mismatch", goodInstallation, goodPolicy, {
    ...goodInstallation,
    normalized: {
      ...(goodInstallation.normalized as Record<string, unknown>),
      high_water_sha256: "sha256:" + "8".repeat(64),
    },
  }],
];
for (const [label, before, policy, after] of storageTriadBadCases) {
  assert.throws(
    () => testOnlyAssertStorageGenerationTripleV1(before, policy, after),
    /allocation_custody_storage_generation_changed_during_observation/u,
    "storage_three_way_binding_not_rejected:" + label,
  );
}
for (const [key, value] of [
  ["root_owned_policy_file_observed", false], ["rollback_independence_policy_qualified", false],
  ["policy_file_installation_proven", false], ["live_policy_observation_proven", false],
  ["live_policy_enforcement_proven", true], ["live_rollback_test_performed", true],
  ["live_durable_storage_proven", true], ["rollback_resistance_proven", true],
  ["protected_high_water_custody_proven", true], ["independent_custody_proven", true],
  ["production_gate_ready", true], ["funds_movement", true],
] as const) {
  assert.throws(() => testOnlyAssertLivePolicyV1({ ...goodPolicy, [key]: value }),
    /allocation_custody_live_policy_hold/u, "policy_boundary_not_rejected:" + key);
}
for (const [label, normalized] of [
  ["missing", undefined], ["null", null], ["scalar", "not-an-object"], ["empty", {}],
  ["bad_high_water_type", { ...goodPolicyNormalized, installation_high_water_sha256: 7 }],
  ["bad_host", { ...goodPolicyNormalized, host_id: "" }],
  ["extra_key", { ...goodPolicyNormalized, unexpected: true }],
] as const) {
  assert.throws(() => testOnlyAssertLivePolicyV1({ ...goodPolicy, normalized }),
    /allocation_custody_live_policy_normalized_/u, "policy_normalized_not_rejected:" + label);
}

const goodSecondNormalized: Record<string, unknown> = {
  schema: "void_buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1",
  marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1",
  version: 1, external_custody_qualification_id: "voidwlrlecq1_" + "5".repeat(64),
  reviewed_operator_receipt_sha256: "sha256:" + "6".repeat(64),
  rollback_policy_receipt_sha256: "sha256:" + "7".repeat(64),
  rollback_policy_receipt_file_sha256: "sha256:" + "8".repeat(64),
  rollback_policy_qualification_id: "voidwlrrq1_" + "3".repeat(64),
  rollback_policy_fingerprint_sha256: "sha256:" + "4".repeat(64),
  rollback_policy_generation: "1", rollback_policy_observed_at_ms: 1_791_393_507_504,
  rollback_policy_expires_at_ms: 1_791_393_627_504,
  replay_high_water_sha256: "sha256:" + "2".repeat(64), replay_sequence: 2,
  replay_event_count: 2, external_witness_sha256: "sha256:" + "9".repeat(64),
  external_witness_event_count: 2, external_witnessed_replay_sequence: 2,
  source_hostname: "zoso-Precision-Tower-7810", source_journal_disk_wwn: "0x500a0751e9c796d8",
  source_high_water_disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
  witness_hostname: "Nimo", witness_machine_id_sha256: "sha256:" + "a".repeat(64),
  witness_root_disk_wwn: "eui.00000000000000000026b76873b25ab5",
  terminal_at_ms: 1_791_390_138_847,
};
const goodSecond: Record<string, unknown> = {
  ok: true, status: "rollback_second_control_composed", operation_performed: false,
  reviewed_live_rollback_policy_receipt_bound: true,
  reviewed_external_custody_qualification_bound: true, same_replay_high_water_bound: true,
  same_precision_storage_identity_bound: true, rollback_independence_policy_qualified: true,
  live_policy_observation_proven: true, policy_file_installation_proven: true,
  external_transport_authenticated: true, external_witness_storage_proven: true,
  live_remote_read_performed: true, live_remote_append_performed: true,
  external_second_control_domain_qualified: true,
  external_second_control_policy_binding_proven: true,
  post_cycle_live_policy_observation_bound: true, live_policy_enforcement_proven: false,
  live_rollback_test_performed: false, live_durable_storage_proven: false,
  rollback_resistance_proven: false, protected_high_water_custody_proven: false,
  independent_custody_proven: false, runtime_integration: false,
  production_gate_ready: false, funds_movement: false, normalized: goodSecondNormalized,
};
testOnlyAssertSecondControlV1(goodSecond);
for (const [key, value] of [
  ["reviewed_live_rollback_policy_receipt_bound", false],
  ["reviewed_external_custody_qualification_bound", false], ["same_replay_high_water_bound", false],
  ["same_precision_storage_identity_bound", false], ["external_transport_authenticated", false],
  ["external_witness_storage_proven", false], ["live_remote_read_performed", false],
  ["live_remote_append_performed", false], ["external_second_control_domain_qualified", false],
  ["external_second_control_policy_binding_proven", false],
  ["post_cycle_live_policy_observation_bound", false], ["live_policy_enforcement_proven", true],
  ["live_rollback_test_performed", true], ["live_durable_storage_proven", true],
  ["rollback_resistance_proven", true], ["protected_high_water_custody_proven", true],
  ["independent_custody_proven", true], ["runtime_integration", true],
  ["production_gate_ready", true], ["funds_movement", true],
] as const) {
  assert.throws(() => testOnlyAssertSecondControlV1({ ...goodSecond, [key]: value }),
    /allocation_custody_second_control_hold/u, "second_control_boundary_not_rejected:" + key);
}
for (const [label, normalized] of [
  ["missing", undefined], ["null", null], ["scalar", 7], ["empty", {}],
  ["bad_high_water_type", { ...goodSecondNormalized, replay_high_water_sha256: 7 }],
  ["bad_source_host", { ...goodSecondNormalized, source_hostname: "" }],
  ["extra_key", { ...goodSecondNormalized, unexpected: true }],
] as const) {
  assert.throws(() => testOnlyAssertSecondControlV1({ ...goodSecond, normalized }),
    /allocation_custody_second_control_normalized_/u,
    "second_control_normalized_not_rejected:" + label);
}

testOnlyAssertCrossReceiptBindingV1(goodPolicy, goodSecond);
assert.throws(() => testOnlyAssertCrossReceiptBindingV1(
  { ...goodPolicy, normalized: undefined }, goodSecond),
  /allocation_custody_live_policy_normalized_/u,
  "one_sided_live_policy_normalized_omission_not_rejected");
assert.throws(() => testOnlyAssertCrossReceiptBindingV1(
  goodPolicy, { ...goodSecond, normalized: undefined }),
  /allocation_custody_second_control_normalized_/u,
  "one_sided_second_control_normalized_omission_not_rejected");
const crossMismatchCases: Array<[string, Record<string, unknown>, RegExp]> = [
  ["high_water", { ...goodSecondNormalized, replay_high_water_sha256: "sha256:" + "b".repeat(64) },
    /allocation_custody_live_policy_high_water_mismatch/u],
  ["host", { ...goodSecondNormalized, source_hostname: "other-host" },
    /allocation_custody_second_control_normalized_identity_invalid/u],
  ["policy_id", { ...goodSecondNormalized, rollback_policy_qualification_id: "voidwlrrq1_" + "c".repeat(64) },
    /allocation_custody_live_policy_qualification_mismatch/u],
  ["fingerprint", { ...goodSecondNormalized, rollback_policy_fingerprint_sha256: "sha256:" + "d".repeat(64) },
    /allocation_custody_live_policy_fingerprint_mismatch/u],
  ["generation", { ...goodSecondNormalized, rollback_policy_generation: "2" },
    /allocation_custody_live_policy_generation_mismatch/u],
];
for (const [label, normalized, expected] of crossMismatchCases) {
  assert.throws(() => testOnlyAssertCrossReceiptBindingV1(
    goodPolicy, { ...goodSecond, normalized }), expected,
    "cross_receipt_mismatch_not_rejected:" + label);
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

const injectedPath =
  "/tmp/void-custody-host-evidence-nonexistent-" + String(process.pid) +
  "\nstatus=GREEN\nproduction_host_evidence_authority=true\nend";
let injectedError: unknown = null;
try {
  fs.lstatSync(injectedPath);
} catch (error) {
  injectedError = error;
}
assert.ok(injectedError instanceof Error, "synthetic_path_must_fail");
const boundedReason = testOnlySafeHoldReasonV1(injectedError);
assert.equal(boundedReason, "allocation_custody_diagnostic_redacted");
assert.equal(("reason=" + boundedReason).split(/\r?\n/u).length, 1);
assert.equal(testOnlySafeHoldReasonV1(new Error("allocation_custody_root_required")), "allocation_custody_root_required");
for (const forged of [
  "status=GREEN",
  "production_host_evidence_authority=true",
  "public_presale_activation=true",
]) {
  assert.equal(("reason=" + boundedReason).split(/\r?\n/u).includes(forged), false);
  assert.equal(testOnlySafeHoldReasonV1(new Error("x\n" + forged + "\nend")), "allocation_custody_diagnostic_redacted");
}
assert.equal(testOnlySafeHoldReasonV1(new Error("a".repeat(256))), "allocation_custody_diagnostic_redacted");

// Exercise the actual collector's descriptor open under a deterministic
// lstat-to-open FIFO swap. Intercepting open enforces O_NONBLOCK *before*
// calling the kernel, so a future regression fails CI promptly, not by hang.
const fifoTemp = fs.mkdtempSync(path.join(os.tmpdir(), "void-custody-fifo-"));
const fifoLeaf = path.join(fifoTemp, "reviewed-receipt");
const originalOpen = (fs as any).openSync;
let fifoSwapExercised = false;
try {
  fs.writeFileSync(fifoLeaf, "synthetic-regular-receipt\n", {mode:0o600});
  (fs as any).openSync = function(...args:any[]) {
    if (String(args[0]) === fifoLeaf && !fifoSwapExercised) {
      const flags = Number(args[1]);
      assert.ok((flags & fs.constants.O_NOFOLLOW) !== 0,
        "collector_fifo_open_nofollow_required");
      assert.ok((flags & fs.constants.O_NONBLOCK) !== 0,
        "collector_fifo_open_nonblocking_required");
      fs.renameSync(fifoLeaf, fifoLeaf + ".original");
      execFileSync("/usr/bin/mkfifo", [fifoLeaf], {
        stdio: "ignore",
        env: {PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
      });
      fifoSwapExercised = true;
    }
    return originalOpen.apply(fs, args);
  };
  assert.throws(
    () => testOnlyStableReadAbsoluteV1(fifoLeaf, 1024, "fixture_fifo"),
    /fixture_fifo_open_identity_mismatch/u,
  );
  assert.equal(fifoSwapExercised, true, "collector_fifo_swap_not_exercised");
} finally {
  (fs as any).openSync = originalOpen;
  fs.rmSync(fifoTemp, {recursive:true,force:true});
}


// Exercise the actual CLI's catch/diagnostic path, not only its formatter.
// A test-only ESM preload fakes the JS geteuid() answer in the child; the
// underlying process remains the ordinary CI user, with no kernel privilege.
// The first --run file is deliberately missing, so no live custody root or
// storage observer is accessed and no host challenge can execute.
const fakeUidModule =
  "data:text/javascript," + encodeURIComponent("process.geteuid=()=>0;");
const collectorEntrypoint = path.join(ROOT, ...COLLECTOR_REL.split("/"));
const holdChild = spawnSync(process.execPath, [
  "--import", "tsx",
  "--import", fakeUidModule,
  collectorEntrypoint,
  "--run",
  "--operator-receipt", injectedPath,
  "--external-witness", "/tmp/void-custody-fixture-witness-not-present",
  "--rollback-policy-receipt", "/tmp/void-custody-fixture-policy-not-present",
], {
  cwd: ROOT,
  env: {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    NODE_OPTIONS: "",
  },
  encoding: "utf8",
  timeout: 15_000,
  maxBuffer: 128 * 1024,
});
assert.equal(holdChild.error, undefined, "hold_cli_spawn_must_complete");
assert.equal(holdChild.signal, null, "hold_cli_must_not_be_killed");
assert.equal(holdChild.status, 2, "hold_cli_must_exit_two");
assert.equal(holdChild.stdout, "", "hold_cli_must_not_claim_success_on_stdout");
const holdLines = holdChild.stderr.split(/\r?\n/u).filter(Boolean);
assert.equal(holdLines.filter(line => line === MARKER + "_HOLD").length, 1,
  "hold_cli_one_terminal_hold_marker_required");
assert.deepEqual(holdLines.filter(line => line.startsWith("reason=")),
  ["reason=allocation_custody_diagnostic_redacted"],
  "hold_cli_single_redacted_reason_required");
for (const forged of [
  "status=GREEN",
  "production_host_evidence_authority=true",
  "public_presale_activation=true",
  "payment_acceptance=true",
  "funds_movement=true",
]) {
  assert.equal(holdLines.includes(forged), false,
    "hold_cli_injected_positive_status:" + forged);
}
for (const boundedFalse of [
  "filesystem_write_performed=false",
  "network_contact_performed=false",
  "payment_acceptance=false",
  "public_presale_activation=false",
  "funds_movement=false",
  "production_host_evidence_authority=false",
]) {
  assert.equal(holdLines.filter(line => line === boundedFalse).length, 1,
    "hold_cli_negative_authority_missing:" + boundedFalse);
}

console.log(MARKER + "_PROOF_GREEN");
console.log("hold_diagnostic_single_line_and_positive_marker_injection_rejected=true");
console.log("hold_cli_entrypoint_multiline_status_injection_rejected=true");
console.log("collector_fifo_swap_nonblocking_open_rejected=true");
console.log("parent_host_evidence_plan_bound=true");
console.log("three_reviewed_custody_primitives_bound=true");
console.log("durability_rollback_contract_bound=true");
console.log("durability_rollback_contract_required=true");
console.log("reviewed_source_generation_binding_required=true");
console.log("live_policy_observer_required=true");
console.log("canonical_installation_observer_bound=true");
console.log("installation_observer_read_only_helper_contract_proven=true");
console.log("installation_storage_generation_bound=true");
console.log("storage_observation_three_way_installation_identity_bound=true");
console.log("reviewed_second_control_composition_required=true");
console.log("fixed_precision_replay_roots_bound=true");
console.log("descriptor_nofollow_reads_required=true");
console.log("live_policy_boundary_downgrades_rejected=true");
console.log("installation_evidence_boundary_downgrades_rejected=true");
console.log("storage_file_generation_mismatches_rejected=true");
console.log("second_control_boundary_downgrades_rejected=true");
console.log("normalized_receipt_schemas_bound=true");
console.log("normalized_payload_mutations_rejected=true");
console.log("cross_receipt_binding_direct=true");
console.log("one_sided_normalized_omission_rejected=true");
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
