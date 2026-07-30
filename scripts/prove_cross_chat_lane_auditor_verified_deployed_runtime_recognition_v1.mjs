#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  assessVerifiedDeployedRuntimeV1,
  parsePorcelainV1ZPathsV1,
} from "../tools/void_cross_chat_lane_audit_v1.mjs";

const MARKER =
  "VOID_CROSS_CHAT_LANE_AUDITOR_VERIFIED_DEPLOYED_RUNTIME_RECOGNITION_V1_EXACT_GREEN";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(scriptsDir, "..");
const tool = path.join(repo, "tools", "void_cross_chat_lane_audit_v1.mjs");
const laneBranch =
  process.env.VOID_LANE_BRANCH
  || "fix/cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1";
assert.notEqual(
  laneBranch.trim(),
  "",
  "VOID_LANE_BRANCH must not be empty",
);
assert.equal(
  /[\0\r\n]/u.test(laneBranch),
  false,
  "VOID_LANE_BRANCH must be a single Git branch name",
);
const reservedPaths = [
  ".github/workflows/cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1.yml",
  "docs/ops/cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1.md",
  "examples/cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1.example.json",
  "schemas/cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1.schema.json",
  "scripts/prove_cross_chat_lane_auditor_verified_deployed_runtime_recognition_v1.mjs",
  "tools/void_cross_chat_lane_audit_v1.mjs",
];
const allowRuntimeScripts = [
  "ops/wc-relayer-v1.cjs",
  "ops/void-workcredits-devnet-http.cjs",
  "scripts/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts",
];

function parseFirstJson(output) {
  const start = output.indexOf("{");
  assert.notEqual(start, -1, "auditor output omitted JSON");
  return JSON.parse(output.slice(start, output.lastIndexOf("}") + 1));
}

function auditArgs(extra = []) {
  const args = [
    tool,
    "--shared-repo",
    repo,
    "--lane-repo",
    repo,
    "--lane-branch",
    laneBranch,
  ];
  for (const value of reservedPaths) args.push("--reserve", value);
  for (const value of allowRuntimeScripts) {
    args.push("--allow-runtime-script", value);
  }
  args.push("--ignore-pid", String(process.pid), ...extra);
  return args;
}

function runAudit(extra = []) {
  const result = spawnSync(process.execPath, auditArgs(extra), {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120000,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    status: result.status,
    output,
    report: parseFirstJson(output),
  };
}

function runFixture(fixture) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-auditor-runtime-v1-"),
  );
  const fixturePath = path.join(directory, "fixture.json");
  try {
    fs.writeFileSync(
      fixturePath,
      `${JSON.stringify(fixture, null, 2)}\n`,
      "utf8",
    );
    return runAudit(["--fixture", fixturePath]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

assert.deepEqual(
  parsePorcelainV1ZPathsV1(
    " M tools/void_cross_chat_lane_audit_v1.mjs\0"
    + "?? docs/path with spaces.md\0",
  ),
  [
    "docs/path with spaces.md",
    "tools/void_cross_chat_lane_audit_v1.mjs",
  ],
);
assert.deepEqual(
  parsePorcelainV1ZPathsV1(
    "R  renamed/path.mjs\0original/path.mjs\0",
  ),
  [
    "original/path.mjs",
    "renamed/path.mjs",
  ],
);
assert.throws(
  () => parsePorcelainV1ZPathsV1("M malformed\0"),
  /unexpected porcelain/u,
);

const mcpHead = "2d96249b39109d4ff85060a0486d562ba0f5234f";
const mcpCwd =
  `/home/test/.local/share/void-agent-mcp-readonly-http-v1/releases/${mcpHead.slice(0, 12)}-20260729T235750Z`;
const mcpScript =
  `${mcpCwd}/integrations/mcp/dist/src/http.js`;
const mcpBase = {
  argv: [
    "/usr/bin/node",
    "/home/test/.local/share/void-agent-mcp-readonly-http-v1/current/integrations/mcp/dist/src/http.js",
  ],
  cwd: mcpCwd,
  observedServiceUnit:
    "void-agent-mcp-readonly-http-v1.service",
  fdCount: 0,
  ageSeconds: 600,
  children: [],
  state: "S (sleeping)",
  resolvedScript: mcpScript,
  currentScriptRealpath: mcpScript,
  deployment: {
    path: mcpCwd,
    head: mcpHead,
    clean: true,
    headInOriginMain: true,
  },
  profileFilesOk: true,
};

const mcp = assessVerifiedDeployedRuntimeV1(mcpBase);
assert.equal(mcp.safe, true);
assert.equal(
  mcp.profile,
  "void_agent_mcp_readonly_http_service_v1",
);

const torHead = "51185f800225bc263caf6a2c24d4e93fe2048f97";
const torCwd =
  `/home/test/dev/void-onion-discovery-live-v1-${torHead.slice(0, 8)}`;
const torScript =
  `${torCwd}/tools/void-tor-onion-public-node-v1.mjs`;
const torBase = {
  argv: [
    "/usr/bin/node",
    torScript,
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
  ],
  cwd: torCwd,
  observedServiceUnit:
    "void-public-node-tor-backend-v1.service",
  fdCount: 0,
  ageSeconds: 600,
  children: [],
  state: "S (sleeping)",
  resolvedScript: torScript,
  currentScriptRealpath: "",
  deployment: {
    path: torCwd,
    head: torHead,
    clean: true,
    headInOriginMain: true,
  },
  profileFilesOk: true,
};

const tor = assessVerifiedDeployedRuntimeV1(torBase);
assert.equal(tor.safe, true);
assert.equal(
  tor.profile,
  "void_public_node_tor_backend_v1",
);

const negativeCases = [
  ["wrong unit", mcpBase, { observedServiceUnit: "untrusted.service" }],
  ["wrong script", mcpBase, { resolvedScript: `${mcpCwd}/wrong.js` }],
  ["dirty deployment", mcpBase, {
    deployment: { ...mcpBase.deployment, clean: false },
  }],
  ["unmerged deployment", mcpBase, {
    deployment: { ...mcpBase.deployment, headInOriginMain: false },
  }],
  ["child process", mcpBase, { children: [999] }],
  ["Git metadata descriptor", mcpBase, { fdCount: 1 }],
  ["young process", mcpBase, { ageSeconds: 1 }],
  ["zombie process", mcpBase, { state: "Z (zombie)" }],
  ["wrong MCP release name", mcpBase, {
    cwd: "/home/test/.local/share/void-agent-mcp-readonly-http-v1/releases/wrong",
    deployment: {
      ...mcpBase.deployment,
      path: "/home/test/.local/share/void-agent-mcp-readonly-http-v1/releases/wrong",
    },
  }],
  ["extra Tor argument", torBase, { argv: [...torBase.argv, "--unexpected"] }],
  ["wrong Tor deployment name", torBase, {
    cwd: "/home/test/dev/void-onion-discovery-live-v1-wrong",
    deployment: {
      ...torBase.deployment,
      path: "/home/test/dev/void-onion-discovery-live-v1-wrong",
    },
  }],
  ["missing Tor profile file", torBase, { profileFilesOk: false }],
];

for (const [name, base, patch] of negativeCases) {
  const assessment = assessVerifiedDeployedRuntimeV1({
    ...base,
    ...patch,
  });
  assert.equal(assessment.safe, false, `${name} must remain a conflict`);
}

const fixtureHead = "a".repeat(40);
const selfOverlapFixture = {
  laneLocalMain: fixtureHead,
  laneRemoteMain: fixtureHead,
  lane: {
    path: repo,
    branch: laneBranch,
    head: fixtureHead,
    dirtyPaths: [...reservedPaths],
  },
  sharedWorktrees: [
    {
      path: repo,
      branch: laneBranch,
      head: fixtureHead,
      dirtyPaths: [...reservedPaths],
      changedPaths: [...reservedPaths],
      changedPathInspectionError: "",
    },
  ],
  openPrs: [],
  processScans: [
    {
      scan: 1,
      conflicts: [],
      safeServices: [],
      safeRuntimes: [],
    },
  ],
};

const selfOverlap = runFixture(selfOverlapFixture);
assert.equal(selfOverlap.status, 0, selfOverlap.output);
assert.equal(selfOverlap.report.collisionSafe, true);
assert.deepEqual(selfOverlap.report.worktreeOverlaps, []);
assert.equal(
  selfOverlap.report.checks.laneDirtyReservedOnly,
  true,
);

const externalOverlap = runFixture({
  ...selfOverlapFixture,
  sharedWorktrees: [
    ...selfOverlapFixture.sharedWorktrees,
    {
      path: "/tmp/void-external-overlap-worktree-v1",
      branch: "parallel/external-overlap-v1",
      head: fixtureHead,
      dirtyPaths: [reservedPaths[0]],
      changedPaths: [],
      changedPathInspectionError: "",
    },
  ],
});
assert.equal(externalOverlap.status, 1, externalOverlap.output);
assert.equal(externalOverlap.report.collisionSafe, false);
assert.deepEqual(
  externalOverlap.report.worktreeOverlaps,
  [
    {
      path: "/tmp/void-external-overlap-worktree-v1",
      branch: "parallel/external-overlap-v1",
      head: fixtureHead,
      overlap: [reservedPaths[0]],
    },
  ],
);

const green = runAudit();
assert.equal(green.status, 0, green.output);
assert.equal(green.report.collisionSafe, true);
assert.equal(green.report.checks.processBoundaryStable, true);
assert.deepEqual(green.report.unstableScans, []);

function requiresLiveVerifiedRuntimeProfiles(env = process.env) {
  if (
    env.VOID_REQUIRE_LIVE_VERIFIED_RUNTIME_PROFILES === "1"
  ) {
    return true;
  }
  if (
    env.VOID_REQUIRE_LIVE_VERIFIED_RUNTIME_PROFILES === "0"
  ) {
    return false;
  }
  return env.GITHUB_ACTIONS !== "true";
}

assert.equal(
  requiresLiveVerifiedRuntimeProfiles({}),
  true,
);
assert.equal(
  requiresLiveVerifiedRuntimeProfiles({
    GITHUB_ACTIONS: "true",
    VOID_REQUIRE_LIVE_VERIFIED_RUNTIME_PROFILES: "0",
  }),
  false,
);
assert.equal(
  requiresLiveVerifiedRuntimeProfiles({
    GITHUB_ACTIONS: "true",
    VOID_REQUIRE_LIVE_VERIFIED_RUNTIME_PROFILES: "1",
  }),
  true,
);

const profiles = new Set(
  green.report.processScans.flatMap((scan) => {
    return (scan.safeRuntimes ?? [])
      .map((entry) => entry.profile)
      .filter(Boolean);
  }),
);
if (requiresLiveVerifiedRuntimeProfiles()) {
  assert.equal(
    profiles.has("void_agent_mcp_readonly_http_service_v1"),
    true,
  );
  assert.equal(
    profiles.has("void_public_node_tor_backend_v1"),
    true,
  );
}

const child = spawn(
  process.execPath,
  ["-e", "setInterval(() => {}, 1000)"],
  { cwd: repo, stdio: "ignore" },
);
assert.ok(child.pid, "synthetic conflict process did not start");

try {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const hold = runAudit();
  assert.equal(hold.status, 1, hold.output);
  assert.equal(hold.report.collisionSafe, false);
  assert.equal(
    hold.report.processScans.some((scan) => {
      return (scan.conflicts ?? []).some(
        (entry) => entry.pid === child.pid,
      );
    }),
    true,
    "synthetic arbitrary Node process was not rejected",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 5000);
  });
}

const restored = runAudit();
assert.equal(restored.status, 0, restored.output);
assert.equal(restored.report.collisionSafe, true);

const example = JSON.parse(
  fs.readFileSync(
    path.join(
      repo,
      "examples",
      "cross-chat-lane-auditor-verified-deployed-runtime-recognition-v1.example.json",
    ),
    "utf8",
  ),
);
assert.equal(
  example.marker,
  "VOID_CROSS_CHAT_LANE_AUDITOR_VERIFIED_DEPLOYED_RUNTIME_RECOGNITION_V1",
);
assert.equal(example.arbitrary_processes_remain_conflicts, true);
assert.equal(example.service_or_process_mutation, false);

console.log(MARKER);
