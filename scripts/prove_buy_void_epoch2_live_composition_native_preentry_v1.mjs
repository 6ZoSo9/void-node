#!/usr/bin/env node
import assert from "node:assert/strict";
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
  "fexecve(node_fd, next_argv, envp);",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_RUNNER_FD=%d",
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
const execAt = preentry.indexOf("fexecve(node_fd, next_argv, envp);");
assert.ok(stdinAt > 0);
assert.ok(policyAt > stdinAt);
assert.ok(runnerOpenAt > policyAt);
assert.ok(execAt > runnerOpenAt);
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
  "requireNativePreentry();",
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
const nativeGateAt = runner.indexOf("requireNativePreentry();");
const sensitiveAt = runner.indexOf("const receipt=runSensitiveSequence({expectedHead});");
assert.ok(nativeGateAt > 0 && sensitiveAt > nativeGateAt);

assert.match(
  doc,
  /stdin JavaScript is rejected before policy, runner, or Node execution/u,
);
assert.match(doc, /policy-v1[.]conf/u);
assert.match(doc, /No live invocation is authorized by this source PR/u);
assert.match(workflow, /prove_buy_void_epoch2_live_composition_native_preentry_v1[.]mjs/u);
assert.match(workflow, /void_buy_void_epoch2_credential_attestation_sealed_v2[.]mjs/u);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-e2-native-preentry-v1-"),
);
const binary = path.join(temp, "preentry");
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

  let fixtureInstalled = false;
  try {
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
    fixtureInstalled = true;

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

    const devnull = run("/usr/bin/bash", [
      "-c",
      "exec " +
        JSON.stringify(SUDO) +
        " -n " +
        JSON.stringify(FIXED_SELF) +
        " --run --confirm " +
        JSON.stringify(CONFIRM) +
        " --expected-head " +
        "b".repeat(40) +
        " </dev/null",
    ]);
    assert.equal(devnull.status, 2);
    assert.match(
      devnull.stderr,
      /reason=native_preentry_policy_custody_invalid/u,
      "devnull input must pass stdin rejection and reach the next protected gate",
    );
  } finally {
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
console.log("caller_stdin_javascript_rejected_before_root_js=true");
console.log("loader_environment_sanitized=true");
console.log("native_preentry_static=true");
console.log("native_preentry_no_pt_interp=true");
console.log("native_preentry_ld_preload_blocked_before_main=true");
console.log("live_credential_access=false");
console.log("live_signing=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
