#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gatewaySource = path.join(repo, "ops/void-ai-agent-public-gateway-v1.mjs");
const operatorRoute = "/__void/operator-notifications/v1/candidate";
const paidWorkRoute = "/__void/agents/paid-work/submissions/v1";
const bearer = "Bearer gateway-response-bounds-proof-token-0001";
const maximumResponseBytes = 4096;
const upstreamTimeoutMs = 3000;
const promptFailureMs = 1200;

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = server.address();
      assert(address && typeof address !== "string", "unexpected listen address");
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function request({ port, requestPath, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: requestPath,
        headers: {
          authorization: bearer,
          "content-type": "application/json",
          "content-length": String(body.length),
          "x-void-payload-sha256": sha256(body),
        },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on("timeout", () => req.destroy(new Error("client_request_timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

function startGateway(upstreamPort) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [gatewaySource], {
      cwd: repo,
      env: {
        ...process.env,
        VOID_REPO_ROOT: repo,
        VOID_AI_AGENT_PUBLIC_GATEWAY_HOST: "127.0.0.1",
        VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
        VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
        VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
        VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES: String(maximumResponseBytes),
        VOID_OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS: String(upstreamTimeoutMs),
        VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
        VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES: String(maximumResponseBytes),
        VOID_AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS: String(upstreamTimeoutMs),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`gateway_start_timeout stdout=${stdout} stderr=${stderr}`));
    }, 10000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) continue;
        try {
          const ready = JSON.parse(line);
          if (ready.marker !== "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" || ready.ready !== true) continue;
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ child, port: ready.port, getStderr: () => stderr });
          return;
        } catch (_error) {
          // A partial readiness line is not terminal; keep collecting stdout.
        }
      }
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`gateway_exited_before_ready code=${code} signal=${signal} stderr=${stderr}`));
    });
  });
}

function stopGateway(instance) {
  return new Promise((resolve, reject) => {
    if (instance.child.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      instance.child.kill("SIGKILL");
      reject(new Error(`gateway_stop_timeout stderr=${instance.getStderr()}`));
    }, 8000);
    instance.child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0 || signal === "SIGTERM") resolve();
      else reject(new Error(`gateway_stop_failed code=${code} signal=${signal} stderr=${instance.getStderr()}`));
    });
    instance.child.kill("SIGTERM");
  });
}

const responseRecords = [];

const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    let requestJson;
    try {
      requestJson = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (_error) {
      res.writeHead(400, { "content-length": "0" });
      res.end();
      return;
    }

    const record = {
      path: req.url,
      mode: requestJson.mode,
      closed: false,
    };
    responseRecords.push(record);
    res.once("close", () => {
      record.closed = true;
    });
    res.on("error", () => {
      record.closed = true;
    });

    if (requestJson.mode === "small") {
      const bytes = Buffer.from(JSON.stringify({ ok: true, route: req.url }) + "\n");
      res.writeHead(req.url === operatorRoute ? 202 : 201, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(bytes.length),
        "x-upstream-proof": "small",
      });
      res.end(bytes);
      return;
    }

    if (requestJson.mode === "declared_oversize") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(maximumResponseBytes + 2048),
      });
      res.write("{");
      return;
    }

    if (requestJson.mode === "streamed_oversize") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "transfer-encoding": "chunked",
      });
      res.write(Buffer.alloc(3000, 0x61));
      setTimeout(() => {
        if (!res.destroyed) res.write(Buffer.alloc(3000, 0x62));
      }, 25);
      return;
    }

    res.writeHead(500, { "content-length": "0" });
    res.end();
  });
});

function bodyFor(mode) {
  return Buffer.from(JSON.stringify({ mode, proof: "gateway-response-bounds-v1" }));
}

async function assertPromptBoundedFailure(gatewayPort, route, mode, expectedError) {
  const start = performance.now();
  const result = await request({ port: gatewayPort, requestPath: route, body: bodyFor(mode) });
  const elapsed = performance.now() - start;

  assert.equal(result.status, 502, `${route} ${mode} did not fail closed`);
  const payload = JSON.parse(result.body.toString("utf8"));
  assert.equal(payload.ok, false);
  assert.equal(payload.error, expectedError);
  assert(elapsed < promptFailureMs, `${route} ${mode} waited ${elapsed.toFixed(1)}ms instead of rejecting before the ${upstreamTimeoutMs}ms upstream timeout`);

  const record = [...responseRecords].reverse().find((entry) => entry.path === route && entry.mode === mode);
  assert(record, `missing upstream record for ${route} ${mode}`);

  const closeDeadline = Date.now() + 1000;
  while (!record.closed && Date.now() < closeDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(record.closed, true, `${route} ${mode} upstream response was not disposed after rejection`);
}

let gateway;
try {
  const upstreamPort = await listen(upstream);
  gateway = await startGateway(upstreamPort);

  for (const route of [operatorRoute, paidWorkRoute]) {
    const small = await request({ port: gateway.port, requestPath: route, body: bodyFor("small") });
    assert.equal(small.status, route === operatorRoute ? 202 : 201, `${route} small response status changed`);
    assert.equal(small.headers["x-upstream-proof"], "small", `${route} filtered small response header missing`);
    const smallJson = JSON.parse(small.body.toString("utf8"));
    assert.equal(smallJson.ok, true);
    assert.equal(smallJson.route, route);

    await assertPromptBoundedFailure(
      gateway.port,
      route,
      "declared_oversize",
      route === operatorRoute
        ? "operator_webhook_receiver_upstream_failed"
        : "agent_paid_work_submission_receiver_upstream_failed",
    );

    await assertPromptBoundedFailure(
      gateway.port,
      route,
      "streamed_oversize",
      route === operatorRoute
        ? "operator_webhook_receiver_upstream_failed"
        : "agent_paid_work_submission_receiver_upstream_failed",
    );
  }

  console.log("VOID_AI_AGENT_PUBLIC_GATEWAY_UPSTREAM_RESPONSE_BOUNDS_V1_PROOF_GREEN");
  console.log("proxy_route_count=2");
  console.log(`maximum_response_bytes=${maximumResponseBytes}`);
  console.log("declared_overflow_rejected_before_full_buffer=1");
  console.log("streamed_overflow_rejected_before_upstream_completion=1");
  console.log("rejected_body_disposal_observed=1");
  console.log("live_proxy_activation=0");
  console.log("credential_access=0");
  console.log("paid_work_submission=0");
  console.log("work_credit_mutation=0");
  console.log("wallet_or_signer=0");
  console.log("transaction_broadcast=0");
  console.log("funds_moved=0");
} finally {
  if (gateway) await stopGateway(gateway);
  await close(upstream);
}
