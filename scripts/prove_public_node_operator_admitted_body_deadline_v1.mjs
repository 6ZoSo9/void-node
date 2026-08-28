#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const REQUEST_TIMEOUT_MS = 250;
const CHILD_TERMINAL_MS = 1_500;
const MARKER = "VOID_PUBLIC_NODE_OPERATOR_ADMITTED_BODY_DEADLINE_V1_PROOF_GREEN";

function writeStalledReadPreload(temp) {
  const preload = path.join(temp, "stalled-read-preload.mjs");
  fs.writeFileSync(
    preload,
    `const originalFetch = globalThis.fetch;\n` +
      `let injected = false;\n` +
      `globalThis.fetch = async (input, init = {}) => {\n` +
      `  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;\n` +
      `  const url = new URL(raw);\n` +
      `  if (!injected && url.pathname === "/health") {\n` +
      `    injected = true;\n` +
      `    let cancelCalls = 0;\n` +
      `    const reader = {\n` +
      `      read() { return new Promise(() => {}); },\n` +
      `      cancel() { cancelCalls += 1; return new Promise(() => {}); },\n` +
      `      releaseLock() {},\n` +
      `    };\n` +
      `    return {\n` +
      `      status: 200,\n` +
      `      headers: new Headers({ "content-type": "application/json" }),\n` +
      `      body: { getReader() { return reader; } },\n` +
      `      get __voidCancelCalls() { return cancelCalls; },\n` +
      `    };\n` +
      `  }\n` +
      `  return originalFetch(input, init);\n` +
      `};\n`,
    { mode: 0o600 },
  );
  return preload;
}

async function runBounded(preload) {
  const args = [
    TOOL,
    "--base",
    "http://127.0.0.1:1",
    "--timeout-ms",
    String(REQUEST_TIMEOUT_MS),
    "--expected-peer-count",
    "0",
    "--observed-at",
    "2026-08-19T04:00:00Z",
  ];
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: path.resolve("."),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${preload}`].filter(Boolean).join(" "),
      },
    });
    let stdout = "";
    let stderr = "";
    let killedForDeadline = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    const terminal = setTimeout(() => {
      killedForDeadline = true;
      child.kill("SIGKILL");
    }, CHILD_TERMINAL_MS);
    child.once("close", (status, signal) => {
      clearTimeout(terminal);
      resolve({
        status,
        signal,
        stdout,
        stderr,
        elapsed_ms: Date.now() - started,
        killed_for_deadline: killedForDeadline,
      });
    });
  });
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-self-check-admitted-body-deadline-"));
try {
  const preload = writeStalledReadPreload(temp);
  const result = await runBounded(preload);

  assert.equal(
    result.killed_for_deadline,
    false,
    `admitted body read escaped request+teardown lifetime; child required SIGKILL after ${CHILD_TERMINAL_MS}ms`,
  );
  assert.equal(result.signal, null, `unexpected child signal: ${String(result.signal)}`);
  assert.equal(result.status, 2, `expected bounded HOLD exit 2: ${result.stderr}\n${result.stdout}`);
  assert(
    result.elapsed_ms >= REQUEST_TIMEOUT_MS,
    `stalled admitted read returned before request deadline: ${result.elapsed_ms}ms`,
  );
  assert(
    result.elapsed_ms < CHILD_TERMINAL_MS,
    `stalled admitted read exceeded bounded terminal: ${result.elapsed_ms}ms`,
  );

  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.marker, "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1");
  assert.equal(receipt.summary.status, "hold");
  const health = receipt.checks.find((entry) => entry.id === "health");
  assert(health, "health check missing");
  assert.equal(health.ok, false);
  assert.equal(health.reason, "timeout", `stalled admitted read must preserve timeout truth: ${health.reason}`);
  assert.equal(receipt.safety.mutation_attempted, false);
  assert.deepEqual(receipt.safety.methods_used, ["GET"]);

  console.log(`request_timeout_ms=${REQUEST_TIMEOUT_MS}`);
  console.log(`child_terminal_ms=${CHILD_TERMINAL_MS}`);
  console.log(`elapsed_ms=${result.elapsed_ms}`);
  console.log("stalled_admitted_read_primary_timeout_preserved=true");
  console.log("stalled_admitted_read_bounded_terminal=true");
  console.log(MARKER);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
