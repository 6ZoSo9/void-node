#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUERY = "ops/public/void_cloudflare_historical_user_tunnel_retirement_query_v1.c";
const PREEXEC = "ops/public/void_cloudflare_historical_user_tunnel_retirement_preexec_v1.c";
const GENERIC = "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const PEER = "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const DOC = "docs/architecture/cloudflare-historical-user-tunnel-retirement-query-v1.md";
const WORKFLOW = ".github/workflows/cloudflare-historical-user-tunnel-retirement-query-v1.yml";

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}
function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "ascii"))
    .update(bytes)
    .digest("hex");
}

assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT, GENERIC))),
  "fc1f640689b7da7278ff013669ef8a10cd8f6659",
  "generic private-unit query generation drift",
);
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT, PEER))),
  "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  "private-manager peer guard generation drift",
);

const query = read(QUERY);
const preexec = read(PREEXEC);
const workflow = read(WORKFLOW);

for (const token of [
  '#include "../precision/void_buy_void_user_manager_private_peer_guard_v1.c"',
  'HISTORICAL_UNIT "void-public-seed-named-tunnel-v1.service"',
  'LIBSYSTEMD_SONAME "/usr/lib/x86_64-linux-gnu/libsystemd.so.0"',
  '"GetUnitFileState"',
  '"GetUnit"',
  '"inactive"',
  '"dead"',
  '"disabled"',
  '"masked"',
  "peercred(retained_fd",
  "pidfd_alive(manager_pidfd)",
  "same_private_fd_used_for_query=true",
  "double_authenticated_query_stable=true",
  "authenticated_retirement_snapshot=true",
  "future_restart_prevented=false",
  "historical_user_tunnel_retirement_verified=false",
  "service_mutation=false",
  "systemd_mutation=false",
  "tunnel_mutation=false",
]) {
  assert.ok(query.includes(token), token);
}
assert.equal(
  query.includes(
    '#include "../precision/void_buy_void_user_manager_private_unit_query_v1.c"',
  ),
  false,
  "generic query main must not be compiled into retirement query",
);
assert.equal(query.includes("--unit"), false, "arbitrary unit query authority");
assert.ok(query.includes("historical_unit_observation_changed"));
assert.ok(query.includes("manager_generation_changed"));
assert.ok(
  query.indexOf("manager_get_unit_file_state") <
    query.indexOf("authenticated_retirement_snapshot=true"),
);

for (const token of [
  'ROOT_DIR "/opt/void-cloudflare-user-tunnel-retirement-query-v1"',
  "fixed_preexec_path_required",
  "O_NOFOLLOW",
  "fexecve(fd, child_argv, child_env)",
  "PATH=/usr/bin:/bin",
  "LANG=C",
  "LC_ALL=C",
  "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1",
]) {
  assert.ok(preexec.includes(token), token);
}

for (const forbidden of [
  "systemctl",
  "service start",
  "service stop",
  " enable(",
  " disable(",
  " mask(",
  " unmask(",
  "eth_sendRawTransaction",
  "privateKey",
]) {
  assert.equal(query.includes(forbidden), false, "query:" + forbidden);
}

const triggerPaths = [
  QUERY,
  PREEXEC,
  GENERIC,
  PEER,
  "scripts/prove_void_cloudflare_historical_user_tunnel_retirement_query_v1.mjs",
  DOC,
  WORKFLOW,
];
assert.ok(workflow.includes("pull_request:"));
assert.ok(workflow.includes("push:"));
assert.ok(workflow.includes("branches: [main]"));
for (const relative of triggerPaths) {
  const needle = '- "' + relative + '"';
  assert.equal(
    workflow.split(needle).length - 1,
    2,
    "workflow PR/main trigger parity: " + relative,
  );
}

console.log("VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_V1_PROOF_GREEN");
console.log("private_manager_peer_source_bound=true");
console.log("generic_active_service_query_semantic_dependency_bound=true");
console.log("historical_unit_fixed=true");
console.log("static_preexec_required=true");
console.log("authenticated_retirement_snapshot_only=true");
console.log("future_restart_prevented=false");
console.log("historical_user_tunnel_retirement_verified=false");
console.log("service_mutation=false");
console.log("systemd_mutation=false");
console.log("funds_movement=false");
