#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
} from "../src/economic/buy_void_allocation_reservation_publication_writer_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_EVIDENCE_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1,
  classifyBuyVoidAllocationHighWaterCustodyQualificationV1,
} from "../src/economic/buy_void_allocation_high_water_custody_qualification_v1.js";

const SOURCE_HEAD = "a".repeat(40);
const HOST_ID = "sha256:" + "b".repeat(64);
const NOW_MS = 2_000_000;
const OBSERVED_AT_MS = 1_900_000;
const EXPIRES_AT_MS = 2_300_000;
const RUNTIME_UID = 2101;
const RUNTIME_GID = 2101;
const CUSTODY_UID = 2201;
const CUSTODY_GID = 2201;

const sha256Id = (value: string | Buffer): string =>
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"))
    .digest("hex");

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & { ok: boolean; reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_hold");
  }
  return value as Extract<T, { ok: true }>;
}

const genesis = requireOk(
  deriveBuyVoidAllocationReservationHighWaterV1(""),
);
const ledger = "";
const highWater = genesis.high_water_json;

const ancestor = (entryPath: string) => ({
  path: entryPath,
  uid: 0,
  gid: 0,
  mode: 0o755,
  is_symlink: false,
  runtime_can_write: false,
  runtime_can_rename: false,
  custody_can_write: false,
  custody_can_rename: false,
});

const mount = (
  mountId: string,
  device: string,
  source: string,
) => ({
  mount_id: mountId,
  device_major_minor: device,
  mount_source: source,
  fs_type: "ext4",
  options: ["nodev", "noexec", "nosuid", "rw"],
  read_only: false,
});

const rootEvidence = (
  rootPath: string,
  ancestors: string[],
  mountValue: ReturnType<typeof mount>,
) => ({
  path: rootPath,
  uid: CUSTODY_UID,
  gid: CUSTODY_GID,
  mode: 0o700,
  is_symlink: false,
  runtime_can_write_contents: false,
  runtime_can_rename_path: false,
  custody_can_write_contents: true,
  custody_can_rename_path: false,
  ancestors: ancestors.map(ancestor),
  mount: mountValue,
});

function evidence() {
  return {
    schema:
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_EVIDENCE_SCHEMA_V1,
    marker:
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1,
    version: 1,
    evidence_generation: 7,
    observed_at_ms: OBSERVED_AT_MS,
    expires_at_ms: EXPIRES_AT_MS,
    source: {
      repository: "6ZoSo9/void-node",
      source_head_sha: SOURCE_HEAD,
      writer_marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
    },
    host: {
      host_id_sha256: HOST_ID,
      runtime_uid: RUNTIME_UID,
      runtime_gid: RUNTIME_GID,
      custody_uid: CUSTODY_UID,
      custody_gid: CUSTODY_GID,
    },
    ledger: rootEvidence(
      "/srv/void-allocation-ledger-v1",
      ["/", "/srv"],
      mount("41", "8:1", "/dev/disk/by-uuid/void-ledger"),
    ),
    custody: rootEvidence(
      "/mnt/void-allocation-custody-v1",
      ["/", "/mnt"],
      mount("52", "8:2", "/dev/disk/by-uuid/void-custody"),
    ),
    ipc: {
      socket_path:
        "/run/void-allocation-custody-v1/custody.sock",
      parent_path: "/run/void-allocation-custody-v1",
      owner_uid: CUSTODY_UID,
      owner_gid: RUNTIME_GID,
      mode: 0o660,
      address_family: "AF_UNIX",
      runtime_can_connect: true,
      runtime_can_write_parent: false,
      runtime_can_replace_socket: false,
      custody_can_write_parent: true,
    },
    service_hardening: {
      no_new_privileges: true,
      private_tmp: true,
      private_devices: true,
      protect_system_strict: true,
      protect_home: true,
      protect_kernel_tunables: true,
      protect_kernel_modules: true,
      protect_control_groups: true,
      lock_personality: true,
      restrict_suid_sgid: true,
      restrict_realtime: true,
      capability_bounding_set_empty: true,
      ambient_capabilities_empty: true,
      af_unix_only: true,
      read_write_paths: [
        "/mnt/void-allocation-custody-v1",
        "/srv/void-allocation-ledger-v1",
      ],
    },
    negative_probes: {
      runtime_rename_ledger_root_denied: true,
      runtime_rename_custody_root_denied: true,
      runtime_recreate_ledger_parent_denied: true,
      runtime_recreate_custody_parent_denied: true,
      symlink_substitution_denied: true,
      bind_mount_substitution_denied: true,
      remount_substitution_denied: true,
      custody_medium_missing_holds: true,
      stale_high_water_rejected: true,
      alternate_same_generation_high_water_rejected: true,
      both_root_rollback_rejected: true,
      reboot_mount_identity_stable: true,
    },
    state: {
      ledger_sha256: sha256Id(ledger),
      ledger_bytes: Buffer.byteLength(ledger, "utf8"),
      high_water_sha256: sha256Id(highWater),
      high_water_bytes: Buffer.byteLength(highWater, "utf8"),
    },
  };
}

function classify(
  evidenceValue: unknown = evidence(),
  overrides: Partial<{
    now_ms: number;
    expected_source_head_sha: string;
    expected_host_id_sha256: string;
    ledger_jsonl: string;
    high_water_json: string;
  }> = {},
) {
  return classifyBuyVoidAllocationHighWaterCustodyQualificationV1({
    now_ms: overrides.now_ms ?? NOW_MS,
    expected_source_head_sha:
      overrides.expected_source_head_sha ?? SOURCE_HEAD,
    expected_host_id_sha256:
      overrides.expected_host_id_sha256 ?? HOST_ID,
    ledger_jsonl: overrides.ledger_jsonl ?? ledger,
    high_water_json: overrides.high_water_json ?? highWater,
    evidence: evidenceValue,
  });
}

function cloneEvidence() {
  return structuredClone(evidence());
}

function expectHeld(
  value: ReturnType<typeof classify>,
  reason: string | RegExp,
): void {
  const runtime = value as { ok: boolean; reason?: string };
  assert.equal(runtime.ok, false);
  if (typeof reason === "string") {
    assert.equal(runtime.reason, reason);
  } else {
    assert.match(String(runtime.reason ?? ""), reason);
  }
}

const qualified = requireOk(classify());
assert.equal(qualified.status, "qualified_source_evidence");
assert.equal(qualified.source_head_sha, SOURCE_HEAD);
assert.equal(qualified.host_id_sha256, HOST_ID);
assert.equal(qualified.ledger_sha256, sha256Id(ledger));
assert.equal(qualified.high_water_sha256, sha256Id(highWater));
assert.equal(qualified.separate_device_custody, true);
assert.equal(qualified.root_path_stability_evidence, true);
assert.equal(qualified.runtime_write_isolation_evidence, true);
assert.equal(qualified.service_hardening_evidence, true);
assert.equal(qualified.evidence_fresh, true);
assert.equal(qualified.live_host_qualification, false);
assert.equal(qualified.production_gate_ready, false);
assert.equal(qualified.funds_movement, false);
assert.match(qualified.evidence_sha256, /^sha256:[0-9a-f]{64}$/u);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_classifier",
    "pure_evidence_validation",
    "exact_current_state_binding",
    "runtime_custody_identity_separation_required",
    "stable_root_ancestor_policy_required",
    "separate_device_custody_required",
    "af_unix_ipc_required",
    "systemd_hardening_required",
    "negative_probe_evidence_required",
    "freshness_required",
    "synthetic_evidence_qualification",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

{
  const bad = cloneEvidence();
  bad.host.custody_uid = bad.host.runtime_uid;
  expectHeld(
    classify(bad),
    "allocation_custody_host_identity_invalid",
  );
}

for (const mutate of [
  (bad: ReturnType<typeof cloneEvidence>) => {
    bad.custody.mount.mount_id = bad.ledger.mount.mount_id;
  },
  (bad: ReturnType<typeof cloneEvidence>) => {
    bad.custody.mount.device_major_minor =
      bad.ledger.mount.device_major_minor;
  },
  (bad: ReturnType<typeof cloneEvidence>) => {
    bad.custody.mount.mount_source =
      bad.ledger.mount.mount_source;
  },
]) {
  const bad = cloneEvidence();
  mutate(bad);
  expectHeld(
    classify(bad),
    "allocation_custody_independent_device_required",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.runtime_can_write_contents = true;
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_authority_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.ancestors[1].mode = 0o777;
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_ancestors_writable_ancestor",
  );
}

{
  const bad = cloneEvidence();
  bad.ledger.ancestors[1].runtime_can_rename = true;
  expectHeld(
    classify(bad),
    "allocation_custody_ledger_ancestors_authority_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.mount.options = [
    "bind",
    "nodev",
    "noexec",
    "nosuid",
    "rw",
  ];
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_mount_forbidden_option",
  );
}

{
  const bad = cloneEvidence();
  bad.ipc.address_family = "AF_INET" as "AF_UNIX";
  expectHeld(
    classify(bad),
    "allocation_custody_ipc_authority_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.ipc.runtime_can_replace_socket = true;
  expectHeld(
    classify(bad),
    "allocation_custody_ipc_authority_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.service_hardening.no_new_privileges =
    false as true;
  expectHeld(
    classify(bad),
    "allocation_custody_hardening_incomplete",
  );
}

{
  const bad = cloneEvidence();
  bad.service_hardening.read_write_paths = [
    "/srv/void-allocation-ledger-v1",
  ];
  expectHeld(
    classify(bad),
    "allocation_custody_hardening_paths_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.negative_probes.runtime_rename_custody_root_denied =
    false as true;
  expectHeld(
    classify(bad),
    "allocation_custody_negative_probe_failed",
  );
}

{
  const bad = cloneEvidence();
  bad.observed_at_ms = NOW_MS - 5 * 60 * 1000 - 1;
  bad.expires_at_ms = NOW_MS + 1;
  expectHeld(classify(bad), "allocation_custody_evidence_stale");
}

expectHeld(
  classify(evidence(), {
    expected_source_head_sha: "c".repeat(40),
  }),
  "allocation_custody_source_binding_invalid",
);

expectHeld(
  classify(evidence(), {
    expected_host_id_sha256:
      "sha256:" + "d".repeat(64),
  }),
  "allocation_custody_host_identity_invalid",
);

{
  const bad = cloneEvidence();
  bad.state.ledger_sha256 = "sha256:" + "e".repeat(64);
  expectHeld(
    classify(bad),
    "allocation_custody_state_digest_mismatch",
  );
}

{
  const malformedHighWater =
    highWater.replace(
      '"remaining_void":"10000000"',
      '"remaining_void":"9999999"',
    );
  expectHeld(
    classify(evidence(), {
      high_water_json: malformedHighWater,
    }),
    /allocation_custody_current_state_/u,
  );
}

{
  const bad = cloneEvidence();
  bad.ledger.is_symlink = true as false;
  expectHeld(
    classify(bad),
    "allocation_custody_ledger_authority_invalid",
  );
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1_PROOF_GREEN",
);
console.log("synthetic_evidence_qualification=true");
console.log("exact_current_state_binding=true");
console.log("runtime_and_custody_uid_separated=true");
console.log("root_owned_nonwritable_ancestor_chain_required=true");
console.log("separate_device_custody_required=true");
console.log("bind_and_remount_substitution_rejected=true");
console.log("af_unix_narrow_ipc_required=true");
console.log("systemd_hardening_required=true");
console.log("negative_probe_evidence_required=true");
console.log("freshness_required=true");
console.log("live_host_observation=false");
console.log("live_host_qualification=false");
console.log("host_mutation=false");
console.log("service_installation=false");
console.log("service_start=false");
console.log("mount_mutation=false");
console.log("ownership_or_permission_mutation=false");
console.log("runtime_integration=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1,
);
