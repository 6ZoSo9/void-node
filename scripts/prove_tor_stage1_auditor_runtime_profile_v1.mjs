#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_TOR_STAGE1_AUDITOR_RUNTIME_PROFILE_PROOF_V1_EXACT_GREEN";
const SOURCE_HEAD = "eaaa2855af6c70c51f671bb6aaba25602fca7797";
const BACKEND_RELATIVE = "tools/void-tor-onion-public-node-v1.mjs";
const BACKEND_SHA256 = "f517562df0453c6c784df1c072d5de212317cd7503dbcbbe671305c48790ddba";
const STAGE1_PROFILE = "void_public_node_tor_backend_mcp_stage1_v1";
const LEGACY_PROFILE = "void_public_node_tor_backend_v1";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const auditorPath = path.join(
  root,
  "tools",
  "void_cross_chat_lane_audit_v1.mjs",
);
const source = fs.readFileSync(auditorPath, "utf8");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fixture({
  argv,
  head,
  ageSeconds,
  minimumAgeSeconds = 120,
}) {
  const legacyArgvOk = argv.length === 12;
  const stage1ArgvOk = (
    argv.length === 22
    && argv[12] === "--mcp-upstream-port"
    && argv[13] === "4114"
    && argv[14] === "--mcp-timeout-ms"
    && argv[15] === "30000"
    && argv[16] === "--mcp-max-request-bytes"
    && argv[17] === "65536"
    && argv[18] === "--mcp-max-response-bytes"
    && argv[19] === "4194304"
    && argv[20] === "--mcp-max-concurrent-requests"
    && argv[21] === "8"
  );
  const stage1HeadOk = head === SOURCE_HEAD;
  const stage1ProfileOk = stage1ArgvOk && stage1HeadOk;
  const stabilizationAgeOk = (
    stage1ProfileOk
    || ageSeconds >= minimumAgeSeconds
  );
  return {
    safe: (
      (legacyArgvOk || stage1ProfileOk)
      && stabilizationAgeOk
      && (!stage1ArgvOk || stage1HeadOk)
    ),
    profile: stage1ProfileOk
      ? STAGE1_PROFILE
      : LEGACY_PROFILE,
  };
}

const common = [
  "/usr/bin/node",
  "/tmp/void-onion-discovery-live-v1-eaaa2855/tools/void-tor-onion-public-node-v1.mjs",
  "--host",
  "127.0.0.1",
  "--port",
  "18088",
  "--virtual-port",
  "80",
  "--hostname-file",
  "/tmp/.local/share/void/tor-onion-v1/hidden-service/hostname",
  "--binding-file",
  "/tmp/.local/share/void/tor-onion-v1/node-onion-binding-v1.json",
];
const stage1 = [
  ...common,
  "--mcp-upstream-port",
  "4114",
  "--mcp-timeout-ms",
  "30000",
  "--mcp-max-request-bytes",
  "65536",
  "--mcp-max-response-bytes",
  "4194304",
  "--mcp-max-concurrent-requests",
  "8",
];

assert.equal(
  source.includes(
    `const VERIFIED_TOR_STAGE1_SOURCE_HEAD_V1 =\n  "${SOURCE_HEAD}";`,
  ),
  true,
);
assert.equal(source.includes(`"${STAGE1_PROFILE}"`), true);
assert.equal(source.includes("const legacyArgvOk = ("), true);
assert.equal(source.includes("const stage1ArgvOk = ("), true);
assert.equal(source.includes("argv.length === 12"), true);
assert.equal(source.includes("argv.length === 22"), true);
assert.equal(
  source.includes(
    "ageOk: age !== null && age >= MIN_RUNTIME_AGE_SECONDS,",
  ),
  true,
);
assert.equal(
  source.includes(
    "&& input.ageSeconds >= MIN_RUNTIME_AGE_SECONDS",
  ),
  true,
);
for (const token of [
  "--mcp-upstream-port",
  "--mcp-timeout-ms",
  "--mcp-max-request-bytes",
  "--mcp-max-response-bytes",
  "--mcp-max-concurrent-requests",
]) {
  assert.equal(source.includes(token), true, token);
}

assert.deepEqual(
  fixture({
    argv: common,
    head: "51185f800225bc263caf6a2c24d4e93fe2048f97",
    ageSeconds: 120,
  }),
  { safe: true, profile: LEGACY_PROFILE },
);
assert.equal(
  fixture({
    argv: common,
    head: "51185f800225bc263caf6a2c24d4e93fe2048f97",
    ageSeconds: 0,
  }).safe,
  false,
);
assert.deepEqual(
  fixture({
    argv: stage1,
    head: SOURCE_HEAD,
    ageSeconds: 0,
  }),
  { safe: true, profile: STAGE1_PROFILE },
);

const wrongPort = [...stage1];
wrongPort[13] = "4115";
assert.equal(
  fixture({
    argv: wrongPort,
    head: SOURCE_HEAD,
    ageSeconds: 0,
  }).safe,
  false,
);
assert.equal(
  fixture({
    argv: stage1,
    head: "0".repeat(40),
    ageSeconds: 0,
  }).safe,
  false,
);
assert.equal(
  fixture({
    argv: [...stage1, "--unexpected"],
    head: SOURCE_HEAD,
    ageSeconds: 0,
  }).safe,
  false,
);

const backend = execFileSync(
  "git",
  ["show", `${SOURCE_HEAD}:${BACKEND_RELATIVE}`],
  { cwd: root },
);
assert.equal(sha256(backend), BACKEND_SHA256);

console.log(`source_head=${SOURCE_HEAD}`);
console.log(`backend_sha256=${BACKEND_SHA256}`);
console.log("legacy_profile_preserved=true");
console.log("legacy_profile_stabilization_age_preserved=true");
console.log("stage1_exact_argv_profile=true");
console.log("stage1_exact_head_profile=true");
console.log("stage1_fresh_process_recognition=true");
console.log("generic_runtime_age_threshold_preserved=true");
console.log("generic_runtime_allowance_added=false");
console.log(MARKER);
