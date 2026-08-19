#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const REVIEWER = path.join(
  ROOT,
  "tools/public-node-operator-evidence-pack-review-v1.mjs",
);
const PRODUCER = path.join(ROOT, "tools/public-node-operator-evidence-pack-v1.mjs");
const MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_PARENT_NAMESPACE_V1_PROOF_GREEN";
const ARTIFACTS = [
  "operator-self-check-v1.json",
  "operator-self-check-receipt-review-v1.json",
  "operator-evidence-pack-v1.json",
  "SHA256SUMS.txt",
];

function mkdirPrivate(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function runNode(args, env = process.env) {
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
  });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function snapshotPack(packDir) {
  return Object.fromEntries(
    ARTIFACTS.map((name) => {
      const file = path.join(packDir, name);
      const stat = fs.statSync(file);
      return [
        name,
        {
          sha256: sha256(file),
          bytes: stat.size,
          mode: stat.mode & 0o777,
        },
      ];
    }),
  );
}

function createValidHoldPack(packDir) {
  const result = runNode([
    PRODUCER,
    "--output-dir",
    packDir,
    "--base",
    "http://127.0.0.1:1",
    "--expected-peer-count",
    "0",
    "--allow-hold",
    "--observed-at",
    "2026-08-19T18:00:00.000Z",
    "--reviewed-at",
    "2026-08-19T18:00:01.000Z",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.statSync(packDir).mode & 0o777, 0o700);
  for (const name of ARTIFACTS) {
    assert.equal(fs.statSync(path.join(packDir, name)).mode & 0o777, 0o600);
  }
}

function writeSwapHook(file) {
  const source = String.raw`"use strict";
const fs = require("node:fs");
const path = require("node:path");
const originalOpenSync = fs.openSync;
let swapped = false;

fs.openSync = function patchedOpenSync(candidate, flags, ...rest) {
  const value = String(candidate);
  const component = process.env.VOID_PARENT_SWAP_COMPONENT || "";
  const finalTrigger = process.env.VOID_PARENT_SWAP_FINAL_TRIGGER || "";
  const componentTrigger = component && value.endsWith(path.sep + component);
  const exactTrigger = finalTrigger && path.resolve(value) === path.resolve(finalTrigger);
  if (!swapped && (componentTrigger || exactTrigger)) {
    swapped = true;
    const victim = process.env.VOID_PARENT_SWAP_VICTIM;
    const target = process.env.VOID_PARENT_SWAP_TARGET;
    const marker = process.env.VOID_PARENT_SWAP_MARKER;
    const backup = victim + ".original";
    fs.renameSync(victim, backup);
    fs.symlinkSync(target, victim);
    fs.writeFileSync(marker, JSON.stringify({ value, victim, target }) + "\n", { mode: 0o600 });
  }
  return originalOpenSync.call(this, candidate, flags, ...rest);
};
`;
  fs.writeFileSync(file, source, { mode: 0o600 });
}

function swapEnv(hook, component, finalTrigger, victim, target, marker) {
  return {
    ...process.env,
    NODE_OPTIONS: `--require=${hook}`,
    VOID_PARENT_SWAP_COMPONENT: component,
    VOID_PARENT_SWAP_FINAL_TRIGGER: finalTrigger,
    VOID_PARENT_SWAP_VICTIM: victim,
    VOID_PARENT_SWAP_TARGET: target,
    VOID_PARENT_SWAP_MARKER: marker,
  };
}

function main() {
  assert.equal(process.platform, "linux", "parent-namespace proof requires Linux");
  assert(fs.existsSync(REVIEWER), "reviewer missing");
  assert(fs.existsSync(PRODUCER), "pack producer missing");

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-evidence-pack-parent-namespace-proof-"),
  );
  fs.chmodSync(temp, 0o700);

  try {
    const hook = path.join(temp, "parent-swap-hook.cjs");
    writeSwapHook(hook);

    const targetRoot = path.join(temp, "input-target");
    mkdirPrivate(targetRoot);
    const targetPack = path.join(targetRoot, "pack");
    createValidHoldPack(targetPack);
    const targetBefore = snapshotPack(targetPack);

    const nominal = runNode([
      REVIEWER,
      "--pack-dir",
      targetPack,
      "--reviewed-at",
      "2026-08-19T18:00:02.000Z",
    ]);
    assert.equal(nominal.status, 0, nominal.stderr || nominal.stdout);
    assert.equal(JSON.parse(nominal.stdout).accepted, true);

    const inputContainer = path.join(temp, "input-container");
    const inputVictim = path.join(inputContainer, "victim-input");
    const victimPack = path.join(inputVictim, "pack");
    mkdirPrivate(victimPack);
    const inputMarker = path.join(temp, "input-parent-swapped.json");

    const inputSwap = runNode(
      [
        REVIEWER,
        "--pack-dir",
        victimPack,
        "--reviewed-at",
        "2026-08-19T18:00:03.000Z",
      ],
      swapEnv(
        hook,
        "victim-input",
        victimPack,
        inputVictim,
        targetRoot,
        inputMarker,
      ),
    );
    assert.equal(fs.existsSync(inputMarker), true, "input parent swap did not execute");
    assert.equal(inputSwap.status, 3, inputSwap.stderr || inputSwap.stdout);
    const inputReview = JSON.parse(inputSwap.stdout);
    assert.equal(inputReview.accepted, false);
    assert.equal(inputReview.summary.failed_check_ids.includes("pack_load"), true);
    assert.deepEqual(snapshotPack(targetPack), targetBefore, "alternate pack changed");

    const outputContainer = path.join(temp, "output-container");
    const outputVictim = path.join(outputContainer, "victim-output");
    const outputParent = path.join(outputVictim, "reviews");
    mkdirPrivate(outputParent);

    const outputTarget = path.join(temp, "output-target");
    const alternateOutputParent = path.join(outputTarget, "reviews");
    mkdirPrivate(alternateOutputParent);

    const requestedOutput = path.join(outputParent, "review.json");
    const alternateOutput = path.join(alternateOutputParent, "review.json");
    const outputMarker = path.join(temp, "output-parent-swapped.json");
    const outputSwap = runNode(
      [
        REVIEWER,
        "--pack-dir",
        targetPack,
        "--output",
        requestedOutput,
        "--reviewed-at",
        "2026-08-19T18:00:04.000Z",
      ],
      swapEnv(
        hook,
        "victim-output",
        outputParent,
        outputVictim,
        outputTarget,
        outputMarker,
      ),
    );
    assert.equal(fs.existsSync(outputMarker), true, "output parent swap did not execute");
    assert.equal(outputSwap.status, 1, outputSwap.stderr || outputSwap.stdout);
    assert.equal(
      fs.existsSync(alternateOutput),
      false,
      "alternate output tree received the review",
    );
    assert.equal(
      fs.existsSync(path.join(`${outputVictim}.original`, "reviews", "review.json")),
      false,
      "original output tree was modified after the swap",
    );
    assert.deepEqual(snapshotPack(targetPack), targetBefore, "pack changed during output test");

    console.log("pack_parent_namespace_swap_rejected=true");
    console.log("output_parent_namespace_swap_rejected=true");
    console.log("alternate_namespace_unchanged=true");
    console.log(MARKER);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main();
