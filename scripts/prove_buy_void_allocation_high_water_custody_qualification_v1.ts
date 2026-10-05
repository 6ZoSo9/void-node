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
const EVIDENCE_GENERATION = 7;
const SERVICE_UNIT_SHA256 = "sha256:" + "f".repeat(64);
const LEDGER_ROLLBACK_DOMAIN_SHA256 =
  "sha256:" + "1".repeat(64);
const CUSTODY_ROLLBACK_DOMAIN_SHA256 =
  "sha256:" + "2".repeat(64);

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
  mountPoint: string,
  device: string,
  source: string,
  rollbackDomainSha256: string,
) => ({
  mount_id: mountId,
  mount_point: mountPoint,
  device_major_minor: device,
  mount_source: source,
  rollback_domain_sha256: rollbackDomainSha256,
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
    evidence_generation: EVIDENCE_GENERATION,
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
      mount(
        "41",
        "/srv",
        "8:1",
        "/dev/disk/by-uuid/void-ledger",
        LEDGER_ROLLBACK_DOMAIN_SHA256,
      ),
    ),
    custody: rootEvidence(
      "/mnt/void-allocation-custody-v1",
      ["/", "/mnt"],
      mount(
        "52",
        "/mnt",
        "8:2",
        "/dev/disk/by-uuid/void-custody",
        CUSTODY_ROLLBACK_DOMAIN_SHA256,
      ),
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
      unit_name: "void-allocation-custody-v1.service",
      unit_sha256: SERVICE_UNIT_SHA256,
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
    recovery_probes: {
      clean_restart_bound: true,
      intent_only_restart_recovers: true,
      ledger_committed_restart_recovers: true,
      high_water_committed_restart_recovers: true,
      complete_restart_recovers: true,
      forward_only_recovery: true,
      no_duplicate_allocation_obligation: true,
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
      ledger_file: {
        path:
          "/srv/void-allocation-ledger-v1/allocation-reservations-v1.jsonl",
        uid: CUSTODY_UID,
        gid: CUSTODY_GID,
        mode: 0o600,
        is_regular_file: true,
        is_symlink: false,
        nlink: 1,
        sha256: sha256Id(ledger),
        bytes: Buffer.byteLength(ledger, "utf8"),
      },
      high_water_file: {
        path:
          "/mnt/void-allocation-custody-v1/allocation-reservation-high-water-v1.json",
        uid: CUSTODY_UID,
        gid: CUSTODY_GID,
        mode: 0o600,
        is_regular_file: true,
        is_symlink: false,
        nlink: 1,
        sha256: sha256Id(highWater),
        bytes: Buffer.byteLength(highWater, "utf8"),
      },
    },
  };
}

function classify(
  evidenceValue: unknown = evidence(),
  overrides: Partial<{
    now_ms: number;
    expected_source_head_sha: string;
    expected_host_id_sha256: string;
    expected_service_unit_sha256: string;
    expected_ledger_rollback_domain_sha256: string;
    expected_custody_rollback_domain_sha256: string;
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
    expected_evidence_generation: EVIDENCE_GENERATION,
    expected_service_unit_sha256:
      (overrides as any).expected_service_unit_sha256 ??
      SERVICE_UNIT_SHA256,
    expected_ledger_rollback_domain_sha256:
      (overrides as any).expected_ledger_rollback_domain_sha256 ??
      LEDGER_ROLLBACK_DOMAIN_SHA256,
    expected_custody_rollback_domain_sha256:
      (overrides as any).expected_custody_rollback_domain_sha256 ??
      CUSTODY_ROLLBACK_DOMAIN_SHA256,
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
assert.equal(qualified.distinct_mount_identity_evidence, true);
assert.equal(qualified.independent_rollback_domain_evidence, true);
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
    "disjoint_storage_roots_required",
    "shared_ancestor_consistency_required",
    "root_mount_binding_required",
    "distinct_mount_identity_required",
    "independent_rollback_domain_identity_required",
    "af_unix_ipc_required",
    "systemd_hardening_required",
    "negative_probe_evidence_required",
    "recovery_phase_evidence_required",
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

{
  const bad = cloneEvidence();
  bad.custody.path =
    "/srv/void-allocation-ledger-v1/protected-high-water";
  bad.custody.ancestors = [
    ancestor("/"),
    ancestor("/srv"),
    ancestor("/srv/void-allocation-ledger-v1"),
  ];
  bad.service_hardening.read_write_paths = [
    bad.ledger.path,
    bad.custody.path,
  ].sort();
  bad.state.high_water_file.path =
    bad.custody.path + "/allocation-reservation-high-water-v1.json";
  expectHeld(
    classify(bad),
    "allocation_custody_storage_roots_must_be_disjoint",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.ancestors[0].mode = 0o555;
  expectHeld(
    classify(bad),
    "allocation_custody_shared_ancestor_evidence_mismatch",
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
    "allocation_custody_distinct_mount_identity_required",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.mount.mount_point = "/opt/unrelated";
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_mount_point_binding_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.mount.rollback_domain_sha256 =
    bad.ledger.mount.rollback_domain_sha256;
  expectHeld(
    classify(bad),
    "allocation_custody_independent_rollback_domain_required",
  );
}

expectHeld(
  classify(evidence(), {
    expected_custody_rollback_domain_sha256:
      LEDGER_ROLLBACK_DOMAIN_SHA256,
  }),
  "allocation_custody_expected_rollback_domain_invalid",
);

expectHeld(
  classify(evidence(), {
    expected_custody_rollback_domain_sha256:
      "sha256:" + "3".repeat(64),
  }),
  "allocation_custody_independent_rollback_domain_required",
);

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

for (const contradictory of ["dev", "exec", "suid", "ro"]) {
  const bad = cloneEvidence();
  bad.custody.mount.options = [
    contradictory,
    "nodev",
    "noexec",
    "nosuid",
    "rw",
  ].sort();
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_mount_forbidden_option",
  );
}

{
  const bad = cloneEvidence();
  bad.ledger.path = " /srv/void-allocation-ledger-v1";
  expectHeld(
    classify(bad),
    "allocation_custody_ledger_path_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.mount.mount_source =
    "/dev/disk/by-uuid/void-custody ";
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_mount_source_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.custody.mount.rollback_domain_sha256 =
    CUSTODY_ROLLBACK_DOMAIN_SHA256 + " ";
  expectHeld(
    classify(bad),
    "allocation_custody_high_water_mount_rollback_domain_invalid",
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
  bad.evidence_generation = EVIDENCE_GENERATION + 1;
  expectHeld(
    classify(bad),
    "allocation_custody_evidence_generation_mismatch",
  );
}

{
  const bad = cloneEvidence() as any;
  bad.host.custody_uid = String(CUSTODY_UID);
  expectHeld(
    classify(bad),
    "allocation_custody_service_uid_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.service_hardening.unit_sha256 =
    "sha256:" + "1".repeat(64);
  expectHeld(
    classify(bad),
    "allocation_custody_service_unit_binding_invalid",
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
  bad.recovery_probes.ledger_committed_restart_recovers =
    false as true;
  expectHeld(
    classify(bad),
    "allocation_custody_recovery_probe_failed",
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
    expected_source_head_sha: SOURCE_HEAD + " ",
  }),
  "allocation_custody_expected_source_head_invalid",
);

expectHeld(
  classify(evidence(), {
    expected_host_id_sha256: HOST_ID + " ",
  }),
  "allocation_custody_expected_host_id_invalid",
);

expectHeld(
  classify(evidence(), {
    expected_service_unit_sha256: SERVICE_UNIT_SHA256 + " ",
  }),
  "allocation_custody_expected_service_unit_sha256_invalid",
);

expectHeld(
  classify(evidence(), {
    expected_ledger_rollback_domain_sha256:
      LEDGER_ROLLBACK_DOMAIN_SHA256 + " ",
  }),
  "allocation_custody_expected_rollback_domain_invalid",
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
  bad.state.ledger_file.sha256 = "sha256:" + "e".repeat(64);
  expectHeld(
    classify(bad),
    "allocation_custody_state_ledger_file_content_binding_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.state.ledger_file.path = "/tmp/allocation-reservations-v1.jsonl";
  expectHeld(
    classify(bad),
    "allocation_custody_state_ledger_file_path_binding_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.state.high_water_file.path =
    "/mnt/void-allocation-custody-v1/other.json";
  expectHeld(
    classify(bad),
    "allocation_custody_state_high_water_file_path_binding_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.state.high_water_file.is_symlink = true as false;
  expectHeld(
    classify(bad),
    "allocation_custody_state_high_water_file_custody_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.state.ledger_file.mode = 0o644;
  expectHeld(
    classify(bad),
    "allocation_custody_state_ledger_file_custody_invalid",
  );
}

{
  const bad = cloneEvidence();
  bad.state.ledger_file.nlink = 2 as 1;
  expectHeld(
    classify(bad),
    "allocation_custody_state_ledger_file_custody_invalid",
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
console.log("canonical_state_file_path_binding=true");
console.log("direct_private_single_link_state_files_required=true");
console.log("runtime_and_custody_uid_separated=true");
console.log("root_owned_nonwritable_ancestor_chain_required=true");
console.log("disjoint_storage_roots_required=true");
console.log("shared_ancestor_consistency_required=true");
console.log("root_mount_binding_required=true");
console.log("distinct_mount_identity_required=true");
console.log("independent_rollback_domain_identity_required=true");
console.log("bind_and_remount_substitution_rejected=true");
console.log("contradictory_mount_security_options_rejected=true");
console.log("af_unix_narrow_ipc_required=true");
console.log("systemd_hardening_required=true");
console.log("negative_probe_evidence_required=true");
console.log("all_publication_recovery_phases_required=true");
console.log("forward_only_no_duplicate_recovery_required=true");
console.log("freshness_required=true");
console.log("caller_bound_evidence_generation=true");
console.log("canonical_evidence_string_spelling_required=true");
console.log("caller_expected_identity_spelling_exact=true");
console.log("typed_json_integer_evidence_required=true");
console.log("reviewed_service_unit_sha256_required=true");
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
