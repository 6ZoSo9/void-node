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
assert.match(doc, /No live invocation is authorized by this source PR/u);
assert.match(workflow, /prove_buy_void_epoch2_live_composition_native_preentry_v1[.]mjs/u);
assert.match(workflow, /void_buy_void_epoch2_credential_attestation_sealed_v2[.]mjs/u);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-e2-native-preentry-v1-"),
);
const binary = path.join(temp, "preentry");
let hostedOptMetadataChanged = false;
let hostedOptRestorationVerified = false;
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

  let fixedNodeFixtureCreated = false;
  let fixedRepoFixtureCreated = false;
  let fixedRepoParentsCreated = false;
  let fixtureInstalled = false;
  const optBefore = fs.lstatSync("/opt");
  try {
    const optUnsafe =
      !optBefore.isDirectory() ||
      optBefore.isSymbolicLink() ||
      optBefore.uid !== 0 ||
      (optBefore.mode & 0o022) !== 0;
    if (optUnsafe) {
      assert.equal(
        process.env.GITHUB_ACTIONS,
        "true",
        "unsafe /opt ancestry may be normalized only on GitHub-hosted CI",
      );
      assert.equal(
        process.env.CI,
        "true",
        "unsafe /opt ancestry requires CI=true",
      );
      const runnerTempRaw = String(process.env.RUNNER_TEMP || "");
      assert.match(
        runnerTempRaw,
        /^\/home\/runner\/work\/_temp(?:\/|$)/u,
        "unsafe /opt ancestry requires the GitHub-hosted runner temp boundary",
      );
      const rootOwn = run(SUDO, ["-n", "chown", "root:root", "/opt"]);
      assert.equal(
        rootOwn.status,
        0,
        "failed to temporarily root-own hosted /opt: " + rootOwn.stderr,
      );
      hostedOptMetadataChanged = true;
      const normalizeMode = run(SUDO, ["-n", "chmod", "0755", "/opt"]);
      assert.equal(
        normalizeMode.status,
        0,
        "failed to temporarily normalize hosted /opt mode: " +
          normalizeMode.stderr,
      );
    }
    for (const target of ["/", "/opt"]) {
      const st = fs.lstatSync(target);
      assert.equal(st.isDirectory() && !st.isSymbolicLink(), true, target);
      assert.equal(st.uid, 0, target + " must be root-owned");
      assert.equal(
        (st.mode & 0o022) === 0,
        true,
        target + " must not be group/world writable",
      );
    }

    if (!fs.existsSync(FIXED_NODE)) {
      const nodeInstall = run(SUDO, [
        "-n", "install",
        "-o", "root", "-g", "root", "-m", "0755",
        process.execPath,
        FIXED_NODE,
      ]);
      assert.equal(
        nodeInstall.status,
        0,
        "failed to materialize fixed Node fixture: " + nodeInstall.stderr,
      );
      fixedNodeFixtureCreated = true;
    }

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
    if (hostedOptMetadataChanged) {
      const restoreOwner = run(SUDO, [
        "-n", "chown",
        String(optBefore.uid) + ":" + String(optBefore.gid),
        "/opt",
      ]);
      assert.equal(
        restoreOwner.status,
        0,
        "failed to restore hosted /opt owner: " + restoreOwner.stderr,
      );
      const originalMode =
        (optBefore.mode & 0o7777).toString(8).padStart(4, "0");
      const restoreMode = run(SUDO, [
        "-n", "chmod", originalMode, "/opt",
      ]);
      assert.equal(
        restoreMode.status,
        0,
        "failed to restore hosted /opt mode: " + restoreMode.stderr,
      );
      const optAfter = fs.lstatSync("/opt");
      assert.equal(optAfter.dev, optBefore.dev, "hosted /opt device drift");
      assert.equal(optAfter.ino, optBefore.ino, "hosted /opt inode drift");
      assert.equal(optAfter.uid, optBefore.uid, "hosted /opt uid restore failed");
      assert.equal(optAfter.gid, optBefore.gid, "hosted /opt gid restore failed");
      assert.equal(
        optAfter.mode & 0o7777,
        optBefore.mode & 0o7777,
        "hosted /opt mode restore failed",
      );
    }
    hostedOptRestorationVerified = true;
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
    if (fixedNodeFixtureCreated) {
      const nodeCleanup = run(SUDO, [
        "-n", "rm", "-f", "--", FIXED_NODE,
      ]);
      assert.equal(
        nodeCleanup.status,
        0,
        "failed to remove fixed Node fixture: " + nodeCleanup.stderr,
      );
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
  "hosted_opt_ancestry_unchanged_or_restored=" +
    String(hostedOptRestorationVerified),
);
console.log(
  "hosted_opt_ci_normalization_performed=" +
    String(hostedOptMetadataChanged),
);
console.log("hosted_self_custody_shape_prechecked=true");
console.log("hosted_fixed_node_fixture_created_only_if_absent=true");
console.log("live_credential_access=false");
console.log("live_signing=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
