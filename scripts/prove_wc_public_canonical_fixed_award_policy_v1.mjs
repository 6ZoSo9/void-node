#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_WC_PUBLIC_CANONICAL_FIXED_AWARD_POLICY_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DISCOVERY = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const READINESS = resolve(ROOT, "tools/wc-public-coordinator-readiness-v1.mjs");
const DIRECTORY = resolve(ROOT, "tools/wc-public-opportunity-directory-v1.mjs");
const NON_CANONICAL = ["4", "3.5", String(Number.MAX_SAFE_INTEGER + 1)];

function run(tool, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [tool, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

function assertCanonicalRejection(result, label) {
  assert.equal(result.code, 2, `${label}: ${result.stderr || result.stdout}`);
  const body = JSON.parse(result.stdout);
  assert.match(body.reason, /canonical fixed award 3/u, label);
}

for (const value of NON_CANONICAL) {
  const discovery = await run(DISCOVERY, [
    "--base", "http://127.0.0.1:9",
    "--timeout-ms", "250",
    "--expected-award-wc", value,
  ]);
  assertCanonicalRejection(discovery, `discovery:${value}`);

  const readiness = await run(READINESS, [
    "--base", "http://127.0.0.1:9",
    "--timeout-ms", "250",
    "--status-retries", "1",
    "--expected-award-wc", value,
  ]);
  assertCanonicalRejection(readiness, `readiness:${value}`);

  const directory = await run(DIRECTORY, [
    "--base", "https://example.invalid",
    "--discovery-tool", "/definitely/missing/void-discovery-tool.mjs",
    "--expected-award-wc", value,
  ]);
  assertCanonicalRejection(directory, `directory:${value}`);
}

const directoryCanonical = await run(DIRECTORY, [
  "--base", "https://example.invalid",
  "--discovery-tool", "/definitely/missing/void-discovery-tool.mjs",
  "--expected-award-wc", "3",
]);
assert.equal(directoryCanonical.code, 2, directoryCanonical.stderr || directoryCanonical.stdout);
const directoryCanonicalBody = JSON.parse(directoryCanonical.stdout);
assert.match(directoryCanonicalBody.reason, /discovery tool not found/u);
assert.doesNotMatch(directoryCanonicalBody.reason, /canonical fixed award 3/u);

console.log(MARKER);
