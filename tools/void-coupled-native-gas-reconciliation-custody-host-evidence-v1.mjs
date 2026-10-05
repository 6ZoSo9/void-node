#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  parseMountInfoV1,
  resolveMountForPathV1,
} from "./void-buy-void-allocation-custody-preflight-v1.mjs";
import {
  classifyCoupledNativeGasReconciliationCustodyQualificationV1,
} from "../src/economic/coupled_native_gas_reconciliation_custody_qualification_v1.js";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector: true,
    designated_host_read_only_observation: true,
    procfs_read: true,
    mountinfo_read: true,
    mount_namespace_read: true,
    collector_in_custody_mount_namespace_required: true,
    collector_in_custody_filesystem_root_required: true,
    public_runtime_mount_namespace_may_differ: true,
    filesystem_metadata_read: true,
    payer_domain_file_read: true,
    systemd_metadata_read: true,
    polkit_authorization_query: true,
    exact_classifier_reused: true,
    synthetic_snapshot_authority: false,
    trusted_collector_proven: false,
    writer_generation_binding_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    filesystem_write: false,
    service_mutation: false,
    mount_mutation: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const TTL_MS = 120_000;
const CAP_SYS_ADMIN = 21n;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SYSTEMCTL = "/usr/bin/systemctl";
const FINDMNT = "/usr/bin/findmnt";
const PKCHECK = "/usr/bin/pkcheck";
const GETFACL = "/usr/bin/getfacl";
const SYSTEMD_UNIT = /^[A-Za-z0-9@_.:-]{1,120}\.service$/u;

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SYSTEMD_CONTROL_VERBS_V1 =
  Object.freeze([
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
  ]);

const SYSTEMD_CONTROL_ACTIONS_V1 = Object.freeze([
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
]);

function hold(reason, detail = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1,
    version: 1,
    reason,
    live_observation_backed: false,
    trusted_collector_proven: false,
    live_host_qualification_performed: false,
    production_gate_ready: false,
    ...detail,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
  });
}

function sha256Id(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(String(value ?? ""), "utf8");
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonical(value) {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return JSON.stringify(
      typeof value === "bigint" ? value.toString(10) : value,
    );
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value).sort().map(
        (key) => JSON.stringify(key) + ":" + canonical(value[key]),
      ).join(",") +
      "}"
    );
  }
  throw new Error("non_canonical_value");
}

function modeText(stat) {
  return "0" + Number(stat.mode & 0o777n).toString(8).padStart(3, "0");
}

function sameStat(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size
  );
}

function sameObjectIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function processRootPath(procRoot, logicalPath) {
  const absolute = path.resolve(String(logicalPath || ""));
  if (!path.isAbsolute(String(logicalPath || "")) || absolute !== logicalPath) {
    throw new Error("public_runtime_path_invalid");
  }
  const relative = absolute.slice(path.parse(absolute).root.length);
  return path.join(procRoot, "root", relative);
}

function readProcessNamespaceDirectoryStat(procRoot, logicalPath, code) {
  const target = processRootPath(procRoot, logicalPath);
  const listed = fs.lstatSync(target, { bigint: true });
  if (!listed.isDirectory() || listed.isSymbolicLink()) {
    throw new Error(code + "_not_directory");
  }
  let fd = -1;
  try {
    fd = fs.openSync(
      target,
      fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isDirectory() || !sameObjectIdentity(listed, opened)) {
      throw new Error(code + "_identity_drift");
    }
    return opened;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function exactRealPath(target, code) {
  const resolved = path.resolve(String(target || ""));
  if (!path.isAbsolute(String(target || "")) || resolved !== String(target || "")) {
    throw new Error(code + "_path_invalid");
  }
  if (fs.realpathSync(resolved) !== resolved) {
    throw new Error(code + "_symlink_or_alias");
  }
  return resolved;
}

export function parseProcStatusV1(text) {
  const fields = new Map();
  for (const line of String(text || "").split("\n")) {
    const index = line.indexOf(":");
    if (index < 1) continue;
    fields.set(line.slice(0, index), line.slice(index + 1).trim());
  }
  const uidParts = String(fields.get("Uid") || "")
    .split(/\s+/u)
    .map(Number);
  const gidParts = String(fields.get("Gid") || "")
    .split(/\s+/u)
    .map(Number);
  const groups = String(fields.get("Groups") || "")
    .split(/\s+/u)
    .filter(Boolean)
    .map(Number);
  const capFields = [
    "CapInh",
    "CapPrm",
    "CapEff",
    "CapBnd",
    "CapAmb",
  ];
  const capValues = Object.create(null);
  for (const key of capFields) {
    const raw = String(fields.get(key) || "");
    if (!/^[0-9A-Fa-f]{1,32}$/u.test(raw)) {
      throw new Error("proc_status_invalid");
    }
    capValues[key] = BigInt("0x" + raw);
  }
  const noNewPrivs = Number(fields.get("NoNewPrivs"));
  if (
    uidParts.length !== 4 ||
    gidParts.length !== 4 ||
    uidParts.some((value) => !Number.isSafeInteger(value) || value < 1) ||
    gidParts.some((value) => !Number.isSafeInteger(value) || value < 1) ||
    new Set(uidParts).size !== 1 ||
    new Set(gidParts).size !== 1 ||
    groups.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    (noNewPrivs !== 0 && noNewPrivs !== 1)
  ) {
    throw new Error("proc_status_invalid");
  }
  return Object.freeze({
    uid: uidParts[3],
    gid: gidParts[3],
    groups: Object.freeze([...new Set(groups)].sort((a, b) => a - b)),
    cap_inh: capValues.CapInh,
    cap_prm: capValues.CapPrm,
    cap_eff: capValues.CapEff,
    cap_bnd: capValues.CapBnd,
    cap_amb: capValues.CapAmb,
    no_new_privs: noNewPrivs,
  });
}

export function parseSystemdShowV1(text) {
  const out = Object.create(null);
  for (const line of String(text || "").split("\n")) {
    if (!line) continue;
    const index = line.indexOf("=");
    if (index < 1) throw new Error("systemd_show_invalid");
    const key = line.slice(0, index);
    if (Object.hasOwn(out, key)) throw new Error("systemd_show_duplicate");
    out[key] = line.slice(index + 1);
  }
  return Object.freeze(out);
}

export function parseProcStatStartTimeV1(text) {
  const raw = String(text || "").trim();
  const close = raw.lastIndexOf(")");
  if (close < 2) throw new Error("proc_stat_invalid");
  const rest = raw.slice(close + 1).trim().split(/\s+/u);
  const start = rest[19];
  if (!/^[1-9][0-9]*$/u.test(String(start || ""))) {
    throw new Error("proc_stat_start_time_invalid");
  }
  return String(start);
}

function readProcessIdentity(procRoot) {
  const creds = parseProcStatusV1(
    fs.readFileSync(path.join(procRoot, "status"), "utf8"),
  );
  const startTimeTicks = parseProcStatStartTimeV1(
    fs.readFileSync(path.join(procRoot, "stat"), "utf8"),
  );
  return Object.freeze({
    ...creds,
    start_time_ticks: startTimeTicks,
  });
}

function yes(value) {
  return String(value || "") === "yes";
}

function capabilitiesZero(identity) {
  return (
    identity.cap_inh === 0n &&
    identity.cap_prm === 0n &&
    identity.cap_eff === 0n &&
    identity.cap_bnd === 0n &&
    identity.cap_amb === 0n
  );
}

function unitName(value, code) {
  const unit = String(value || "").trim();
  if (!SYSTEMD_UNIT.test(unit) || unit.startsWith("-")) {
    throw new Error(code);
  }
  return unit;
}

function sortedList(value) {
  const items = String(value || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  return Object.freeze([...new Set(items)].sort());
}

export function restrictMountNamespaceDeniedV1(value) {
  const raw = String(value || "").trim();
  if (raw === "yes") return true;
  if (!raw || raw === "no") return false;
  const denyList = raw.startsWith("~");
  const tokens = raw
    .replace(/^~/u, "")
    .split(/\s+/u)
    .filter(Boolean);
  if (tokens.length < 1) return false;
  return denyList
    ? tokens.includes("mnt")
    : !tokens.includes("mnt");
}

export function assertSimpleAclTextV1(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (lines.length < 3) {
    throw new Error("custody_host_evidence_acl_invalid");
  }
  for (const line of lines) {
    if (
      line.startsWith("default:") ||
      /^user:[^:]+:/u.test(line) ||
      /^group:[^:]+:/u.test(line)
    ) {
      throw new Error("custody_host_evidence_extended_acl_forbidden");
    }
    if (!/^(user::|group::|other::|mask::)[rwx-]{3}$/u.test(line)) {
      throw new Error("custody_host_evidence_acl_invalid");
    }
  }
}

function assertSimpleAcl(target) {
  let raw;
  try {
    raw = runText(
      GETFACL,
      ["-cp", "--absolute-names", target],
    );
  } catch {
    throw new Error("custody_host_evidence_acl_unavailable");
  }
  assertSimpleAclTextV1(raw);
}

function canMutateDirectory(stat, creds) {
  const bits = Number(stat.mode & 0o777n);
  let permission;
  if (BigInt(creds.uid) === stat.uid) permission = (bits >> 6) & 7;
  else if (
    BigInt(creds.gid) === stat.gid ||
    creds.groups.includes(Number(stat.gid))
  ) {
    permission = (bits >> 3) & 7;
  } else {
    permission = bits & 7;
  }
  return (permission & 3) === 3;
}

function readNamespaceIdentity(procRoot) {
  const target = path.join(procRoot, "ns", "mnt");
  const stat = fs.statSync(target, { bigint: true });
  const link = fs.readlinkSync(target);
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
    link,
    identity_sha256: sha256Id(
      canonical({
        dev: String(stat.dev),
        ino: String(stat.ino),
        link,
      }),
    ),
  });
}

function sameNamespace(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.link === right.link
  );
}

function splitMountOptions(record) {
  return Object.freeze(
    [...new Set(
      String(record.mount_options || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )].sort(),
  );
}

function readDirectoryIdentity(target, mountRecords, code) {
  const resolved = exactRealPath(target, code);
  const listed = fs.lstatSync(resolved, { bigint: true });
  if (!listed.isDirectory() || listed.isSymbolicLink()) {
    throw new Error(code + "_not_directory");
  }
  assertSimpleAcl(resolved);
  let fd = -1;
  try {
    fd = fs.openSync(
      resolved,
      fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isDirectory() || !sameStat(listed, opened)) {
      throw new Error(code + "_identity_drift");
    }
    const mount = resolveMountForPathV1(mountRecords, resolved);
    return Object.freeze({
      resolved_path: resolved,
      stat: opened,
      mount,
    });
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function readFileIdentity(target, mountRecords, code) {
  const resolved = exactRealPath(target, code);
  const listed = fs.lstatSync(resolved, { bigint: true });
  if (!listed.isFile() || listed.isSymbolicLink()) {
    throw new Error(code + "_not_file");
  }
  assertSimpleAcl(resolved);
  let fd = -1;
  try {
    fd = fs.openSync(
      resolved,
      fs.constants.O_RDONLY | O_NOFOLLOW,
    );
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile() || !sameStat(listed, before)) {
      throw new Error(code + "_identity_drift");
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameStat(before, after) || bytes.length !== Number(after.size)) {
      throw new Error(code + "_changed_during_read");
    }
    const mount = resolveMountForPathV1(mountRecords, resolved);
    return Object.freeze({
      resolved_path: resolved,
      stat: after,
      mount,
      bytes,
    });
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function expectedAncestors(target) {
  const root = path.parse(target).root;
  const out = [];
  let current = path.dirname(target);
  for (;;) {
    out.push(current);
    if (current === root) break;
    current = path.dirname(current);
    if (out.length > 64) throw new Error("ancestor_chain_too_large");
  }
  return out.reverse();
}

function ancestorEvidence(rootPath, publicCreds, mountRecords) {
  return Object.freeze(expectedAncestors(rootPath).map((entryPath) => {
    const resolved = exactRealPath(entryPath, "ancestor");
    const stat = fs.lstatSync(resolved, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("ancestor_invalid");
    }
    assertSimpleAcl(resolved);
    const mount = resolveMountForPathV1(mountRecords, resolved);
    return Object.freeze({
      path: resolved,
      dev: String(stat.dev),
      ino: String(stat.ino),
      uid: Number(stat.uid),
      gid: Number(stat.gid),
      mode: modeText(stat),
      symlink: false,
      public_runtime_write: canMutateDirectory(stat, publicCreds),
      public_runtime_rename: canMutateDirectory(stat, publicCreds),
      public_runtime_recreate: canMutateDirectory(stat, publicCreds),
      mount_id: mount.mount_id,
    });
  }));
}

function directoryEvidence(identity, publicCreds, parentStat) {
  return Object.freeze({
    resolved_path: identity.resolved_path,
    dev: String(identity.stat.dev),
    ino: String(identity.stat.ino),
    mount_id: identity.mount.mount_id,
    uid: Number(identity.stat.uid),
    gid: Number(identity.stat.gid),
    mode: modeText(identity.stat),
    symlink: false,
    public_runtime_write: canMutateDirectory(identity.stat, publicCreds),
    public_runtime_rename: canMutateDirectory(parentStat, publicCreds),
    public_runtime_recreate: canMutateDirectory(parentStat, publicCreds),
  });
}

function runText(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function systemdShow(unit) {
  const properties = [
    "Id",
    "MainPID",
    "UMask",
    "NoNewPrivileges",
    "PrivateTmp",
    "PrivateDevices",
    "ProtectSystem",
    "ProtectHome",
    "ProtectKernelTunables",
    "ProtectKernelModules",
    "ProtectControlGroups",
    "LockPersonality",
    "RestrictSUIDSGID",
    "RestrictRealtime",
    "CapabilityBoundingSet",
    "AmbientCapabilities",
    "ReadWritePaths",
    "RestrictNamespaces",
  ];
  return runText(SYSTEMCTL, [
    "show",
    unit,
    "--no-pager",
    "--property=" + properties.join(","),
  ]);
}

function systemdCat(unit) {
  return runText(SYSTEMCTL, ["cat", "--no-pager", unit]);
}

function mainPid(show, expectedUnit) {
  const parsed = parseSystemdShowV1(show);
  if (parsed.Id !== expectedUnit) throw new Error("systemd_unit_identity_mismatch");
  const pid = Number(parsed.MainPID);
  if (!Number.isSafeInteger(pid) || pid < 2) {
    throw new Error("systemd_main_pid_invalid");
  }
  return Object.freeze({ parsed, pid });
}

function polkitActionDenied(
  processIdentity,
  pid,
  actionId,
  details = [],
) {
  try {
    const args = [
      "--action-id",
      actionId,
      "--process",
      String(pid) +
        "," +
        processIdentity.start_time_ticks +
        "," +
        String(processIdentity.uid),
    ];
    for (const [key, value] of details) {
      args.push("--detail", key, value);
    }
    runText(PKCHECK, args);
    return false;
  } catch (error) {
    if (Number(error?.status) === 1) return true;
    throw new Error("polkit_authorization_query_failed");
  }
}

function polkitManageUnitVerbDenied(
  processIdentity,
  pid,
  unit,
  verb,
) {
  return polkitActionDenied(
    processIdentity,
    pid,
    "org.freedesktop.systemd1.manage-units",
    [
      ["unit", unit],
      ["verb", verb],
    ],
  );
}

function polkitCustodyServiceControlDenied(
  processIdentity,
  pid,
  unit,
) {
  const directControlDenied =
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SYSTEMD_CONTROL_VERBS_V1
      .every(
        (verb) =>
          polkitManageUnitVerbDenied(
            processIdentity,
            pid,
            unit,
            verb,
          ),
      );
  const managerMutationDenied =
    SYSTEMD_CONTROL_ACTIONS_V1.every(
      (actionId) =>
        polkitActionDenied(
          processIdentity,
          pid,
          actionId,
        ),
    );
  return directControlDenied && managerMutationDenied;
}

function findMountUuid(target) {
  const value = runText(FINDMNT, [
    "--noheadings",
    "--output",
    "UUID",
    "--target",
    target,
  ]).trim();
  if (
    !value ||
    /\s/u.test(value) ||
    value === "-" ||
    value.toLowerCase() === "none"
  ) {
    throw new Error("mount_uuid_unavailable");
  }
  return value;
}

function servicePolicyEvidence(
  unit,
  showText,
  catText,
  serviceCreds,
  publicProcessIdentity,
  publicPid,
  rootPath,
) {
  const show = parseSystemdShowV1(showText);
  if (show.Id !== unit) throw new Error("custody_service_unit_mismatch");
  return Object.freeze({
    unit_name: unit,
    unit_sha256: sha256Id(catText),
    user_uid: serviceCreds.uid,
    group_gid: serviceCreds.gid,
    umask: String(show.UMask || ""),
    no_new_privileges: yes(show.NoNewPrivileges),
    private_tmp: yes(show.PrivateTmp),
    private_devices: yes(show.PrivateDevices),
    protect_system: String(show.ProtectSystem || ""),
    protect_home: yes(show.ProtectHome),
    protect_kernel_tunables: yes(show.ProtectKernelTunables),
    protect_kernel_modules: yes(show.ProtectKernelModules),
    protect_control_groups: yes(show.ProtectControlGroups),
    lock_personality: yes(show.LockPersonality),
    restrict_suid_sgid: yes(show.RestrictSUIDSGID),
    restrict_realtime: yes(show.RestrictRealtime),
    capability_bounding_set: sortedList(show.CapabilityBoundingSet),
    ambient_capabilities: sortedList(show.AmbientCapabilities),
    read_write_paths: sortedList(show.ReadWritePaths),
    public_runtime_can_control_service:
      !polkitCustodyServiceControlDenied(
        publicProcessIdentity,
        publicPid,
        unit,
      ),
  });
}

function statfsType(target) {
  const stat = fs.statfsSync(target, { bigint: true });
  const type = BigInt.asUintN(64, stat.type);
  return "0x" + type.toString(16);
}

function mountEvidence(rootIdentity, publicCreds) {
  const record = rootIdentity.mount;
  if ((publicCreds.cap_eff & (1n << CAP_SYS_ADMIN)) !== 0n) {
    throw new Error("public_runtime_has_cap_sys_admin");
  }
  return Object.freeze({
    medium_present: true,
    mount_target: record.mount_point,
    mount_source: record.mount_source,
    mount_uuid: findMountUuid(rootIdentity.resolved_path),
    mount_id: record.mount_id,
    parent_id: record.parent_id,
    major_minor: record.major_minor,
    filesystem_type: record.fs_type,
    statfs_type: statfsType(rootIdentity.resolved_path),
    mount_options: splitMountOptions(record),
    public_runtime_remount: false,
    public_runtime_bind_mount: false,
  });
}

function payerDomainEvidence(identity) {
  let parsed;
  try {
    parsed = JSON.parse(identity.bytes.toString("utf8"));
  } catch {
    throw new Error("payer_domain_json_invalid");
  }
  return Object.freeze({
    resolved_path: identity.resolved_path,
    dev: String(identity.stat.dev),
    ino: String(identity.stat.ino),
    mount_id: identity.mount.mount_id,
    uid: Number(identity.stat.uid),
    gid: Number(identity.stat.gid),
    mode: modeText(identity.stat),
    symlink: false,
    nlink: Number(identity.stat.nlink),
    payer_domain_id: String(parsed?.payer_domain_id || ""),
    content_sha256: sha256Id(identity.bytes),
  });
}

function collectPathEvidence(rootPath, publicCreds, mountRecords) {
  const rootIdentity = readDirectoryIdentity(
    rootPath,
    mountRecords,
    "payer_root",
  );
  const parentStat = fs.lstatSync(path.dirname(rootPath), { bigint: true });
  const payerDomain = readFileIdentity(
    path.join(rootPath, "payer-domain-v1.json"),
    mountRecords,
    "payer_domain",
  );
  const records = readDirectoryIdentity(
    path.join(rootPath, "records"),
    mountRecords,
    "records",
  );
  const reconciliations = readDirectoryIdentity(
    path.join(rootPath, "reconciliations"),
    mountRecords,
    "reconciliations",
  );
  const queue = readDirectoryIdentity(
    path.join(rootPath, "gas-liability-admission-v1.queue"),
    mountRecords,
    "queue",
  );
  return Object.freeze({
    root_identity: rootIdentity,
    parent_stat: parentStat,
    payer_root: Object.freeze({
      ...directoryEvidence(rootIdentity, publicCreds, parentStat),
      ancestors: ancestorEvidence(rootPath, publicCreds, mountRecords)
        .map(({ mount_id: _mountId, ...entry }) => Object.freeze(entry)),
      mount: mountEvidence(rootIdentity, publicCreds),
    }),
    payer_domain: payerDomainEvidence(payerDomain),
    records: directoryEvidence(records, publicCreds, rootIdentity.stat),
    reconciliations:
      directoryEvidence(reconciliations, publicCreds, rootIdentity.stat),
    queue: directoryEvidence(queue, publicCreds, rootIdentity.stat),
  });
}

function verifyPublicRuntimePathMapping(
  rootPath,
  publicProc,
  publicCreds,
  publicMountRecords,
  custodyPaths,
) {
  const publicRoot = readProcessNamespaceDirectoryStat(
    publicProc,
    rootPath,
    "public_runtime_payer_root",
  );
  if (!sameObjectIdentity(publicRoot, custodyPaths.root_identity.stat)) {
    throw new Error("public_runtime_payer_root_mapping_mismatch");
  }
  const ancestors = custodyPaths.payer_root.ancestors;
  const publicAncestorRecords = [];
  for (const expected of ancestors) {
    const observed = readProcessNamespaceDirectoryStat(
      publicProc,
      expected.path,
      "public_runtime_ancestor",
    );
    if (
      String(observed.dev) !== String(expected.dev) ||
      String(observed.ino) !== String(expected.ino) ||
      canMutateDirectory(observed, publicCreds)
    ) {
      throw new Error("public_runtime_ancestor_mapping_mismatch");
    }
    publicAncestorRecords.push(Object.freeze({
      path: expected.path,
      dev: String(observed.dev),
      ino: String(observed.ino),
      mode: modeText(observed),
    }));
  }
  const parent = publicAncestorRecords.at(-1);
  if (!parent) {
    throw new Error("public_runtime_parent_mapping_missing");
  }
  if (canMutateDirectory(publicRoot, publicCreds)) {
    throw new Error("public_runtime_payer_root_writable");
  }
  const rootMount = resolveMountForPathV1(
    publicMountRecords,
    rootPath,
  );
  return Object.freeze({
    payer_root_dev: String(publicRoot.dev),
    payer_root_ino: String(publicRoot.ino),
    payer_root_mount_id: rootMount.mount_id,
    payer_root_mount_parent_id: rootMount.parent_id,
    payer_root_mount_major_minor: rootMount.major_minor,
    ancestor_records: Object.freeze(publicAncestorRecords),
  });
}

export function testOnlyPublicRuntimePathMappingV1(
  rootPath,
  publicProc,
  publicCreds,
  publicMountRecords,
  custodyPaths,
) {
  return verifyPublicRuntimePathMapping(
    rootPath,
    publicProc,
    publicCreds,
    publicMountRecords,
    custodyPaths,
  );
}

function namespaceBundle(selfNs, publicNs, custodyNs) {
  if (!sameNamespace(selfNs, custodyNs)) {
    throw new Error("collector_not_in_custody_mount_namespace");
  }
  return Object.freeze({
    collector: selfNs,
    public_runtime: publicNs,
    custody_service: custodyNs,
    identity_sha256: sha256Id(canonical(custodyNs)),
    public_runtime_identity_sha256: sha256Id(canonical(publicNs)),
    public_runtime_shared_with_custody:
      sameNamespace(publicNs, custodyNs),
  });
}

export function testOnlyBuildMountNamespaceBundleV1(
  selfNs,
  publicNs,
  custodyNs,
) {
  return namespaceBundle(selfNs, publicNs, custodyNs);
}

function readProcessFilesystemRootIdentity(procRoot) {
  const stat = fs.statSync(path.join(procRoot, "root"), {
    bigint: true,
  });
  if (!stat.isDirectory()) {
    throw new Error("process_filesystem_root_invalid");
  }
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
    uid: Number(stat.uid),
    gid: Number(stat.gid),
    mode: modeText(stat),
  });
}

function filesystemRootBundle(selfRoot, publicRoot, custodyRoot) {
  if (
    selfRoot.dev !== custodyRoot.dev ||
    selfRoot.ino !== custodyRoot.ino
  ) {
    throw new Error("collector_not_in_custody_filesystem_root");
  }
  return Object.freeze({
    collector: selfRoot,
    public_runtime: publicRoot,
    custody_service: custodyRoot,
    identity_sha256: sha256Id(canonical(custodyRoot)),
    public_runtime_identity_sha256:
      sha256Id(canonical(publicRoot)),
    public_runtime_shared_with_custody:
      publicRoot.dev === custodyRoot.dev &&
      publicRoot.ino === custodyRoot.ino,
  });
}

export function testOnlyBuildFilesystemRootBundleV1(
  selfRoot,
  publicRoot,
  custodyRoot,
) {
  return filesystemRootBundle(selfRoot, publicRoot, custodyRoot);
}

function buildDecision({
  live,
  expectedHostname,
  observedHostname,
  mountInfoBefore,
  mountInfoAfter,
  publicRuntimeMountInfoBefore,
  publicRuntimeMountInfoAfter,
  namespaceBefore,
  namespaceAfter,
  filesystemRootBefore,
  filesystemRootAfter,
  classifierInput,
  collectorEvidence,
}) {
  try {
    if (!expectedHostname || expectedHostname !== observedHostname) {
      return hold("designated_host_mismatch");
    }
    if (mountInfoBefore !== mountInfoAfter) {
      return hold("mountinfo_changed_during_observation");
    }
    if (publicRuntimeMountInfoBefore !== publicRuntimeMountInfoAfter) {
      return hold("public_runtime_mountinfo_changed_during_observation");
    }
    if (
      namespaceBefore.identity_sha256 !== namespaceAfter.identity_sha256 ||
      canonical(namespaceBefore) !== canonical(namespaceAfter)
    ) {
      return hold("mount_namespace_changed_during_observation");
    }
    if (canonical(filesystemRootBefore) !== canonical(filesystemRootAfter)) {
      return hold("filesystem_root_changed_during_observation");
    }
    const qualification =
      classifyCoupledNativeGasReconciliationCustodyQualificationV1(
        classifierInput,
      );
    if (qualification.ok !== true) {
      return hold(
        "custody_classifier_" + String(qualification.reason || "hold"),
        { qualification },
      );
    }
    return Object.freeze({
      ok: true,
      status: live
        ? "HOST_EVIDENCE_OBSERVED_SOURCE_QUALIFIED_NOT_AUTHORIZED"
        : "SYNTHETIC_HOST_EVIDENCE_CLASSIFIED_TEST_ONLY",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1,
      version: 1,
      live_observation_backed: live,
      synthetic_snapshot_authority: false,
      trusted_collector_proven: false,
      mount_namespace_identity_sha256:
        namespaceBefore.identity_sha256,
      public_runtime_mount_namespace_identity_sha256:
        namespaceBefore.public_runtime_identity_sha256,
      public_runtime_mount_namespace_shared_with_custody:
        namespaceBefore.public_runtime_shared_with_custody,
      filesystem_root_identity_sha256:
        filesystemRootBefore.identity_sha256,
      public_runtime_filesystem_root_identity_sha256:
        filesystemRootBefore.public_runtime_identity_sha256,
      public_runtime_filesystem_root_shared_with_custody:
        filesystemRootBefore.public_runtime_shared_with_custody,
      mountinfo_sha256: sha256Id(mountInfoBefore),
      public_runtime_mountinfo_sha256:
        sha256Id(publicRuntimeMountInfoBefore),
      classifier_input: classifierInput,
      qualification,
      collector_evidence: collectorEvidence,
      writer_generation_binding_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(String(error?.message || error || "collector_classification_failed"));
  }
}

export function testOnlyClassifyCollectedHostEvidenceV1(input) {
  return buildDecision({
    live: false,
    ...input,
  });
}

export function inspectCoupledNativeGasReconciliationCustodyHostEvidenceV1({
  payer_root,
  payer_address,
  expected_hostname,
  public_runtime_unit,
  custody_service_unit,
} = {}) {
  try {
    if (
      typeof O_NOFOLLOW !== "number" ||
      typeof O_DIRECTORY !== "number" ||
      process.platform !== "linux"
    ) {
      return hold("linux_descriptor_safety_required");
    }
    const rootPath = exactRealPath(
      String(payer_root || "").trim(),
      "payer_root",
    );
    const expectedHostname = String(expected_hostname || "").trim();
    const publicUnit = unitName(
      public_runtime_unit,
      "public_runtime_unit_invalid",
    );
    const custodyUnit = unitName(
      custody_service_unit,
      "custody_service_unit_invalid",
    );
    if (!expectedHostname) {
      return hold("collector_required_input_missing");
    }
    const observedHostname = os.hostname();
    if (observedHostname !== expectedHostname) {
      return hold("designated_host_mismatch");
    }

    const observedAt = Date.now();
    const publicShowBefore = systemdShow(publicUnit);
    const custodyShowBefore = systemdShow(custodyUnit);
    const publicUnitBefore = mainPid(publicShowBefore, publicUnit);
    const custodyUnitBefore = mainPid(custodyShowBefore, custodyUnit);
    if (publicUnitBefore.pid === custodyUnitBefore.pid) {
      return hold("runtime_and_custody_process_not_separated");
    }
    const publicCatBefore = systemdCat(publicUnit);
    const custodyCatBefore = systemdCat(custodyUnit);

    const publicProc = "/proc/" + String(publicUnitBefore.pid);
    const custodyProc = "/proc/" + String(custodyUnitBefore.pid);
    const publicCredsBefore = readProcessIdentity(publicProc);
    const custodyCredsBefore = readProcessIdentity(custodyProc);
    if (!capabilitiesZero(publicCredsBefore)) {
      return hold("public_runtime_capabilities_present");
    }
    if (!capabilitiesZero(custodyCredsBefore)) {
      return hold("custody_service_capabilities_present");
    }
    if (
      publicCredsBefore.no_new_privs !== 1 ||
      custodyCredsBefore.no_new_privs !== 1
    ) {
      return hold("process_no_new_privileges_missing");
    }

    const namespaceBefore = namespaceBundle(
      readNamespaceIdentity("/proc/self"),
      readNamespaceIdentity(publicProc),
      readNamespaceIdentity(custodyProc),
    );
    const filesystemRootBefore = filesystemRootBundle(
      readProcessFilesystemRootIdentity("/proc/self"),
      readProcessFilesystemRootIdentity(publicProc),
      readProcessFilesystemRootIdentity(custodyProc),
    );
    const mountInfoPath =
      path.join(custodyProc, "mountinfo");
    const publicRuntimeMountInfoPath =
      path.join(publicProc, "mountinfo");
    const mountInfoBefore = fs.readFileSync(mountInfoPath, "utf8");
    const publicRuntimeMountInfoBefore =
      fs.readFileSync(publicRuntimeMountInfoPath, "utf8");
    const mountRecords = parseMountInfoV1(mountInfoBefore);
    const publicRuntimeMountRecords =
      parseMountInfoV1(publicRuntimeMountInfoBefore);
    const pathsBefore = collectPathEvidence(
      rootPath,
      publicCredsBefore,
      mountRecords,
    );
    const publicRuntimePathMappingBefore =
      verifyPublicRuntimePathMapping(
        rootPath,
        publicProc,
        publicCredsBefore,
        publicRuntimeMountRecords,
        pathsBefore,
      );

    const custodyPolicyBefore = servicePolicyEvidence(
      custodyUnit,
      custodyShowBefore,
      custodyCatBefore,
      custodyCredsBefore,
      publicCredsBefore,
      publicUnitBefore.pid,
      rootPath,
    );

    const publicShowAfter = systemdShow(publicUnit);
    const custodyShowAfter = systemdShow(custodyUnit);
    const publicCatAfter = systemdCat(publicUnit);
    const custodyCatAfter = systemdCat(custodyUnit);
    if (
      publicShowAfter !== publicShowBefore ||
      custodyShowAfter !== custodyShowBefore ||
      publicCatAfter !== publicCatBefore ||
      custodyCatAfter !== custodyCatBefore
    ) {
      return hold("service_metadata_changed_during_observation");
    }

    const publicCredsAfter = readProcessIdentity(publicProc);
    const custodyCredsAfter = readProcessIdentity(custodyProc);
    if (
      canonical(publicCredsAfter) !== canonical(publicCredsBefore) ||
      canonical(custodyCredsAfter) !== canonical(custodyCredsBefore)
    ) {
      return hold("process_identity_changed_during_observation");
    }

    const mountInfoAfter = fs.readFileSync(mountInfoPath, "utf8");
    const publicRuntimeMountInfoAfter =
      fs.readFileSync(publicRuntimeMountInfoPath, "utf8");
    const namespaceAfter = namespaceBundle(
      readNamespaceIdentity("/proc/self"),
      readNamespaceIdentity(publicProc),
      readNamespaceIdentity(custodyProc),
    );
    const filesystemRootAfter = filesystemRootBundle(
      readProcessFilesystemRootIdentity("/proc/self"),
      readProcessFilesystemRootIdentity(publicProc),
      readProcessFilesystemRootIdentity(custodyProc),
    );
    const pathsAfter = collectPathEvidence(
      rootPath,
      publicCredsAfter,
      parseMountInfoV1(mountInfoAfter),
    );
    const publicRuntimePathMappingAfter =
      verifyPublicRuntimePathMapping(
        rootPath,
        publicProc,
        publicCredsAfter,
        parseMountInfoV1(publicRuntimeMountInfoAfter),
        pathsAfter,
      );
    if (
      canonical(pathsAfter.payer_root) !== canonical(pathsBefore.payer_root) ||
      canonical(pathsAfter.payer_domain) !== canonical(pathsBefore.payer_domain) ||
      canonical(pathsAfter.records) !== canonical(pathsBefore.records) ||
      canonical(pathsAfter.reconciliations) !==
        canonical(pathsBefore.reconciliations) ||
      canonical(pathsAfter.queue) !== canonical(pathsBefore.queue)
    ) {
      return hold("custody_paths_changed_during_observation");
    }
    if (
      canonical(publicRuntimePathMappingAfter) !==
      canonical(publicRuntimePathMappingBefore)
    ) {
      return hold("public_runtime_paths_changed_during_observation");
    }

    const now = Date.now();
    if (now - observedAt >= TTL_MS) {
      return hold("collector_observation_window_exceeded");
    }
    const bootId = fs
      .readFileSync("/proc/sys/kernel/random/boot_id", "utf8")
      .trim();
    const machineId = fs
      .readFileSync("/etc/machine-id", "utf8")
      .trim();
    if (!bootId) return hold("boot_id_unavailable");
    if (!machineId) return hold("machine_id_unavailable");

    const parentWritable =
      pathsBefore.payer_root.public_runtime_rename === true ||
      pathsBefore.payer_root.public_runtime_recreate === true;
    const publicPolicy =
      parseSystemdShowV1(publicShowBefore);
    const namespaceMutationDenied =
      restrictMountNamespaceDeniedV1(
        publicPolicy.RestrictNamespaces,
      );
    const negativeTests = Object.freeze({
      same_uid_root_rename_denied: !parentWritable,
      same_uid_root_recreate_denied: !parentWritable,
      symlink_substitution_denied: !parentWritable,
      bind_mount_substitution_denied: namespaceMutationDenied,
      remount_denied: namespaceMutationDenied,
      alternate_namespace_substitution_denied:
        namespaceMutationDenied,
    });

    const classifierInput = Object.freeze({
      verification_now_ms: now,
      payer_address,
      host_evidence: Object.freeze({
        host_id: observedHostname,
        evidence_snapshot: Object.freeze({
          observed_at_ms: observedAt,
          expires_at_ms: observedAt + TTL_MS,
          evidence_generation: String(observedAt),
          boot_id_sha256: sha256Id(bootId),
        }),
        public_runtime_uid: publicCredsBefore.uid,
        public_runtime_gid: publicCredsBefore.gid,
        service_uid: custodyCredsBefore.uid,
        service_gid: custodyCredsBefore.gid,
        payer_root: pathsBefore.payer_root,
        payer_domain: pathsBefore.payer_domain,
        records: pathsBefore.records,
        reconciliations: pathsBefore.reconciliations,
        queue: pathsBefore.queue,
        service_policy: custodyPolicyBefore,
        negative_mutation_tests: negativeTests,
        fallback_storage_enabled: false,
        missing_storage_holds: true,
      }),
    });

    return buildDecision({
      live: true,
      expectedHostname,
      observedHostname,
      mountInfoBefore,
      mountInfoAfter,
      publicRuntimeMountInfoBefore,
      publicRuntimeMountInfoAfter,
      namespaceBefore,
      namespaceAfter,
      filesystemRootBefore,
      filesystemRootAfter,
      classifierInput,
      collectorEvidence: Object.freeze({
        observed_at_ms: observedAt,
        completed_at_ms: now,
        public_runtime_unit: publicUnit,
        public_runtime_pid: publicUnitBefore.pid,
        public_runtime_start_time_ticks:
          publicCredsBefore.start_time_ticks,
        public_runtime_unit_sha256: sha256Id(publicCatBefore),
        public_runtime_restrict_namespaces:
          String(publicPolicy.RestrictNamespaces || ""),
        custody_service_unit: custodyUnit,
        custody_service_pid: custodyUnitBefore.pid,
        custody_service_start_time_ticks:
          custodyCredsBefore.start_time_ticks,
        custody_service_unit_sha256: sha256Id(custodyCatBefore),
        mount_namespace_identity_sha256:
          namespaceBefore.identity_sha256,
        public_runtime_mount_namespace_identity_sha256:
          namespaceBefore.public_runtime_identity_sha256,
        public_runtime_mount_namespace_shared_with_custody:
          namespaceBefore.public_runtime_shared_with_custody,
        public_runtime_payer_root_mapping:
          publicRuntimePathMappingBefore,
        filesystem_root_identity_sha256:
          filesystemRootBefore.identity_sha256,
        public_runtime_filesystem_root_identity_sha256:
          filesystemRootBefore.public_runtime_identity_sha256,
        public_runtime_filesystem_root_shared_with_custody:
          filesystemRootBefore.public_runtime_shared_with_custody,
        mountinfo_sha256: sha256Id(mountInfoBefore),
        public_runtime_mountinfo_sha256:
          sha256Id(publicRuntimeMountInfoBefore),
        boot_id_sha256: sha256Id(bootId),
        machine_id_sha256: sha256Id(machineId),
      }),
    });
  } catch (error) {
    return hold(String(error?.message || error || "collector_observation_failed"));
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return "";
  return String(process.argv[index + 1] || "").trim();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  if (process.argv.includes("--help")) {
    process.stdout.write([
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1,
      "read_only=true",
      "collector_in_custody_mount_namespace_required=true",
      "collector_in_custody_filesystem_root_required=true",
      "public_runtime_mount_namespace_may_differ=true",
      "live_host_qualification_performed=false",
      "production_gate_ready=false",
      "",
      "Usage:",
      "  node --import tsx tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs \\",
      "    --payer-root /absolute/payer-root \\",
      "    --payer-address 0x... \\",
      "    --expected-hostname HOST \\",
      "    --public-runtime-unit UNIT \\",
      "    --custody-service-unit UNIT",
      "",
    ].join("\n"));
  } else {
    const decision =
      inspectCoupledNativeGasReconciliationCustodyHostEvidenceV1({
        payer_root: arg("--payer-root"),
        payer_address: arg("--payer-address"),
        expected_hostname: arg("--expected-hostname"),
        public_runtime_unit: arg("--public-runtime-unit"),
        custody_service_unit: arg("--custody-service-unit"),
      });
    process.stdout.write(JSON.stringify(decision, null, 2) + "\n");
    if (!decision.ok) process.exitCode = 2;
  }
}
