#!/usr/bin/env -S node --experimental-strip-types
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tool = path.join(repoRoot, "tools", "void_cross_chat_lane_audit_v1.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-cross-chat-lane-audit-v1-"));
const laneRepo = repoRoot;
const laneBranch = "parallel/cross-chat-lane-audit-standalone-v1";
const reserved = [
  "docs/operators/void-cross-chat-lane-audit-v1.md",
  "scripts/prove_void_cross_chat_lane_audit_v1.ts",
  "tools/void_cross_chat_lane_audit_v1.mjs",
];
const base = "a".repeat(40);

function fixture() {
  return {
    laneLocalMain: base,
    laneRemoteMain: base,
    lane: {
      path: laneRepo,
      branch: laneBranch,
      head: base,
      dirtyPaths: [...reserved],
    },
    sharedWorktrees: [
      {
        path: "/fixture/dev/void-node",
        branch: "main",
        head: base,
        dirtyPaths: [],
        changedPaths: [],
        changedPathInspectionError: "",
      },
      {
        path: "/fixture/dev/void-node-validator-route",
        branch: "parallel/validator-positive-readiness-public-route-v1",
        head: "b".repeat(40),
        dirtyPaths: [],
        changedPaths: ["src/index.ts", "src/local-multibox-runtime-route-v1.ts"],
        changedPathInspectionError: "",
      },
    ],
    openPrs: [
      {
        number: 646,
        headRefName: "parallel/validator-positive-readiness-public-route-v1",
        headRefOid: "b".repeat(40),
        title: "validator route",
        url: "https://example.invalid/pr/646",
        paths: ["src/index.ts", "src/local-multibox-runtime-route-v1.ts"],
      },
    ],
    processScans: [1, 2, 3].map((scan) => ({
      scan,
      conflicts: [],
      safeServices: [{ pid: 100 + scan, serviceUnit: "void-node-live.service" }],
      safeRuntimes: [{ pid: 200, argv: ["/usr/bin/node", "/fixture/ops/wc-relayer-v1.cjs"] }],
    })),
  };
}

function runCase(name, value) {
  const fixturePath = path.join(tempRoot, `${name}.json`);
  fs.writeFileSync(fixturePath, `${JSON.stringify(value, null, 2)}\n`);
  const args = [
    tool,
    "--shared-repo", repoRoot,
    "--lane-repo", repoRoot,
    "--lane-branch", laneBranch,
    "--fixture", fixturePath,
  ];
  for (const item of reserved) args.push("--reserve", item);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const jsonText = (result.stdout ?? "").replace(
    /\nVOID_CROSS_CHAT_LANE_AUDIT_V1_(?:EXACT_GREEN|HOLD)\s*$/s,
    "",
  );
  return {
    status: result.status,
    combined: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    report: JSON.parse(jsonText),
  };
}

try {
  const green = runCase("green", fixture());
  assert.equal(green.status, 0);
  assert.equal(green.report.collisionSafe, true);
  assert.match(green.combined, /VOID_CROSS_CHAT_LANE_AUDIT_V1_EXACT_GREEN/);

  const worktreeCollision = fixture();
  worktreeCollision.sharedWorktrees.push({
    path: "/fixture/dev/void-node-other",
    branch: "parallel/other-v1",
    head: "c".repeat(40),
    dirtyPaths: [],
    changedPaths: [reserved[2]],
    changedPathInspectionError: "",
  });
  const worktreeHold = runCase("worktree-collision", worktreeCollision);
  assert.equal(worktreeHold.status, 1);
  assert.equal(worktreeHold.report.checks.sharedWorktreeReservedPathsClear, false);

  const prCollision = fixture();
  prCollision.openPrs.push({
    number: 999,
    headRefName: "parallel/conflict-v1",
    headRefOid: "d".repeat(40),
    title: "conflict",
    url: "https://example.invalid/pr/999",
    paths: [reserved[0]],
  });
  const prHold = runCase("pr-collision", prCollision);
  assert.equal(prHold.status, 1);
  assert.equal(prHold.report.checks.openPrReservedPathsClear, false);

  const stale = fixture();
  stale.laneRemoteMain = "e".repeat(40);
  const staleHold = runCase("stale-main", stale);
  assert.equal(staleHold.status, 1);
  assert.equal(staleHold.report.checks.laneRemoteMainExact, false);

  const processConflict = fixture();
  processConflict.processScans[1].conflicts = [{
    pid: 4242,
    comm: "git",
    cwd: "/fixture/dev/void-node",
    argv: ["git", "status"],
    gitMetadataFdCount: 1,
  }];
  const processHold = runCase("process-conflict", processConflict);
  assert.equal(processHold.status, 1);
  assert.equal(processHold.report.checks.processBoundaryStable, false);

  const dirtyOutside = fixture();
  dirtyOutside.lane.dirtyPaths.push("src/index.ts");
  const dirtyHold = runCase("dirty-outside", dirtyOutside);
  assert.equal(dirtyHold.status, 1);
  assert.equal(dirtyHold.report.checks.laneDirtyReservedOnly, false);

  const wrongBranch = fixture();
  wrongBranch.lane.branch = "parallel/wrong-v1";
  const branchHold = runCase("wrong-branch", wrongBranch);
  assert.equal(branchHold.status, 1);
  assert.equal(branchHold.report.checks.laneBranchExact, false);

  console.log("fixture_cases=7");
  console.log("green_cases=1");
  console.log("hold_cases=6");
  console.log("VOID_CROSS_CHAT_LANE_AUDIT_V1_PROOF_EXACT_GREEN");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
