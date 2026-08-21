#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTDOOR = resolve(ROOT, "ops/public/void-public-frontdoor-v1.mjs");
const STATUS_PATH = "/__void/frontdoor/status.json";
const COMPOSITION_MARKER_HEADER = "x-void-public-app-composition";
const COMPOSITION_MARKER_VALUE = "v1";

const listen = (server, port = 0) => new Promise((resolvePromise, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", () => {
    server.off("error", reject);
    resolvePromise(server.address().port);
  });
});

const closeServer = (server) => new Promise((resolvePromise) => {
  if (!server.listening) {
    resolvePromise();
    return;
  }
  server.close(() => resolvePromise());
});

const freePort = async () => {
  const server = net.createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
};

const waitForReady = (child, timeoutMs = 3000) => new Promise((resolvePromise, reject) => {
  let output = "";
  const timer = setTimeout(() => {
    cleanup();
    reject(new Error(`frontdoor readiness timeout: ${output}`));
  }, timeoutMs);

  const onData = (chunk) => {
    output += chunk.toString("utf8");
    if (output.includes("VOID_PUBLIC_FRONTDOOR_V1_READY")) {
      cleanup();
      resolvePromise();
    }
  };
  const onExit = (code, signal) => {
    cleanup();
    reject(new Error(`frontdoor exited before ready: code=${code} signal=${signal} output=${output}`));
  };
  const cleanup = () => {
    clearTimeout(timer);
    child.stdout.off("data", onData);
    child.off("exit", onExit);
  };

  child.stdout.on("data", onData);
  child.once("exit", onExit);
});

const stopChild = async (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => child.once("exit", resolvePromise)),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 500)),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolvePromise) => child.once("exit", resolvePromise));
  }
};

const getStatus = async (port) => {
  const response = await fetch(`http://127.0.0.1:${port}${STATUS_PATH}`, {
    method: "GET",
    redirect: "manual",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-void-frontdoor"), "VOID_PUBLIC_FRONTDOOR_V1");
  return response.json();
};

const tmp = mkdtempSync(resolve(os.tmpdir(), "void-frontdoor-status-identity-v1-"));
const homePath = resolve(tmp, "index.html");
writeFileSync(homePath, "<!doctype html><title>VOID</title>\n", { mode: 0o600 });

let mode = "canonical";
const requests = [];
const upstream = http.createServer((req, res) => {
  let requestBytes = 0;
  req.on("data", (chunk) => {
    requestBytes += chunk.length;
  });
  req.on("end", () => {
    requests.push({
      method: req.method,
      url: req.url,
      requestBytes,
      mode,
    });

    const headers = {
      "content-type": "text/html; charset=utf-8",
      "content-length": "0",
    };
    if (mode === "canonical") {
      headers[COMPOSITION_MARKER_HEADER] = COMPOSITION_MARKER_VALUE;
    } else if (mode === "wrong") {
      headers[COMPOSITION_MARKER_HEADER] = "wrong";
    }
    res.writeHead(200, headers);
    res.end();
  });
});

let frontdoor = null;
try {
  const upstreamPort = await listen(upstream);
  const frontdoorPort = await freePort();

  frontdoor = spawn(process.execPath, [FRONTDOOR], {
    cwd: ROOT,
    env: {
      ...process.env,
      VOID_PUBLIC_FRONTDOOR_HOME: homePath,
      VOID_PUBLIC_FRONTDOOR_PORT: String(frontdoorPort),
      VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: String(upstreamPort),
      VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS: "300",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  frontdoor.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  await waitForReady(frontdoor);

  let status = await getStatus(frontdoorPort);
  assert.equal(status.listener_ready, true);
  assert.equal(status.upstream_ready, true);
  assert.equal(status.ready, true);

  mode = "wrong";
  status = await getStatus(frontdoorPort);
  assert.equal(status.listener_ready, true);
  assert.equal(status.upstream_ready, false);
  assert.equal(status.ready, false);

  mode = "missing";
  status = await getStatus(frontdoorPort);
  assert.equal(status.listener_ready, true);
  assert.equal(status.upstream_ready, false);
  assert.equal(status.ready, false);

  mode = "canonical";
  status = await getStatus(frontdoorPort);
  assert.equal(status.listener_ready, true);
  assert.equal(status.upstream_ready, true);
  assert.equal(status.ready, true);

  assert.equal(requests.length, 4);
  for (const request of requests) {
    assert.equal(request.method, "GET");
    assert.equal(request.url, "/app/");
    assert.equal(request.requestBytes, 0);
  }
  assert.equal(stderr, "");

  console.log("VOID_PUBLIC_FRONTDOOR_STATUS_IDENTITY_V1_GREEN");
} finally {
  if (frontdoor) await stopChild(frontdoor);
  await closeServer(upstream);
  rmSync(tmp, { recursive: true, force: true });
}
