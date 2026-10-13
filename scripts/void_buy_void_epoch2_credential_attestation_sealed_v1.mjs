#!/usr/bin/env node
// Builtin-only live credential capability probe.
// Live authority requires execution from the reviewed Git object on stdin.
// No repository module, node_modules package, RPC client, or transaction codec is loaded.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V1";
const CONFIRM =
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV1";
const SERVICE = "void-node-live.service";
const CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";
const EXPECTED_ADDRESS = "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const SOURCE_BINDING_ID =
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
const MAX_CREDENTIAL_BYTES = 256;
const MAX_FILE_BYTES = 2_000_000;
const SHA40 = /^[0-9a-f]{40}$/u;
const HEX32 = /^[0-9a-f]{32}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const MASK64 = (1n << 64n) - 1n;

const REVIEWED_BLOBS = Object.freeze({
  "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs":
    "834f17d99c0351c0f2b10fb024f3ee43afae8a42",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts":
    "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "af2179651a88a74b158e7f3602fc5b3c30701f87",
  "src/economic/buy_void_epoch2_credential_attestation_v1.ts":
    "66e18fd566825e2f2f71a673418209f6824b7c81",
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts":
    "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_epoch2_credential_source_binding_v1.ts":
    "4de9832a0f8e384e477177b55975e8557ec9147c",
});

const SEALED_PATH =
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs";
const AUTHORITY_PATHS = Object.freeze([
  SEALED_PATH,
  ...Object.keys(REVIEWED_BLOBS),
]);

function safeReason(error) {
  const raw = String(error && error.message || "").trim();
  return /^[a-z0-9_:-]{1,160}$/u.test(raw)
    ? raw
    : "epoch2_sealed_attestation_failed";
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function sanitizedGitEnvironment() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
}

function trustedExecutable(candidate, leaf) {
  const resolved = fs.realpathSync(candidate);
  const stat = fs.lstatSync(resolved, { bigint: true });
  const mode = stat.mode & 0o7777n;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0n ||
      (mode & 0o022n) !== 0n || path.basename(resolved) !== leaf) {
    throw new Error("epoch2_sealed_trusted_executable_invalid:" + leaf);
  }
  return resolved;
}

const GIT = trustedExecutable("/usr/bin/git", "git");
const SYSTEMCTL = trustedExecutable("/usr/bin/systemctl", "systemctl");

function git(root, args) {
  return execFileSync(GIT, [
    "-C", root,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    ...args,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 256 * 1024,
    env: sanitizedGitEnvironment(),
  }).trim();
}

function gitLocalBoolean(root, name) {
  try {
    const value = git(root, ["config", "--local", "--bool", "--get", name]);
    if (value === "true") return true;
    if (value === "false" || value === "") return false;
    throw new Error("epoch2_sealed_git_config_value_invalid");
  } catch (error) {
    if (Number(error && error.status) === 1) return false;
    throw error;
  }
}

function readPinnedRegularFile(absolute, maxBytes) {
  let fd = -1;
  let bytes = null;
  try {
    const before = fs.lstatSync(absolute, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile() ||
        before.size < 1n || before.size > BigInt(maxBytes)) {
      throw new Error("epoch2_sealed_source_file_shape_invalid");
    }
    const noFollow = fs.constants.O_NOFOLLOW;
    if (!Number.isInteger(noFollow) || noFollow === 0) {
      throw new Error("epoch2_sealed_nofollow_unavailable");
    }
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!statIdentitySame(before, opened)) {
      throw new Error("epoch2_sealed_source_file_replaced");
    }
    bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const n = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!Number.isSafeInteger(n) || n <= 0) {
        throw new Error("epoch2_sealed_source_file_read_invalid");
      }
      offset += n;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(absolute, { bigint: true });
    if (!statIdentitySame(opened, after) ||
        !statIdentitySame(opened, visible)) {
      throw new Error("epoch2_sealed_source_file_changed");
    }
    return Buffer.from(bytes);
  } finally {
    if (bytes !== null) bytes.fill(0);
    if (fd >= 0) fs.closeSync(fd);
  }
}

function statIdentitySame(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function assertReviewedSource(root) {
  const head = git(root, ["rev-parse", "--verify", "HEAD"]).toLowerCase();
  const tree = git(root, ["rev-parse", "--verify", "HEAD^{tree}"]).toLowerCase();
  const branch = git(root, ["symbolic-ref", "--short", "-q", "HEAD"]);
  const top = path.resolve(git(root, ["rev-parse", "--show-toplevel"]));
  if (top !== path.resolve(root) || !SHA40.test(head) || !SHA40.test(tree) ||
      branch !== "main") {
    throw new Error("epoch2_sealed_source_generation_invalid");
  }
  if (git(root, ["status", "--porcelain=v1", "--untracked-files=no"]) !== "") {
    throw new Error("epoch2_sealed_tracked_worktree_dirty");
  }
  if (gitLocalBoolean(root, "core.sparseCheckout")) {
    throw new Error("epoch2_sealed_sparse_checkout_forbidden");
  }

  const tagged = git(root, ["ls-files", "-v", "--", ...AUTHORITY_PATHS]);
  const tags = new Map();
  for (const line of tagged.split("\n").filter(Boolean)) {
    if (line.length < 3 || line[1] !== " ") {
      throw new Error("epoch2_sealed_index_output_invalid");
    }
    const relative = line.slice(2);
    if (tags.has(relative)) {
      throw new Error("epoch2_sealed_index_duplicate");
    }
    tags.set(relative, line[0]);
  }

  const observed = {};
  for (const relative of AUTHORITY_PATHS) {
    if (tags.get(relative) !== "H") {
      throw new Error("epoch2_sealed_index_flag_unsafe");
    }
    const headBlob =
      git(root, ["rev-parse", "--verify", "HEAD:" + relative]).toLowerCase();
    if (!SHA40.test(headBlob)) {
      throw new Error("epoch2_sealed_head_blob_invalid");
    }
    const bytes = readPinnedRegularFile(
      path.join(root, relative),
      MAX_FILE_BYTES,
    );
    try {
      const worktreeBlob = gitBlob(bytes);
      if (worktreeBlob !== headBlob) {
        throw new Error("epoch2_sealed_worktree_blob_mismatch");
      }
      if (Object.hasOwn(REVIEWED_BLOBS, relative) &&
          REVIEWED_BLOBS[relative] !== headBlob) {
        throw new Error("epoch2_sealed_reviewed_blob_mismatch");
      }
      observed[relative] = headBlob;
    } finally {
      bytes.fill(0);
    }
  }

  const qualifier = execFileSync(process.execPath, [
    path.join(root,
      "tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs"),
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 15_000,
    maxBuffer: 256 * 1024,
    env: {
      PATH: "/usr/bin:/bin",
      HOME: String(process.env.HOME || ""),
      GIT_OPTIONAL_LOCKS: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
  if (!qualifier.includes(
        "status=EPOCH2_SOURCE_TUPLE_REVIEWABLE_CREDENTIAL_AND_ACTIVATION_HOLD") ||
      !qualifier.includes("source_qualification_complete=true")) {
    throw new Error("epoch2_sealed_source_qualifier_not_green");
  }
  return Object.freeze({ head, tree, branch, blobs: Object.freeze(observed) });
}

function parseSystemdObservation(show, environ, cgroup, uid = process.getuid()) {
  const props = new Map();
  for (const line of String(show).split(/\r?\n/u)) {
    if (!line) continue;
    const at = line.indexOf("=");
    if (at <= 0) throw new Error("epoch2_sealed_systemd_show_line_invalid");
    const key = line.slice(0, at);
    if (props.has(key)) {
      throw new Error("epoch2_sealed_systemd_show_duplicate_property");
    }
    props.set(key, line.slice(at + 1));
  }
  if (props.get("ActiveState") !== "active" ||
      props.get("SubState") !== "running") {
    throw new Error("epoch2_sealed_service_not_active_running");
  }
  const pid = Number(props.get("MainPID"));
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_sealed_service_main_pid_invalid");
  }
  if (!Number.isSafeInteger(uid) || uid < 0 ||
      !serviceCgroupBound(cgroup, uid)) {
    throw new Error("epoch2_sealed_service_main_pid_cgroup_mismatch");
  }
  const invocation = String(props.get("InvocationID") || "").toLowerCase();
  if (!HEX32.test(invocation)) {
    throw new Error("epoch2_sealed_service_invocation_invalid");
  }
  const loads = String(props.get("LoadCredential") || "")
    .split(/\s+/u).filter(Boolean);
  const prefix = CREDENTIAL_ID + ":";
  const matches = loads.filter((row) => row.startsWith(prefix));
  if (matches.length !== 1) {
    throw new Error("epoch2_sealed_loadcredential_cardinality_invalid");
  }
  const sourcePath = matches[0].slice(prefix.length);
  if (!path.isAbsolute(sourcePath) || path.normalize(sourcePath) !== sourcePath) {
    throw new Error("epoch2_sealed_loadcredential_source_invalid");
  }

  if (!Buffer.isBuffer(environ) || environ.length < 1 ||
      environ.length > 1_048_576) {
    throw new Error("epoch2_sealed_process_environ_invalid");
  }
  const rows = environ.toString("utf8").split("\0").filter(Boolean);
  const exactEnv = (name) => {
    const prefixEnv = name + "=";
    const values = rows
      .filter((row) => row.startsWith(prefixEnv))
      .map((row) => row.slice(prefixEnv.length));
    if (values.length !== 1) {
      throw new Error("epoch2_sealed_process_env_cardinality:" + name);
    }
    return values[0];
  };
  const processInvocation = exactEnv("INVOCATION_ID").toLowerCase();
  if (processInvocation !== invocation) {
    throw new Error("epoch2_sealed_process_invocation_mismatch");
  }
  const credentialsDirectory = exactEnv("CREDENTIALS_DIRECTORY");
  if (!path.isAbsolute(credentialsDirectory) ||
      path.normalize(credentialsDirectory) !== credentialsDirectory ||
      !(
        /^\/run\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory) ||
        /^\/run\/user\/[0-9]+\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory)
      )) {
    throw new Error("epoch2_sealed_credentials_directory_invalid");
  }
  const processCommit = exactEnv("VOID_PROCESS_SOURCE_COMMIT").toLowerCase();
  const processTree = exactEnv("VOID_PROCESS_SOURCE_TREE").toLowerCase();
  const processBranch = exactEnv("VOID_PROCESS_SOURCE_BRANCH");
  if (!SHA40.test(processCommit) || !SHA40.test(processTree) ||
      processBranch !== "main") {
    throw new Error("epoch2_sealed_process_source_invalid");
  }
  return Object.freeze({
    service: SERVICE,
    main_pid: pid,
    invocation_id: invocation,
    credential_id: CREDENTIAL_ID,
    credentials_directory: credentialsDirectory,
    loadcredential_binding_sha256:
      sha256Bytes(Buffer.from(matches[0], "utf8")),
    credentials_directory_sha256:
      sha256Bytes(Buffer.from(credentialsDirectory, "utf8")),
    main_pid_cgroup_sha256:
      sha256Bytes(Buffer.from(String(cgroup), "utf8")),
    process_invocation_id: processInvocation,
    process_source_commit: processCommit,
    process_source_tree: processTree,
    process_source_branch: processBranch,
  });
}

function serviceCgroupBound(cgroup, uid) {
  if (typeof cgroup !== "string" || cgroup.length < 1 ||
      cgroup.length > 1_048_576 ||
      !Number.isSafeInteger(uid) || uid < 0) {
    return false;
  }
  const userPrefix =
    "/user.slice/user-" + String(uid) + ".slice/user@" +
    String(uid) + ".service/";
  return cgroup.split("\n").some((line) => {
    const first = line.indexOf(":");
    const second = first < 0 ? -1 : line.indexOf(":", first + 1);
    const cgroupPath = second < 0 ? "" : line.slice(second + 1);
    if (!cgroupPath.startsWith(userPrefix)) return false;
    return cgroupPath.endsWith("/" + SERVICE) ||
      cgroupPath.includes("/" + SERVICE + "/");
  });
}

function canonicalUserBusPaths(uid) {
  if (!Number.isSafeInteger(uid) || uid < 0) {
    throw new Error("epoch2_sealed_user_bus_uid_invalid");
  }
  const runtimeDirectory = "/run/user/" + String(uid);
  const busPath = runtimeDirectory + "/bus";
  return Object.freeze({
    runtime_directory: runtimeDirectory,
    bus_path: busPath,
    bus_address: "unix:path=" + busPath,
  });
}

function canonicalUserBusEnvironment() {
  if (process.platform !== "linux" ||
      typeof process.getuid !== "function") {
    throw new Error("epoch2_sealed_linux_required");
  }
  const uid = process.getuid();
  const paths = canonicalUserBusPaths(uid);
  let runtimeStat;
  let busStat;
  try {
    runtimeStat = fs.lstatSync(paths.runtime_directory, { bigint: true });
    busStat = fs.lstatSync(paths.bus_path, { bigint: true });
  } catch {
    throw new Error("epoch2_sealed_user_bus_unavailable");
  }
  const runtimeMode = runtimeStat.mode & 0o7777n;
  if (!runtimeStat.isDirectory() || runtimeStat.isSymbolicLink() ||
      runtimeStat.uid !== BigInt(uid) || (runtimeMode & 0o077n) !== 0n) {
    throw new Error("epoch2_sealed_user_runtime_directory_untrusted");
  }
  if (!busStat.isSocket() || busStat.isSymbolicLink() ||
      busStat.uid !== BigInt(uid)) {
    throw new Error("epoch2_sealed_user_bus_socket_untrusted");
  }
  return Object.freeze({
    uid,
    paths,
    bus_stat: busStat,
    env: Object.freeze({
      PATH: "/usr/bin:/bin",
      XDG_RUNTIME_DIR: paths.runtime_directory,
      DBUS_SESSION_BUS_ADDRESS: paths.bus_address,
    }),
  });
}

function observeLiveSystemd() {
  const userBus = canonicalUserBusEnvironment();
  const show = execFileSync(SYSTEMCTL, [
    "--user", "show", SERVICE, "--no-pager",
    "-p", "ActiveState",
    "-p", "SubState",
    "-p", "MainPID",
    "-p", "InvocationID",
    "-p", "LoadCredential",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
    maxBuffer: 128 * 1024,
    env: userBus.env,
  });
  let busAfter;
  try {
    busAfter = fs.lstatSync(userBus.paths.bus_path, { bigint: true });
  } catch {
    throw new Error("epoch2_sealed_user_bus_changed");
  }
  if (!statIdentitySame(userBus.bus_stat, busAfter)) {
    throw new Error("epoch2_sealed_user_bus_changed");
  }
  const match = show.match(/^MainPID=([0-9]+)$/mu);
  if (!match) throw new Error("epoch2_sealed_service_main_pid_missing");
  const pid = Number(match[1]);
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_sealed_service_main_pid_invalid");
  }
  const environ = fs.readFileSync("/proc/" + String(pid) + "/environ");
  const cgroup = fs.readFileSync(
    "/proc/" + String(pid) + "/cgroup",
    { encoding: "utf8" },
  );
  return parseSystemdObservation(show, environ, cgroup, userBus.uid);
}

function observationStable(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) return false;
  }
  return Object.keys(before).length === Object.keys(after).length;
}

function readCredentialBytes(directory) {
  let dirFd = -1;
  let keyFd = -1;
  let scratch = null;
  let result = null;
  try {
    if (process.platform !== "linux" ||
        typeof process.getuid !== "function") {
      throw new Error("epoch2_sealed_linux_required");
    }
    const uid = BigInt(process.getuid());
    const noFollow = fs.constants.O_NOFOLLOW;
    const directoryFlag = fs.constants.O_DIRECTORY;
    if (!Number.isInteger(noFollow) || noFollow === 0 ||
        !Number.isInteger(directoryFlag) || directoryFlag === 0 ||
        !fs.existsSync("/proc/self/fd")) {
      throw new Error("epoch2_sealed_fd_primitives_unavailable");
    }

    const root = path.parse(directory).root;
    const components = path.relative(root, directory)
      .split(path.sep).filter(Boolean);
    const ancestors = [];
    let current = root;
    const inspect = (name, isLeaf) => {
      const stat = fs.lstatSync(name, { bigint: true });
      const mode = stat.mode & 0o7777n;
      const stickyProtected =
        !isLeaf && stat.uid === 0n && (mode & 0o1000n) !== 0n;
      if (stat.isSymbolicLink() || !stat.isDirectory() ||
          (stat.uid !== 0n && stat.uid !== uid) ||
          ((mode & 0o022n) !== 0n && !stickyProtected)) {
        throw new Error("epoch2_sealed_credential_namespace_untrusted");
      }
      ancestors.push({ name, stat });
    };
    inspect(root, components.length === 0);
    for (let i = 0; i < components.length; i += 1) {
      current = path.join(current, components[i]);
      inspect(current, i === components.length - 1);
    }
    const beforeDir = ancestors[ancestors.length - 1].stat;
    dirFd = fs.openSync(
      directory,
      fs.constants.O_RDONLY | directoryFlag | noFollow,
    );
    const openedDir = fs.fstatSync(dirFd, { bigint: true });
    if (!statIdentitySame(beforeDir, openedDir)) {
      throw new Error("epoch2_sealed_credential_directory_replaced");
    }

    const visiblePath = path.join(directory, CREDENTIAL_ID);
    const beforeKey = fs.lstatSync(visiblePath, { bigint: true });
    const mode = beforeKey.mode & 0o777n;
    if (beforeKey.isSymbolicLink() || !beforeKey.isFile() ||
        beforeKey.uid !== uid || beforeKey.nlink !== 1n ||
        beforeKey.size < 1n ||
        beforeKey.size > BigInt(MAX_CREDENTIAL_BYTES) ||
        (mode & 0o077n) !== 0n) {
      throw new Error("epoch2_sealed_credential_file_policy_invalid");
    }

    const pinned =
      "/proc/self/fd/" + String(dirFd) + "/" + CREDENTIAL_ID;
    keyFd = fs.openSync(pinned, fs.constants.O_RDONLY | noFollow);
    const openedKey = fs.fstatSync(keyFd, { bigint: true });
    if (!statIdentitySame(beforeKey, openedKey)) {
      throw new Error("epoch2_sealed_credential_file_replaced");
    }
    scratch = Buffer.alloc(MAX_CREDENTIAL_BYTES + 1);
    let count = 0;
    while (count < scratch.length) {
      const n = fs.readSync(
        keyFd, scratch, count, scratch.length - count, null,
      );
      if (!Number.isSafeInteger(n) || n < 0) {
        throw new Error("epoch2_sealed_credential_read_invalid");
      }
      if (n === 0) break;
      count += n;
    }
    if (count !== Number(beforeKey.size) || count > MAX_CREDENTIAL_BYTES) {
      throw new Error("epoch2_sealed_credential_bytes_changed");
    }

    const afterKey = fs.fstatSync(keyFd, { bigint: true });
    const visibleKey = fs.lstatSync(visiblePath, { bigint: true });
    const afterDir = fs.fstatSync(dirFd, { bigint: true });
    const visibleDir = fs.lstatSync(directory, { bigint: true });
    if (!statIdentitySame(beforeKey, afterKey) ||
        !statIdentitySame(beforeKey, visibleKey) ||
        !statIdentitySame(beforeDir, afterDir) ||
        !statIdentitySame(beforeDir, visibleDir)) {
      throw new Error("epoch2_sealed_credential_changed_during_read");
    }
    for (const ancestor of ancestors) {
      const visible = fs.lstatSync(ancestor.name, { bigint: true });
      if (!statIdentitySame(ancestor.stat, visible)) {
        throw new Error("epoch2_sealed_credential_parent_changed");
      }
    }
    result = Buffer.from(scratch.subarray(0, count));
  } finally {
    if (scratch !== null) scratch.fill(0);
    for (const fd of [keyFd, dirFd]) {
      if (fd >= 0) {
        try { fs.closeSync(fd); } catch {
          if (result !== null) result.fill(0);
          result = null;
        }
      }
    }
  }
  if (result === null) {
    throw new Error("epoch2_sealed_credential_fd_close_uncertain");
  }
  return result;
}

function privateKeyFromCredential(bytes) {
  let start = 0;
  let end = bytes.length;
  const ws = (v) => v === 0x20 || v === 0x09 || v === 0x0a || v === 0x0d;
  while (start < end && ws(bytes[start])) start += 1;
  while (end > start && ws(bytes[end - 1])) end -= 1;
  if (end - start === 66 &&
      bytes[start] === 0x30 &&
      (bytes[start + 1] === 0x78 || bytes[start + 1] === 0x58)) {
    start += 2;
  }
  if (end - start !== 64) {
    throw new Error("epoch2_sealed_private_key_shape_invalid");
  }
  const out = Buffer.alloc(32);
  const hexValue = (v) => {
    if (v >= 0x30 && v <= 0x39) return v - 0x30;
    if (v >= 0x41 && v <= 0x46) return v - 0x41 + 10;
    if (v >= 0x61 && v <= 0x66) return v - 0x61 + 10;
    return -1;
  };
  for (let i = 0; i < 32; i += 1) {
    const hi = hexValue(bytes[start + i * 2]);
    const lo = hexValue(bytes[start + i * 2 + 1]);
    if (hi < 0 || lo < 0) {
      out.fill(0);
      throw new Error("epoch2_sealed_private_key_shape_invalid");
    }
    out[i] = (hi << 4) | lo;
  }
  return out;
}

function rotl64(value, shift) {
  const n = BigInt(shift % 64);
  if (n === 0n) return value & MASK64;
  return ((value << n) | (value >> (64n - n))) & MASK64;
}

const KECCAK_RC = Object.freeze([
  0x0000000000000001n, 0x0000000000008082n,
  0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn,
  0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n,
  0x0000000080000001n, 0x8000000080008008n,
]);
const KECCAK_ROT = Object.freeze([
  Object.freeze([0, 36, 3, 41, 18]),
  Object.freeze([1, 44, 10, 45, 2]),
  Object.freeze([62, 6, 43, 15, 61]),
  Object.freeze([28, 55, 25, 21, 56]),
  Object.freeze([27, 20, 39, 8, 14]),
]);

function keccakF1600(state) {
  for (const rc of KECCAK_RC) {
    const c = new Array(5);
    const d = new Array(5);
    for (let x = 0; x < 5; x += 1) {
      c[x] =
        state[x] ^ state[x + 5] ^ state[x + 10] ^
        state[x + 15] ^ state[x + 20];
    }
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] =
          (state[x + 5 * y] ^ d[x]) & MASK64;
      }
    }
    const b = new Array(25).fill(0n);
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const destinationX = y;
        const destinationY = (2 * x + 3 * y) % 5;
        b[destinationX + 5 * destinationY] =
          rotl64(state[x + 5 * y], KECCAK_ROT[x][y]);
      }
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] =
          (b[x + 5 * y] ^
            ((~b[(x + 1) % 5 + 5 * y]) &
             b[(x + 2) % 5 + 5 * y])) & MASK64;
      }
    }
    state[0] = (state[0] ^ rc) & MASK64;
  }
}

function keccak256(bytes) {
  const rate = 136;
  const state = new Array(25).fill(0n);
  let offset = 0;
  while (offset + rate <= bytes.length) {
    const block = bytes.subarray(offset, offset + rate);
    absorbBlock(state, block);
    keccakF1600(state);
    offset += rate;
  }
  const finalBlock = Buffer.alloc(rate);
  bytes.copy(finalBlock, 0, offset);
  finalBlock[bytes.length - offset] ^= 0x01;
  finalBlock[rate - 1] ^= 0x80;
  absorbBlock(state, finalBlock);
  keccakF1600(state);
  const out = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) {
    const lane = state[Math.floor(i / 8)];
    out[i] = Number((lane >> BigInt((i % 8) * 8)) & 0xffn);
  }
  return out;
}

function absorbBlock(state, block) {
  for (let laneIndex = 0; laneIndex < 17; laneIndex += 1) {
    let lane = 0n;
    for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
      lane |=
        BigInt(block[laneIndex * 8 + byteIndex]) <<
        BigInt(byteIndex * 8);
    }
    state[laneIndex] = (state[laneIndex] ^ lane) & MASK64;
  }
}

function keyMaterial(privateKey) {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.setPrivateKey(privateKey);
  const publicKey = ecdh.getPublicKey(null, "uncompressed");
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    publicKey.fill(0);
    throw new Error("epoch2_sealed_public_key_invalid");
  }
  const digest = keccak256(publicKey.subarray(1));
  const address =
    "0x" + digest.subarray(12).toString("hex").toLowerCase();
  digest.fill(0);

  // RFC 5915 ECPrivateKey with named-curve secp256k1 (1.3.132.0.10).
  // This keeps the private scalar in zeroable Buffers and avoids JWK/base64
  // string materialization of credential bytes.
  const der = Buffer.concat([
    Buffer.from("302e0201010420", "hex"),
    privateKey,
    Buffer.from("a00706052b8104000a", "hex"),
  ]);
  let privateObject;
  try {
    privateObject = crypto.createPrivateKey({
      key: der,
      format: "der",
      type: "sec1",
    });
  } finally {
    der.fill(0);
  }
  const publicObject = crypto.createPublicKey(privateObject);
  const publicFingerprint = sha256Bytes(publicKey);
  publicKey.fill(0);
  return { address, privateObject, publicObject, publicFingerprint };
}

function assertCryptoSelfTest() {
  const empty = keccak256(Buffer.alloc(0)).toString("hex");
  if (empty !==
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470") {
    throw new Error("epoch2_sealed_keccak_self_test_failed");
  }
  const one = Buffer.alloc(32);
  one[31] = 1;
  try {
    const material = keyMaterial(one);
    if (material.address !==
        "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf") {
      throw new Error("epoch2_sealed_address_self_test_failed");
    }
  } finally {
    one.fill(0);
  }
}

function buildChallenge(source, observation) {
  const random = crypto.randomBytes(32);
  try {
    const text = [
      "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V1",
      source.head,
      source.tree,
      observation.invocation_id,
      random.toString("hex"),
    ].join("\0");
    return {
      message: Buffer.from(text, "utf8"),
      challenge_sha256: sha256Bytes(Buffer.from(text, "utf8")),
    };
  } finally {
    random.fill(0);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Run this reviewed file from the current main Git object on stdin. " +
      "Direct worktree execution is non-authoritative.",
    );
    return;
  }
  if (process.argv[1] !== "-") {
    throw new Error("epoch2_sealed_git_object_stdin_required");
  }
  const probe = argv.includes("--probe");
  const confirmAt = argv.indexOf("--confirm");
  const confirmation =
    confirmAt >= 0 && confirmAt + 1 < argv.length
      ? argv[confirmAt + 1]
      : "";
  const allowed = new Set(["--probe", "--confirm"]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--confirm") {
      i += 1;
      continue;
    }
    if (!allowed.has(argv[i])) {
      throw new Error("epoch2_sealed_unknown_argument");
    }
  }
  if (!probe) {
    console.log(JSON.stringify({
      marker: MARKER,
      status: "disabled",
      reason: "epoch2_sealed_probe_not_requested",
      systemd_observation_performed: false,
      credential_content_read: false,
      signing_performed: false,
      transaction_constructed: false,
      rpc_call_performed: false,
      transaction_broadcast_performed: false,
      filesystem_write_performed: false,
      funds_movement: false,
    }, null, 2));
    return;
  }
  if (confirmation !== CONFIRM) {
    throw new Error("epoch2_sealed_confirmation_mismatch");
  }
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("epoch2_sealed_linux_x64_required");
  }

  const trustedNode = trustedExecutable(
    process.execPath,
    path.basename(fs.realpathSync(process.execPath)),
  );
  if (process.execPath !== trustedNode ||
      process.execArgv.length !== 1 ||
      process.execArgv[0] !== "--input-type=module" ||
      String(process.env.NODE_OPTIONS || "") !== "" ||
      String(process.env.NODE_PATH || "") !== "" ||
      String(process.env.LD_PRELOAD || "") !== "" ||
      String(process.env.LD_LIBRARY_PATH || "") !== "" ||
      String(process.env.LD_AUDIT || "") !== "") {
    throw new Error("epoch2_sealed_node_execution_context_invalid");
  }
  assertCryptoSelfTest();
  const root = path.resolve(process.cwd());
  const source = assertReviewedSource(root);
  const before = observeLiveSystemd();
  if (before.process_source_commit !== source.head ||
      before.process_source_tree !== source.tree ||
      before.process_source_branch !== source.branch) {
    throw new Error("epoch2_sealed_live_process_source_mismatch");
  }

  const credential = readCredentialBytes(before.credentials_directory);
  let privateKey = null;
  let signature = null;
  let challenge = null;
  try {
    privateKey = privateKeyFromCredential(credential);
    credential.fill(0);
    const material = keyMaterial(privateKey);
    if (material.address !== EXPECTED_ADDRESS) {
      throw new Error("epoch2_sealed_immutable_fulfiller_mismatch");
    }
    challenge = buildChallenge(source, before);
    signature = crypto.sign(
      "sha256",
      challenge.message,
      { key: material.privateObject, dsaEncoding: "ieee-p1363" },
    );
    if (signature.length !== 64 ||
        !crypto.verify(
          "sha256",
          challenge.message,
          { key: material.publicObject, dsaEncoding: "ieee-p1363" },
          signature,
        )) {
      throw new Error("epoch2_sealed_local_signature_verify_failed");
    }
    const after = observeLiveSystemd();
    if (!observationStable(before, after)) {
      throw new Error("epoch2_sealed_systemd_invocation_changed");
    }

    const body = {
      marker: MARKER,
      version: 1,
      status: "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
      source_head: source.head,
      source_tree: source.tree,
      source_branch: source.branch,
      sealed_probe_git_blob: source.blobs[SEALED_PATH],
      credential_source_binding_id: SOURCE_BINDING_ID,
      credential_id: CREDENTIAL_ID,
      immutable_fulfiller: EXPECTED_ADDRESS,
      systemd: {
        service: after.service,
        main_pid: after.main_pid,
        invocation_id: after.invocation_id,
        loadcredential_binding_sha256:
          after.loadcredential_binding_sha256,
        credentials_directory_sha256:
          after.credentials_directory_sha256,
        process_source_commit: after.process_source_commit,
        process_source_tree: after.process_source_tree,
        process_source_branch: after.process_source_branch,
        raw_loadcredential_source_path_output: false,
        raw_credentials_directory_output: false,
      },
      challenge: {
        domain:
          "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V1",
        challenge_sha256: challenge.challenge_sha256,
        signature_sha256: sha256Bytes(signature),
        raw_challenge_output: false,
        raw_signature_output: false,
        transaction_constructed: false,
      },
      credential_content_read: true,
      immutable_fulfiller_identity_proven: true,
      active_signing_capability_proven: true,
      raw_private_key_output: false,
      private_key_string_materialization: false,
      raw_signed_transaction_output: false,
      rpc_call_performed: false,
      transaction_constructed: false,
      root_owned_node_binary_verified: true,
      node_loader_environment_empty: true,
      native_loader_environment_empty: true,
      transaction_broadcast_performed: false,
      transaction_submission_performed: false,
      filesystem_write_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    };
    console.log(JSON.stringify({
      ...body,
      evidence_id:
        "voide2sealed1_" +
        sha256Bytes(Buffer.from(JSON.stringify(body), "utf8")),
    }, null, 2));
  } finally {
    credential.fill(0);
    if (privateKey !== null) privateKey.fill(0);
    if (signature !== null) signature.fill(0);
    if (challenge !== null) challenge.message.fill(0);
  }
}

export {
  MARKER,
  CONFIRM,
  EXPECTED_ADDRESS,
  REVIEWED_BLOBS,
  AUTHORITY_PATHS,
  keccak256,
  keyMaterial,
  privateKeyFromCredential,
  assertReviewedSource,
  parseSystemdObservation,
  serviceCgroupBound,
  canonicalUserBusPaths,
};

const directFileExecution = process.argv[1] && process.argv[1] !== "-" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (process.argv[1] === "-" || directFileExecution) {
  main().catch((error) => {
    console.error(JSON.stringify({
      marker: MARKER + "_HOLD",
      status: "HOLD",
      reason: safeReason(error),
      raw_private_key_output: false,
      raw_signature_output: false,
      raw_signed_transaction_output: false,
      systemd_mutation_performed: false,
      rpc_call_performed: false,
      transaction_constructed: false,
      transaction_broadcast_performed: false,
      transaction_submission_performed: false,
      filesystem_write_performed: false,
      runtime_activation_authorized: false,
      public_payment_acceptance_authorized: false,
      presale_activation_authorized: false,
      funds_movement: false,
    }, null, 2));
    process.exitCode = 2;
  });
}
