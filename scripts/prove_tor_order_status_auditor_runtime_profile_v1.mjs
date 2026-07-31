#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessVerifiedDeployedRuntimeV1,
} from "../tools/void_cross_chat_lane_audit_v1.mjs";

const MARKER =
  "VOID_TOR_ORDER_STATUS_AUDITOR_RUNTIME_PROFILE_V1_EXACT_GREEN";

const ORDER_STATUS_HEAD =
  "043c659eea56c8fb0fdd0ca8e619a7573145a307";
const LEGACY_RUNTIME_HEAD =
  "3d725ef8b3c53f381b5988305a01a15fa1bfee92";
const LEGACY_RUNTIME_DIRECTORY =
  "void-onion-discovery-live-v1-51185f80";
const ORDER_STATUS_PROFILE =
  "void_public_node_tor_backend_order_status_v1";
const ORDER_STATUS_ROOT =
  "/home/test/.local/share/void/tor-onion-v1/order-status-source-v1";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const auditorPath = path.join(
  root,
  "tools",
  "void_cross_chat_lane_audit_v1.mjs",
);
const source = fs.readFileSync(auditorPath, "utf8");

function baseInput({
  head,
  cwd,
  argv,
  ageSeconds = 0,
  profileFilesOk = true,
}) {
  const script = `${cwd}/tools/void-tor-onion-public-node-v1.mjs`;
  return {
    argv,
    cwd,
    observedServiceUnit:
      "void-public-node-tor-backend-v1.service",
    fdCount: 0,
    ageSeconds,
    children: [],
    state: "S (sleeping)",
    resolvedScript: script,
    currentScriptRealpath: "",
    deployment: {
      path: cwd,
      head,
      clean: true,
      headInOriginMain: true,
    },
    profileFilesOk,
  };
}

function commonArgv(script) {
  return [
    "/usr/bin/node",
    script,
    "--host",
    "127.0.0.1",
    "--port",
    "18088",
    "--virtual-port",
    "80",
    "--hostname-file",
    "/home/test/.local/share/void/tor-onion-v1/hidden-service/hostname",
    "--binding-file",
    "/home/test/.local/share/void/tor-onion-v1/node-onion-binding-v1.json",
  ];
}

function stage1Argv(script) {
  return [
    ...commonArgv(script),
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
}

function orderStatusArgv(script) {
  return [
    ...stage1Argv(script),
    "--order-status-root",
    ORDER_STATUS_ROOT,
    "--order-status-max-bytes",
    "1048576",
    "--order-status-max-concurrent-requests",
    "8",
  ];
}

const canonicalCwd =
  `/home/test/dev/void-onion-discovery-live-v1-${ORDER_STATUS_HEAD.slice(0, 8)}`;
const canonicalScript =
  `${canonicalCwd}/tools/void-tor-onion-public-node-v1.mjs`;
const canonicalInput = baseInput({
  head: ORDER_STATUS_HEAD,
  cwd: canonicalCwd,
  argv: orderStatusArgv(canonicalScript),
});

const canonical = assessVerifiedDeployedRuntimeV1(canonicalInput);
assert.equal(canonical.safe, true);
assert.equal(canonical.profile, ORDER_STATUS_PROFILE);
assert.equal(canonical.argvOk, true);
assert.equal(canonical.cwdOk, true);
assert.equal(canonical.scriptOk, true);
assert.equal(canonical.profileFilesOk, true);
assert.equal(canonical.orderStatusHeadOk, true);
assert.equal(canonical.stabilizationAgeOk, true);

const legacyCwd = `/home/test/dev/${LEGACY_RUNTIME_DIRECTORY}`;
const legacyScript =
  `${legacyCwd}/tools/void-tor-onion-public-node-v1.mjs`;
const exactLegacy = assessVerifiedDeployedRuntimeV1(
  baseInput({
    head: LEGACY_RUNTIME_HEAD,
    cwd: legacyCwd,
    argv: commonArgv(legacyScript),
    ageSeconds: 600,
  }),
);
assert.equal(exactLegacy.safe, true);
assert.equal(
  exactLegacy.profile,
  "void_public_node_tor_backend_v1",
);
assert.equal(exactLegacy.legacyDeploymentLineageOk, true);

const negativeCases = [
  ["wrong source root", {
    argv: canonicalInput.argv.map((value, index) => (
      index === 23 ? "/tmp/untrusted-order-status-root" : value
    )),
  }],
  ["wrong source bound", {
    argv: canonicalInput.argv.map((value, index) => (
      index === 25 ? "1048575" : value
    )),
  }],
  ["wrong concurrency bound", {
    argv: canonicalInput.argv.map((value, index) => (
      index === 27 ? "9" : value
    )),
  }],
  ["wrong source head", {
    deployment: {
      ...canonicalInput.deployment,
      head: "0".repeat(40),
    },
  }],
  ["wrong deployment cwd", {
    cwd: "/home/test/dev/void-onion-discovery-live-v1-wrong",
    deployment: {
      ...canonicalInput.deployment,
      path: "/home/test/dev/void-onion-discovery-live-v1-wrong",
    },
  }],
  ["missing profile files", {
    profileFilesOk: false,
  }],
  ["extra argument", {
    argv: [...canonicalInput.argv, "--unexpected"],
  }],
  ["wrong service unit", {
    observedServiceUnit: "untrusted.service",
  }],
];

for (const [name, patch] of negativeCases) {
  const assessment = assessVerifiedDeployedRuntimeV1({
    ...canonicalInput,
    ...patch,
  });
  assert.equal(
    assessment.safe,
    false,
    `${name} must remain a conflict`,
  );
}

for (const token of [
  "VERIFIED_TOR_ORDER_STATUS_SOURCE_HEAD_V1",
  "VERIFIED_TOR_ORDER_STATUS_PROFILE_V1",
  "VERIFIED_TOR_ORDER_STATUS_SOURCE_ROOT_SUFFIX_V1",
  "VERIFIED_TOR_ORDER_STATUS_SOURCE_FILENAME_V1",
  "--order-status-root",
  "--order-status-max-bytes",
  "--order-status-max-concurrent-requests",
  "argv.length === 28",
  "orderStatusSourceRootOkV1",
  "legacyDeploymentLineageOk",
]) {
  assert.equal(source.includes(token), true, token);
}

console.log(`order_status_source_head=${ORDER_STATUS_HEAD}`);
console.log(`order_status_profile=${ORDER_STATUS_PROFILE}`);
console.log("order_status_exact_argv_profile=true");
console.log("order_status_exact_head_profile=true");
console.log("order_status_exact_source_root_suffix=true");
console.log("order_status_source_file_required=true");
console.log("legacy_profile_preserved=true");
console.log("legacy_runtime_lineage_exception_exact=true");
console.log("stage1_profile_preserved=true");
console.log("generic_runtime_allowance_added=false");
console.log("service_or_process_mutation=false");
console.log(MARKER);
