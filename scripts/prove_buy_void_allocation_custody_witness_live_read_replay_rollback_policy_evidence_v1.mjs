#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
  testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";

const NOW = 1_800_000_000_000;
const POLICY_PATH =
  "/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json";

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical proof value");
}

function sha256Id(value) {
  return "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
}

function installationEvidence() {
  const normalized = {
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version: 1,
    parent_writer_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
    high_water_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
    hostname: "zoso-Precision-Tower-7810",
    journal_root: {
      path: "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
      dev: "2050",
      ino: "225448588",
      uid: 994,
      gid: 981,
      mode: 0o700,
      mount_id: 33,
      major_minor: "8:2",
      fs_type: "ext4",
      mount_source: "/dev/sda2",
      mount_source_resolved: "/dev/sda2",
      mount_point: "/",
      parent_device: "/dev/sda",
      disk_serial: "2530E9C796D8",
      disk_wwn: "0x500a0751e9c796d8",
    },
    high_water_root: {
      path: "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
      dev: "66306",
      ino: "213909505",
      uid: 994,
      gid: 981,
      mode: 0o700,
      mount_id: 3936,
      major_minor: "259:2",
      fs_type: "ext4",
      mount_source: "/dev/nvme0n1p1",
      mount_source_resolved: "/dev/nvme0n1p1",
      mount_point: "/var/lib/void-allocation-custody-v1",
      parent_device: "/dev/nvme0n1",
      disk_serial: "25278B802787",
      disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
    },
    journal_file: {
      path: "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1/live-read-replay-v1.jsonl",
      dev: "2050",
      ino: "225448589",
      mtime_ns: "1791332658259059852",
      ctime_ns: "1791332658259631554",
      sha256:
        "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      bytes: 0,
      uid: 994,
      gid: 981,
      mode: 0o600,
      nlink: 1,
      regular_file: true,
      symlink: false,
    },
    high_water_file: {
      path: "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1/live-read-replay-high-water-v1.json",
      dev: "66306",
      ino: "213909506",
      mtime_ns: "1791332658276916555",
      ctime_ns: "1791332658276916555",
      sha256:
        "sha256:9fbff858219c90347b66d127b45edb869044b2132051042c7cb78d4b6ac21483",
      bytes: 512,
      uid: 994,
      gid: 981,
      mode: 0o600,
      nlink: 1,
      regular_file: true,
      symlink: false,
    },
    high_water_sha256:
      "sha256:9fbff858219c90347b66d127b45edb869044b2132051042c7cb78d4b6ac21483",
    generation: 0,
    sequence: 0,
    event_count: 0,
    pending: false,
    pending_challenge_sha256: null,
    pending_challenge_id: null,
    pending_expires_at_ms: null,
    last_terminal_state: null,
    ready_for_issue: true,
  };
  const qualificationId =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalized), "utf8")
      .digest("hex");
  return {
    ok: true,
    status: "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version: 1,
    qualification_id: qualificationId,
    normalized,
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
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority: {},
  };
}

function control() {
  return {
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_rollback_control_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_CONTROL_V1",
    version: 1,
    host_id: "zoso-Precision-Tower-7810",
    policy_generation: "1",
    policy_ttl_ms: 60_000,
    journal: {
      role: "journal",
      snapshot_enabled: false,
      snapshot_domain_id: null,
      backup_enabled: false,
      backup_domain_id: null,
      backup_target_id: null,
      restore_domain_id: "void.replay.journal.restore.v1",
      rollback_controller_id: "void.replay.journal.rollback.controller.v1",
      restore_credential_domain_id:
        "void.replay.journal.restore.credentials.v1",
      hostwide_snapshot_member: false,
      hostwide_backup_member: false,
      automatic_restore_allowed: false,
      restore_requires_manual_approval: true,
      restore_requires_separate_credential: true,
      restore_second_control_required: false,
    },
    high_water: {
      role: "high_water",
      snapshot_enabled: false,
      snapshot_domain_id: null,
      backup_enabled: false,
      backup_domain_id: null,
      backup_target_id: null,
      restore_domain_id: "void.replay.high-water.restore.v1",
      rollback_controller_id:
        "void.replay.high-water.rollback.controller.v1",
      restore_credential_domain_id:
        "void.replay.high-water.restore.credentials.v1",
      hostwide_snapshot_member: false,
      hostwide_backup_member: false,
      automatic_restore_allowed: false,
      restore_requires_manual_approval: true,
      restore_requires_separate_credential: true,
      restore_second_control_required: true,
    },
    hostwide_snapshot_can_revert_both: false,
    hostwide_backup_can_revert_both: false,
    hostwide_restore_can_revert_both: false,
    shared_rollback_controller: false,
    coordinated_rollback_without_second_control: false,
  };
}

function policyObservation(
  value = control(),
  patch = {},
) {
  const bytes = Buffer.from(canonicalJson(value) + "\n", "utf8");
  return {
    path: POLICY_PATH,
    bytes,
    sha256: sha256Id(bytes),
    uid: 0,
    gid: 0,
    mode: 0o444,
    nlink: 1,
    dev: "2050",
    ino: "9001",
    mtime_ns: "1791333000000000000",
    ctime_ns: "1791333000000000000",
    control: value,
    ...patch,
  };
}

function classify(
  installation = installationEvidence(),
  observed = policyObservation(),
  now = NOW,
) {
  return testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1({
    installation_evidence: installation,
    policy_file: observed,
    verification_now_ms: now,
  });
}

const green = classify();
assert.equal(green.ok, true);
if (!green.ok) throw new Error("synthetic policy evidence held");
assert.equal(green.status, "ROLLBACK_POLICY_CLASSIFIED_TEST_ONLY");
assert.match(green.receipt_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(green.root_owned_policy_file_observed, false);
assert.equal(green.rollback_independence_policy_qualified, true);
assert.equal(green.installation_storage_rebound, true);
assert.equal(green.bounded_policy_freshness_checked, true);
assert.equal(green.policy_file_installation_proven, false);
assert.equal(green.live_policy_observation_proven, false);
assert.equal(green.verification_clock_authority_proven, false);
assert.equal(green.policy_generation_monotonicity_proven, false);
assert.equal(green.live_policy_enforcement_proven, false);
assert.equal(green.live_rollback_test_performed, false);
assert.equal(green.rollback_resistance_proven, false);
assert.equal(green.protected_high_water_custody_proven, false);
assert.equal(green.independent_custody_proven, false);
assert.equal(green.production_gate_ready, false);
assert.equal(green.funds_movement, false);
assert.equal(
  green.parent_qualification.rollback_independence_policy_qualified,
  true,
);
assert.equal(
  green.parent_qualification.live_policy_observation_proven,
  false,
);

for (const patch of [
  { path: "/tmp/policy.json" },
  { uid: 1000 },
  { gid: 1000 },
  { mode: 0o644 },
  { nlink: 2 },
  { sha256: "sha256:" + "f".repeat(64) },
]) {
  const held = classify(undefined, policyObservation(control(), patch));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("bad policy metadata unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_rollback_policy_evidence_policy_observation_invalid/u,
  );
}

{
  const c = control();
  const bytes = Buffer.from(JSON.stringify(c) + "\n", "utf8");
  const held = classify(
    undefined,
    policyObservation(c, {
      bytes,
      sha256: sha256Id(bytes),
    }),
  );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("noncanonical policy bytes unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_policy_noncanonical",
  );
}

{
  const c = control();
  c.host_id = "wrong-host";
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("wrong host unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_host_mismatch",
  );
}

{
  const c = control();
  c.policy_ttl_ms = 300_001;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("oversized ttl unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_ttl_invalid",
  );
}

{
  const c = control();
  c.high_water.restore_second_control_required = false;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("missing second control unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_high_water_second_control_required",
  );
}

{
  const c = control();
  c.high_water.rollback_controller_id =
    c.journal.rollback_controller_id;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared controller unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_restore_authority_not_independent",
  );
}

{
  const c = control();
  c.high_water.restore_credential_domain_id =
    c.journal.restore_credential_domain_id;
  const held = classify(undefined, policyObservation(c));
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared credential unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_restore_authority_not_independent",
  );
}

{
  const bad = installationEvidence();
  bad.normalized.high_water_root.disk_wwn = "changed-wwn";
  const held = classify(bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("forged storage evidence unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_rollback_policy_evidence_parent_witness_replay_rollback_installation_/u,
  );
}

for (const key of [
  "verification_clock_authority_proven",
  "policy_generation_monotonicity_proven",
  "live_policy_enforcement_proven",
  "live_rollback_test_performed",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "filesystem_write",
  "mount_mutation",
  "storage_bootstrap",
  "backup_mutation",
  "snapshot_mutation",
  "service_mutation",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "designated_host_read_only_observation",
  "fixed_root_owned_policy_path",
  "root_owned_nonwritable_parent_chain_required",
  "root_owned_read_only_policy_file_required",
  "descriptor_bound_policy_read",
  "canonical_policy_control_required",
  "canonical_parent_rollback_classifier_required",
  "live_replay_storage_reobservation_required",
  "double_storage_census_required",
  "policy_file_double_read_stability_required",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs",
  "utf8",
);
for (const token of [
  POLICY_PATH,
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "readRootOwnedPolicyFile",
  "inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1",
  "classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1",
  "live_policy_observation_proven: live === true",
  "live_policy_enforcement_proven: false",
]) {
  assert.equal(source.includes(token), true, "missing source token: " + token);
}
assert.doesNotMatch(
  source,
  /fs\.(?:writeFileSync|appendFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync|linkSync)\(/u,
);
assert.doesNotMatch(
  source,
  /spawnSync\(\s*["']\/usr\/bin\/ssh["']/u,
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1_GREEN",
);
console.log("fixed_root_owned_policy_path=true");
console.log("root_owned_read_only_policy_file_required=true");
console.log("canonical_policy_control_required=true");
console.log("live_replay_storage_reobservation_required=true");
console.log("policy_file_double_read_stability_required=true");
console.log("synthetic_live_policy_authority=false");
console.log("live_policy_enforcement_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
