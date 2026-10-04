#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
  testOnlyClassifyAllocationCustodySnapshotV1,
  inspectBuyVoidAllocationCustodyPreflightV1,
  parseMountInfoV1,
  resolveMountForPathV1,
} from "../tools/void-buy-void-allocation-custody-preflight-v1.mjs";

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1,
  {
    designated_host_read_only_preflight: true,
    proc_mountinfo_read: true,
    filesystem_metadata_read: true,
    distinct_local_storage_domains_required: true,
    live_observation_required_for_domain_proof: true,
    designated_hostname_required: true,
    caller_supplied_snapshot_authority: false,
    synthetic_mountinfo_authority: false,
    source_mutation: false,
    filesystem_write: false,
    mount_mutation: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    inventory_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  },
);

const mountInfo = [
  "25 1 0:1 / / rw,relatime - rootfs rootfs rw",
  "36 25 8:1 / /ledger rw,relatime - ext4 /dev/sda1 rw",
  "37 25 8:17 / /high-water rw,relatime - xfs /dev/sdb1 rw",
  "38 36 8:2 / /ledger/escaped\\040mount rw,relatime - ext4 /dev/sda2 rw",
].join("\n") + "\n";

const parsed = parseMountInfoV1(mountInfo);
assert.equal(parsed.length, 4);
assert.equal(
  resolveMountForPathV1(parsed, "/ledger/alloc").mount_id,
  36,
);
assert.equal(
  resolveMountForPathV1(
    parsed,
    "/ledger/escaped mount/alloc",
  ).mount_id,
  38,
);
assert.equal(
  resolveMountForPathV1(parsed, "/ledger/escaped mount/alloc")
    .mount_point,
  "/ledger/escaped mount",
);

const greenSnapshot = Object.freeze({
  ledger: Object.freeze({
    path: "/ledger/alloc",
    dev: "2049",
    ino: "100",
    mode: 0o700,
    mount_id: 36,
    major_minor: "8:1",
    fs_type: "ext4",
    mount_source: "/dev/sda1",
    mount_point: "/ledger",
  }),
  high_water: Object.freeze({
    path: "/high-water/alloc",
    dev: "2065",
    ino: "200",
    mode: 0o700,
    mount_id: 37,
    major_minor: "8:17",
    fs_type: "xfs",
    mount_source: "/dev/sdb1",
    mount_point: "/high-water",
  }),
});

const green = testOnlyClassifyAllocationCustodySnapshotV1(greenSnapshot);
assert.equal(green.ok, true);
assert.equal(
  green.status,
  "DISTINCT_LOCAL_STORAGE_DOMAINS_CLASSIFIED_TEST_ONLY",
);
assert.equal(green.ready, false);
assert.equal(green.test_only, true);
assert.equal(green.live_observation_backed, false);
assert.equal(green.storage_domain_classification_green, true);
assert.equal(green.distinct_local_storage_domains_proven, false);
assert.equal(green.protected_high_water_custody_proven, false);
assert.equal(green.independent_custody_proven, false);
assert.equal(green.production_gate_ready, false);
assert.equal(
  green.next_gate,
  "designated_host_live_observation_required",
);

for (const patch of [
  { high_water: { dev: greenSnapshot.ledger.dev } },
  { high_water: { mount_id: greenSnapshot.ledger.mount_id } },
  {
    high_water: {
      major_minor: greenSnapshot.ledger.major_minor,
    },
  },
  {
    high_water: {
      mount_source: greenSnapshot.ledger.mount_source,
    },
  },
]) {
  const snapshot = structuredClone(greenSnapshot);
  Object.assign(snapshot.high_water, patch.high_water);
  const decision = testOnlyClassifyAllocationCustodySnapshotV1(snapshot);
  assert.equal(decision.ok, false);
  assert.equal(
    decision.reason,
    "custody_storage_domains_not_distinct",
  );
  assert.equal(decision.independent_custody_proven, false);
}

for (const patch of [
  { fs_type: "nfs" },
  { fs_type: "overlay" },
  { fs_type: "tmpfs" },
  { mount_source: "server:/volume" },
]) {
  const snapshot = structuredClone(greenSnapshot);
  Object.assign(snapshot.high_water, patch);
  const decision = testOnlyClassifyAllocationCustodySnapshotV1(snapshot);
  assert.equal(decision.ok, false);
  assert.equal(
    decision.reason,
    "high_water_storage_domain_invalid",
  );
  assert.equal(decision.production_gate_ready, false);
}

{
  const snapshot = structuredClone(greenSnapshot);
  snapshot.high_water.path = "/ledger/alloc/high-water";
  const decision = testOnlyClassifyAllocationCustodySnapshotV1(snapshot);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "custody_roots_not_path_disjoint");
}

assert.throws(
  () => parseMountInfoV1("not mountinfo\n"),
  /mountinfo_line_invalid/u,
);
assert.throws(
  () => parseMountInfoV1(""),
  /mountinfo_missing/u,
);

const preflightSource = fs.readFileSync(
  "tools/void-buy-void-allocation-custody-preflight-v1.mjs",
  "utf8",
);
for (const token of [
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "fs.fstatSync(",
  "sameDirectoryIdentity(",
  "assertObservedRootStable(",
  "mountinfo_changed_during_observation",
  "observation_descriptor_bound: true",
  "mountinfo_stable_across_observation: true",
]) {
  assert.equal(
    preflightSource.includes(token),
    true,
    "missing live-observation stability token: " + token,
  );
}
assert.equal(
  (
    preflightSource.match(
      /fs\.readFileSync\(\s*"\/proc\/self\/mountinfo"/gu,
    ) || []
  ).length,
  2,
  "live custody observation must bracket root inspection with two mountinfo reads",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-allocation-custody-preflight-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const ledgerRoot = path.join(temp, "ledger");
  const highWaterRoot = path.join(temp, "high-water");
  fs.mkdirSync(ledgerRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });

  const actual = inspectBuyVoidAllocationCustodyPreflightV1({
    ledger_root: ledgerRoot,
    high_water_root: highWaterRoot,
    expected_hostname: os.hostname(),
  });
  assert.equal(actual.ok, false);
  assert.equal(actual.independent_custody_proven, false);
  assert.equal(actual.production_gate_ready, false);

  const missingHost = inspectBuyVoidAllocationCustodyPreflightV1({
    ledger_root: ledgerRoot,
    high_water_root: highWaterRoot,
  });
  assert.equal(missingHost.ok, false);
  assert.equal(
    missingHost.reason,
    "designated_host_expectation_required",
  );

  const wrongHost = inspectBuyVoidAllocationCustodyPreflightV1({
    ledger_root: ledgerRoot,
    high_water_root: highWaterRoot,
    expected_hostname: os.hostname() + "-wrong",
  });
  assert.equal(wrongHost.ok, false);
  assert.equal(wrongHost.reason, "designated_host_mismatch");

  const alias = path.join(temp, "ledger-alias");
  fs.symlinkSync(ledgerRoot, alias);
  const symlinkHold = inspectBuyVoidAllocationCustodyPreflightV1({
    ledger_root: alias,
    high_water_root: highWaterRoot,
    expected_hostname: os.hostname(),
  });
  assert.equal(symlinkHold.ok, false);
  assert.equal(
    symlinkHold.reason,
    "ledger_symlink_ancestor_or_alias",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1_GREEN");
console.log("read_only=true");
console.log("synthetic_snapshot_authority=false");
console.log("synthetic_mountinfo_authority=false");
console.log("designated_hostname_required=true");
console.log("live_observation_required_for_domain_proof=true");
console.log("live_observation_descriptor_bound=true");
console.log("mountinfo_stability_recheck_required=true");
console.log("distinct_local_storage_domains_required=true");
console.log("network_filesystems_accepted=false");
console.log("shared_device_domains_accepted=false");
console.log("symlink_root_accepted=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
