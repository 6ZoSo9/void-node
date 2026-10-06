#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1,
  testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1,
  testOnlySingleParentNameV1,
  testOnlyStatHexDeviceNumberToDecimalV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";

const sha256Id = (value) =>
  "sha256:" + crypto.createHash("sha256").update(value).digest("hex");

assert.equal(testOnlyStatHexDeviceNumberToDecimalV1("8:1"), "8:1");
assert.equal(
  testOnlyStatHexDeviceNumberToDecimalV1("103:1"),
  "259:1",
);
assert.equal(testOnlySingleParentNameV1("sda"), "sda");
assert.equal(testOnlySingleParentNameV1(""), null);
assert.throws(
  () => testOnlySingleParentNameV1("sda\nsdb"),
  /witness_replay_installation_evidence_parent_topology_ambiguous/u,
);
assert.throws(
  () => testOnlyStatHexDeviceNumberToDecimalV1("not-a-device"),
  /witness_replay_installation_evidence_test_device_number_invalid/u,
);

const journalBytes = Buffer.alloc(0);
const derived =
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
    journalBytes,
  );
assert.equal(derived.ok, true);
if (!derived.ok) throw new Error("genesis high-water derivation held");
const highWaterBytes = Buffer.from(derived.high_water_json, "utf8");

const journalRoot = Object.freeze({
  path: "/mnt/void-replay-journal",
  dev: "2049",
  ino: "100",
  uid: 1201,
  gid: 1201,
  mode: 0o700,
  mount_id: 36,
  major_minor: "8:1",
  fs_type: "ext4",
  mount_source: "/dev/sda1",
  mount_source_resolved: "/dev/sda1",
  mount_point: "/mnt/void-replay-journal",
  parent_device: "/dev/sda",
  disk_serial: "DISK-A-001",
  disk_wwn: "wwn-disk-a-001",
});
const highWaterRoot = Object.freeze({
  path: "/mnt/void-replay-high-water",
  dev: "66305",
  ino: "200",
  uid: 1201,
  gid: 1201,
  mode: 0o700,
  mount_id: 37,
  major_minor: "259:1",
  fs_type: "ext4",
  mount_source: "/dev/nvme0n1p1",
  mount_source_resolved: "/dev/nvme0n1p1",
  mount_point: "/mnt/void-replay-high-water",
  parent_device: "/dev/nvme0n1",
  disk_serial: "DISK-B-002",
  disk_wwn: "wwn-disk-b-002",
});

function snapshot(overrides = {}) {
  const jr = {
    ...journalRoot,
    ...(overrides.journal_root || {}),
  };
  const hr = {
    ...highWaterRoot,
    ...(overrides.high_water_root || {}),
  };
  const jf = {
    path: path.join(jr.path, "live-read-replay-v1.jsonl"),
    sha256: sha256Id(journalBytes),
    bytes: journalBytes.length,
    uid: jr.uid,
    gid: jr.gid,
    mode: 0o600,
    nlink: 1,
    regular_file: true,
    symlink: false,
    ...(overrides.journal_file || {}),
  };
  const hf = {
    path: path.join(hr.path, "live-read-replay-high-water-v1.json"),
    sha256: sha256Id(highWaterBytes),
    bytes: highWaterBytes.length,
    uid: jr.uid,
    gid: jr.gid,
    mode: 0o600,
    nlink: 1,
    regular_file: true,
    symlink: false,
    ...(overrides.high_water_file || {}),
  };
  return {
    hostname: "Precision",
    journal_root: jr,
    high_water_root: hr,
    journal_file: jf,
    high_water_file: hf,
    journal_jsonl:
      overrides.journal_jsonl === undefined
        ? journalBytes
        : overrides.journal_jsonl,
    high_water_json:
      overrides.high_water_json === undefined
        ? highWaterBytes
        : overrides.high_water_json,
    journal_intent_present:
      overrides.journal_intent_present ?? false,
    high_water_intent_present:
      overrides.high_water_intent_present ?? false,
  };
}

const green =
  testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
    snapshot(),
  );
assert.equal(green.ok, true);
if (!green.ok) throw new Error("synthetic green snapshot held");
assert.equal(
  green.status,
  "REPLAY_STORAGE_DOMAINS_CLASSIFIED_TEST_ONLY",
);
assert.match(green.qualification_id, /^voidwlrie1_[0-9a-f]{64}$/u);
assert.equal(green.storage_domain_classification_green, true);
assert.equal(green.canonical_journal_high_water_binding_proven, true);
assert.equal(green.no_pending_publication_intent_observed, true);
assert.equal(green.live_storage_observation_proven, false);
assert.equal(green.distinct_local_storage_domains_proven, false);
assert.equal(green.distinct_parent_block_devices_proven, false);
assert.equal(green.live_durable_storage_proven, false);
assert.equal(green.rollback_resistance_proven, false);
assert.equal(green.protected_high_water_custody_proven, false);
assert.equal(green.independent_custody_proven, false);
assert.equal(green.production_gate_ready, false);

for (const patch of [
  { dev: journalRoot.dev },
  { mount_id: journalRoot.mount_id },
  { major_minor: journalRoot.major_minor },
  { mount_source: journalRoot.mount_source },
  { mount_source_resolved: journalRoot.mount_source_resolved },
]) {
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ high_water_root: patch }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared mount domain unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_mount_domains_not_distinct",
  );
}

for (const patch of [
  { parent_device: journalRoot.parent_device },
  { disk_serial: journalRoot.disk_serial },
  { disk_wwn: journalRoot.disk_wwn },
]) {
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ high_water_root: patch }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("shared physical disk unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_parent_disks_not_distinct",
  );
}

{
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({
        high_water_root: {
          path: journalRoot.path + "/nested",
        },
      }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("nested roots unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_roots_not_path_disjoint",
  );
}

{
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ high_water_root: { fs_type: "overlay" } }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("overlay storage unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_high_water_storage_domain_invalid",
  );
}

{
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ high_water_root: { uid: 1300 } }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("owner mismatch unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_root_owner_mismatch",
  );
}

{
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ journal_file: { mode: 0o644 } }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("writable/public file mode unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_journal_file_invalid",
  );
}

for (const key of [
  "journal_intent_present",
  "high_water_intent_present",
]) {
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({ [key]: true }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("pending intent unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_publication_intent_present",
  );
}

{
  const tamperedJournal = Buffer.from("tampered\n", "utf8");
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({
        journal_jsonl: tamperedJournal,
      }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("journal digest drift unexpectedly green");
  assert.equal(
    held.reason,
    "witness_replay_installation_evidence_file_digest_mismatch",
  );
}

{
  const issue =
    planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
      journal_jsonl: "",
      entropy_sha256: "sha256:" + "1".repeat(64),
      issued_at_ms: 1_000,
      expires_at_ms: 39_000,
    });
  assert.equal(issue.ok, true);
  if (!issue.ok) throw new Error("issue fixture held");
  const nextJournal = Buffer.from(issue.next_journal_jsonl, "utf8");
  const held =
    testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationSnapshotV1(
      snapshot({
        journal_jsonl: nextJournal,
        journal_file: {
          sha256: sha256Id(nextJournal),
          bytes: nextJournal.length,
        },
      }),
    );
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("stale high-water unexpectedly green");
  assert.match(
    held.reason,
    /witness_replay_installation_evidence_high_water_/u,
  );
}

for (const key of [
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
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
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "designated_host_read_only_observation",
  "canonical_replay_writer_required",
  "canonical_replay_high_water_required",
  "descriptor_bound_root_observation",
  "descriptor_bound_file_reads",
  "terminal_root_and_file_revalidation",
  "double_census_required",
  "proc_mountinfo_read",
  "mountinfo_stability_required",
  "local_block_filesystem_required",
  "distinct_mount_domains_required",
  "distinct_parent_block_devices_required",
  "mount_source_device_number_bound",
  "single_parent_block_topology_required",
  "parent_disk_serial_and_wwn_required",
  "no_pending_publication_intent_required",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs",
  "utf8",
);
for (const token of [
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "/proc/self/mountinfo",
  '"/usr/bin/lsblk"',
  '"/usr/bin/stat"',
  '"SERIAL,WWN"',
  "isBlockDevice()",
  "mount_source_device_mismatch",
  "parent_topology_ambiguous",
  "assertPinnedRootVisible(",
  "assertPinnedFileVisible(",
  "assertIntentAbsent(",
  "classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1",
  "distinct_parent_block_devices_proven: live === true",
]) {
  assert.equal(
    source.includes(token),
    true,
    "missing evidence safety token: " + token,
  );
}
assert.doesNotMatch(
  source,
  /fs\.(?:writeFileSync|appendFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync|linkSync)\(/u,
);
assert.doesNotMatch(
  source,
  /spawnSync\(\s*["']\/usr\/bin\/ssh["']/u,
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-replay-installation-evidence-v1-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const journal = path.join(temp, "journal");
  const highWater = path.join(temp, "high-water");
  fs.mkdirSync(journal, { mode: 0o700 });
  fs.mkdirSync(highWater, { mode: 0o700 });
  fs.writeFileSync(
    path.join(journal, "live-read-replay-v1.jsonl"),
    journalBytes,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highWater, "live-read-replay-high-water-v1.json"),
    highWaterBytes,
    { mode: 0o600 },
  );
  const observed =
    inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
      journal_root: journal,
      high_water_root: highWater,
      expected_hostname: os.hostname(),
    });
  assert.equal(observed.ok, false);
  assert.equal(observed.protected_high_water_custody_proven, false);
  assert.equal(observed.independent_custody_proven, false);
  assert.equal(observed.production_gate_ready, false);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1_GREEN",
);
console.log("read_only_host_observation=true");
console.log("canonical_replay_writer_required=true");
console.log("canonical_replay_high_water_binding_required=true");
console.log("double_census_required=true");
console.log("mountinfo_stability_required=true");
console.log("distinct_mount_domains_required=true");
console.log("distinct_parent_block_devices_required=true");
console.log("mount_source_device_number_bound=true");
console.log("single_parent_block_topology_required=true");
console.log("parent_disk_serial_and_wwn_required=true");
console.log("same_physical_disk_partitions_accepted=false");
console.log("pending_publication_intent_accepted=false");
console.log("synthetic_storage_authority=false");
console.log("live_durable_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
