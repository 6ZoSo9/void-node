#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PREENTRY =
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const RUNNER =
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const SEALED =
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const DOC =
  "docs/operators/buy-void-epoch2-live-composition-native-preentry-v1.md";
const WORKFLOW =
  ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v1.yml";
const FIXED_ROOT = "/opt/void-buy-void-epoch2-live-composition-v2";
const FIXED_SELF =
  FIXED_ROOT + "/void_buy_void_epoch2_live_composition_native_preentry_v1";
const FIXED_RUNNER =
  FIXED_ROOT + "/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const FIXED_POLICY = FIXED_ROOT + "/policy-v1.conf";
const FIXED_NODE = "/usr/bin/node";
const FIXED_REPO_ROOT = "/home/zoso/dev/void-node";
const SETPRIV = "/usr/bin/setpriv";
const CONFIRM =
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2";
const GIT = "/usr/bin/git";
const CC = "/usr/bin/cc";
const SUDO = "/usr/bin/sudo";
const PRIVATE_OPT_FIXTURE_ENV =
  "VOID_BUY_VOID_EPOCH2_PROOF_PRIVATE_OPT_NAMESPACE_V1";
const PRIVATE_BOOTSTRAP_ROOT_ENV =
  "VOID_BUY_VOID_EPOCH2_PROOF_BOOTSTRAP_ROOT_V1";
const PRIVATE_SELECTED_NODE_SHA256_ENV =
  "VOID_BUY_VOID_EPOCH2_PROOF_SELECTED_NODE_SHA256_V1";
const PRIVATE_OUTER_MOUNT_NS_INO_ENV =
  "VOID_BUY_VOID_EPOCH2_PROOF_OUTER_MOUNT_NS_INO_V1";
const PRIVATE_MOUNT_HELPER_SHA256_ENV =
  "VOID_BUY_VOID_EPOCH2_PROOF_MOUNT_HELPER_SHA256_V1";

function cleanEnv(extra = {}) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: String(process.env.HOME || ""),
    LANG: "C",
    LC_ALL: "C",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    ...extra,
  };
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || cleanEnv(),
    encoding: "utf8",
    input: options.input,
    timeout: options.timeout || 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function git(args) {
  return execFileSync(GIT, [
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    ...args,
  ], {
    cwd: ROOT,
    env: cleanEnv(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
  }).trim();
}


function sameFsIdentity(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode;
}

function mountInfoPath(raw) {
  return String(raw).replace(/\\([0-7]{3})/gu, (_match, octal) =>
    String.fromCharCode(Number.parseInt(octal, 8)),
  );
}

const PROC_SUPER_MAGIC = 0x9fa0n;

function requireAuthenticProcfsForCurrentProcess() {
  const pidRoot = "/proc/" + String(process.pid);
  assert.equal(
    fs.realpathSync.native("/proc/self"),
    pidRoot,
    "/proc/self must resolve to the current process",
  );
  for (const target of [
    "/proc",
    pidRoot,
    pidRoot + "/mountinfo",
    "/proc/self/mountinfo",
    pidRoot + "/status",
    "/proc/self/status",
  ]) {
    const statfs = fs.statfsSync(target, { bigint: true });
    assert.equal(
      statfs.type,
      PROC_SUPER_MAGIC,
      target + " must be backed by genuine procfs",
    );
  }
  const canonicalMountInfo = fs.statSync(
    pidRoot + "/mountinfo",
    { bigint: true },
  );
  const aliasMountInfo = fs.statSync(
    "/proc/self/mountinfo",
    { bigint: true },
  );
  assert.equal(
    canonicalMountInfo.dev,
    aliasMountInfo.dev,
    "proc mountinfo device identity mismatch",
  );
  assert.equal(
    canonicalMountInfo.ino,
    aliasMountInfo.ino,
    "proc mountinfo inode identity mismatch",
  );
  const canonicalStatus = fs.statSync(pidRoot + "/status", { bigint: true });
  const aliasStatus = fs.statSync("/proc/self/status", { bigint: true });
  assert.equal(
    canonicalStatus.dev,
    aliasStatus.dev,
    "proc status device identity mismatch",
  );
  assert.equal(
    canonicalStatus.ino,
    aliasStatus.ino,
    "proc status inode identity mismatch",
  );
  const mountInfo = fs.readFileSync(pidRoot + "/mountinfo", "utf8");
  assert.equal(
    fs.readFileSync("/proc/self/mountinfo", "utf8"),
    mountInfo,
    "proc mountinfo alias content mismatch",
  );
  return mountInfo;
}

function retainedDirectoryMountIdentity(target) {
  const noFollow = Number(fs.constants.O_NOFOLLOW || 0);
  const directory = Number(fs.constants.O_DIRECTORY || 0);
  assert.equal(
    noFollow > 0 && directory > 0,
    true,
    "Linux nofollow/directory open flags required",
  );
  const before = fs.lstatSync(target, { bigint: true });
  assert.equal(
    before.isDirectory() && !before.isSymbolicLink(),
    true,
    target + " must be a direct directory before mount-id binding",
  );
  const fd = fs.openSync(
    target,
    fs.constants.O_RDONLY | noFollow | directory,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(target, { bigint: true });
    assert.equal(
      sameFsIdentity(before, opened) && sameFsIdentity(opened, visible),
      true,
      target + " changed across retained mount-id observation",
    );

    const bootstrapRoot = String(
      process.env[PRIVATE_BOOTSTRAP_ROOT_ENV] || "",
    );
    const expectedHelperSha256 = String(
      process.env[PRIVATE_MOUNT_HELPER_SHA256_ENV] || "",
    );
    assert.match(
      expectedHelperSha256,
      /^[0-9a-f]{64}$/u,
      "delegated mount helper SHA-256 binding invalid",
    );
    const helper = path.join(bootstrapRoot, "mount-id-helper");
    const helperStat = fs.lstatSync(helper, { bigint: true });
    assert.equal(
      helperStat.isFile() && !helperStat.isSymbolicLink(),
      true,
      "delegated mount helper must be a direct regular file",
    );
    assert.equal(helperStat.uid, 0n, "delegated mount helper must be root-owned");
    assert.equal(
      helperStat.nlink,
      1n,
      "delegated mount helper must have one link",
    );
    assert.equal(
      (helperStat.mode & 0o022n) === 0n &&
        (helperStat.mode & 0o111n) !== 0n,
      true,
      "delegated mount helper must be non-writable and executable",
    );
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(helper)).digest("hex"),
      expectedHelperSha256,
      "delegated mount helper bytes changed",
    );

    const result = spawnSync(helper, [], {
      cwd: "/",
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/nonexistent",
        LANG: "C",
        LC_ALL: "C",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe", fd],
      timeout: 10_000,
      maxBuffer: 64 * 1024,
    });
    assert.equal(
      result.error,
      undefined,
      "direct statx mount helper spawn failed",
    );
    assert.equal(
      result.status,
      0,
      "direct statx mount helper failed: " + String(result.stderr || ""),
    );
    assert.equal(
      result.stderr,
      "",
      "direct statx mount helper produced stderr",
    );
    const rows = String(result.stdout || "")
      .split("\n")
      .filter(Boolean);
    assert.equal(rows.length, 3, "direct statx mount helper output shape invalid");
    const mountMatch = /^mount_id=([1-9][0-9]*)$/u.exec(rows[0]);
    const typeMatch = /^fs_type=([0-9a-f]+)$/u.exec(rows[1]);
    const readonlyMatch = /^readonly=(true|false)$/u.exec(rows[2]);
    assert.ok(mountMatch, "direct statx mount id missing");
    assert.ok(typeMatch, "direct fstatfs type missing");
    assert.ok(readonlyMatch, "direct fstatvfs readonly flag missing");

    const openedAfter = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(target, { bigint: true });
    assert.equal(
      sameFsIdentity(opened, openedAfter) &&
        sameFsIdentity(openedAfter, visibleAfter),
      true,
      target + " changed across direct statx mount-id observation",
    );
    return Object.freeze({
      mountId: mountMatch[1],
      fsType: BigInt("0x" + typeMatch[1]),
      readOnly: readonlyMatch[1] === "true",
    });
  } finally {
    fs.closeSync(fd);
  }
}

function requireDelegatedPrivateNamespace() {
  assert.equal(
    process.env[PRIVATE_OPT_FIXTURE_ENV],
    "1",
    "delegated namespace marker missing",
  );
  assert.equal(
    typeof process.getuid === "function" && process.getuid() !== 0,
    true,
    "delegated proof must run as the original unprivileged uid",
  );

  const parentRoot = "/proc/" + String(process.ppid);
  for (const target of [parentRoot, parentRoot + "/status", parentRoot + "/cmdline"]) {
    const statfs = fs.statfsSync(target, { bigint: true });
    assert.equal(
      statfs.type,
      PROC_SUPER_MAGIC,
      target + " must be backed by genuine procfs",
    );
  }
  const parentStatus = fs.readFileSync(parentRoot + "/status", "utf8");
  assert.match(
    parentStatus,
    /^Name:\s+unshare\s*$/mu,
    "delegated proof parent process name must be unshare",
  );
  assert.match(
    parentStatus,
    /^Uid:\s+0\s+0\s+0\s+0\s*$/mu,
    "delegated unshare parent must remain root",
  );
  const parentArgv = fs.readFileSync(parentRoot + "/cmdline")
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  assert.deepEqual(
    parentArgv.slice(0, 4),
    ["/usr/bin/unshare", "--mount", "--fork", "/usr/bin/bash"],
    "delegated parent launch argv must match fixed unshare boundary",
  );

  const selfMountNs = fs.statSync("/proc/self/ns/mnt", { bigint: true });
  const outerMountNsInoRaw = String(
    process.env[PRIVATE_OUTER_MOUNT_NS_INO_ENV] || "",
  );
  assert.match(
    outerMountNsInoRaw,
    /^[1-9][0-9]*$/u,
    "outer mount namespace inode binding invalid",
  );
  assert.notEqual(
    String(selfMountNs.ino),
    outerMountNsInoRaw,
    "delegated proof must execute in a mount namespace distinct from the authenticated outer process",
  );

  const bootstrapRoot = String(
    process.env[PRIVATE_BOOTSTRAP_ROOT_ENV] || "",
  );
  assert.equal(
    path.dirname(bootstrapRoot),
    "/tmp",
    "delegated harness root must be directly beneath fixed /tmp",
  );
  assert.match(
    path.basename(bootstrapRoot),
    /^void-e2-private-opt-v1-[A-Za-z0-9_-]+$/u,
    "delegated harness root name invalid",
  );
  const selectedNodeSha256 = String(
    process.env[PRIVATE_SELECTED_NODE_SHA256_ENV] || "",
  );
  assert.match(
    selectedNodeSha256,
    /^[0-9a-f]{64}$/u,
    "delegated selected Node SHA-256 invalid",
  );
  const bootstrapStat = fs.lstatSync(bootstrapRoot, { bigint: true });
  assert.equal(
    bootstrapStat.isDirectory() && !bootstrapStat.isSymbolicLink(),
    true,
    "delegated bootstrap root must be a direct directory",
  );
  assert.equal(
    bootstrapStat.uid,
    0n,
    "delegated bootstrap root must be root-owned",
  );
  assert.equal(
    (bootstrapStat.mode & 0o022n) === 0n,
    true,
    "delegated bootstrap root must not be group/world writable",
  );
  assert.equal(
    bootstrapStat.mode & 0o7777n,
    0o755n,
    "delegated bootstrap root must be exact mode 0755",
  );
  const harnessNode = path.join(bootstrapRoot, "node");
  const harnessStat = fs.lstatSync(harnessNode, { bigint: true });
  assert.equal(
    harnessStat.isFile() && !harnessStat.isSymbolicLink(),
    true,
    "delegated harness Node must be a direct regular file",
  );
  assert.equal(
    harnessStat.uid,
    0n,
    "delegated harness Node must be root-owned",
  );
  assert.equal(
    harnessStat.nlink,
    1n,
    "delegated harness Node must have one link",
  );
  assert.equal(
    (harnessStat.mode & 0o022n) === 0n,
    true,
    "delegated harness Node must not be group/world writable",
  );
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(harnessNode)).digest("hex"),
    selectedNodeSha256,
    "root-owned harness Node must match the selected hosted Node bytes",
  );

  const backingOpt = path.join(bootstrapRoot, "opt");
  const backingHome = path.join(bootstrapRoot, "home");
  const backingRepo = path.join(bootstrapRoot, "repo");
  const backingUsrUpper = path.join(bootstrapRoot, "usr-bin-upper");
  const backingUsrWork = path.join(bootstrapRoot, "usr-bin-work");
  const backingUsrMerged = path.join(bootstrapRoot, "usr-bin-merged");
  const backingNode = path.join(backingUsrMerged, "node");
  const OVERLAYFS_SUPER_MAGIC = 0x794c7630n;

  const bootstrapMount = retainedDirectoryMountIdentity(bootstrapRoot);
  const tmpMount = retainedDirectoryMountIdentity("/tmp");
  assert.equal(
    bootstrapMount.mountId,
    tmpMount.mountId,
    "delegated bootstrap root must remain an ordinary directory on /tmp",
  );

  const ordinaryBackings = new Map();
  for (const backing of [
    backingOpt,
    backingHome,
    backingUsrUpper,
    backingUsrWork,
  ]) {
    const identity = retainedDirectoryMountIdentity(backing);
    ordinaryBackings.set(backing, identity);
    assert.equal(
      identity.mountId,
      bootstrapMount.mountId,
      backing + " must remain on the bootstrap root mount generation",
    );
  }

  for (const [visible, backing] of [
    ["/opt", backingOpt],
    ["/home", backingHome],
  ]) {
    const visibleStat = fs.lstatSync(visible, { bigint: true });
    const backingStat = fs.lstatSync(backing, { bigint: true });
    assert.equal(
      visibleStat.isDirectory() && !visibleStat.isSymbolicLink(),
      true,
      visible + " delegated mount must be a direct directory",
    );
    assert.equal(
      backingStat.isDirectory() && !backingStat.isSymbolicLink(),
      true,
      backing + " delegated backing must be a direct directory",
    );
    const visibleMount = retainedDirectoryMountIdentity(visible);
    const backingMount = ordinaryBackings.get(backing);
    assert.ok(backingMount, backing + " mount identity missing");
    assert.notEqual(
      visibleMount.mountId,
      backingMount.mountId,
      visible + " must be a distinct namespace-local bind mount",
    );
    assert.equal(
      sameFsIdentity(visibleStat, backingStat),
      true,
      visible + " must resolve to its private bootstrap backing generation",
    );
    assert.equal(
      visibleStat.uid,
      0n,
      visible + " private backing must be root-owned",
    );
    assert.equal(
      (visibleStat.mode & 0o022n) === 0n,
      true,
      visible + " private backing must not be group/world writable",
    );
  }

  const visibleUsrBin = fs.lstatSync("/usr/bin", { bigint: true });
  const mergedUsrBin = fs.lstatSync(backingUsrMerged, { bigint: true });
  assert.equal(
    visibleUsrBin.isDirectory() && !visibleUsrBin.isSymbolicLink(),
    true,
    "namespace-local /usr/bin must be a direct directory",
  );
  assert.equal(
    mergedUsrBin.isDirectory() && !mergedUsrBin.isSymbolicLink(),
    true,
    "private /usr/bin merged root must be a direct directory",
  );
  const mergedUsrMount = retainedDirectoryMountIdentity(backingUsrMerged);
  assert.notEqual(
    mergedUsrMount.mountId,
    bootstrapMount.mountId,
    "private /usr/bin merged root must be a distinct overlay mount",
  );
  assert.equal(
    mergedUsrMount.fsType,
    OVERLAYFS_SUPER_MAGIC,
    "private /usr/bin backing must be overlayfs",
  );
  for (const backing of [backingUsrUpper, backingUsrWork]) {
    assert.equal(
      retainedDirectoryMountIdentity(backing).mountId,
      bootstrapMount.mountId,
      backing + " must remain an ordinary bootstrap directory",
    );
  }
  const visibleUsrMount = retainedDirectoryMountIdentity("/usr/bin");
  assert.notEqual(
    visibleUsrMount.mountId,
    mergedUsrMount.mountId,
    "namespace-local /usr/bin must be a distinct bind mount over the overlay",
  );
  assert.equal(
    sameFsIdentity(visibleUsrBin, mergedUsrBin),
    true,
    "namespace-local /usr/bin must resolve to the private overlay generation",
  );

  const visibleNode = fs.lstatSync(FIXED_NODE, { bigint: true });
  const backingNodeStat = fs.lstatSync(backingNode, { bigint: true });
  assert.equal(
    visibleNode.isFile() && !visibleNode.isSymbolicLink(),
    true,
    "namespace-local fixed Node must be a direct regular file",
  );
  assert.equal(
    sameFsIdentity(visibleNode, backingNodeStat),
    true,
    "namespace-local fixed Node must be the private overlay generation",
  );
  assert.equal(visibleNode.uid, 0n, "private fixed Node must be root-owned");
  assert.equal(
    (visibleNode.mode & 0o022n) === 0n,
    true,
    "private fixed Node must not be group/world writable",
  );
  assert.equal(
    (visibleNode.mode & 0o111n) !== 0n,
    true,
    "private fixed Node must be executable",
  );
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(FIXED_NODE)).digest("hex"),
    selectedNodeSha256,
    "private fixed Node must match the selected hosted Node bytes",
  );
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(FIXED_NODE)).digest("hex"),
    crypto.createHash("sha256").update(fs.readFileSync(harnessNode)).digest("hex"),
    "private fixed Node must match the root-owned harness generation",
  );

  assert.equal(
    path.resolve(ROOT),
    backingRepo,
    "delegated proof cwd must be the private checkout mirror",
  );
  const repoMount = retainedDirectoryMountIdentity(backingRepo);
  assert.notEqual(
    repoMount.mountId,
    bootstrapMount.mountId,
    "private checkout mirror must be a distinct bind mount",
  );
  assert.equal(
    repoMount.readOnly,
    true,
    "private checkout mirror must be read-only",
  );
}

function enterPrivateOptFixtureNamespace() {
  if (process.env[PRIVATE_OPT_FIXTURE_ENV] === "1") {
    requireDelegatedPrivateNamespace();
    return;
  }

  assert.equal(
    typeof process.getuid === "function" && typeof process.getgid === "function",
    true,
    "private fixture namespace requires Unix uid/gid identity",
  );
  assert.notEqual(process.getuid(), 0, "outer proof must remain unprivileged");

  for (const required of [
    "/usr/bin/unshare",
    "/usr/bin/mount",
    "/usr/bin/install",
    "/usr/bin/mktemp",
    "/usr/bin/chmod",
    "/usr/bin/rm",
    "/usr/bin/setpriv",
    "/usr/bin/env",
    "/usr/bin/bash",
    "/usr/bin/cc",
  ]) {
    const st = fs.lstatSync(required);
    assert.equal(st.isFile() && !st.isSymbolicLink(), true, required);
    assert.equal(st.uid, 0, required + " must be root-owned");
    assert.equal((st.mode & 0o022) === 0, true, required + " must not be writable");
  }

  for (const target of ["/opt", "/home"]) {
    const st = fs.lstatSync(target);
    assert.equal(
      st.isDirectory() && !st.isSymbolicLink(),
      true,
      target + " must be a direct directory before namespace bootstrap",
    );
  }

  requireAuthenticProcfsForCurrentProcess();
  const outerMountNsIno = String(
    fs.statSync("/proc/self/ns/mnt", { bigint: true }).ino,
  );

  const sudoReady = run(SUDO, ["-n", "true"]);
  assert.equal(
    sudoReady.status,
    0,
    "passwordless sudo is required for the disposable mount namespace",
  );

  const rootTemp = run(SUDO, [
    "-n",
    "/usr/bin/mktemp",
    "-d",
    "/tmp/void-e2-private-opt-v1-XXXXXXXX",
  ]);
  assert.equal(rootTemp.status, 0, "root bootstrap mktemp failed: " + rootTemp.stderr);
  const bootstrapRoot = String(rootTemp.stdout || "").trim();
  assert.match(
    bootstrapRoot,
    /^\/tmp\/void-e2-private-opt-v1-[A-Za-z0-9]{8}$/u,
    "root bootstrap path invalid",
  );
  const bootstrapMode = run(SUDO, [
    "-n",
    "/usr/bin/chmod",
    "0755",
    "--",
    bootstrapRoot,
  ]);
  assert.equal(
    bootstrapMode.status,
    0,
    "failed to make root bootstrap traversable: " + bootstrapMode.stderr,
  );

  let delegated;
  try {
    const bootstrapStat = fs.lstatSync(bootstrapRoot);
  assert.equal(
    bootstrapStat.isDirectory() && !bootstrapStat.isSymbolicLink(),
    true,
    "root bootstrap must be a direct directory",
  );
  assert.equal(bootstrapStat.uid, 0, "root bootstrap must be root-owned");
  assert.equal(
    (bootstrapStat.mode & 0o022) === 0,
    true,
    "root bootstrap must not be group/world writable",
  );
  assert.equal(
    bootstrapStat.mode & 0o7777,
    0o755,
    "root bootstrap must be exact mode 0755",
  );

  const selectedNodeSha256 =
    crypto.createHash("sha256").update(fs.readFileSync(process.execPath)).digest("hex");
  const harnessNode = path.join(bootstrapRoot, "node");
  const harnessInstall = run(SUDO, [
    "-n",
    "/usr/bin/install",
    "-o", "root",
    "-g", "root",
    "-m", "0755",
    process.execPath,
    harnessNode,
  ]);
  assert.equal(
    harnessInstall.status,
    0,
    "failed to install root-owned harness Node: " + harnessInstall.stderr,
  );
  assert.equal(
    crypto.createHash("sha256").update(fs.readFileSync(harnessNode)).digest("hex"),
    selectedNodeSha256,
    "root-owned harness Node copy must match selected hosted Node bytes",
  );

  const mountHelper = path.join(bootstrapRoot, "mount-id-helper");
  const mountHelperSource = [
    "#define _GNU_SOURCE",
    "#include <fcntl.h>",
    "#include <inttypes.h>",
    "#include <stdint.h>",
    "#include <stdio.h>",
    "#include <sys/stat.h>",
    "#include <sys/statfs.h>",
    "#include <sys/statvfs.h>",
    "int main(void){",
    "  struct statx sx={0};",
    "  struct statfs sfs;",
    "  struct statvfs svfs;",
    "  if(statx(3,\"\",AT_EMPTY_PATH,STATX_MNT_ID,&sx)!=0)return 2;",
    "  if((sx.stx_mask & STATX_MNT_ID)==0 || sx.stx_mnt_id==0)return 3;",
    "  if(fstatfs(3,&sfs)!=0)return 4;",
    "  if(fstatvfs(3,&svfs)!=0)return 5;",
    "  printf(\"mount_id=%\" PRIu64 \"\\n\",(uint64_t)sx.stx_mnt_id);",
    "  printf(\"fs_type=%\" PRIx64 \"\\n\",(uint64_t)sfs.f_type);",
    "  printf(\"readonly=%s\\n\",(svfs.f_flag & ST_RDONLY)?\"true\":\"false\");",
    "  return 0;",
    "}",
    "",
  ].join("\n");
  const mountHelperBuild = run(SUDO, [
    "-n",
    "/usr/bin/cc",
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-O2",
    "-fno-ident",
    "-Wl,--build-id=none",
    "-x",
    "c",
    "-",
    "-o",
    mountHelper,
  ], {
    input: mountHelperSource,
  });
  assert.equal(
    mountHelperBuild.status,
    0,
    "failed to compile root-owned direct statx helper: " +
      String(mountHelperBuild.stderr || ""),
  );
  assert.equal(
    mountHelperBuild.stderr,
    "",
    "direct statx helper compile produced stderr",
  );
  const mountHelperStat = fs.lstatSync(mountHelper);
  assert.equal(
    mountHelperStat.isFile() && !mountHelperStat.isSymbolicLink(),
    true,
    "direct statx helper must be a direct regular file",
  );
  assert.equal(mountHelperStat.uid, 0, "direct statx helper must be root-owned");
  assert.equal(
    mountHelperStat.nlink,
    1,
    "direct statx helper must have one link",
  );
  assert.equal(
    (mountHelperStat.mode & 0o022) === 0 &&
      (mountHelperStat.mode & 0o111) !== 0,
    true,
    "direct statx helper must be non-writable and executable",
  );
  const mountHelperSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(mountHelper))
    .digest("hex");

  const safeOpt = path.join(bootstrapRoot, "opt");
  const safeHome = path.join(bootstrapRoot, "home");
  const safeRepo = path.join(bootstrapRoot, "repo");
  const safeUsrUpper = path.join(bootstrapRoot, "usr-bin-upper");
  const safeUsrWork = path.join(bootstrapRoot, "usr-bin-work");
  const safeUsrMerged = path.join(bootstrapRoot, "usr-bin-merged");
  const proofRelative =
    "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v1.mjs";
  const shell = [
    "set -euo pipefail",
    'safe_opt="$1"',
    'safe_home="$2"',
    'safe_repo="$3"',
    'source_repo="$4"',
    'harness_node="$5"',
    'proof_relative="$6"',
    'runtime_uid="$7"',
    'runtime_gid="$8"',
    'runtime_home="$9"',
    'safe_usr_upper="${10}"',
    'safe_usr_work="${11}"',
    'safe_usr_merged="${12}"',
    'bootstrap_root="${13}"',
    'selected_node_sha256="${14}"',
    'outer_mount_ns_ino="${15}"',
    'mount_helper_sha256="${16}"',
    "/usr/bin/mount --make-rprivate /",
    '/usr/bin/install -d -o root -g root -m 0755 "$safe_usr_upper" "$safe_usr_work" "$safe_usr_merged"',
    '/usr/bin/mount -t overlay overlay -o "lowerdir=/usr/bin,upperdir=$safe_usr_upper,workdir=$safe_usr_work" "$safe_usr_merged"',
    '/usr/bin/install -o root -g root -m 0755 "$harness_node" "$safe_usr_merged/node"',
    '/usr/bin/mount --bind "$safe_usr_merged" /usr/bin',
    '/usr/bin/install -d -o root -g root -m 0755 "$safe_opt" "$safe_home"',
    '/usr/bin/install -d -o "$runtime_uid" -g "$runtime_gid" -m 0755 "$safe_repo"',
    '/usr/bin/mount --bind "$source_repo" "$safe_repo"',
    '/usr/bin/mount -o remount,bind,ro "$safe_repo"',
    '/usr/bin/mount --bind "$safe_opt" /opt',
    '/usr/bin/mount --bind "$safe_home" /home',
    'cd "$safe_repo"',
    'exec /usr/bin/setpriv --reuid="$runtime_uid" --regid="$runtime_gid" --clear-groups ' +
      '/usr/bin/env -i PATH=/usr/bin:/bin HOME="$runtime_home" LANG=C LC_ALL=C ' +
      PRIVATE_OPT_FIXTURE_ENV + '=1 ' +
      PRIVATE_BOOTSTRAP_ROOT_ENV + '="$bootstrap_root" ' +
      PRIVATE_SELECTED_NODE_SHA256_ENV + '="$selected_node_sha256" ' +
      PRIVATE_OUTER_MOUNT_NS_INO_ENV + '="$outer_mount_ns_ino" ' +
      PRIVATE_MOUNT_HELPER_SHA256_ENV + '="$mount_helper_sha256" ' +
      '/usr/bin/node "$safe_repo/$proof_relative"',
  ].join("\n");

    delegated = run(SUDO, [
      "-n",
      "/usr/bin/unshare",
      "--mount",
      "--fork",
      "/usr/bin/bash",
      "-c",
      shell,
      "void-e2-private-opt-v1",
      safeOpt,
      safeHome,
      safeRepo,
      ROOT,
      harnessNode,
      proofRelative,
      String(process.getuid()),
      String(process.getgid()),
      String(process.env.HOME || "/home/runner"),
      safeUsrUpper,
      safeUsrWork,
      safeUsrMerged,
      bootstrapRoot,
      selectedNodeSha256,
      outerMountNsIno,
      mountHelperSha256,
    ], {
      timeout: 180_000,
    });
  } finally {
    const cleanup = run(SUDO, [
      "-n", "/usr/bin/rm", "-rf", "--", bootstrapRoot,
    ]);
    assert.equal(
      cleanup.status,
      0,
      "failed to remove private mount-namespace bootstrap root: " +
        cleanup.stderr,
    );
  }

  assert.equal(
    delegated.error,
    undefined,
    "private mount namespace spawn failed: " +
      String(delegated.error && delegated.error.message || ""),
  );
  if (delegated.status !== 0) {
    fs.writeSync(1, String(delegated.stdout || ""));
    fs.writeSync(2, String(delegated.stderr || ""));
    throw new Error(
      "private_mount_namespace_fixture_failed:" + String(delegated.status),
    );
  }
  fs.writeSync(1, String(delegated.stdout || ""));
  fs.writeSync(2, String(delegated.stderr || ""));
  process.exit(0);
}

enterPrivateOptFixtureNamespace();

for (const file of [PREENTRY, RUNNER, SEALED, DOC, WORKFLOW]) {
  assert.equal(fs.lstatSync(path.join(ROOT, file)).isFile(), true, file);
}

const preentry = fs.readFileSync(path.join(ROOT, PREENTRY), "utf8");
const runner = fs.readFileSync(path.join(ROOT, RUNNER), "utf8");
const doc = fs.readFileSync(path.join(ROOT, DOC), "utf8");
const workflow = fs.readFileSync(path.join(ROOT, WORKFLOW), "utf8");

assert.equal(git(["status", "--porcelain=v1"]), "");
assert.equal(
  git(["hash-object", "--", RUNNER]),
  git(["rev-parse", "HEAD:" + RUNNER]),
  "runner working bytes must equal the tracked Git object",
);
assert.equal(
  git(["hash-object", "--", PREENTRY]),
  git(["rev-parse", "HEAD:" + PREENTRY]),
  "preentry working bytes must equal the tracked Git object",
);

for (const required of [
  '#define FIXED_SELF FIXED_ROOT "/void_buy_void_epoch2_live_composition_native_preentry_v1"',
  '#define FIXED_POLICY FIXED_ROOT "/policy-v1.conf"',
  '#define FIXED_RUNNER FIXED_ROOT "/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"',
  '#define FIXED_NODE "/usr/bin/node"',
  '#define FIXED_DEVNULL "/dev/null"',
  "O_RDONLY | O_NOFOLLOW",
  "require_self_identity();",
  "require_devnull_stdin();",
  "policy_v1 policy = read_policy();",
  "native_preentry_expected_head_policy_mismatch",
  "runner_sha256",
  "runner_bytes",
  "node_sha256",
  "node_bytes",
  "pipe2(proof_pipe, O_CLOEXEC)",
  "pid_t child = fork()",
  "emit_parent_proof(",
  "read_process_start_ticks(",
  "waitpid(child, &status, 0)",
  "fexecve(node_fd, next_argv, envp);",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_RUNNER_FD=%d",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_PROOF_FD=",
  "PATH=/usr/bin:/bin",
  "HOME=/root",
  "LANG=C",
  "LC_ALL=C",
  "TZ=UTC",
]) {
  assert.equal(
    preentry.includes(required),
    true,
    "preentry missing required contract: " + required,
  );
}

const stdinAt = preentry.indexOf("require_devnull_stdin();");
const policyAt = preentry.indexOf("policy_v1 policy = read_policy();");
const runnerOpenAt = preentry.indexOf(
  "int runner_fd = open_trusted_regular(",
);
const forkAt = preentry.indexOf("pid_t child = fork()");
const proofAt = preentry.indexOf("emit_parent_proof(", forkAt);
const execAt = preentry.lastIndexOf("fexecve(node_fd, next_argv, envp);");
const waitAt = preentry.indexOf("waitpid(child, &status, 0)");
assert.ok(stdinAt > 0);
assert.ok(policyAt > stdinAt);
assert.ok(runnerOpenAt > policyAt);
assert.ok(forkAt > runnerOpenAt);
assert.ok(execAt > forkAt);
assert.ok(proofAt > forkAt);
assert.ok(waitAt > proofAt);
assert.equal(preentry.includes("system("), false);
assert.equal(preentry.includes("popen("), false);
assert.equal(preentry.includes("execve("), true);
assert.equal(preentry.includes("--input-type=module"), false);

for (const forbiddenEnvName of [
  "NODE_OPTIONS",
  "NODE_PATH",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
]) {
  assert.equal(
    preentry.includes(forbiddenEnvName),
    false,
    "native preentry must sanitize loader variable: " + forbiddenEnvName,
  );
}

for (const required of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2",
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2",
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs",
  "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2",
  "voide2sealed2_",
  "voide2livecomp2_",
  "credential_generation_retained_through_signing:true",
  "credential_generation_revalidated_after_final_observation:true",
  "credential_generation_revalidated_immediately_before_close:true",
  "privileged_first_entry_authenticated:true",
  "native_preentry_policy_bound:true",
  "root_node_descriptor_execution_bound:true",
  "runner_retained_descriptor_bound:true",
  "stdin_javascript_source_forbidden:true",
  "native_parent_retained_for_child_lifetime:true",
  "native_parent_process_generation_bound:true",
  "native_parent_installed_generation_bound:true",
  "native_parent_revalidated_after_sensitive_sequence:true",
  "requireNativePreentry(expectedHead)",
  "revalidateNativePreentry(nativeProof,expectedHead)",
  "PREENTRY_PROOF_FD_ENV",
  "PREENTRY_PROOF_SCHEMA",
  "process.ppid",
  "native_preentry_parent_executable_mismatch",
  "native_preentry_parent_child_generation_mismatch",
  "native_preentry_fixed_runner_required",
  "native_preentry_runner_generation_invalid",
  "native_preentry_node_executable_mismatch",
]) {
  assert.equal(
    runner.includes(required),
    true,
    "runner missing required V2/preentry binding: " + required,
  );
}
assert.equal(runner.includes("runner_git_object_stdin_required"), false);
assert.equal(runner.includes("git_object_stdin_required_for_live=true"), false);
const nativeGateAt = runner.indexOf("requireNativePreentry(expectedHead);");
const sensitiveAt = runner.indexOf("const receipt=runSensitiveSequence({expectedHead});");
const finalRevalidateAt = runner.indexOf(
  "revalidateNativePreentry(nativeProof,expectedHead);",
  sensitiveAt,
);
const receiptOutputAt = runner.indexOf(
  "console.log(JSON.stringify(receipt,null,2));",
  finalRevalidateAt,
);
assert.ok(nativeGateAt > 0);
assert.ok(sensitiveAt > nativeGateAt);
assert.ok(finalRevalidateAt > sensitiveAt);
assert.ok(receiptOutputAt > finalRevalidateAt);

assert.match(
  doc,
  /Caller-streamed stdin JavaScript is rejected before policy, runner, or Node\s+execution/u,
);
assert.match(doc, /policy-v1[.]conf/u);
assert.match(doc, /private mount namespace/u);
assert.match(doc, /No live invocation is authorized by this source PR/u);
assert.match(workflow, /prove_buy_void_epoch2_live_composition_native_preentry_v1[.]mjs/u);
assert.match(workflow, /void_buy_void_epoch2_credential_attestation_sealed_v2[.]mjs/u);

const initialOpt = fs.lstatSync("/opt");
assert.equal(
  initialOpt.isDirectory() && !initialOpt.isSymbolicLink(),
  true,
  "/opt must be a direct directory inside the authenticated delegated namespace",
);
assert.equal(initialOpt.uid, 0, "/opt must be root-owned in delegated namespace");
assert.equal(
  (initialOpt.mode & 0o022) === 0,
  true,
  "/opt must not be group/world writable in delegated namespace",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-e2-native-preentry-v1-"),
);
const binary = path.join(temp, "preentry");
let fixtureOptPreflightVerified = false;
try {
  const compile = run(CC, [
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-O2",
    "-static",
    path.join(ROOT, PREENTRY),
    "-o",
    binary,
  ]);
  assert.equal(
    compile.status,
    0,
    "native preentry compile failed: " + compile.stderr,
  );

  const self = run(binary, ["--self-test"]);
  assert.equal(self.status, 0, self.stderr);
  assert.match(
    self.stdout,
    /VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_SELF_TEST_GREEN/u,
  );
  assert.match(self.stdout, /stdin_javascript_source_forbidden=true/u);
  assert.match(self.stdout, /node_sha256_policy_bound=true/u);
  assert.match(self.stdout, /native_parent_retained_for_child_lifetime=true/u);
  assert.match(self.stdout, /parent_child_start_ticks_bound=true/u);
  assert.match(self.stdout, /private_parent_proof_channel=true/u);

  const readelf = run("/usr/bin/readelf", ["-l", binary]);
  assert.equal(readelf.status, 0, readelf.stderr);
  assert.doesNotMatch(readelf.stdout, / INTERP /u);

  const preloadSource = path.join(temp, "preload.c");
  const preloadSo = path.join(temp, "preload.so");
  const preloadMarker = path.join(temp, "preload-marker");
  const dynamicControlSource = path.join(temp, "dynamic-control.c");
  const dynamicControl = path.join(temp, "dynamic-control");
  fs.writeFileSync(
    preloadSource,
    "#include <fcntl.h>\n#include <stdlib.h>\n#include <unistd.h>\n" +
      "__attribute__((constructor)) static void p(void){" +
      "const char*m=getenv(\"VOID_PRELOAD_MARKER\");if(!m)return;" +
      "int f=open(m,O_WRONLY|O_CREAT|O_TRUNC,0600);" +
      "if(f>=0){write(f,\"x\",1);close(f);}}\n",
    "utf8",
  );
  fs.writeFileSync(dynamicControlSource, "int main(void){return 0;}\n", "utf8");
  let preloadCompile = run(CC, [
    "-shared", "-fPIC", preloadSource, "-o", preloadSo,
  ]);
  assert.equal(preloadCompile.status, 0, preloadCompile.stderr);
  preloadCompile = run(CC, [dynamicControlSource, "-o", dynamicControl]);
  assert.equal(preloadCompile.status, 0, preloadCompile.stderr);
  const poisonEnv = {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    LD_PRELOAD: preloadSo,
    VOID_PRELOAD_MARKER: preloadMarker,
  };
  const dynamicControlRun = run(dynamicControl, [], { env: poisonEnv });
  assert.equal(dynamicControlRun.status, 0, dynamicControlRun.stderr);
  assert.equal(fs.existsSync(preloadMarker), true, "dynamic preload positive control");
  fs.rmSync(preloadMarker, { force: true });
  const staticPreentryRun = run(binary, ["--self-test"], { env: poisonEnv });
  assert.equal(staticPreentryRun.status, 0, staticPreentryRun.stderr);
  assert.equal(
    fs.existsSync(preloadMarker),
    false,
    "static native preentry must not execute LD_PRELOAD constructor",
  );

  for (const arg of ["--self-test", "--plan"]) {
    const check = run(process.execPath, [path.join(ROOT, RUNNER), arg]);
    assert.equal(
      check.status,
      0,
      "runner " + arg + " failed: " + check.stderr,
    );
  }

  const sudoReady = run(SUDO, ["-n", "true"]);
  assert.equal(sudoReady.status, 0, "passwordless sudo is required by fixture");

  const setprivReal = fs.realpathSync(SETPRIV);
  const setprivStat = fs.lstatSync(setprivReal);
  assert.equal(setprivStat.isFile() && !setprivStat.isSymbolicLink(), true);
  assert.equal(setprivStat.uid, 0, "fixed setpriv must be root-owned");
  assert.equal(
    (setprivStat.mode & 0o022) === 0,
    true,
    "fixed setpriv must not be group/world writable",
  );
  assert.equal(
    (setprivStat.mode & 0o111) !== 0,
    true,
    "fixed setpriv must be executable",
  );

  let fixedRepoFixtureCreated = false;
  let fixedRepoParentsCreated = false;
  let fixtureInstalled = false;
  try {
    for (const target of ["/", "/opt"]) {
      const st = fs.lstatSync(target);
      assert.equal(
        st.isDirectory() && !st.isSymbolicLink(),
        true,
        target + " must be a direct directory before any fixture mutation",
      );
      assert.equal(st.uid, 0, target + " must be root-owned");
      assert.equal(
        (st.mode & 0o022) === 0,
        true,
        target + " must not be group/world writable",
      );
    }
    fixtureOptPreflightVerified = true;

    const fixedNodeStat = fs.lstatSync(FIXED_NODE);
    assert.equal(
      fixedNodeStat.isFile() && !fixedNodeStat.isSymbolicLink(),
      true,
      "fixed /usr/bin/node must already be a direct regular file",
    );
    assert.equal(fixedNodeStat.uid, 0, "fixed /usr/bin/node must be root-owned");
    assert.equal(fixedNodeStat.nlink, 1, "fixed /usr/bin/node must have one link");
    assert.equal(
      (fixedNodeStat.mode & 0o022) === 0,
      true,
      "fixed /usr/bin/node must not be group/world writable",
    );
    assert.equal(
      (fixedNodeStat.mode & 0o6000) === 0,
      true,
      "fixed /usr/bin/node must not be setuid/setgid",
    );
    assert.equal(
      (fixedNodeStat.mode & 0o111) !== 0,
      true,
      "fixed /usr/bin/node must already be executable",
    );

    assert.equal(
      fs.existsSync(FIXED_ROOT),
      false,
      "hosted protected-root fixture must begin absent",
    );
    let install = run(SUDO, [
      "-n", "install",
      "-d", "-o", "root", "-g", "root", "-m", "0755",
      FIXED_ROOT,
    ]);
    assert.equal(install.status, 0, install.stderr);
    install = run(SUDO, [
      "-n", "install",
      "-o", "root", "-g", "root", "-m", "0755",
      binary,
      FIXED_SELF,
    ]);
    assert.equal(install.status, 0, install.stderr);
    for (const target of [FIXED_ROOT, FIXED_SELF]) {
      const st = fs.lstatSync(target);
      if (target === FIXED_ROOT) {
        assert.equal(st.isDirectory() && !st.isSymbolicLink(), true, target);
      } else {
        assert.equal(st.isFile() && !st.isSymbolicLink(), true, target);
        assert.equal(st.nlink, 1, target + " must have one link");
        assert.equal((st.mode & 0o111) !== 0, true, target + " must be executable");
      }
      assert.equal(st.uid, 0, target + " must be root-owned");
      assert.equal(
        (st.mode & 0o022) === 0,
        true,
        target + " must not be group/world writable",
      );
    }

    install = run(SUDO, [
      "-n", "install",
      "-o", "root", "-g", "root", "-m", "0444",
      path.join(ROOT, RUNNER),
      FIXED_RUNNER,
    ]);
    assert.equal(install.status, 0, install.stderr);

    const acceptedHead = git(["rev-parse", "HEAD"]);
    const runnerBytes = fs.readFileSync(path.join(ROOT, RUNNER));
    const nodeBytes = fs.readFileSync(FIXED_NODE);
    const policyFixture = path.join(temp, "policy-v1.conf");
    fs.writeFileSync(
      policyFixture,
      [
        "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1",
        "expected_head=" + acceptedHead,
        "runner_sha256=" +
          crypto.createHash("sha256").update(runnerBytes).digest("hex"),
        "runner_bytes=" + String(runnerBytes.length),
        "node_sha256=" +
          crypto.createHash("sha256").update(nodeBytes).digest("hex"),
        "node_bytes=" + String(nodeBytes.length),
        "",
      ].join("\n"),
      "utf8",
    );
    install = run(SUDO, [
      "-n", "install",
      "-o", "root", "-g", "root", "-m", "0444",
      policyFixture,
      FIXED_POLICY,
    ]);
    assert.equal(install.status, 0, install.stderr);
    fixtureInstalled = true;

    assert.equal(
      fs.existsSync(FIXED_REPO_ROOT),
      false,
      "hosted fixed checkout fixture must begin absent",
    );

    const missingCwdLineage = run("/usr/bin/bash", [
      "-c",
      "exec " +
        JSON.stringify(SUDO) +
        " -n " +
        JSON.stringify(FIXED_SELF) +
        " --run --confirm " +
        JSON.stringify(CONFIRM) +
        " --expected-head " +
        JSON.stringify(acceptedHead) +
        " </dev/null",
    ], { timeout: 60_000 });
    assert.equal(missingCwdLineage.status, 2);
    assert.match(
      missingCwdLineage.stderr,
      /spawn_error:spawnSync_usr_bin_setpriv_ENOENT/u,
      "missing fixed checkout cwd must fail closed before runtime-user work",
    );

    for (const target of ["/home/zoso", "/home/zoso/dev"]) {
      assert.equal(
        fs.existsSync(target),
        false,
        "hosted fixed-checkout parent must begin absent: " + target,
      );
    }
    let fixedRepoInstall = run(SUDO, [
      "-n", "install",
      "-d", "-o", "root", "-g", "root", "-m", "0755",
      "/home/zoso",
      "/home/zoso/dev",
    ]);
    assert.equal(
      fixedRepoInstall.status,
      0,
      "failed to create hosted fixed checkout parents: " +
        fixedRepoInstall.stderr,
    );
    fixedRepoParentsCreated = true;
    fixedRepoInstall = run(SUDO, [
      "-n", "ln", "-s", "--", ROOT, FIXED_REPO_ROOT,
    ]);
    assert.equal(
      fixedRepoInstall.status,
      0,
      "failed to create hosted fixed checkout link: " +
        fixedRepoInstall.stderr,
    );
    fixedRepoFixtureCreated = true;
    const fixedRepoLink = fs.lstatSync(FIXED_REPO_ROOT);
    assert.equal(fixedRepoLink.isSymbolicLink(), true);
    assert.equal(
      fs.realpathSync(FIXED_REPO_ROOT),
      fs.realpathSync(ROOT),
      "hosted fixed checkout must resolve to exact checkout",
    );

    const attackSource =
      'process.stderr.write("ROOT_JS_SENTINEL_EXECUTED\\\\n");\\n';
    const attack = run(SUDO, [
      "-n",
      FIXED_SELF,
      "--run",
      "--confirm",
      CONFIRM,
      "--expected-head",
      "a".repeat(40),
    ], {
      input: attackSource,
    });
    assert.equal(attack.status, 2);
    assert.match(attack.stderr, /reason=stdin_javascript_source_forbidden/u);
    assert.doesNotMatch(attack.stdout + attack.stderr, /ROOT_JS_SENTINEL_EXECUTED/u);
    assert.match(attack.stderr, /root_javascript_started=false/u);

    const nativeLineage = run("/usr/bin/bash", [
      "-c",
      "exec " +
        JSON.stringify(SUDO) +
        " -n " +
        JSON.stringify(FIXED_SELF) +
        " --run --confirm " +
        JSON.stringify(CONFIRM) +
        " --expected-head " +
        JSON.stringify(acceptedHead) +
        " </dev/null",
    ], { timeout: 60_000 });
    assert.equal(nativeLineage.status, 2);
    assert.doesNotMatch(
      nativeLineage.stderr,
      /native_preentry_(proof|parent|child|installed)_/u,
      "valid native lineage must clear parent-proof gates",
    );
    assert.match(
      nativeLineage.stderr,
      /git_failed:rev-parse/u,
      "valid native lineage must execute the real runtime-user transition and reach the later Git checkout gate",
    );
    assert.doesNotMatch(
      nativeLineage.stderr,
      /spawn_error:spawnSync_usr_bin_setpriv_ENOENT/u,
      "positive native lineage must not stop at an ambiguous spawn ENOENT",
    );

    const forgedProof = path.join(temp, "forged-parent-proof.json");
    const forgeScript = [
      "set -euo pipefail",
      "runner=" + JSON.stringify(FIXED_RUNNER),
      "preentry=" + JSON.stringify(FIXED_SELF),
      "node=" + JSON.stringify(FIXED_NODE),
      "proof=" + JSON.stringify(forgedProof),
      "head=" + JSON.stringify(acceptedHead),
      "exec 3<\"$runner\"",
      "parent=$PPID",
      "child=$$",
      "parent_ticks=$(awk '{print $22}' /proc/$parent/stat)",
      "child_ticks=$(awk '{print $22}' /proc/$child/stat)",
      "pre_dev=$(stat -Lc %d \"$preentry\")",
      "pre_ino=$(stat -Lc %i \"$preentry\")",
      "runner_dev=$(stat -Lc %d \"$runner\")",
      "runner_ino=$(stat -Lc %i \"$runner\")",
      "node_dev=$(stat -Lc %d \"$node\")",
      "node_ino=$(stat -Lc %i \"$node\")",
      "printf '%s\\n' \"{\\\"schema\\\":\\\"VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V1\\\",\\\"parent_pid\\\":$parent,\\\"parent_start_ticks\\\":\\\"$parent_ticks\\\",\\\"child_pid\\\":$child,\\\"child_start_ticks\\\":\\\"$child_ticks\\\",\\\"preentry_dev\\\":\\\"$pre_dev\\\",\\\"preentry_ino\\\":\\\"$pre_ino\\\",\\\"runner_dev\\\":\\\"$runner_dev\\\",\\\"runner_ino\\\":\\\"$runner_ino\\\",\\\"node_dev\\\":\\\"$node_dev\\\",\\\"node_ino\\\":\\\"$node_ino\\\",\\\"expected_head\\\":\\\"$head\\\"}\" >\"$proof\"",
      "exec 4<\"$proof\"",
      "export VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1",
      "export VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_RUNNER_FD=3",
      "export VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_PROOF_FD=4",
      "exec \"$node\" \"$runner\" --run --confirm " +
        JSON.stringify(CONFIRM) + " --expected-head \"$head\"",
    ].join("\n");
    const forgedRootNode = run(SUDO, [
      "-n", "/usr/bin/bash", "-c", forgeScript,
    ], { timeout: 30_000 });
    assert.equal(forgedRootNode.status, 2);
    assert.match(
      forgedRootNode.stderr,
      /native_preentry_parent_executable_mismatch/u,
      "direct root Node with forged marker/fds must fail fixed-parent provenance",
    );
  } finally {
    if (fixedRepoFixtureCreated) {
      run(SUDO, ["-n", "rm", "-f", "--", FIXED_REPO_ROOT]);
    }
    if (fixedRepoParentsCreated) {
      run(SUDO, ["-n", "rmdir", "--ignore-fail-on-non-empty", "/home/zoso/dev"]);
      run(SUDO, ["-n", "rmdir", "--ignore-fail-on-non-empty", "/home/zoso"]);
    }
    if (fixtureInstalled) {
      run(SUDO, ["-n", "rm", "-rf", "--", FIXED_ROOT]);
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_PROOF_GREEN");
console.log("stack_parent_sealed_v2=true");
console.log("native_first_instruction=true");
console.log("root_owned_fixed_runner=true");
console.log("runner_generation_policy_bound=true");
console.log("node_generation_policy_bound=true");
console.log("expected_head_policy_bound=true");
console.log("runner_descriptor_retained=true");
console.log("node_descriptor_fexecve=true");
console.log("native_parent_retained_for_child_lifetime=true");
console.log("native_parent_process_generation_bound=true");
console.log("native_parent_installed_generation_bound=true");
console.log("native_parent_revalidated_after_sensitive_sequence=true");
console.log("direct_root_node_marker_fd_forgery_rejected=true");
console.log("caller_stdin_javascript_rejected_before_root_js=true");
console.log("loader_environment_sanitized=true");
console.log("native_preentry_static=true");
console.log("native_preentry_no_pt_interp=true");
console.log("native_preentry_ld_preload_blocked_before_main=true");
console.log(
  "fixture_opt_ancestry_preflight_read_only=" +
    String(fixtureOptPreflightVerified),
);
console.log("host_opt_metadata_mutation=false");
console.log("host_opt_mount_mutation=false");
console.log("host_home_metadata_mutation=false");
console.log("host_home_mount_mutation=false");
console.log("fixed_checkout_parent_host_mutation=false");
console.log("private_opt_mount_namespace=true");
console.log("private_home_mount_namespace=true");
console.log("private_usr_bin_overlay_namespace=true");
console.log("private_fixed_node_matches_selected_node=true");
console.log("root_owned_bootstrap_generation=true");
console.log("root_bootstrap_traversable_mode_0755=true");
console.log("same_uid_bootstrap_replacement_blocked=true");
console.log("host_fixed_mountpoints_preflight_read_only=true");
console.log("delegated_namespace_kernel_state_verified=true");
console.log("delegated_parent_launch_identity_verified=true");
console.log("delegated_procfs_provenance_verified=true");
console.log("delegated_mount_topology_asymmetric=true");
console.log("caller_controlled_ci_flags_authorize_opt_mutation=false");
console.log("hosted_self_custody_shape_prechecked=true");
console.log("private_fixed_node_overlay_required=true");
console.log("direct_statx_mount_topology_bound=true");
console.log("proc_mountinfo_topology_authority=false");
console.log("host_usr_bin_mutation=false");
console.log("live_credential_access=false");
console.log("live_signing=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
