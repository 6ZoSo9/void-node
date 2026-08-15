#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5_000;
const MAX_SETTLE_MS = 3_500;
const MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RESPONSE_BOUND_V1_GREEN";

function smallJson(res, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

async function runCase(mode) {
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
    if (pathname !== "/health") {
      smallJson(res, 404, { ok: false, error: "fixture_not_found" });
      return;
    }

    if (mode === "declared") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(MAX_RESPONSE_BYTES + 1),
      });
      res.flushHeaders();
      return;
    }

    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "transfer-encoding": "chunked",
    });
    res.write(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 0x20));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `void-public-self-check-bound-${mode}-`));
  const output = path.join(temp, "receipt.json");
  const started = Date.now();
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          TOOL,
          "--base",
          `http://127.0.0.1:${address.port}`,
          "--timeout-ms",
          String(TIMEOUT_MS),
          "--expected-peer-count",
          "0",
          "--observed-at",
          "2026-08-15T16:00:00Z",
          "--output",
          output,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.once("error", reject);
      child.once("close", (status) => resolve({ status, stdout, stderr }));
    });

    const elapsed = Date.now() - started;
    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert(elapsed < MAX_SETTLE_MS, `${mode} oversize HOLD took ${elapsed}ms`);
    assert(fs.existsSync(output), `${mode} receipt missing`);
    const receipt = JSON.parse(fs.readFileSync(output, "utf8"));
    const health = receipt.checks.find((entry) => entry.id === "health");
    assert(health, `${mode} health check missing`);
    assert.equal(health.ok, false);
    assert.equal(health.reason, "response_too_large");
    assert.equal(receipt.safety.mutation_attempted, false);
    assert.deepEqual(receipt.safety.methods_used, ["GET"]);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

await runCase("declared");
await runCase("streamed");
console.log(MARKER);
