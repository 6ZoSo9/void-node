import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_tool: true,
    read_only_host_observation: true,
    exact_writer_identity_derived: true,
    machine_identity_hashed: true,
    boot_identity_hashed: true,
    root_ancestor_evidence_derived: true,
    runtime_permission_evidence_derived: true,
    mount_evidence_derived: true,
    statfs_evidence_derived: true,
    effective_systemd_policy_derived: true,
    runtime_service_control_denial_proven: true,
    unix_socket_evidence_derived: true,
    reviewed_service_contract_required: true,
    evidence_snapshot_derived: true,
    double_census_stability_required: true,
    content_addressed_output: true,
    verification_clock_authority_proven: false,
    evidence_generation_monotonicity_proven: false,
    output_publication: false,
    filesystem_write: false,
    service_install: false,
    service_start: false,
    service_restart: false,
    daemon_reload: false,
    mount_mutation: false,
    permission_mutation: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const PACKET_SCHEMA =
  "void_buy_void_allocation_custody_host_evidence_v1";
const SERVICE_CONTRACT_SCHEMA =
  "void_buy_void_allocation_custody_service_contract_v1";
const SERVICE_CONTRACT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1";
const WRITER_RELATIVE_PATH =
  "src/economic/buy_void_allocation_reservation_publication_writer_v1.ts";
const SERVICE_SOURCE_RELATIVE_PATH =
  "tools/void-buy-allocation-custody-service-v1.mjs";
const SERVICE_CONTRACT_RELATIVE_PATH =
  "docs/architecture/buy-void-allocation-custody-service-contract-v1.json";
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_COMMAND_BYTES = 512 * 1024;
const REVIEWED_SYSTEMD_MAJOR = 255;
const POLKIT_DENY_RULE_PATH =
  "/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules";
const POLKIT_RULE_DIRECTORIES = Object.freeze([
  "/etc/polkit-1/rules.d",
  "/usr/share/polkit-1/rules.d",
]);
const POLKIT_DENY_ACTIONS = Object.freeze([
  "org.freedesktop.systemd1.manage-units",
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "org.freedesktop.systemd1.set-environment",
]);
const EVIDENCE_TTL_MS = 60_000;
const SAFE_NAME = /^[A-Za-z0-9_.@:-]{1,160}$/u;
const ABSOLUTE_PATH_MAX = 4096;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const BOOT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const MACHINE_ID = /^[0-9a-f]{32}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

const CONFIG_KEYS = Object.freeze([
  "repo_root",
  "ledger_root",
  "custody_root",
  "runtime_user",
  "custody_user",
  "ipc_group",
  "socket_path",
  "service_unit",
  "runtime_service_unit",
]);

const SERVICE_CONTRACT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "service_source_sha256",
  "exact_request_schema",
  "exact_response_schema",
  "max_request_bytes",
  "max_response_bytes",
  "response_timeout_ms",
  "arbitrary_path_write",
  "arbitrary_bytes_write",
  "caller_selected_generation",
  "automatic_retry",
  "runtime_integration",
  "payment_acceptance",
  "wallet_or_signer_access",
  "transaction_broadcast",
  "chain2050_write",
  "funds_movement",
]);

const SYSTEMD_PROPERTIES = Object.freeze([
  "User",
  "Group",
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
  "RestrictAddressFamilies",
  "ReadWritePaths",
  "ExecStart",
]);

const RUNTIME_SYSTEMD_PROPERTIES = Object.freeze([
  "User",
  "Group",
  "MainPID",
  "ControlGroup",
  "NoNewPrivileges",
  "CapabilityBoundingSet",
  "AmbientCapabilities",
]);

const SYSTEMD_MANAGE_UNIT_VERBS = Object.freeze([
  "start",
  "verify-active",
  "stop",
  "reload",
  "reload-or-start",
  "restart",
  "try-restart",
  "try-reload",
  "nop",
  "reload-or-restart",
  "reload-or-try-restart",
  "kill",
  "clean",
  "set-property",
  "reset-failed",
  "ref",
  "bind-mount",
  "mount-image",
]);

const SYSTEMD_GLOBAL_CONTROL_ACTIONS = Object.freeze([
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "org.freedesktop.systemd1.set-environment",
]);

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
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
    const record = value;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("custody_host_evidence_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(
    "blob " + String(bytes.length) + "\0",
    "utf8",
  );
  return crypto
    .createHash("sha1")
    .update(header)
    .update(bytes)
    .digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = [...own].sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function safeName(value, code) {
  const text = String(value ?? "").trim();
  if (!SAFE_NAME.test(text)) fail(code);
  return text;
}

function absolutePath(value, code) {
  const raw = String(value ?? "").trim();
  if (
    !raw ||
    raw.length > ABSOLUTE_PATH_MAX ||
    !path.isAbsolute(raw) ||
    raw.includes("\0")
  ) {
    fail(code);
  }
  return path.normalize(raw);
}

function safeInteger(value, minimum, maximum, code) {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    fail(code);
  }
  return parsed;
}

function modeText(stat) {
  return (
    "0" +
    (Number(stat.mode) & 0o777)
      .toString(8)
      .padStart(3, "0")
  );
}

function bigintText(value, code) {
  const text = String(value);
  if (!UINT.test(text)) fail(code);
  return text;
}

function boolProperty(value, code) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "yes" || text === "true") return true;
  if (text === "no" || text === "false") return false;
  fail(code);
}

function protectHomeProperty(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "yes" || text === "true") return "true";
  return text;
}

function normalizedList(value) {
  if (!String(value ?? "").trim()) return Object.freeze([]);
  const values = String(value)
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .sort();
  if (new Set(values).size !== values.length) {
    fail("custody_host_evidence_list_duplicate");
  }
  return Object.freeze(values);
}

function normalizedMountOptions(value) {
  const values = String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
  return Object.freeze([...new Set(values)]);
}

function defaultIo() {
  return Object.freeze({
    readFile(file) {
      return fs.readFileSync(file);
    },
    lstat(file) {
      return fs.lstatSync(file, { bigint: true });
    },
    statfs(file) {
      return fs.statfsSync(file, { bigint: true });
    },
    execFile(command, args) {
      return execFileSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: MAX_COMMAND_BYTES,
      });
    },
    execFileStatus(command, args) {
      const result = spawnSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: MAX_COMMAND_BYTES,
      });
      if (
        result.error ||
        result.signal ||
        !Number.isInteger(result.status)
      ) {
        throw result.error || new Error("command_status_unavailable");
      }
      return Object.freeze({
        status: result.status,
        stdout: String(result.stdout ?? ""),
        stderr: String(result.stderr ?? ""),
      });
    },
    nowMs() {
      return Date.now();
    },
  });
}

function run(io, command, args, code) {
  let value;
  try {
    value = io.execFile(command, args);
  } catch {
    fail(code);
  }
  const text = String(value ?? "");
  if (Buffer.byteLength(text, "utf8") > MAX_COMMAND_BYTES) {
    fail(code);
  }
  return text.trim();
}

function runStatus(io, command, args, code) {
  if (typeof io.execFileStatus !== "function") fail(code);
  let result;
  try {
    result = io.execFileStatus(command, args);
  } catch {
    fail(code);
  }
  const status = Number(result?.status);
  const stdout = String(result?.stdout ?? "");
  const stderr = String(result?.stderr ?? "");
  if (
    !Number.isInteger(status) ||
    Buffer.byteLength(stdout, "utf8") > MAX_COMMAND_BYTES ||
    Buffer.byteLength(stderr, "utf8") > MAX_COMMAND_BYTES
  ) {
    fail(code);
  }
  return Object.freeze({ status, stdout, stderr });
}

function readBounded(io, file, maximum, code) {
  let stat;
  let bytes;
  try {
    stat = io.lstat(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size < 1n ||
      stat.size > BigInt(maximum)
    ) {
      fail(code);
    }
    bytes = Buffer.from(io.readFile(file));
    const after = io.lstat(file);
    if (
      bytes.length !== Number(stat.size) ||
      stat.dev !== after.dev ||
      stat.ino !== after.ino ||
      stat.size !== after.size ||
      stat.mtimeNs !== after.mtimeNs ||
      stat.ctimeNs !== after.ctimeNs
    ) {
      fail(code);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === code
    ) {
      throw error;
    }
    fail(code);
  }
  return bytes;
}

function userIds(io, user, code) {
  const uid = safeInteger(
    run(io, "id", ["-u", user], code),
    1,
    0x7fff_ffff,
    code,
  );
  const gid = safeInteger(
    run(io, "id", ["-g", user], code),
    1,
    0x7fff_ffff,
    code,
  );
  const primaryGroup = safeName(
    run(io, "id", ["-gn", user], code),
    code,
  );
  const groups = run(io, "id", ["-G", user], code)
    .split(/\s+/u)
    .filter(Boolean)
    .map((value) =>
      safeInteger(value, 0, 0x7fff_ffff, code),
    );
  return Object.freeze({
    uid,
    gid,
    primary_group: primaryGroup,
    groups: Object.freeze([...new Set(groups)].sort((a, b) => a - b)),
  });
}

function groupId(io, group) {
  const line = run(
    io,
    "getent",
    ["group", group],
    "custody_host_evidence_ipc_group_invalid",
  );
  const fields = line.split(":");
  if (fields.length < 4 || fields[0] !== group) {
    fail("custody_host_evidence_ipc_group_invalid");
  }
  return safeInteger(
    fields[2],
    1,
    0x7fff_ffff,
    "custody_host_evidence_ipc_group_invalid",
  );
}

function assertSimpleAcl(io, target) {
  const raw = run(
    io,
    "getfacl",
    ["-cp", "--absolute-names", target],
    "custody_host_evidence_acl_unavailable",
  );
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  for (const line of lines) {
    if (
      line.startsWith("default:") ||
      /^user:[^:]+:/u.test(line) ||
      /^group:[^:]+:/u.test(line)
    ) {
      fail("custody_host_evidence_extended_acl_forbidden");
    }
    if (
      !/^(user::|group::|other::|mask::)[rwx-]{3}$/u.test(line)
    ) {
      fail("custody_host_evidence_acl_invalid");
    }
  }
}

function canWriteDirectory(stat, runtimeUid, runtimeGroups) {
  const mode = Number(stat.mode) & 0o777;
  let bits;
  if (Number(stat.uid) === runtimeUid) {
    bits = (mode >> 6) & 0o7;
  } else if (runtimeGroups.includes(Number(stat.gid))) {
    bits = (mode >> 3) & 0o7;
  } else {
    bits = mode & 0o7;
  }
  return (bits & 0o3) === 0o3;
}

function pathChain(resolved) {
  const root = path.parse(resolved).root;
  const parts = resolved
    .slice(root.length)
    .split(path.sep)
    .filter(Boolean);
  const out = [root];
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    out.push(current);
  }
  return out;
}

function statIdentity(stat) {
  return Object.freeze({
    dev: bigintText(stat.dev, "custody_host_evidence_stat_invalid"),
    ino: bigintText(stat.ino, "custody_host_evidence_stat_invalid"),
    uid: safeInteger(
      stat.uid,
      0,
      0x7fff_ffff,
      "custody_host_evidence_stat_invalid",
    ),
    gid: safeInteger(
      stat.gid,
      0,
      0x7fff_ffff,
      "custody_host_evidence_stat_invalid",
    ),
    mode: modeText(stat),
  });
}

function collectPathStats(io, resolved, runtime) {
  const chain = pathChain(resolved);
  const stats = chain.map((entry) => {
    let stat;
    try {
      stat = io.lstat(entry);
    } catch {
      fail("custody_host_evidence_path_stat_failed");
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail("custody_host_evidence_path_not_direct_directory");
    }
    assertSimpleAcl(io, entry);
    return Object.freeze({
      path: entry,
      stat,
      identity: statIdentity(stat),
      runtime_write:
        canWriteDirectory(stat, runtime.uid, runtime.groups),
    });
  });
  return Object.freeze(stats);
}

function collectMount(io, root) {
  const raw = run(
    io,
    "findmnt",
    [
      "--json",
      "--target",
      root,
      "--output",
      "TARGET,SOURCE,FSTYPE,OPTIONS,MAJ:MIN",
    ],
    "custody_host_evidence_findmnt_failed",
  );
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("custody_host_evidence_findmnt_invalid");
  }
  const filesystems = parsed?.filesystems;
  if (!Array.isArray(filesystems) || filesystems.length !== 1) {
    fail("custody_host_evidence_findmnt_invalid");
  }
  const entry = filesystems[0];
  const target = absolutePath(
    entry.target,
    "custody_host_evidence_mount_target_invalid",
  );
  const source = String(entry.source ?? "").trim();
  const fstype = String(entry.fstype ?? "").trim();
  const majorMinor = String(
    entry["maj:min"] ?? entry.maj_min ?? "",
  ).trim();
  if (
    !source.startsWith("/dev/") ||
    !/^[A-Za-z0-9._:+/-]{1,300}$/u.test(source) ||
    !/^[A-Za-z0-9._-]{1,64}$/u.test(fstype) ||
    !/^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/u.test(majorMinor)
  ) {
    fail("custody_host_evidence_mount_identity_invalid");
  }
  const relative = path.relative(target, root);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("custody_host_evidence_mount_target_invalid");
  }
  const uuid = run(
    io,
    "lsblk",
    ["-ndo", "UUID", source],
    "custody_host_evidence_mount_uuid_failed",
  );
  if (!/^[A-Za-z0-9._:-]{1,160}$/u.test(uuid)) {
    fail("custody_host_evidence_mount_uuid_invalid");
  }
  let statfs;
  try {
    statfs = io.statfs(root);
  } catch {
    fail("custody_host_evidence_statfs_failed");
  }
  const type = BigInt.asUintN(64, BigInt(statfs.type));
  return Object.freeze({
    medium_present: true,
    mount_target: target,
    mount_source: source,
    mount_uuid: uuid,
    major_minor: majorMinor,
    filesystem_type: fstype,
    statfs_type: "0x" + type.toString(16),
    mount_options: normalizedMountOptions(entry.options),
  });
}

function collectRoot(io, resolved, runtime) {
  const stats = collectPathStats(io, resolved, runtime);
  const rootEntry = stats.at(-1);
  const parentEntry = stats.at(-2);
  if (!rootEntry || !parentEntry) {
    fail("custody_host_evidence_root_depth_invalid");
  }
  const ancestors = stats.slice(0, -1).map((entry) =>
    Object.freeze({
      path: entry.path,
      ...entry.identity,
      symlink: false,
      runtime_write: entry.runtime_write,
      runtime_rename: entry.runtime_write,
      runtime_recreate: entry.runtime_write,
    }),
  );
  return Object.freeze({
    resolved_path: resolved,
    ...rootEntry.identity,
    symlink: false,
    runtime_write: rootEntry.runtime_write,
    runtime_rename: parentEntry.runtime_write,
    runtime_recreate: parentEntry.runtime_write,
    ancestors: Object.freeze(ancestors),
    mount: collectMount(io, resolved),
  });
}

function parseSystemdShow(
  raw,
  requiredProperties = SYSTEMD_PROPERTIES,
) {
  const out = Object.create(null);
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const index = line.indexOf("=");
    if (index <= 0) {
      fail("custody_host_evidence_systemd_invalid");
    }
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (Object.hasOwn(out, key)) {
      fail("custody_host_evidence_systemd_invalid");
    }
    out[key] = value;
  }
  for (const key of requiredProperties) {
    if (!Object.hasOwn(out, key)) {
      fail("custody_host_evidence_systemd_invalid");
    }
  }
  return Object.freeze(out);
}

function expectedPolkitDenyRule(runtimeUser) {
  const user = JSON.stringify(runtimeUser);
  const actions = POLKIT_DENY_ACTIONS.map(
    (action) =>
      "      action.id === " + JSON.stringify(action),
  ).join(" ||\n");
  return (
    "polkit.addRule(function(action, subject) {\n" +
    "  if (\n" +
    "    subject.user === " + user + " &&\n" +
    "    (\n" +
    actions + "\n" +
    "    )\n" +
    "  ) {\n" +
    "    return polkit.Result.NO;\n" +
    "  }\n" +
    "  return polkit.Result.NOT_HANDLED;\n" +
    "});\n"
  );
}

export function testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1(
  runtimeUser,
) {
  return expectedPolkitDenyRule(
    safeName(
      runtimeUser,
      "custody_host_evidence_runtime_user_invalid",
    ),
  );
}

function collectPolkitRuleNames(io, directory) {
  const raw = run(
    io,
    "find",
    [
      directory,
      "-mindepth",
      "1",
      "-maxdepth",
      "1",
      "-name",
      "*.rules",
      "-printf",
      "%f\\n",
    ],
    "custody_host_evidence_polkit_rules_inventory_failed",
  );
  return raw
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => {
      if (!/^[A-Za-z0-9_.-]{1,200}\.rules$/u.test(name)) {
        fail("custody_host_evidence_polkit_rule_name_invalid");
      }
      return name;
    });
}

function collectPolkitDenyRuleEvidence(io, runtimeUser) {
  const expected = Buffer.from(
    expectedPolkitDenyRule(runtimeUser),
    "utf8",
  );
  const observed = readBounded(
    io,
    POLKIT_DENY_RULE_PATH,
    16 * 1024,
    "custody_host_evidence_polkit_deny_rule_invalid",
  );
  if (!observed.equals(expected)) {
    fail("custody_host_evidence_polkit_deny_rule_bytes_mismatch");
  }
  const stat = io.lstat(POLKIT_DENY_RULE_PATH);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    Number(stat.uid) !== 0 ||
    Number(stat.gid) !== 0 ||
    stat.nlink !== 1n ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail("custody_host_evidence_polkit_deny_rule_custody_invalid");
  }

  const entries = [];
  for (let rank = 0; rank < POLKIT_RULE_DIRECTORIES.length; rank += 1) {
    const directory = POLKIT_RULE_DIRECTORIES[rank];
    for (const name of collectPolkitRuleNames(io, directory)) {
      entries.push(
        Object.freeze({
          name,
          directory,
          rank,
          path: path.join(directory, name),
        }),
      );
    }
  }
  entries.sort((left, right) => {
    const byName = left.name.localeCompare(right.name);
    if (byName !== 0) return byName;
    return left.rank - right.rank;
  });
  if (
    entries.length < 1 ||
    entries[0].path !== POLKIT_DENY_RULE_PATH
  ) {
    fail("custody_host_evidence_polkit_deny_rule_not_first");
  }

  return Object.freeze({
    path: POLKIT_DENY_RULE_PATH,
    sha256: sha256Id(observed),
    bytes: observed.length,
    owner_uid: Number(stat.uid),
    owner_gid: Number(stat.gid),
    mode: modeText(stat),
    lexically_first: true,
    runtime_user: runtimeUser,
    denied_action_ids: POLKIT_DENY_ACTIONS,
    rule_inventory: Object.freeze(entries),
  });
}

function processStartTimeTicks(io, pid) {
  const raw = run(
    io,
    "cat",
    ["/proc/" + String(pid) + "/stat"],
    "custody_host_evidence_runtime_process_stat_failed",
  );
  const close = raw.lastIndexOf(") ");
  if (close <= 0) {
    fail("custody_host_evidence_runtime_process_stat_invalid");
  }
  const fields = raw.slice(close + 2).trim().split(/\s+/u);
  if (
    fields.length < 20 ||
    !/^[A-Za-z]$/u.test(fields[0]) ||
    !UINT.test(fields[19]) ||
    BigInt(fields[19]) < 1n
  ) {
    fail("custody_host_evidence_runtime_process_stat_invalid");
  }
  return fields[19];
}

export function testOnlyClassifyBuyVoidAllocationCustodyPolkitStatusV1(
  status,
) {
  const value = Number(status);
  if (!Number.isInteger(value)) return "error";
  if (value === 0) return "authorized";
  if (value === 1) return "denied";
  if (value === 2) return "challenge";
  if (value === 3) return "dismissed";
  return "error";
}

function processCapabilityState(io, pid) {
  const raw = run(
    io,
    "cat",
    ["/proc/" + String(pid) + "/status"],
    "custody_host_evidence_runtime_process_status_failed",
  );
  const out = Object.create(null);
  for (const key of ["CapInh", "CapPrm", "CapEff", "CapAmb"]) {
    const match = raw.match(
      new RegExp("^" + key + ":\\s*([0-9A-Fa-f]+)$", "mu"),
    );
    if (!match) {
      fail("custody_host_evidence_runtime_process_capabilities_invalid");
    }
    const normalized = match[1].replace(/^0+/u, "") || "0";
    if (normalized !== "0") {
      fail("custody_host_evidence_runtime_process_capabilities_nonzero");
    }
    out[key] = "0";
  }
  const noNewPrivs = raw.match(/^NoNewPrivs:\\s*([01])$/mu);
  if (!noNewPrivs || noNewPrivs[1] !== "1") {
    fail("custody_host_evidence_runtime_process_no_new_privileges_not_enforced");
  }
  return Object.freeze({
    inheritable: out.CapInh,
    permitted: out.CapPrm,
    effective: out.CapEff,
    ambient: out.CapAmb,
    no_new_privileges: true,
  });
}

function pkcheckDenial(io, actionId, subject, details = []) {
  const args = [
    "--action-id",
    actionId,
    "--process",
    subject,
  ];
  for (const [key, value] of details) {
    args.push("--detail", key, value);
  }
  const result = runStatus(
    io,
    "pkcheck",
    args,
    "custody_host_evidence_polkit_probe_failed",
  );
  const classification =
    testOnlyClassifyBuyVoidAllocationCustodyPolkitStatusV1(
      result.status,
    );
  if (classification !== "denied") {
    fail(
      classification === "authorized"
        ? "custody_host_evidence_runtime_service_control_authorized"
        : "custody_host_evidence_runtime_service_control_not_explicitly_denied",
    );
  }
  return Object.freeze({
    action_id: actionId,
    details: Object.freeze(
      details.map(([key, value]) => Object.freeze({ key, value })),
    ),
    exit_status: 1,
    result: "explicitly_denied",
  });
}

function collectRuntimeServiceControlEvidence(io, config, runtime) {
  const polkitDenyRule = collectPolkitDenyRuleEvidence(
    io,
    config.runtime_user,
  );
  const systemdVersionLine = run(
    io,
    "systemctl",
    ["--version"],
    "custody_host_evidence_systemd_version_failed",
  ).split("\n", 1)[0].trim();
  const versionMatch = /^systemd\s+([0-9]+)(?:\s|$)/u.exec(
    systemdVersionLine,
  );
  if (
    !versionMatch ||
    Number(versionMatch[1]) !== REVIEWED_SYSTEMD_MAJOR
  ) {
    fail("custody_host_evidence_systemd_major_not_reviewed");
  }

  const args = [
    "show",
    config.runtime_service_unit,
    "--no-pager",
  ];
  for (const property of RUNTIME_SYSTEMD_PROPERTIES) {
    args.push("--property", property);
  }
  const show = parseSystemdShow(
    run(
      io,
      "systemctl",
      args,
      "custody_host_evidence_runtime_service_show_failed",
    ),
    RUNTIME_SYSTEMD_PROPERTIES,
  );
  if (
    show.User !== config.runtime_user ||
    show.Group !== runtime.primary_group ||
    boolProperty(
      show.NoNewPrivileges,
      "custody_host_evidence_runtime_service_invalid",
    ) !== true
  ) {
    fail("custody_host_evidence_runtime_service_identity_invalid");
  }
  const pid = safeInteger(
    show.MainPID,
    1,
    0x7fff_ffff,
    "custody_host_evidence_runtime_service_pid_invalid",
  );
  const capabilityBoundingSet =
    normalizedList(show.CapabilityBoundingSet);
  const ambientCapabilities =
    normalizedList(show.AmbientCapabilities);
  if (
    capabilityBoundingSet.length !== 0 ||
    ambientCapabilities.length !== 0
  ) {
    fail("custody_host_evidence_runtime_service_capabilities_not_empty");
  }
  const controlGroup = String(show.ControlGroup ?? "").trim();
  if (!/^\/[A-Za-z0-9_.@:+\/-]{1,500}$/u.test(controlGroup)) {
    fail("custody_host_evidence_runtime_service_cgroup_invalid");
  }
  const processIdentity = run(
    io,
    "ps",
    ["-o", "uid=,gid=", "-p", String(pid)],
    "custody_host_evidence_runtime_process_identity_failed",
  )
    .split(/\s+/u)
    .filter(Boolean);
  if (
    processIdentity.length !== 2 ||
    safeInteger(
      processIdentity[0],
      1,
      0x7fff_ffff,
      "custody_host_evidence_runtime_process_identity_invalid",
    ) !== runtime.uid ||
    safeInteger(
      processIdentity[1],
      1,
      0x7fff_ffff,
      "custody_host_evidence_runtime_process_identity_invalid",
    ) !== runtime.gid
  ) {
    fail("custody_host_evidence_runtime_process_identity_invalid");
  }

  const startTimeTicks = processStartTimeTicks(io, pid);
  const processCapabilities = processCapabilityState(io, pid);
  const subject =
    String(pid) + "," + startTimeTicks + "," + String(runtime.uid);
  const checks = [
    pkcheckDenial(
      io,
      "org.freedesktop.systemd1.manage-units",
      subject,
    ),
  ];
  for (const verb of SYSTEMD_MANAGE_UNIT_VERBS) {
    checks.push(
      pkcheckDenial(
        io,
        "org.freedesktop.systemd1.manage-units",
        subject,
        [
          ["unit", config.service_unit],
          ["verb", verb],
        ],
      ),
    );
  }
  for (const actionId of SYSTEMD_GLOBAL_CONTROL_ACTIONS) {
    checks.push(pkcheckDenial(io, actionId, subject));
  }

  return Object.freeze({
    reviewed_systemd_major: REVIEWED_SYSTEMD_MAJOR,
    observed_systemd_version_line: systemdVersionLine,
    polkit_deny_rule: polkitDenyRule,
    runtime_service_unit: config.runtime_service_unit,
    runtime_main_pid: pid,
    runtime_control_group: controlGroup,
    runtime_process_start_time_ticks: startTimeTicks,
    runtime_process_uid: runtime.uid,
    runtime_process_gid: runtime.gid,
    runtime_service_capability_bounding_set:
      capabilityBoundingSet,
    runtime_service_ambient_capabilities:
      ambientCapabilities,
    runtime_process_capabilities: processCapabilities,
    pkcheck_subject: subject,
    checked_actions: Object.freeze(checks),
    all_systemd_control_actions_explicitly_denied: true,
    runtime_can_control_service: false,
  });
}

function readServiceContract(io, repoRoot) {
  const contractPath = path.join(
    repoRoot,
    SERVICE_CONTRACT_RELATIVE_PATH,
  );
  const sourcePath = path.join(
    repoRoot,
    SERVICE_SOURCE_RELATIVE_PATH,
  );
  const contractBytes = readBounded(
    io,
    contractPath,
    128 * 1024,
    "custody_host_evidence_service_contract_missing",
  );
  let parsed;
  try {
    parsed = JSON.parse(contractBytes.toString("utf8"));
  } catch {
    fail("custody_host_evidence_service_contract_invalid");
  }
  const contract = exactObject(
    parsed,
    SERVICE_CONTRACT_KEYS,
    "custody_host_evidence_service_contract_invalid",
  );
  if (
    contract.schema !== SERVICE_CONTRACT_SCHEMA ||
    contract.marker !== SERVICE_CONTRACT_MARKER ||
    contract.version !== 1 ||
    contract.exact_request_schema !== true ||
    contract.exact_response_schema !== true ||
    contract.arbitrary_path_write !== false ||
    contract.arbitrary_bytes_write !== false ||
    contract.caller_selected_generation !== false ||
    contract.automatic_retry !== false ||
    contract.runtime_integration !== false ||
    contract.payment_acceptance !== false ||
    contract.wallet_or_signer_access !== false ||
    contract.transaction_broadcast !== false ||
    contract.chain2050_write !== false ||
    contract.funds_movement !== false
  ) {
    fail("custody_host_evidence_service_contract_invalid");
  }
  const maxRequest = safeInteger(
    contract.max_request_bytes,
    1,
    64 * 1024,
    "custody_host_evidence_service_contract_invalid",
  );
  const maxResponse = safeInteger(
    contract.max_response_bytes,
    1,
    64 * 1024,
    "custody_host_evidence_service_contract_invalid",
  );
  const timeout = safeInteger(
    contract.response_timeout_ms,
    1,
    10_000,
    "custody_host_evidence_service_contract_invalid",
  );
  const expectedSourceSha = String(
    contract.service_source_sha256 ?? "",
  );
  if (!SHA256_ID.test(expectedSourceSha)) {
    fail("custody_host_evidence_service_contract_invalid");
  }
  const sourceBytes = readBounded(
    io,
    sourcePath,
    MAX_SOURCE_BYTES,
    "custody_host_evidence_service_source_missing",
  );
  const sourceSha = sha256Id(sourceBytes);
  if (sourceSha !== expectedSourceSha) {
    fail("custody_host_evidence_service_source_mismatch");
  }
  return Object.freeze({
    contract: Object.freeze({
      ...contract,
      max_request_bytes: maxRequest,
      max_response_bytes: maxResponse,
      response_timeout_ms: timeout,
    }),
    contract_sha256: sha256Id(contractBytes),
    service_source_sha256: sourceSha,
    source_path: sourcePath,
  });
}

function collectServicePolicy(
  io,
  config,
  custody,
  ledgerRoot,
  custodyRoot,
  serviceContract,
  runtimeControl,
) {
  const args = ["show", config.service_unit, "--no-pager"];
  for (const property of SYSTEMD_PROPERTIES) {
    args.push("--property", property);
  }
  const raw = run(
    io,
    "systemctl",
    args,
    "custody_host_evidence_systemd_failed",
  );
  const show = parseSystemdShow(raw);
  if (
    show.User !== config.custody_user ||
    show.Group !== custody.primary_group
  ) {
    fail("custody_host_evidence_service_identity_invalid");
  }
  const execStart = String(show.ExecStart ?? "");
  if (!execStart.includes(serviceContract.source_path)) {
    fail("custody_host_evidence_service_exec_mismatch");
  }
  const readWritePaths = normalizedList(show.ReadWritePaths);
  return Object.freeze({
    user_uid: custody.uid,
    group_gid: custody.gid,
    umask: String(show.UMask ?? "").trim(),
    no_new_privileges: boolProperty(
      show.NoNewPrivileges,
      "custody_host_evidence_systemd_invalid",
    ),
    private_tmp: boolProperty(
      show.PrivateTmp,
      "custody_host_evidence_systemd_invalid",
    ),
    private_devices: boolProperty(
      show.PrivateDevices,
      "custody_host_evidence_systemd_invalid",
    ),
    protect_system: String(show.ProtectSystem ?? "").trim(),
    protect_home: protectHomeProperty(show.ProtectHome),
    protect_kernel_tunables: boolProperty(
      show.ProtectKernelTunables,
      "custody_host_evidence_systemd_invalid",
    ),
    protect_kernel_modules: boolProperty(
      show.ProtectKernelModules,
      "custody_host_evidence_systemd_invalid",
    ),
    protect_control_groups: boolProperty(
      show.ProtectControlGroups,
      "custody_host_evidence_systemd_invalid",
    ),
    lock_personality: boolProperty(
      show.LockPersonality,
      "custody_host_evidence_systemd_invalid",
    ),
    restrict_suid_sgid: boolProperty(
      show.RestrictSUIDSGID,
      "custody_host_evidence_systemd_invalid",
    ),
    restrict_realtime: boolProperty(
      show.RestrictRealtime,
      "custody_host_evidence_systemd_invalid",
    ),
    capability_bounding_set:
      normalizedList(show.CapabilityBoundingSet),
    ambient_capabilities:
      normalizedList(show.AmbientCapabilities),
    restrict_address_families:
      normalizedList(show.RestrictAddressFamilies),
    read_write_paths: readWritePaths,
    runtime_can_control_service:
      runtimeControl.runtime_can_control_service,
  });
}

function collectSocket(
  io,
  socketPath,
  runtime,
  custody,
  ipcGid,
  contract,
) {
  const parent = path.dirname(socketPath);
  const parentChain = collectPathStats(io, parent, runtime);
  const parentEntry = parentChain.at(-1);
  if (!parentEntry) {
    fail("custody_host_evidence_socket_parent_invalid");
  }
  assertSimpleAcl(io, socketPath);
  let socket;
  try {
    socket = io.lstat(socketPath);
  } catch {
    fail("custody_host_evidence_socket_missing");
  }
  if (!socket.isSocket() || socket.isSymbolicLink()) {
    fail("custody_host_evidence_socket_invalid");
  }
  const socketIdentity = statIdentity(socket);
  const runtimeMember = runtime.groups.includes(ipcGid);
  const custodyMember = custody.groups.includes(ipcGid);
  const parentWritable =
    canWriteDirectory(parentEntry.stat, runtime.uid, runtime.groups);
  const parentMode = modeText(parentEntry.stat);
  const socketMode = modeText(socket);
  const runtimeConnect =
    runtimeMember &&
    Number(parentEntry.stat.gid) === ipcGid &&
    parentMode === "0750" &&
    Number(socket.gid) === ipcGid &&
    socketMode === "0660";
  const serverControlled =
    Number(parentEntry.stat.uid) === custody.uid &&
    Number(socket.uid) === custody.uid;
  return Object.freeze({
    resolved_path: socketPath,
    parent_path: parent,
    parent_uid: Number(parentEntry.stat.uid),
    parent_gid: Number(parentEntry.stat.gid),
    parent_mode: parentMode,
    parent_symlink: false,
    owner_uid: socketIdentity.uid,
    group_gid: socketIdentity.gid,
    mode: socketMode,
    direct_socket: true,
    symlink_ancestors: false,
    server_controlled_path: serverControlled,
    runtime_connect_allowed: runtimeConnect,
    runtime_replace_denied: !parentWritable,
    runtime_member_of_connect_group: runtimeMember,
    custody_member_of_connect_group: custodyMember,
    exact_request_schema: contract.exact_request_schema,
    exact_response_schema: contract.exact_response_schema,
    max_request_bytes: contract.max_request_bytes,
    max_response_bytes: contract.max_response_bytes,
    response_timeout_ms: contract.response_timeout_ms,
    arbitrary_path_write: contract.arbitrary_path_write,
    arbitrary_bytes_write: contract.arbitrary_bytes_write,
    caller_selected_generation:
      contract.caller_selected_generation,
    automatic_retry: contract.automatic_retry,
  });
}

function collectWriterIdentity(io, repoRoot) {
  const head = run(
    io,
    "git",
    ["-C", repoRoot, "rev-parse", "HEAD"],
    "custody_host_evidence_git_head_failed",
  );
  if (!SHA1.test(head)) {
    fail("custody_host_evidence_git_head_invalid");
  }
  const status = run(
    io,
    "git",
    [
      "-C",
      repoRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ],
    "custody_host_evidence_git_status_failed",
  );
  if (status) {
    fail("custody_host_evidence_repository_not_clean");
  }
  const writerPath = path.join(repoRoot, WRITER_RELATIVE_PATH);
  const bytes = readBounded(
    io,
    writerPath,
    MAX_SOURCE_BYTES,
    "custody_host_evidence_writer_source_invalid",
  );
  return Object.freeze({
    writer_source_head: head,
    writer_source_blob_sha1: gitBlobSha1(bytes),
    writer_source_sha256: sha256Id(bytes),
  });
}

function collectMachineAndBoot(io) {
  const machineBytes = readBounded(
    io,
    "/etc/machine-id",
    4096,
    "custody_host_evidence_machine_id_unavailable",
  );
  const machine = machineBytes.toString("utf8").trim().toLowerCase();
  if (!MACHINE_ID.test(machine)) {
    fail("custody_host_evidence_machine_id_invalid");
  }
  const bootBytes = readBounded(
    io,
    "/proc/sys/kernel/random/boot_id",
    4096,
    "custody_host_evidence_boot_id_unavailable",
  );
  const boot = bootBytes.toString("utf8").trim().toLowerCase();
  if (!BOOT_ID.test(boot)) {
    fail("custody_host_evidence_boot_id_invalid");
  }
  return Object.freeze({
    host_id:
      "linux-machine-sha256:" +
      sha256Id(Buffer.from(machine, "utf8")).slice("sha256:".length),
    boot_id_sha256: sha256Id(Buffer.from(boot, "utf8")),
  });
}

function normalizeConfig(raw) {
  const value = exactObject(
    raw,
    CONFIG_KEYS,
    "custody_host_evidence_config_invalid",
  );
  const repoRoot = absolutePath(
    value.repo_root,
    "custody_host_evidence_repo_root_invalid",
  );
  const ledgerRoot = absolutePath(
    value.ledger_root,
    "custody_host_evidence_ledger_root_invalid",
  );
  const custodyRoot = absolutePath(
    value.custody_root,
    "custody_host_evidence_custody_root_invalid",
  );
  const socketPath = absolutePath(
    value.socket_path,
    "custody_host_evidence_socket_path_invalid",
  );
  if (
    ledgerRoot === custodyRoot ||
    path.relative(ledgerRoot, custodyRoot) === "" ||
    !path.relative(ledgerRoot, custodyRoot).startsWith("..") ||
    !path.relative(custodyRoot, ledgerRoot).startsWith("..")
  ) {
    fail("custody_host_evidence_roots_not_disjoint");
  }
  return Object.freeze({
    repo_root: repoRoot,
    ledger_root: ledgerRoot,
    custody_root: custodyRoot,
    runtime_user: safeName(
      value.runtime_user,
      "custody_host_evidence_runtime_user_invalid",
    ),
    custody_user: safeName(
      value.custody_user,
      "custody_host_evidence_custody_user_invalid",
    ),
    ipc_group: safeName(
      value.ipc_group,
      "custody_host_evidence_ipc_group_invalid",
    ),
    socket_path: socketPath,
    service_unit: safeName(
      value.service_unit,
      "custody_host_evidence_service_unit_invalid",
    ),
    runtime_service_unit: safeName(
      value.runtime_service_unit,
      "custody_host_evidence_runtime_service_unit_invalid",
    ),
  });
}

function collectStaticEvidence(config, io) {
  const writer = collectWriterIdentity(io, config.repo_root);
  const machine = collectMachineAndBoot(io);
  const runtime = userIds(
    io,
    config.runtime_user,
    "custody_host_evidence_runtime_identity_invalid",
  );
  const custody = userIds(
    io,
    config.custody_user,
    "custody_host_evidence_custody_identity_invalid",
  );
  if (
    runtime.uid === custody.uid ||
    runtime.gid === custody.gid
  ) {
    fail("custody_host_evidence_identity_not_separated");
  }
  const ipcGid = groupId(io, config.ipc_group);
  if (ipcGid === runtime.gid || ipcGid === custody.gid) {
    fail("custody_host_evidence_ipc_group_not_separate");
  }
  const serviceContract = readServiceContract(io, config.repo_root);
  const ledgerRoot = collectRoot(
    io,
    config.ledger_root,
    runtime,
  );
  const custodyRoot = collectRoot(
    io,
    config.custody_root,
    runtime,
  );
  const runtimeServiceControl =
    collectRuntimeServiceControlEvidence(io, config, runtime);
  const servicePolicy = collectServicePolicy(
    io,
    config,
    custody,
    config.ledger_root,
    config.custody_root,
    serviceContract,
    runtimeServiceControl,
  );
  const socket = collectSocket(
    io,
    config.socket_path,
    runtime,
    custody,
    ipcGid,
    serviceContract.contract,
  );

  return Object.freeze({
    writer,
    machine,
    service_contract_attestation_sha256:
      serviceContract.contract_sha256,
    service_source_sha256:
      serviceContract.service_source_sha256,
    runtime_service_control_evidence:
      runtimeServiceControl,
    host_static: Object.freeze({
      host_id: machine.host_id,
      runtime_uid: runtime.uid,
      runtime_gid: runtime.gid,
      custody_uid: custody.uid,
      custody_gid: custody.gid,
      ledger_root: ledgerRoot,
      custody_root: custodyRoot,
      socket,
      service_policy: servicePolicy,
      fallback_storage_enabled: false,
      custody_medium_absence_holds: true,
    }),
  });
}

export function collectBuyVoidAllocationCustodyHostEvidenceV1(
  rawConfig,
  injectedIo = null,
) {
  const config = normalizeConfig(rawConfig);
  const io = injectedIo || defaultIo();

  const first = collectStaticEvidence(config, io);
  const second = collectStaticEvidence(config, io);
  if (canonicalJson(first) !== canonicalJson(second)) {
    fail("custody_host_evidence_changed_during_collection");
  }

  const observedAtMs = safeInteger(
    io.nowMs(),
    1,
    Number.MAX_SAFE_INTEGER,
    "custody_host_evidence_clock_invalid",
  );
  const expiresAtMs = observedAtMs + EVIDENCE_TTL_MS;
  if (!Number.isSafeInteger(expiresAtMs)) {
    fail("custody_host_evidence_clock_invalid");
  }
  const verificationNowMs = safeInteger(
    io.nowMs(),
    observedAtMs,
    expiresAtMs - 1,
    "custody_host_evidence_clock_invalid",
  );
  const evidenceGeneration = String(observedAtMs);

  const hostEvidence = Object.freeze({
    host_id: second.host_static.host_id,
    evidence_snapshot: Object.freeze({
      observed_at_ms: observedAtMs,
      expires_at_ms: expiresAtMs,
      evidence_generation: evidenceGeneration,
      boot_id_sha256: second.machine.boot_id_sha256,
    }),
    runtime_uid: second.host_static.runtime_uid,
    runtime_gid: second.host_static.runtime_gid,
    custody_uid: second.host_static.custody_uid,
    custody_gid: second.host_static.custody_gid,
    ledger_root: second.host_static.ledger_root,
    custody_root: second.host_static.custody_root,
    socket: second.host_static.socket,
    service_policy: second.host_static.service_policy,
    fallback_storage_enabled: false,
    custody_medium_absence_holds: true,
  });

  const body = Object.freeze({
    schema: PACKET_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1,
    version: 1,
    writer_source_head: second.writer.writer_source_head,
    writer_source_blob_sha1:
      second.writer.writer_source_blob_sha1,
    writer_source_sha256:
      second.writer.writer_source_sha256,
    verification_now_ms: verificationNowMs,
    host_evidence: hostEvidence,
    service_contract_attestation_sha256:
      second.service_contract_attestation_sha256,
    service_source_sha256: second.service_source_sha256,
    runtime_service_control_evidence:
      second.runtime_service_control_evidence,
    collector_wall_clock_authority_proven: false,
    evidence_generation_monotonicity_proven: false,
    live_host_qualification_performed: false,
    filesystem_write_performed: false,
    host_mutation_performed: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
  });

  return Object.freeze({
    ...body,
    collector_receipt_sha256: sha256Id(canonicalJson(body)),
  });
}

function main() {
  const raw = process.env.VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_CONFIG_JSON;
  if (!raw) {
    fail("custody_host_evidence_config_env_required");
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    fail("custody_host_evidence_config_json_invalid");
  }
  const result =
    collectBuyVoidAllocationCustodyHostEvidenceV1(config);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
