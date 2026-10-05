import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1,
  classifyCoupledNativeGasReconciliationCustodyQualificationV1,
} from "../src/economic/coupled_native_gas_reconciliation_custody_qualification_v1.js";
import {
  buildCoupledNativeGasStorePayerDomainV1,
  serializeCoupledNativeGasStorePayerDomainV1,
} from "../src/economic/coupled_native_gas_liability_store_v1.js";

const now = 1_800_000_000_000;
const payerAddress = "0x" + "a".repeat(40);
const canonicalPayerDomain =
  buildCoupledNativeGasStorePayerDomainV1(payerAddress);
const payerDomainId = canonicalPayerDomain.payer_domain_id;
const payerDomainContentSha256 =
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(
      serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
      "utf8",
    )
    .digest("hex");
const root = "/var/lib/void/native-gas/payer-a";

function ancestor(
  path: string,
  ino: number,
): Record<string, unknown> {
  return {
    path,
    dev: "2049",
    ino: String(ino),
    uid: 0,
    gid: 0,
    mode: "0755",
    symlink: false,
    public_runtime_write: false,
    public_runtime_rename: false,
    public_runtime_recreate: false,
  };
}

function directory(
  resolved_path: string,
  ino: number,
): Record<string, unknown> {
  return {
    resolved_path,
    dev: "2049",
    ino: String(ino),
    uid: 2000,
    gid: 2000,
    mode: "0700",
    symlink: false,
    public_runtime_write: false,
    public_runtime_rename: false,
    public_runtime_recreate: false,
  };
}

function green(): Record<string, unknown> {
  return {
    verification_now_ms: now,
    payer_address: payerAddress,
    host_evidence: {
      host_id: "precision-mainnet0",
      evidence_snapshot: {
        observed_at_ms: now - 10_000,
        expires_at_ms: now + 120_000,
        evidence_generation: "7",
        boot_id_sha256: "sha256:" + "1".repeat(64),
      },
      public_runtime_uid: 1000,
      public_runtime_gid: 1000,
      service_uid: 2000,
      service_gid: 2000,
      payer_root: {
        resolved_path: root,
        dev: "2049",
        ino: "100",
        uid: 2000,
        gid: 2000,
        mode: "0700",
        symlink: false,
        public_runtime_write: false,
        public_runtime_rename: false,
        public_runtime_recreate: false,
        ancestors: [
          ancestor("/", 1),
          ancestor("/var", 2),
          ancestor("/var/lib", 3),
          ancestor("/var/lib/void", 4),
          ancestor("/var/lib/void/native-gas", 5),
        ],
        mount: {
          medium_present: true,
          mount_target: "/var/lib/void/native-gas",
          mount_source: "/dev/disk/by-uuid/void-gas",
          mount_uuid: "void-gas-uuid",
          major_minor: "8:17",
          filesystem_type: "ext4",
          statfs_type: "0xef53",
          mount_options: ["nodev", "nosuid", "rw"],
          public_runtime_remount: false,
          public_runtime_bind_mount: false,
        },
      },
      payer_domain: {
        resolved_path: root + "/payer-domain-v1.json",
        dev: "2049",
        ino: "104",
        uid: 2000,
        gid: 2000,
        mode: "0600",
        symlink: false,
        nlink: 1,
        payer_domain_id: payerDomainId,
        content_sha256: payerDomainContentSha256,
      },
      records: directory(root + "/records", 101),
      reconciliations: directory(root + "/reconciliations", 102),
      queue: directory(root + "/gas-liability-admission-v1.queue", 103),
      service_policy: {
        unit_name: "void-native-gas-reconciliation-custody.service",
        unit_sha256: "sha256:" + "3".repeat(64),
        user_uid: 2000,
        group_gid: 2000,
        umask: "0077",
        no_new_privileges: true,
        private_tmp: true,
        private_devices: true,
        protect_system: "strict",
        protect_home: true,
        protect_kernel_tunables: true,
        protect_kernel_modules: true,
        protect_control_groups: true,
        lock_personality: true,
        restrict_suid_sgid: true,
        restrict_realtime: true,
        capability_bounding_set: [],
        ambient_capabilities: [],
        read_write_paths: [root],
        public_runtime_can_control_service: false,
      },
      negative_mutation_tests: {
        same_uid_root_rename_denied: true,
        same_uid_root_recreate_denied: true,
        symlink_substitution_denied: true,
        bind_mount_substitution_denied: true,
        remount_denied: true,
        alternate_namespace_substitution_denied: true,
      },
      fallback_storage_enabled: false,
      missing_storage_holds: true,
    },
  };
}

function decision(
  input: Record<string, unknown>,
) {
  return classifyCoupledNativeGasReconciliationCustodyQualificationV1(
    input,
  );
}

function requireHeld(
  input: Record<string, unknown>,
  reason?: string,
): void {
  const result = decision(input);
  assert.equal(result.ok, false);
  if (result.ok === false && reason) {
    assert.equal(result.reason, reason);
  }
  assert.equal(result.production_gate_ready, false);
  assert.equal(result.operation_performed, false);
}

const baseline = decision(green());
assert.equal(baseline.ok, true);
if (baseline.ok !== true) throw new Error(baseline.reason);
assert.equal(baseline.status, "source_qualified");
assert.equal(baseline.payer_address, payerAddress);
assert.equal(baseline.payer_domain_id, payerDomainId);
assert.equal(baseline.root_path_stability_evidence_qualified, true);
assert.equal(baseline.namespace_identity_evidence_qualified, true);
assert.equal(baseline.service_policy_evidence_qualified, true);
assert.equal(baseline.negative_mutation_evidence_qualified, true);
assert.equal(baseline.bounded_evidence_freshness_checked, true);
assert.equal(baseline.writer_generation_binding_proven, false);
assert.equal(baseline.bootstrap_receipt_external_trust_proven, false);
assert.equal(baseline.evidence_generation_monotonicity_proven, false);
assert.equal(baseline.verification_clock_authority_proven, false);
assert.equal(baseline.live_host_qualification_performed, false);
assert.equal(baseline.storage_bootstrap, false);
assert.equal(baseline.runtime_integration, false);
assert.equal(baseline.production_gate_ready, false);
assert.equal(baseline.operation_performed, false);
assert.match(
  baseline.qualification_id_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.match(
  String(baseline.receipt.receipt_sha256),
  /^sha256:[0-9a-f]{64}$/u,
);

{
  const x = structuredClone(green()) as any;
  x.host_evidence.evidence_snapshot.expires_at_ms = now;
  requireHeld(x, "reconciliation_custody_snapshot_not_fresh");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.evidence_snapshot.observed_at_ms = now + 1;
  requireHeld(x, "reconciliation_custody_snapshot_not_fresh");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.evidence_snapshot.observed_at_ms = now - 1;
  x.host_evidence.evidence_snapshot.expires_at_ms =
    now + 5 * 60 * 1000 + 1;
  requireHeld(x, "reconciliation_custody_snapshot_not_fresh");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.evidence_snapshot.evidence_generation = "0";
  requireHeld(x, "reconciliation_custody_snapshot_not_fresh");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.service_uid = 1000;
  x.host_evidence.service_policy.user_uid = 1000;
  x.host_evidence.payer_root.uid = 1000;
  x.host_evidence.records.uid = 1000;
  x.host_evidence.reconciliations.uid = 1000;
  x.host_evidence.queue.uid = 1000;
  x.host_evidence.payer_domain.uid = 1000;
  requireHeld(x, "reconciliation_custody_identity_not_separated");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.ancestors[3].uid = 2000;
  requireHeld(x, "reconciliation_custody_ancestor_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.ancestors[4].mode = "0775";
  requireHeld(x, "reconciliation_custody_ancestor_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.public_runtime_rename = true;
  requireHeld(x, "reconciliation_custody_root_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.symlink = true;
  requireHeld(x, "reconciliation_custody_root_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.mount.public_runtime_bind_mount = true;
  requireHeld(x, "reconciliation_custody_mount_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.mount.public_runtime_remount = true;
  requireHeld(x, "reconciliation_custody_mount_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_root.mount.mount_target = "/srv/elsewhere";
  requireHeld(x, "reconciliation_custody_mount_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.reconciliations.resolved_path =
    root + "/alternate-reconciliations";
  requireHeld(x, "reconciliation_custody_namespace_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.reconciliations.ino =
    x.host_evidence.records.ino;
  requireHeld(x, "reconciliation_custody_identity_alias_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_domain.payer_domain_id = "b".repeat(64);
  requireHeld(x, "reconciliation_custody_payer_domain_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.payer_address = "0x" + "b".repeat(40);
  requireHeld(x, "reconciliation_custody_payer_domain_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_domain.content_sha256 =
    "sha256:" + "f".repeat(64);
  requireHeld(x, "reconciliation_custody_payer_domain_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.payer_domain.nlink = 2;
  requireHeld(x, "reconciliation_custody_payer_domain_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.service_policy.no_new_privileges = false;
  requireHeld(x, "reconciliation_custody_service_policy_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.service_policy.read_write_paths = [
    root,
    "/tmp",
  ];
  requireHeld(x, "reconciliation_custody_service_policy_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.negative_mutation_tests.remount_denied = false;
  requireHeld(x, "reconciliation_custody_negative_tests_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.fallback_storage_enabled = true;
  requireHeld(x, "reconciliation_custody_fallback_policy_invalid");
}
{
  const x = structuredClone(green()) as any;
  x.host_evidence.missing_storage_holds = false;
  requireHeld(x, "reconciliation_custody_fallback_policy_invalid");
}
{
  const x = structuredClone(green()) as any;
  delete x.host_evidence.reconciliations;
  requireHeld(x, "reconciliation_custody_host_evidence_invalid");
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1,
)) {
  if ([
    "source_only_contract",
    "host_evidence_input_only",
    "dedicated_service_identity_required",
    "exact_payer_domain_identity_required",
    "canonical_payer_domain_binding_reused",
    "exact_payer_domain_bytes_required",
    "exact_namespace_identity_required",
    "root_owned_ancestor_chain_required",
    "root_path_stability_evidence_required",
    "mount_instance_fingerprint_bound",
    "remount_denial_evidence_required",
    "bind_mount_denial_evidence_required",
    "same_uid_root_replacement_denial_required",
    "symlink_substitution_denial_required",
    "hardened_service_policy_required",
    "no_fallback_storage_required",
    "bounded_evidence_freshness_checked",
  ].includes(key)) {
    assert.equal(value, true, key);
  }
}

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1_GREEN",
);
console.log("source_only_contract=true");
console.log("host_evidence_input_only=true");
console.log("root_owned_ancestor_chain_required=true");
console.log("same_uid_root_replacement_denial_required=true");
console.log("symlink_substitution_denial_required=true");
console.log("bind_mount_denial_evidence_required=true");
console.log("remount_denial_evidence_required=true");
console.log("exact_payer_domain_identity_required=true");
console.log("canonical_payer_domain_binding_reused=true");
console.log("exact_payer_domain_bytes_required=true");
console.log("exact_reconciliation_namespace_required=true");
console.log("hardened_service_policy_required=true");
console.log("bounded_evidence_freshness_checked=true");
console.log("writer_generation_binding_proven=false");
console.log("bootstrap_receipt_external_trust_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("live_host_qualification_performed=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
