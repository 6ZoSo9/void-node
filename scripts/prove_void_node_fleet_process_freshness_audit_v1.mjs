#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  VOID_NODE_FLEET_DRIFT_CONFIG_V1,
  VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1,
  buildFleetProcessFreshnessDecisionV1,
  buildProcessFreshnessCollectorScriptV1,
  classifyProcessFreshnessV1,
  collectNodeProcessFreshnessV1,
  validateProcessFreshnessConfigV1,
} from "../tools/void-node-fleet-process-freshness-audit-v1.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 20_000,
    env: options.env ?? process.env,
  });
  if (options.allowFailure) return result;
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function git(cwd, ...args) {
  return run("git", args, { cwd });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntilEpochAtLeast(epoch) {
  while (Math.floor(Date.now() / 1000) < epoch) await delay(50);
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(port, child) {
  let lastError = "health endpoint did not return a green response";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    assert.equal(child.exitCode, null, "fixture process exited before becoming healthy");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok && (await response.json()).ok === true) return;
      lastError = `health response status=${response.status}`;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await delay(50);
  }
  assert.fail(`fixture process did not become healthy: ${lastError}`);
}

function baseSnapshot(overrides = {}) {
  return {
    repo_ok: true,
    source_head: "1".repeat(40),
    source_branch: "main",
    dirty_count: 0,
    worktree_status_readable: true,
    source_stable: true,
    head_log_present: true,
    head_transition_epoch: 100,
    observed_at_epoch: 110,
    service_active: true,
    process_present: true,
    process_start_epoch: 105,
    process_cwd_matches_repo: true,
    process_entrypoint_matches: true,
    process_executable_node: true,
    process_identity_stable: true,
    health_json_ok: true,
    health: { ok: true },
    readiness_json_ok: true,
    readiness: { ready: true, gap: 0 },
    version_json_ok: true,
    version: { git_commit: "1".repeat(12) },
    ...overrides,
  };
}

const aligned = classifyProcessFreshnessV1(baseSnapshot());
assert.equal(aligned.classification, "PROCESS_SOURCE_ALIGNED");
assert.equal(aligned.source_to_process_start_seconds, 5);
assert.equal(aligned.version_git_commit_matches_source_head_diagnostic_only, true);
assert.equal(classifyProcessFreshnessV1(baseSnapshot({ version: { git_commit: "1" } }))
  .version_git_commit_matches_source_head_diagnostic_only, false, "short diagnostic prefixes must be rejected");

const stale = classifyProcessFreshnessV1(baseSnapshot({ process_start_epoch: 90 }));
assert.equal(stale.classification, "STALE_SOURCE_AFTER_PROCESS_START");
assert.equal(stale.source_to_process_start_seconds, -10);

const ambiguous = classifyProcessFreshnessV1(baseSnapshot({ process_start_epoch: 100 }));
assert.equal(ambiguous.classification, "HOLD");
assert.deepEqual(ambiguous.reasons, ["timestamp_order_ambiguous"]);

const unhealthy = classifyProcessFreshnessV1(baseSnapshot({
  health: { ok: false },
  process_cwd_matches_repo: false,
  source_branch: "release",
}));
assert.equal(unhealthy.classification, "HOLD");
assert.deepEqual(unhealthy.reasons, ["health_not_green", "process_cwd_mismatch", "source_branch_not_main"]);

const raced = classifyProcessFreshnessV1(baseSnapshot({
  source_stable: false,
  process_identity_stable: false,
}));
assert.equal(raced.classification, "HOLD");
assert.deepEqual(raced.reasons, ["process_changed_during_collection", "source_changed_during_collection"]);

const unreadableStatus = classifyProcessFreshnessV1(baseSnapshot({ worktree_status_readable: false }));
assert.equal(unreadableStatus.classification, "HOLD");
assert.deepEqual(unreadableStatus.reasons, ["worktree_status_unreadable"]);

const alignedNode = { name: "nimo", source_head: "1".repeat(40), ...aligned };
const staleNode = { name: "precision", source_head: "2".repeat(40), ...stale };
const fleet = buildFleetProcessFreshnessDecisionV1([alignedNode, staleNode]);
assert.equal(fleet.decision, "RESTART_REQUIRED");
assert.match(fleet.audit_id_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(buildFleetProcessFreshnessDecisionV1([alignedNode, staleNode]), fleet, "fleet result must be deterministic");
assert.equal(buildFleetProcessFreshnessDecisionV1([
  alignedNode,
  { name: "alienware", source_head: null, ...unhealthy },
]).decision, "HOLD", "ambiguity must dominate stale or green states");

const sampleConfig = {
  marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
  canonical_branch: "main",
  nodes: [{
    name: "nimo",
    transport: "local",
    repo: "/tmp/void-proof-repo",
    service: "void-node-live.service",
    http_base: "http://127.0.0.1:4101",
  }],
};
const [sampleNode] = validateProcessFreshnessConfigV1(sampleConfig, "nimo");
const collectorScript = buildProcessFreshnessCollectorScriptV1(sampleNode);
assert.match(collectorScript, /systemctl --user show/);
assert.equal(Array.from(collectorScript.matchAll(/systemctl --user show/g)).length, 2,
  "collector must bracket process evidence with two service snapshots");
assert.match(collectorScript, /ExecMainStartTimestamp/);
assert.match(collectorScript, /\/proc\/\$main_pid\/cmdline/);
assert.match(collectorScript, /expected_process_argv/);
assert.match(collectorScript, /node_modules\/tsx\/dist\/preflight\.cjs/);
assert.match(collectorScript, /node_modules\/tsx\/dist\/loader\.mjs/);
assert.doesNotMatch(collectorScript, /grep -Fxq -e "\$entrypoint"/,
  "the expected entrypoint must not be accepted as an arbitrary argv token");
for (const forbidden of [
  /\bgit[^\n]*\bfetch\b/,
  /\bgit[^\n]*\bpull\b/,
  /\bgit[^\n]*\bmerge\b/,
  /\bgit[^\n]*\breset\b/,
  /\bgit[^\n]*\bcheckout\b/,
  /\bsystemctl[^\n]*\b(?:start|stop|restart|reload)\b/,
  /\b(?:npm|pnpm|yarn|sudo|kill)\b/,
  /\brm\s/,
]) assert.doesNotMatch(collectorScript, forbidden);

assert.throws(() => validateProcessFreshnessConfigV1({ ...sampleConfig, canonical_branch: "release" }), /exact main/);
const remoteHttp = structuredClone(sampleConfig);
remoteHttp.nodes[0].http_base = "https://void.example";
assert.throws(() => validateProcessFreshnessConfigV1(remoteHttp), /numeric loopback/);
const unsafeService = structuredClone(sampleConfig);
unsafeService.nodes[0].service = "--all";
assert.throws(() => validateProcessFreshnessConfigV1(unsafeService), /safe user-systemd unit/);

const root = mkdtempSync(join(tmpdir(), "void-process-freshness-v1-"));
let child = null;
let decoyChild = null;
const preservedEnvironment = new Map([
  "PATH",
  "VOID_PROOF_MAIN_PID",
  "VOID_PROOF_START_EPOCH",
  "VOID_PROOF_REPO",
  "VOID_PROOF_NODE_EXE",
  "VOID_PROOF_REAL_READLINK",
  "VOID_PROOF_REAL_TR",
  "VOID_PROOF_CMDLINE_MODE",
  "VOID_PROOF_DECOY_ENTRY",
].map((name) => [name, process.env[name]]));
const originalPath = process.env.PATH;
try {
  const repo = join(root, "repo");
  const bin = join(root, "bin");
  mkdirSync(repo);
  mkdirSync(join(repo, "src"));
  mkdirSync(bin);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "VOID Proof");
  git(repo, "config", "user.email", "proof@void.invalid");

  const port = await reservePort();
  writeFileSync(join(repo, ".gitignore"), "node_modules/\n");
  writeFileSync(join(repo, "package.json"), JSON.stringify({ private: true, type: "commonjs" }, null, 2) + "\n");
  writeFileSync(join(repo, "src", "index.ts"), `const http = require("node:http");
const { execFileSync } = require("node:child_process");
const port = Number(process.env.VOID_PROOF_PORT);
http.createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.url === "/health") return response.end(JSON.stringify({ ok: true }));
  if (request.url === "/__void/ready.json") return response.end(JSON.stringify({ ready: true, gap: 0 }));
  if (request.url === "/version") {
    const git_commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
    return response.end(JSON.stringify({ git_commit }));
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ ok: false }));
}).listen(port, "127.0.0.1");
`);
  git(repo, "add", "--", ".gitignore", "package.json", "src/index.ts");
  git(repo, "commit", "-m", "fixture source v1");
  const firstHead = git(repo, "rev-parse", "HEAD");
  const firstTransition = Number(run("stat", ["-c", "%Y", join(repo, ".git", "logs", "HEAD")]));

  const tsxDist = join(repo, "node_modules", "tsx", "dist");
  mkdirSync(join(repo, "node_modules"));
  mkdirSync(join(repo, "node_modules", "tsx"));
  mkdirSync(tsxDist);
  const preflightPath = join(tsxDist, "preflight.cjs");
  const loaderPath = join(tsxDist, "loader.mjs");
  writeFileSync(preflightPath, "module.exports = {};\n");
  writeFileSync(loaderPath, "export {};\n");

  await waitUntilEpochAtLeast(firstTransition + 2);
  const processStartEpoch = Math.floor(Date.now() / 1000);
  child = spawn(process.execPath, [
    "--require", preflightPath,
    "--import", pathToFileURL(loaderPath).href,
    join(repo, "src", "index.ts"),
  ], {
    cwd: repo,
    env: { ...process.env, VOID_PROOF_PORT: String(port) },
    stdio: "ignore",
  });
  await waitForHealth(port, child);

  const fakeSystemctl = join(bin, "systemctl");
  writeFileSync(fakeSystemctl, `#!/bin/sh
case "$*" in
  *--property=ActiveState*--property=MainPID*--property=ExecMainStartTimestamp*)
    printf 'ActiveState=active\\nMainPID=%s\\nExecMainStartTimestamp=@%s\\n' \
      "$VOID_PROOF_MAIN_PID" "$VOID_PROOF_START_EPOCH"
    ;;
  *--property=ActiveState*) printf '%s\\n' active ;;
  *--property=MainPID*) printf '%s\\n' "$VOID_PROOF_MAIN_PID" ;;
  *--property=ExecMainStartTimestamp*) printf '@%s\\n' "$VOID_PROOF_START_EPOCH" ;;
  *) exit 1 ;;
esac
`, { mode: 0o700 });
  chmodSync(fakeSystemctl, 0o700);
  const procVisible = run("bash", ["-c", `test -d /proc/${child.pid}`], { allowFailure: true }).status === 0;
  const collectorPid = procVisible ? child.pid : 1;
  if (!procVisible) {
    const realReadlink = run("sh", ["-c", "command -v readlink"]);
    const realTr = run("sh", ["-c", "command -v tr"]);
    const fakeReadlink = join(bin, "readlink");
    const fakeTr = join(bin, "tr");
    writeFileSync(fakeReadlink, `#!/bin/sh
last=""
for last do :; done
case "$last" in
  "/proc/$VOID_PROOF_MAIN_PID/cwd") printf '%s\\n' "$VOID_PROOF_REPO" ;;
  "/proc/$VOID_PROOF_MAIN_PID/exe") printf '%s\\n' "$VOID_PROOF_NODE_EXE" ;;
  *) exec "$VOID_PROOF_REAL_READLINK" "$@" ;;
esac
`, { mode: 0o700 });
    writeFileSync(fakeTr, `#!/bin/sh
if test "$#" -eq 2 && test "$1" = '\\0' && test "$2" = '\\n'; then
  if test "\${VOID_PROOF_CMDLINE_MODE:-exact}" = decoy; then
    printf '%s\\n' \
      "$VOID_PROOF_NODE_EXE" \
      "$VOID_PROOF_DECOY_ENTRY" \
      "$VOID_PROOF_REPO/src/index.ts"
  else
    printf '%s\\n' \
      "$VOID_PROOF_NODE_EXE" \
      --require \
      "$VOID_PROOF_REPO/node_modules/tsx/dist/preflight.cjs" \
      --import \
      "file://$VOID_PROOF_REPO/node_modules/tsx/dist/loader.mjs" \
      "$VOID_PROOF_REPO/src/index.ts"
  fi
else
  exec "$VOID_PROOF_REAL_TR" "$@"
fi
`, { mode: 0o700 });
    chmodSync(fakeReadlink, 0o700);
    chmodSync(fakeTr, 0o700);
    process.env.VOID_PROOF_REPO = repo;
    process.env.VOID_PROOF_NODE_EXE = process.execPath;
    process.env.VOID_PROOF_REAL_READLINK = realReadlink;
    process.env.VOID_PROOF_REAL_TR = realTr;
  }
  process.env.PATH = `${bin}:${originalPath}`;
  process.env.VOID_PROOF_MAIN_PID = String(collectorPid);
  process.env.VOID_PROOF_START_EPOCH = String(processStartEpoch);
  assert.equal(
    run(fakeSystemctl, ["--user", "show", "void-node-proof.service", "--property=MainPID", "--value"]),
    String(collectorPid),
  );
  assert.equal(
    run("bash", ["-c", "main_pid=\"$(systemctl --user show void-node-proof.service --property=MainPID --value)\"; printf '<%s>' \"$main_pid\""]),
    `<${collectorPid}>`,
  );

  const liveConfig = {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    canonical_branch: "main",
    nodes: [{
      name: "fixture",
      transport: "local",
      repo,
      service: "void-node-proof.service",
      http_base: `http://127.0.0.1:${port}`,
    }],
  };
  const [liveNode] = validateProcessFreshnessConfigV1(liveConfig, "fixture");
  const rawFreshCollector = run("bash", ["-s"], {
    input: buildProcessFreshnessCollectorScriptV1(liveNode),
    env: process.env,
  });
  assert.match(rawFreshCollector, /process_present\t1/, rawFreshCollector);
  assert.match(rawFreshCollector, /source_stable\t1/, rawFreshCollector);
  assert.match(rawFreshCollector, /process_identity_stable\t1/, rawFreshCollector);
  const freshResult = collectNodeProcessFreshnessV1(liveNode);
  assert.equal(freshResult.source_head, firstHead);
  assert.equal(freshResult.classification, "PROCESS_SOURCE_ALIGNED", JSON.stringify(freshResult));
  assert.equal(freshResult.source_stable, true);
  assert.equal(freshResult.process_identity_stable, true);
  assert.equal(freshResult.version_git_commit_matches_source_head_diagnostic_only, true);

  const configPath = join(root, "fleet-config.json");
  const outputPath = join(root, "freshness-result.json");
  const toolPath = join(process.cwd(), "tools", "void-node-fleet-process-freshness-audit-v1.mjs");
  writeFileSync(configPath, JSON.stringify(liveConfig, null, 2) + "\n");
  const freshCli = JSON.parse(run(process.execPath, [
    toolPath,
    "--config", configPath,
    "--output", outputPath,
  ]));
  assert.equal(freshCli.marker, VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1);
  assert.equal(freshCli.decision, "PROCESS_FRESH");
  assert.equal(freshCli.version_git_commit_is_process_identity, false);
  assert.deepEqual(Object.values(freshCli.authority), Object.values(freshCli.authority).map(() => false));
  assert.equal(statSync(outputPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), freshCli);
  chmodSync(outputPath, 0o644);
  run(process.execPath, [toolPath, "--config", configPath, "--output", outputPath]);
  assert.equal(statSync(outputPath).mode & 0o777, 0o600, "existing receipts must be tightened back to 0600");

  await waitUntilEpochAtLeast(processStartEpoch + 2);
  writeFileSync(join(repo, "source-version.txt"), "v2\n");
  git(repo, "add", "--", "source-version.txt");
  git(repo, "commit", "-m", "fixture source v2 without restart");
  const secondHead = git(repo, "rev-parse", "HEAD");
  assert.notEqual(secondHead, firstHead);

  const staleResult = collectNodeProcessFreshnessV1(liveNode);
  assert.equal(staleResult.source_head, secondHead);
  assert.equal(staleResult.classification, "STALE_SOURCE_AFTER_PROCESS_START");
  assert.equal(staleResult.version_git_commit_matches_source_head_diagnostic_only, true,
    "dynamic /version may match new source while the old process is still running");
  assert.equal(buildFleetProcessFreshnessDecisionV1([staleResult]).decision, "RESTART_REQUIRED");
  const staleCliRun = run(process.execPath, [toolPath, "--config", configPath], { allowFailure: true });
  assert.equal(staleCliRun.status, 3, staleCliRun.stderr);
  assert.equal(JSON.parse(staleCliRun.stdout).decision, "RESTART_REQUIRED");

  const secondTransition = Number(run("stat", ["-c", "%Y", join(repo, ".git", "logs", "HEAD")]));
  await waitUntilEpochAtLeast(secondTransition + 2);
  const decoyPort = await reservePort();
  const decoyPath = join(root, "old-entry.cjs");
  writeFileSync(decoyPath, `const http = require("node:http");
const { execFileSync } = require("node:child_process");
const port = Number(process.env.VOID_PROOF_PORT);
http.createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.url === "/health") return response.end(JSON.stringify({ ok: true }));
  if (request.url === "/__void/ready.json") return response.end(JSON.stringify({ ready: true, gap: 0 }));
  if (request.url === "/version") {
    const git_commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
    return response.end(JSON.stringify({ git_commit }));
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ ok: false }));
}).listen(port, "127.0.0.1");
`);
  const decoyStartEpoch = Math.floor(Date.now() / 1000);
  decoyChild = spawn(process.execPath, [decoyPath, join(repo, "src", "index.ts")], {
    cwd: repo,
    env: { ...process.env, VOID_PROOF_PORT: String(decoyPort) },
    stdio: "ignore",
  });
  await waitForHealth(decoyPort, decoyChild);
  process.env.VOID_PROOF_MAIN_PID = String(procVisible ? decoyChild.pid : 1);
  process.env.VOID_PROOF_START_EPOCH = String(decoyStartEpoch);
  process.env.VOID_PROOF_CMDLINE_MODE = "decoy";
  process.env.VOID_PROOF_DECOY_ENTRY = decoyPath;
  const [decoyNode] = validateProcessFreshnessConfigV1({
    ...liveConfig,
    nodes: [{ ...liveConfig.nodes[0], http_base: `http://127.0.0.1:${decoyPort}` }],
  }, "fixture");
  const decoyResult = collectNodeProcessFreshnessV1(decoyNode);
  assert.equal(decoyResult.classification, "HOLD", JSON.stringify(decoyResult));
  assert.deepEqual(decoyResult.reasons, ["process_entrypoint_mismatch"],
    "a different script must not gain authority by passing the expected entrypoint as an application argument");
} finally {
  for (const [name, value] of preservedEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(2_000),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  if (decoyChild && decoyChild.exitCode === null) {
    decoyChild.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => decoyChild.once("exit", resolve)),
      delay(2_000),
    ]);
    if (decoyChild.exitCode === null) decoyChild.kill("SIGKILL");
  }
  rmSync(root, { recursive: true, force: true });
}

console.log(`${VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1}_PROOF_GREEN`);
