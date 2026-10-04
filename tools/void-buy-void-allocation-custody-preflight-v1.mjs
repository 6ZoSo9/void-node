#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1 =
  Object.freeze({
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
  });

const LOCAL_FS_TYPES = new Set(["ext4", "xfs", "btrfs"]);

function hold(reason, detail = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
    version: 1,
    ready: false,
    reason,
    distinct_local_storage_domains_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    ...detail,
    authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1,
  });
}

function unescapeMountInfo(value) {
  return String(value || "")
    .replaceAll("\\040", " ")
    .replaceAll("\\011", "\t")
    .replaceAll("\\012", "\n")
    .replaceAll("\\134", "\\");
}

export function parseMountInfoV1(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("mountinfo_missing");
  }
  const records = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const separator = line.indexOf(" - ");
    if (separator < 0) throw new Error("mountinfo_line_invalid");
    const left = line.slice(0, separator).split(" ");
    const right = line.slice(separator + 3).split(" ");
    if (left.length < 6 || right.length < 3) {
      throw new Error("mountinfo_line_invalid");
    }
    const mountId = Number(left[0]);
    const parentId = Number(left[1]);
    if (
      !Number.isSafeInteger(mountId) ||
      mountId < 1 ||
      !Number.isSafeInteger(parentId) ||
      parentId < 0 ||
      !/^[0-9]+:[0-9]+$/u.test(left[2])
    ) {
      throw new Error("mountinfo_identity_invalid");
    }
    records.push(Object.freeze({
      mount_id: mountId,
      parent_id: parentId,
      major_minor: left[2],
      root: unescapeMountInfo(left[3]),
      mount_point: path.resolve(unescapeMountInfo(left[4])),
      mount_options: left[5],
      fs_type: right[0],
      mount_source: unescapeMountInfo(right[1]),
      super_options: right.slice(2).join(" "),
    }));
  }
  if (records.length < 1) throw new Error("mountinfo_empty");
  return Object.freeze(records);
}

function containsPath(mountPoint, target) {
  if (mountPoint === "/") return target.startsWith("/");
  return target === mountPoint || target.startsWith(mountPoint + path.sep);
}

export function resolveMountForPathV1(records, targetPath) {
  const target = path.resolve(String(targetPath || ""));
  const matches = records
    .filter((record) => containsPath(record.mount_point, target))
    .sort((left, right) =>
      right.mount_point.length - left.mount_point.length ||
      right.mount_id - left.mount_id
    );
  if (matches.length < 1) throw new Error("mount_for_path_missing");
  return matches[0];
}

function pathAncestor(left, right) {
  return (
    right === left ||
    right.startsWith(left.endsWith(path.sep) ? left : left + path.sep)
  );
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function validateObservedRootStat(stat, label) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    typeof process.geteuid !== "function" ||
    stat.uid !== BigInt(process.geteuid()) ||
    (stat.mode & 0o022n) !== 0n
  ) {
    throw new Error(label + "_custody_invalid");
  }
}

function openObservedRoot(rootPath, records, label) {
  if (process.platform !== "linux") {
    throw new Error("custody_linux_required");
  }
  const raw = String(rootPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || path.resolve(raw) !== raw) {
    throw new Error(label + "_path_invalid");
  }
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  if (typeof noFollow !== "number" || typeof directory !== "number") {
    throw new Error("custody_directory_flags_unavailable");
  }
  const real = fs.realpathSync(raw);
  if (real !== raw) throw new Error(label + "_symlink_ancestor_or_alias");
  const listed = fs.lstatSync(raw, { bigint: true });
  validateObservedRootStat(listed, label);

  let fd = -1;
  try {
    fd = fs.openSync(
      raw,
      fs.constants.O_RDONLY | directory | noFollow,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    validateObservedRootStat(opened, label);
    if (!sameDirectoryIdentity(listed, opened)) {
      throw new Error(label + "_directory_drift");
    }
    const mount = resolveMountForPathV1(records, raw);
    const binding = Object.freeze({
      fd,
      path: raw,
      initial_stat: opened,
      snapshot: Object.freeze({
        path: raw,
        dev: String(opened.dev),
        ino: String(opened.ino),
        mode: Number(opened.mode & 0o777n),
        mount_id: mount.mount_id,
        major_minor: mount.major_minor,
        fs_type: mount.fs_type,
        mount_source: mount.mount_source,
        mount_point: mount.mount_point,
      }),
    });
    fd = -1;
    return binding;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertObservedRootStable(binding, label) {
  const descriptor = fs.fstatSync(binding.fd, { bigint: true });
  const visible = fs.lstatSync(binding.path, { bigint: true });
  validateObservedRootStat(descriptor, label);
  validateObservedRootStat(visible, label);
  if (
    fs.realpathSync(binding.path) !== binding.path ||
    !sameDirectoryIdentity(binding.initial_stat, descriptor) ||
    !sameDirectoryIdentity(binding.initial_stat, visible)
  ) {
    throw new Error(label + "_directory_drift");
  }
}

function classifyAllocationCustodySnapshotV1(snapshot) {
  try {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return hold("custody_snapshot_invalid");
    }
    const ledger = snapshot.ledger;
    const highWater = snapshot.high_water;
    if (
      !ledger || typeof ledger !== "object" || Array.isArray(ledger) ||
      !highWater || typeof highWater !== "object" || Array.isArray(highWater)
    ) {
      return hold("custody_snapshot_roots_invalid");
    }
    for (const [label, root] of [["ledger", ledger], ["high_water", highWater]]) {
      if (
        typeof root.path !== "string" ||
        !path.isAbsolute(root.path) ||
        !Number.isSafeInteger(root.mount_id) ||
        root.mount_id < 1 ||
        !/^[0-9]+:[0-9]+$/u.test(String(root.major_minor || "")) ||
        !LOCAL_FS_TYPES.has(String(root.fs_type || "")) ||
        typeof root.mount_source !== "string" ||
        !root.mount_source.startsWith("/dev/") ||
        typeof root.dev !== "string" ||
        !root.dev
      ) {
        return hold(label + "_storage_domain_invalid", {
          ledger,
          high_water: highWater,
        });
      }
    }
    if (
      pathAncestor(ledger.path, highWater.path) ||
      pathAncestor(highWater.path, ledger.path)
    ) {
      return hold("custody_roots_not_path_disjoint", {
        ledger,
        high_water: highWater,
      });
    }
    if (
      ledger.dev === highWater.dev ||
      ledger.mount_id === highWater.mount_id ||
      ledger.major_minor === highWater.major_minor ||
      ledger.mount_source === highWater.mount_source
    ) {
      return hold("custody_storage_domains_not_distinct", {
        ledger,
        high_water: highWater,
      });
    }
    return Object.freeze({
      ok: true,
      status: "DISTINCT_LOCAL_STORAGE_DOMAINS_CLASSIFIED_TEST_ONLY",
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
      version: 1,
      ready: false,
      test_only: true,
      live_observation_backed: false,
      ledger,
      high_water: highWater,
      storage_domain_classification_green: true,
      distinct_local_storage_domains_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      next_gate:
        "designated_host_live_observation_required",
      authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(String(error?.message || error || "custody_snapshot_failure"));
  }
}

export function testOnlyClassifyAllocationCustodySnapshotV1(snapshot) {
  return classifyAllocationCustodySnapshotV1(snapshot);
}

export function inspectBuyVoidAllocationCustodyPreflightV1({
  ledger_root,
  high_water_root,
  expected_hostname,
} = {}) {
  try {
    const hostname = os.hostname();
    const expectedHostname = String(expected_hostname || "").trim();
    if (!expectedHostname) {
      return hold("designated_host_expectation_required", {
        observed_hostname: hostname,
      });
    }
    if (hostname !== expectedHostname) {
      return hold("designated_host_mismatch", {
        observed_hostname: hostname,
        expected_hostname: expectedHostname,
      });
    }
    const mountInfoBefore = fs.readFileSync(
      "/proc/self/mountinfo",
      "utf8",
    );
    const mountInfo = parseMountInfoV1(mountInfoBefore);
    let ledgerBinding = null;
    let highWaterBinding = null;
    try {
      ledgerBinding = openObservedRoot(
        ledger_root,
        mountInfo,
        "ledger",
      );
      highWaterBinding = openObservedRoot(
        high_water_root,
        mountInfo,
        "high_water",
      );
      assertObservedRootStable(ledgerBinding, "ledger");
      assertObservedRootStable(highWaterBinding, "high_water");
      const mountInfoAfter = fs.readFileSync(
        "/proc/self/mountinfo",
        "utf8",
      );
      if (mountInfoAfter !== mountInfoBefore) {
        throw new Error("mountinfo_changed_during_observation");
      }
      assertObservedRootStable(ledgerBinding, "ledger");
      assertObservedRootStable(highWaterBinding, "high_water");

      const classified = classifyAllocationCustodySnapshotV1({
        ledger: ledgerBinding.snapshot,
        high_water: highWaterBinding.snapshot,
      });
      if (!classified.ok) return classified;
      return Object.freeze({
        ...classified,
        status: "DISTINCT_LOCAL_STORAGE_DOMAINS_GREEN_NOT_AUTHORIZED",
        ready: true,
        test_only: false,
        live_observation_backed: true,
        observation_descriptor_bound: true,
        mountinfo_stable_across_observation: true,
        observed_hostname: hostname,
        expected_hostname: expectedHostname,
        mountinfo_source: "/proc/self/mountinfo",
        distinct_local_storage_domains_proven: true,
        next_gate:
          "designated_host_snapshot_backup_and_rollback_independence_qualification",
      });
    } finally {
      if (highWaterBinding) fs.closeSync(highWaterBinding.fd);
      if (ledgerBinding) fs.closeSync(ledgerBinding.fd);
    }
  } catch (error) {
    return hold(String(error?.message || error || "custody_preflight_failure"));
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return "";
  return String(process.argv[index + 1] || "").trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  if (process.argv.includes("--help")) {
    process.stdout.write([
      VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
      "read_only=true",
      "storage_bootstrap=false",
      "independent_custody_proven=false",
      "",
      "Usage:",
      "  node tools/void-buy-void-allocation-custody-preflight-v1.mjs \\",
      "    --ledger-root /absolute/private/ledger-root \\",
      "    --high-water-root /absolute/private/high-water-root \\",
      "    --expected-hostname HOST",
      "",
    ].join("\n"));
  } else {
    const decision = inspectBuyVoidAllocationCustodyPreflightV1({
      ledger_root: arg("--ledger-root"),
      high_water_root: arg("--high-water-root"),
      expected_hostname: arg("--expected-hostname"),
    });
    process.stdout.write(JSON.stringify(decision, null, 2) + "\n");
    if (!decision.ok) process.exitCode = 2;
  }
}
