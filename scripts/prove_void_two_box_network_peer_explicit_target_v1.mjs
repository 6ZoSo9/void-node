#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_NETWORK_PEER_EXPLICIT_TARGET_V1";
const path = "ops/two-box-network-peer-proof.sh";
const source = fs.readFileSync(path, "utf8");

assert.ok(source.startsWith("#!/usr/bin/env bash\n"));
assert.ok(source.includes(`MARKER="${MARKER}"`));
assert.equal(source.includes('${ALIEN:-zoso@100.122.79.39}'), false);
assert.equal(source.includes('${REMOTE_NODE_BASE:-http://${ALIEN##*@}:4100}'), false);
assert.ok(source.includes(': "${ALIEN:?set ALIEN to an explicit SSH target, for example user@host}"'));
assert.ok(source.includes(': "${REMOTE_NODE_BASE:?set REMOTE_NODE_BASE to the explicit remote node HTTP origin}"'));
assert.ok(source.includes("retired Alienware target is forbidden"));
assert.ok(source.includes("100.122.79.39"));
assert.ok(source.includes("zoso-alienware-aurora-r7.taila47fd.ts.net"));
assert.ok(source.includes("REMOTE_NODE_BASE must be a credential-free non-loopback HTTP(S) origin"));
assert.ok(source.includes("ip.is_loopback"));
assert.ok(source.includes("parsed.username is not None or parsed.password is not None"));
assert.ok(source.includes('parsed.path not in {"", "/"} or parsed.query or parsed.fragment'));

const workflow = fs.readFileSync(
  ".github/workflows/void-two-box-remote-jobs-explicit-target-v1.yml",
  "utf8",
);
const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert.ok(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of [
  "ops/two-box-network-peer-proof.sh",
  "scripts/prove_void_two_box_network_peer_explicit_target_v1.mjs",
]) {
  const token = `- "${dependency}"`;
  assert.equal(
    prBlock.split(token).length - 1,
    1,
    `pull_request trigger mismatch: ${dependency}`,
  );
  assert.equal(
    pushBlock.split(token).length - 1,
    1,
    `push trigger mismatch: ${dependency}`,
  );
}

for (const forbidden of [
  " -X POST",
  "/jobs/submit",
  "eth_sendRawTransaction",
  "systemctl --user restart",
  "systemctl --user start",
  "systemctl --user stop",
  "/wc/send",
]) {
  assert.equal(source.includes(forbidden), false, `unexpected mutation token: ${forbidden}`);
}

function run(envPatch) {
  const env = { ...process.env };
  delete env.ALIEN;
  delete env.REMOTE_NODE_BASE;
  Object.assign(env, envPatch);
  return spawnSync("bash", [path], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 2000,
  });
}

for (const envPatch of [
  {},
  { ALIEN: "reviewed-peer" },
]) {
  const result = run(envPatch);
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0);
}

for (const envPatch of [
  { ALIEN: "ZOSO@ZOSO-ALIENWARE-AURORA-R7.TAILA47FD.TS.NET", REMOTE_NODE_BASE: "https://example.invalid" },
  { ALIEN: "reviewed-peer", REMOTE_NODE_BASE: "http://100.122.79.39:4100" },
]) {
  const result = run(envPatch);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2);
  assert.match(String(result.stderr || ""), /retired Alienware/u);
}

for (const badAlien of [
  "-oProxyCommand=must-not-run",
  "peer host",
  "peer;echo-no",
]) {
  const result = run({ ALIEN: badAlien, REMOTE_NODE_BASE: "https://example.invalid" });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2);
  assert.match(String(result.stderr || ""), /ALIEN must be an explicit SSH alias or user@host/u);
}

for (const badBase of [
  "https://user:pass@example.invalid:4100",
  "https://example.invalid:4100/path",
  "https://example.invalid:4100?query=1",
  "http://127.0.0.1:4100",
  "http://localhost:4100",
]) {
  const result = run({ ALIEN: "reviewed-peer", REMOTE_NODE_BASE: badBase });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2);
  assert.match(String(result.stderr || ""), /credential-free non-loopback HTTP\(S\) origin/u);
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("implicit_retired_ssh_target=false");
console.log("implicit_remote_http_origin=false");
console.log("explicit_ssh_target_required=true");
console.log("explicit_remote_http_origin_required=true");
console.log("retired_target_casefold_rejected=true");
console.log("ssh_option_or_shell_fragment_rejected=true");
console.log("remote_origin_credentials_path_query_loopback_rejected=true");
console.log("network_peer_trigger_symmetry=true");
console.log("live_ssh_executed=false");
console.log("live_http_executed=false");
console.log("mutation_attempted=false");
console.log("funds_movement=false");
