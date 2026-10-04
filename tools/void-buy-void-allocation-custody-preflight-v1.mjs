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

function inspectRoot(rootPath, records, label) {
  const raw = String(rootPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || path.resolve(raw) !== raw) {
    throw new Error(label + "_path_invalid");
  }
  const real = fs.realpathSync(raw);
  if (real !== raw) throw new Error(label + "_symlink_ancestor_or_alias");
  const stat = fs.lstatSync(raw, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(label + "_directory_invalid");
  }
  if (
    typeof process.geteuid !== "function" ||
    stat.uid !== BigInt(process.geteuid()) ||
    (stat.mode & 0o022n) !== 0n
  ) {
    throw new Error(label + "_custody_invalid");
  }
  const mount = resolveMountForPathV1(records, raw);
  return Object.freeze({
    path: raw,
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: Number(stat.mode & 0o777n),
    mount_id: mount.mount_id,
    major_minor: mount.major_minor,
    fs_type: mount.fs_type,
    mount_source: mount.mount_source,
    mount_point: mount.mount_point,
  });
}

export function classifyAllocationCustodySnapshotV1(snapshot) {
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
      status: "DISTINCT_LOCAL_STORAGE_DOMAINS_GREEN_NOT_AUTHORIZED",
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_V1,
      version: 1,
      ready: true,
      ledger,
      high_water: highWater,
      distinct_local_storage_domains_proven: true,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      next_gate:
        "designated_host_snapshot_backup_and_rollback_independence_qualification",
      authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_PREFLIGHT_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(String(error?.message || error || "custody_snapshot_failure"));
  }
}

export function inspectBuyVoidAllocationCustodyPreflightV1({
  ledger_root,
  high_water_root,
  expected_hostname = "",
  mountinfo_text = null,
} = {}) {
  try {
    const hostname = os.hostname();
    if (
      expected_hostname &&
      hostname !== String(expected_hostname)
    ) {
      return hold("designated_host_mismatch", {
        observed_hostname: hostname,
        expected_hostname: String(expected_hostname),
      });
    }
    const mountInfo = parseMountInfoV1(
      mountinfo_text === null
        ? fs.readFileSync("/proc/self/mountinfo", "utf8")
        : String(mountinfo_text),
    );
    const ledger = inspectRoot(ledger_root, mountInfo, "ledger");
    const highWater = inspectRoot(
      high_water_root,
      mountInfo,
      "high_water",
    );
    return classifyAllocationCustodySnapshotV1({
      hostname,
      ledger,
      high_water: highWater,
    });
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
      "    [--expected-hostname HOST]",
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
