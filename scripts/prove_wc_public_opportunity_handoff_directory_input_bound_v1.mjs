#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_DIRECTORY_INPUT_BOUND_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const MAX_DIRECTORY_INPUT_BYTES = 256 * 1024;

function run(args, stdin = "") {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", fail);
    child.on("close", (code) => done({ code, stdout, stderr }));
    child.stdin.end(stdin);
  });
}

function canonicalEmptyDirectory() {
  return {
    marker: "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1",
    status: "green",
    results: [],
    safety: {
      read_only: true,
      composed_discovery_marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
      child_results_safety_validated: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  };
}

function assertBoundHold(result) {
  assert.equal(result.code, 2, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.handoff_state, "hold");
  assert.equal(body.reason, "directory JSON input exceeds byte limit");
  assert.equal(body.safety.directory_input_max_bytes, MAX_DIRECTORY_INPUT_BYTES);
  assert.equal(body.safety.mutation_attempted, false);
  assert.equal(body.commands, undefined);
}

const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-input-bound-"));
try {
  const oversized = "x".repeat(MAX_DIRECTORY_INPUT_BYTES + 1);
  const oversizedFile = join(temp, "oversized.json");
  writeFileSync(oversizedFile, oversized, "utf8");
  assertBoundHold(await run(["--directory-json", oversizedFile, "--account", "outside-user-bound"]));

  assertBoundHold(await run(["--directory-json", "-", "--account", "outside-user-bound"], oversized));

  const regularFile = join(temp, "regular.json");
  writeFileSync(regularFile, JSON.stringify(canonicalEmptyDirectory()), "utf8");
  const symlinkFile = join(temp, "symlink.json");
  symlinkSync(regularFile, symlinkFile);
  const symlinkRejected = await run(["--directory-json", symlinkFile, "--account", "outside-user-bound"]);
  assert.equal(symlinkRejected.code, 2, symlinkRejected.stderr || symlinkRejected.stdout);
  assert.equal(JSON.parse(symlinkRejected.stdout).reason, "directory JSON input must be a regular file");

  const bounded = await run(["--directory-json", regularFile, "--account", "outside-user-bound"]);
  assert.equal(bounded.code, 2, bounded.stderr || bounded.stdout);
  const boundedBody = JSON.parse(bounded.stdout);
  assert.equal(boundedBody.reason, "no_trusted_available_coordinator");
  assert.equal(boundedBody.safety.directory_input_max_bytes, MAX_DIRECTORY_INPUT_BYTES);
  assert.equal(boundedBody.commands, undefined);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("directory_file_preparse_bound=true");
console.log("directory_stdin_preparse_bound=true");
console.log("directory_symlink_rejected=true");
console.log("ready_command_emitted_on_oversize=false");
console.log("status_or_health_fetch_before_input_acceptance=false");
console.log(MARKER);
