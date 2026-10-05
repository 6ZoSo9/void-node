#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildCoupledNativeGasStorePayerDomainV1,
  serializeCoupledNativeGasStorePayerDomainV1,
} from "../src/economic/coupled_native_gas_liability_store_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SYSTEMD_CONTROL_VERBS_V1,
  assertSimpleAclTextV1,
  parseProcStatusV1,
  parseProcStatStartTimeV1,
  parseSystemdShowV1,
  restrictMountNamespaceDeniedV1,
  testOnlyBuildMountNamespaceBundleV1,
  testOnlyClassifyCollectedHostEvidenceV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs";

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(String(value), "utf8").digest("hex")
  );
}

assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1,
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1",
);

assert.deepEqual(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SYSTEMD_CONTROL_VERBS_V1,
  [
    "start",
    "stop",
    "reload",
    "restart",
    "try-restart",
    "reload-or-restart",
    "reload-or-try-restart",
    "kill",
    "kill-subgroup",
    "reset-failed",
    "set-property",
    "clean",
    "bind-mount",
    "mount-image",
  ],
);

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_collector",
    "designated_host_read_only_observation",
    "procfs_read",
    "mountinfo_read",
    "mount_namespace_read",
    "collector_in_custody_mount_namespace_required",
    "public_runtime_mount_namespace_may_differ",
    "filesystem_metadata_read",
    "payer_domain_file_read",
    "systemd_metadata_read",
    "polkit_authorization_query",
    "exact_classifier_reused",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

{
  assert.doesNotThrow(() =>
    assertSimpleAclTextV1(
      [
        "user::rwx",
        "group::r-x",
        "other::---",
        "",
      ].join("\n"),
    ),
  );
  assert.throws(
    () =>
      assertSimpleAclTextV1(
        [
          "user::rwx",
          "user:1000:rwx",
          "group::r-x",
          "mask::rwx",
          "other::---",
          "",
        ].join("\n"),
      ),
    /custody_host_evidence_extended_acl_forbidden/u,
  );
  assert.throws(
    () =>
      assertSimpleAclTextV1(
        [
          "user::rwx",
          "group::r-x",
          "other::---",
          "default:user::rwx",
          "",
        ].join("\n"),
      ),
    /custody_host_evidence_extended_acl_forbidden/u,
  );
}

{
  const parsed = parseProcStatusV1(
    [
      "Name:\tvoid",
      "Uid:\t1000\t1000\t1000\t1000",
      "Gid:\t1001\t1001\t1001\t1001",
      "Groups:\t1001 1002",
      "CapInh:\t0000000000000000",
      "CapPrm:\t0000000000000000",
      "CapEff:\t0000000000000000",
      "CapBnd:\t0000000000000000",
      "CapAmb:\t0000000000000000",
      "NoNewPrivs:\t1",
      "",
    ].join("\n"),
  );
  assert.equal(parsed.uid, 1000);
  assert.equal(parsed.gid, 1001);
  assert.deepEqual(parsed.groups, [1001, 1002]);
  assert.equal(parsed.cap_inh, 0n);
  assert.equal(parsed.cap_prm, 0n);
  assert.equal(parsed.cap_eff, 0n);
  assert.equal(parsed.cap_bnd, 0n);
  assert.equal(parsed.cap_amb, 0n);
  assert.equal(parsed.no_new_privs, 1);
}

{
  const start = parseProcStatStartTimeV1(
    "123 (void worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 424242 0",
  );
  assert.equal(start, "424242");
}

{
  const parsed = parseSystemdShowV1(
    "Id=void-custody.service\nMainPID=1234\nUMask=0077\n",
  );
  assert.equal(parsed.Id, "void-custody.service");
  assert.equal(parsed.MainPID, "1234");
  assert.equal(parsed.UMask, "0077");
}

assert.equal(restrictMountNamespaceDeniedV1("yes"), true);
assert.equal(restrictMountNamespaceDeniedV1("no"), false);
assert.equal(
  restrictMountNamespaceDeniedV1("~user mnt net"),
  true,
);
assert.equal(
  restrictMountNamespaceDeniedV1("user ipc net"),
  true,
);
assert.equal(
  restrictMountNamespaceDeniedV1("user mnt ipc"),
  false,
);

const now = 1_800_000_000_000;
const payerAddress = "0x" + "a".repeat(40);
const domain = buildCoupledNativeGasStorePayerDomainV1(payerAddress);
const domainSha = sha256Id(
  serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
);
const root = "/var/lib/void/native-gas/payer-a";
const rootDev = "2065";

function ancestor(path, ino, dev = "2049") {
  return {
    path,
    dev,
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

function directory(resolvedPath, ino) {
  return {
    resolved_path: resolvedPath,
    dev: rootDev,
    ino: String(ino),
    mount_id: 77,
    uid: 2000,
    gid: 2000,
    mode: "0700",
    symlink: false,
    public_runtime_write: false,
    public_runtime_rename: false,
    public_runtime_recreate: false,
  };
}

function classifierInput() {
  return {
    verification_now_ms: now,
    payer_address: payerAddress,
    host_evidence: {
      host_id: "precision-mainnet0",
      evidence_snapshot: {
        observed_at_ms: now - 10_000,
        expires_at_ms: now + 120_000,
        evidence_generation: "1800000000000",
        boot_id_sha256: "sha256:" + "1".repeat(64),
      },
      public_runtime_uid: 1000,
      public_runtime_gid: 1000,
      service_uid: 2000,
      service_gid: 2000,
      payer_root: {
        resolved_path: root,
        dev: rootDev,
        ino: "100",
        mount_id: 77,
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
          ancestor("/var/lib/void/native-gas", 5, rootDev),
        ],
        mount: {
          medium_present: true,
          mount_target: "/var/lib/void/native-gas",
          mount_source: "/dev/disk/by-uuid/void-gas",
          mount_uuid: "void-gas-uuid",
          mount_id: 77,
          parent_id: 33,
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
        dev: rootDev,
        ino: "104",
        mount_id: 77,
        uid: 2000,
        gid: 2000,
        mode: "0600",
        symlink: false,
        nlink: 1,
        payer_domain_id: domain.payer_domain_id,
        content_sha256: domainSha,
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

const custodyNamespace = Object.freeze({
  dev: "4",
  ino: "4026531840",
  link: "mnt:[4026531840]",
  identity_sha256: "sha256:" + "4".repeat(64),
});
const publicRuntimeNamespace = Object.freeze({
  dev: "4",
  ino: "4026531999",
  link: "mnt:[4026531999]",
  identity_sha256: "sha256:" + "6".repeat(64),
});
const namespace = testOnlyBuildMountNamespaceBundleV1(
  custodyNamespace,
  publicRuntimeNamespace,
  custodyNamespace,
);
assert.equal(namespace.public_runtime_shared_with_custody, false);
assert.notEqual(
  namespace.identity_sha256,
  namespace.public_runtime_identity_sha256,
);
assert.throws(
  () =>
    testOnlyBuildMountNamespaceBundleV1(
      publicRuntimeNamespace,
      publicRuntimeNamespace,
      custodyNamespace,
    ),
  /collector_not_in_custody_mount_namespace/u,
);

function collect(input = {}) {
  return testOnlyClassifyCollectedHostEvidenceV1({
    expectedHostname: "precision-mainnet0",
    observedHostname: "precision-mainnet0",
    mountInfoBefore:
      "77 33 8:17 / /var/lib/void/native-gas rw,nodev,nosuid - ext4 /dev/disk/by-uuid/void-gas rw\n",
    mountInfoAfter:
      "77 33 8:17 / /var/lib/void/native-gas rw,nodev,nosuid - ext4 /dev/disk/by-uuid/void-gas rw\n",
    namespaceBefore: namespace,
    namespaceAfter: namespace,
    classifierInput: classifierInput(),
    collectorEvidence: {
      mount_namespace_identity_sha256: namespace.identity_sha256,
    },
    ...input,
  });
}

const green = collect();
assert.equal(green.ok, true);
assert.equal(
  green.status,
  "SYNTHETIC_HOST_EVIDENCE_CLASSIFIED_TEST_ONLY",
);
assert.equal(green.live_observation_backed, false);
assert.equal(green.synthetic_snapshot_authority, false);
assert.equal(green.trusted_collector_proven, false);
assert.equal(
  green.public_runtime_mount_namespace_shared_with_custody,
  false,
);
assert.equal(
  green.mount_namespace_identity_sha256,
  namespace.identity_sha256,
);
assert.equal(
  green.public_runtime_mount_namespace_identity_sha256,
  namespace.public_runtime_identity_sha256,
);
assert.equal(green.qualification.ok, true);
assert.equal(green.qualification.status, "source_qualified");
assert.equal(green.qualification.live_host_qualification_performed, false);
assert.equal(green.writer_generation_binding_proven, false);
assert.equal(green.bootstrap_receipt_external_trust_proven, false);
assert.equal(green.evidence_generation_monotonicity_proven, false);
assert.equal(green.verification_clock_authority_proven, false);
assert.equal(green.live_host_qualification_performed, false);
assert.equal(green.runtime_integration, false);
assert.equal(green.production_gate_ready, false);
assert.equal(green.funds_movement, false);

{
  const held = collect({
    observedHostname: "wrong-host",
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "designated_host_mismatch");
}

{
  const held = collect({
    mountInfoAfter:
      "78 33 8:17 / /var/lib/void/native-gas rw,nodev,nosuid - ext4 /dev/disk/by-uuid/void-gas rw\n",
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "mountinfo_changed_during_observation");
}

{
  const changed = structuredClone(namespace);
  changed.public_runtime.ino = "4026532999";
  changed.public_runtime.link = "mnt:[4026532999]";
  changed.public_runtime_identity_sha256 = sha256Id(
    JSON.stringify(changed.public_runtime),
  );
  const held = collect({ namespaceAfter: changed });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "mount_namespace_changed_during_observation",
  );
}

{
  const input = classifierInput();
  input.host_evidence.reconciliations.mount_id = 78;
  const held = collect({ classifierInput: input });
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "custody_classifier_reconciliation_custody_namespace_invalid",
  );
}

const collectorSource = fs.readFileSync(
  "tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs",
  "utf8",
);

for (const token of [
  "parseMountInfoV1",
  "resolveMountForPathV1",
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "fs.fstatSync(",
  "fs.realpathSync(",
  "mountinfo_changed_during_observation",
  "mount_namespace_changed_during_observation",
  "collector_not_in_custody_mount_namespace",
  "public_runtime_shared_with_custody",
  "service_metadata_changed_during_observation",
  "process_identity_changed_during_observation",
  "custody_paths_changed_during_observation",
  "systemctl",
  "pkcheck",
  "findmnt",
  "/proc/sys/kernel/random/boot_id",
  "/etc/machine-id",
  "start_time_ticks",
  "\"--detail\"",
  "SYSTEMCTL = \"/usr/bin/systemctl\"",
  "FINDMNT = \"/usr/bin/findmnt\"",
  "PKCHECK = \"/usr/bin/pkcheck\"",
  "GETFACL = \"/usr/bin/getfacl\"",
  "custody_host_evidence_extended_acl_forbidden",
  "custody_host_evidence_acl_unavailable",
  "org.freedesktop.systemd1.manage-units",
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "\"set-property\"",
  "\"clean\"",
  "\"kill\"",
  "\"bind-mount\"",
  "\"mount-image\"",
  "RestrictNamespaces",
  "restrictMountNamespaceDeniedV1",
  "live_host_qualification_performed: false",
  "production_gate_ready: false",
]) {
  assert.equal(
    collectorSource.includes(token),
    true,
    "missing collector safety token: " + token,
  );
}

assert.doesNotMatch(
  collectorSource,
  /fs\.(?:writeFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync|rmSync)\(/u,
);
assert.doesNotMatch(
  collectorSource,
  /execFileSync\(\s*["'](?:mount|umount|systemctl-start|systemctl-stop)["']/u,
);

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1_GREEN",
);
console.log("read_only_collector=true");
console.log("exact_parent_classifier_reused=true");
console.log("mount_namespace_identity_bound=true");
console.log("collector_in_custody_mount_namespace_required=true");
console.log("public_runtime_mount_namespace_may_differ=true");
console.log("public_runtime_mount_namespace_identity_bound=true");
console.log("systemd_direct_control_verb_denials_complete=true");
console.log("systemd_unit_file_mutation_denied=true");
console.log("systemd_daemon_reload_denied=true");
console.log("mountinfo_snapshot_stability_required=true");
console.log("descriptor_bound_metadata_reads=true");
console.log("extended_acl_rejected=true");
console.log("mode_bit_permission_inference_acl_safe=true");
console.log("synthetic_snapshot_authority=false");
console.log("trusted_collector_proven=false");
console.log("writer_generation_binding_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("live_host_qualification_performed=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
