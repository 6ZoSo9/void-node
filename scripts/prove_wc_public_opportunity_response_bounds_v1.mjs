#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-discovery-v1.mjs");
const LIMIT = 64 * 1024;

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

async function withFixture(mode, fn) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    if (request.url === "/.well-known/void-public-node.json") {
      response.writeHead(200, {
        "content-type": "application/json",
        ...(mode === "declared" ? { "content-length": String(LIMIT + 1) } : {}),
      });
      response.end(Buffer.alloc(LIMIT + 1, 0x20));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end('{"ok":false,"error":"not_found"}\n');
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await fn(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    await new Promise((resolveClose) => server.close(() => resolveClose()));
  }
}

for (const mode of ["declared", "streamed"]) {
  await withFixture(mode, async (base, requests) => {
    const result = await run(["--base", base, "--require-available"]);
    assert.equal(result.code, 2, `${mode}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.opportunity_state, "unavailable", mode);
    assert.equal(body.safety.read_only, true, mode);
    assert.equal(body.safety.mutation_attempted, false, mode);
    assert.equal(body.safety.ticket_issuance_attempted, false, mode);
    assert.equal(body.safety.wc_award_attempted, false, mode);
    assert.equal(body.attempts[0].path, "/.well-known/void-public-node.json", mode);
    assert.equal(body.attempts[0].error, "response_body_too_large", mode);
    assert.ok(requests.every((entry) => entry.method === "GET"), mode);
  });
}

console.log("VOID_WC_PUBLIC_OPPORTUNITY_RESPONSE_BOUNDS_V1_PROOF_GREEN");
