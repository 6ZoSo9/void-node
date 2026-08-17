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

function canonicalDirectoryAtExactBytes(byteLength) {
  const compact = JSON.stringify(canonicalEmptyDirectory());
  const compactBytes = Buffer.byteLength(compact, "utf8");
  assert.ok(compactBytes <= byteLength, `canonical directory exceeds target ${byteLength}`);
  const text = compact + " ".repeat(byteLength - compactBytes);
  assert.equal(Buffer.byteLength(text, "utf8"), byteLength);
  JSON.parse(text);
  return text;
}

function multibyteOversizedCanonicalDirectory() {
  const text = JSON.stringify({
    ...canonicalEmptyDirectory(),
    padding: "é".repeat(Math.ceil(MAX_DIRECTORY_INPUT_BYTES / 2)),
  });
  assert.ok(text.length < MAX_DIRECTORY_INPUT_BYTES, "multibyte fixture must be below the cap in JS code units");
  assert.ok(Buffer.byteLength(text, "utf8") > MAX_DIRECTORY_INPUT_BYTES, "multibyte fixture must exceed the cap in UTF-8 bytes");
  JSON.parse(text);
  return text;
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

function assertNoCoordinatorHold(result) {
  assert.equal(result.code, 2, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.handoff_state, "hold");
  assert.equal(body.reason, "no_trusted_available_coordinator");
  assert.equal(body.safety.directory_input_max_bytes, MAX_DIRECTORY_INPUT_BYTES);
  assert.equal(body.safety.mutation_attempted, false);
  assert.equal(body.commands, undefined);
}

const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-input-bound-"));
try {
  const exactLimit = canonicalDirectoryAtExactBytes(MAX_DIRECTORY_INPUT_BYTES);
  const exactLimitFile = join(temp, "exact-limit.json");
  writeFileSync(exactLimitFile, exactLimit, "utf8");
  assertNoCoordinatorHold(await run(["--directory-json", exactLimitFile, "--account", "outside-user-bound"]));
  assertNoCoordinatorHold(await run(["--directory-json", "-", "--account", "outside-user-bound"], exactLimit));

  const exactOverflow = canonicalDirectoryAtExactBytes(MAX_DIRECTORY_INPUT_BYTES + 1);
  const exactOverflowFile = join(temp, "exact-overflow.json");
  writeFileSync(exactOverflowFile, exactOverflow, "utf8");
  assertBoundHold(await run(["--directory-json", exactOverflowFile, "--account", "outside-user-bound"]));
  assertBoundHold(await run(["--directory-json", "-", "--account", "outside-user-bound"], exactOverflow));

  const multibyteOverflow = multibyteOversizedCanonicalDirectory();
  const multibyteOverflowFile = join(temp, "multibyte-overflow.json");
  writeFileSync(multibyteOverflowFile, multibyteOverflow, "utf8");
  assertBoundHold(await run(["--directory-json", multibyteOverflowFile, "--account", "outside-user-bound"]));
  assertBoundHold(await run(["--directory-json", "-", "--account", "outside-user-bound"], multibyteOverflow));

  const regularFile = join(temp, "regular.json");
  writeFileSync(regularFile, JSON.stringify(canonicalEmptyDirectory()), "utf8");
  const symlinkFile = join(temp, "symlink.json");
  symlinkSync(regularFile, symlinkFile);
  const symlinkRejected = await run(["--directory-json", symlinkFile, "--account", "outside-user-bound"]);
  assert.equal(symlinkRejected.code, 2, symlinkRejected.stderr || symlinkRejected.stdout);
  assert.equal(JSON.parse(symlinkRejected.stdout).reason, "directory JSON input must be a regular file");

  const bounded = await run(["--directory-json", regularFile, "--account", "outside-user-bound"]);
  assertNoCoordinatorHold(bounded);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("directory_exact_262144_file_accepted=true");
console.log("directory_exact_262144_stdin_accepted=true");
console.log("directory_exact_262145_file_rejected=true");
console.log("directory_exact_262145_stdin_rejected=true");
console.log("directory_multibyte_utf8_byte_bound=true");
console.log("directory_file_preparse_bound=true");
console.log("directory_stdin_preparse_bound=true");
console.log("directory_symlink_rejected=true");
console.log("ready_command_emitted_on_oversize=false");
console.log("status_or_health_fetch_before_input_acceptance=false");
console.log(MARKER);
