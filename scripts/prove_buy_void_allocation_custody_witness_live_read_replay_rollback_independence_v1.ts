#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";

const NOW = 1_800_000_000_000;

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical proof value");
}

function sha(value: string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value, "utf8").digest("hex")
  );
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

function policy() {
  return {
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
    version: 1,
    host_id: "zoso-Precision-Tower-7810",
    observed_at_ms: NOW - 1_000,
    expires_at_ms: NOW + 60_000,
    policy_generation: "1",
    journal: {
      role: "journal",
      disk_serial: "2530E9C796D8",
      disk_wwn: "0x500a0751e9c796d8",
      snapshot_enabled: false,
      snapshot_domain_id: null,
      backup_enabled: true,
      backup_domain_id: "void.replay.journal.backup.v1",
      backup_target_id: "void.replay.journal.backup.target.v1",
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
      disk_serial: "25278B802787",
      disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
      snapshot_enabled: false,
      snapshot_domain_id: null,
      backup_enabled: true,
      backup_domain_id: "void.replay.high-water.backup.v1",
      backup_target_id: "void.replay.high-water.backup.target.v1",
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

function classify(
  installation: unknown = installationEvidence(),
  rollbackPolicy: unknown = policy(),
  now: unknown = NOW,
) {
  return classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1({
    verification_now_ms: now,
    installation_evidence: installation,
    rollback_policy: rollbackPolicy,
  });
}

const green = classify();
assert.equal(green.ok, true);
if (!green.ok) throw new Error("baseline held: " + green.reason);
assert.equal(green.status, "source_policy_qualified");
assert.match(green.qualification_id, /^voidwlrrq1_[0-9a-f]{64}$/u);
assert.match(green.policy_fingerprint_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(green.rollback_independence_policy_qualified, true);
assert.equal(green.installation_storage_rebound, true);
assert.equal(green.bounded_policy_freshness_checked, true);
assert.equal(green.verification_clock_authority_proven, false);
assert.equal(green.policy_generation_monotonicity_proven, false);
assert.equal(green.live_policy_observation_proven, false);
assert.equal(green.live_rollback_test_performed, false);
assert.equal(green.rollback_resistance_proven, false);
assert.equal(green.protected_high_water_custody_proven, false);
assert.equal(green.independent_custody_proven, false);
assert.equal(green.production_gate_ready, false);
assert.equal(green.funds_movement, false);

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, nested]) => [key, reverseObjectKeys(nested)]),
    );
  }
  return value;
}

const shuffled = classify(
  reverseObjectKeys(installationEvidence()),
  reverseObjectKeys(policy()),
);
assert.equal(shuffled.ok, true);
if (!shuffled.ok) throw new Error("shuffled held");
assert.equal(shuffled.qualification_id, green.qualification_id);
assert.equal(
  shuffled.policy_fingerprint_sha256,
  green.policy_fingerprint_sha256,
);

{
  const bad = structuredClone(installationEvidence());
  bad.qualification_id = "voidwlrie1_" + "f".repeat(64);
  const held = classify(bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("forged installation id green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_installation_qualification_id_invalid",
  );
}

{
  const bad = structuredClone(installationEvidence());
  bad.normalized.high_water_root.disk_wwn = "wwn-changed";
  bad.qualification_id =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(bad.normalized), "utf8")
      .digest("hex");
  const held = classify(bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("disk drift green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_domain_invalid",
  );
}

for (const mutate of [
  (p: any) => {
    p.high_water.restore_domain_id = p.journal.restore_domain_id;
  },
  (p: any) => {
    p.high_water.rollback_controller_id =
      p.journal.rollback_controller_id;
  },
  (p: any) => {
    p.high_water.restore_credential_domain_id =
      p.journal.restore_credential_domain_id;
  },
]) {
  const bad = structuredClone(policy());
  mutate(bad);
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared restore authority green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_restore_authority_not_independent",
  );
}

{
  const bad = structuredClone(policy());
  bad.journal.snapshot_enabled = true;
  bad.journal.snapshot_domain_id = "shared.snapshot";
  bad.high_water.snapshot_enabled = true;
  bad.high_water.snapshot_domain_id = "shared.snapshot";
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared snapshot green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_snapshot_domains_not_independent",
  );
}

for (const field of ["backup_domain_id", "backup_target_id"] as const) {
  const bad = structuredClone(policy());
  bad.high_water[field] = bad.journal[field];
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared backup authority green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_backup_domains_not_independent",
  );
}

for (const field of [
  "hostwide_snapshot_can_revert_both",
  "hostwide_backup_can_revert_both",
  "hostwide_restore_can_revert_both",
  "shared_rollback_controller",
  "coordinated_rollback_without_second_control",
] as const) {
  const bad = structuredClone(policy());
  bad[field] = true;
  const held = classify(undefined, bad);
  assert.equal(held.ok, false, field);
  if (held.ok) throw new Error(field + " unexpectedly green");
  assert.equal(held.reason, "witness_replay_rollback_policy_invalid");
}

{
  const bad = structuredClone(policy());
  bad.high_water.automatic_restore_allowed = true;
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("automatic high-water restore green");
  assert.equal(held.reason, "witness_replay_rollback_domain_invalid");
}

{
  const bad = structuredClone(policy());
  bad.high_water.restore_second_control_required = false;
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("missing second control green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_high_water_second_control_required",
  );
}

for (const patch of [
  { observed_at_ms: NOW + 1 },
  { observed_at_ms: NOW - 500_000, expires_at_ms: NOW - 1 },
  {
    observed_at_ms: NOW - 1_000,
    expires_at_ms: NOW - 1_000 + 300_001,
  },
]) {
  const bad = structuredClone(policy());
  Object.assign(bad, patch);
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("bad freshness green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_freshness_invalid",
  );
}

{
  const bad = structuredClone(policy());
  bad.policy_generation = "0";
  const held = classify(undefined, bad);
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("zero generation green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_policy_generation_invalid",
  );
}

{
  const installation = installationEvidence();
  let getterReads = 0;
  Object.defineProperty(installation, "qualification_id", {
    enumerable: true,
    get() {
      getterReads += 1;
      return "voidwlrie1_" + "a".repeat(64);
    },
  });
  const held = classify(installation);
  assert.equal(held.ok, false);
  assert.equal(getterReads, 0);
  if (held.ok) throw new Error("getter evidence green");
  assert.equal(
    held.reason,
    "witness_replay_rollback_installation_result_invalid",
  );
}

for (const key of [
  "verification_clock_authority_proven",
  "policy_generation_monotonicity_proven",
  "live_policy_observation_proven",
  "live_rollback_test_performed",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "filesystem_read",
  "filesystem_write",
  "mount_mutation",
  "storage_bootstrap",
  "backup_mutation",
  "snapshot_mutation",
  "service_mutation",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "source_only_contract",
  "installation_evidence_input_only",
  "exact_live_storage_qualification_required",
  "canonical_replay_writer_marker_bound",
  "canonical_replay_high_water_marker_bound",
  "physical_disk_identity_rebound",
  "snapshot_domain_separation_required",
  "backup_domain_separation_required",
  "restore_domain_separation_required",
  "rollback_controller_separation_required",
  "restore_credential_domain_separation_required",
  "hostwide_joint_rollback_forbidden",
  "high_water_second_control_required",
  "automatic_restore_forbidden",
  "bounded_policy_freshness_checked",
  "verification_clock_input_required",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1_GREEN",
);
console.log("installation_storage_rebound=true");
console.log("physical_disk_identity_rebound=true");
console.log("snapshot_domain_separation_required=true");
console.log("backup_domain_separation_required=true");
console.log("restore_domain_separation_required=true");
console.log("rollback_controller_separation_required=true");
console.log("restore_credential_domain_separation_required=true");
console.log("hostwide_joint_rollback_forbidden=true");
console.log("high_water_second_control_required=true");
console.log("automatic_restore_forbidden=true");
console.log("bounded_policy_freshness_checked=true");
console.log("verification_clock_authority_proven=false");
console.log("policy_generation_monotonicity_proven=false");
console.log("live_policy_observation_proven=false");
console.log("live_rollback_test_performed=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
