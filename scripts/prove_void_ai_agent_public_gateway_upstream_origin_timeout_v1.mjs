#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gatewayPath = path.join(root, "ops", "void-ai-agent-public-gateway-v1.mjs");
const OPERATOR_PATH = "/__void/operator-notifications/v1/candidate";
const PAID_WORK_PATH = "/__void/agents/paid-work/submissions/v1";
const TOKEN = "Bearer void-proof-token-1234567890";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      resolve(address.port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function gatewayEnvironment(overrides = {}) {
  return {
    ...process.env,
    VOID_REPO_ROOT: root,
    VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
    VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
    VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM: "",
    VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM: "",
    ...overrides,
  };
}

function spawnGateway(overrides = {}) {
  return spawn(process.execPath, [gatewayPath], {
    cwd: root,
    env: gatewayEnvironment(overrides),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForGatewayReady(child) {
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

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const line = stdout.split(/\r?\n/).find((candidate) => candidate.startsWith("{"));
    if (line) {
      const ready = JSON.parse(line);
      assert.equal(ready.marker, "VOID_AI_AGENT_PUBLIC_GATEWAY_V1");
      assert.equal(ready.ready, true);
      return { ready, getStderr: () => stderr };
    }
    if (child.exitCode !== null) {
      throw new Error(`gateway exited before ready code=${child.exitCode} stderr=${stderr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`gateway readiness timeout stderr=${stderr}`);
}

async function stopGateway(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("gateway shutdown timeout")), 3_000),
    ),
  ]);
}

async function expectStartupHold(envName, value) {
  const child = spawnGateway({ [envName]: value });
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
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`startup HOLD timeout: ${value}`)), 3_000);
    child.once("exit", (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });
  assert.equal(code, 78, `${envName} accepted unsafe upstream ${value}`);
  assert.match(stderr, new RegExp(`invalid ${envName}`));
  assert.doesNotMatch(stdout, /"ready":true/);
}

function postJson(port, route) {
  const body = Buffer.from(JSON.stringify({ marker: "VOID_GATEWAY_TIMEOUT_PROBE_V1" }));
  const sha = crypto.createHash("sha256").update(body).digest("hex");
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: route,
        method: "POST",
        headers: {
          authorization: TOKEN,
          "content-type": "application/json",
          "content-length": String(body.length),
          "x-void-payload-sha256": sha,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    request.end(body);
  });
}

async function runAdmittedTimeoutCase({ routeKind, cancellationMode }) {
  const route = routeKind === "operator" ? OPERATOR_PATH : PAID_WORK_PATH;
  const upstreamClosed = deferred();
  let authorizationSeen = "";
  const upstream = http.createServer((request, response) => {
    authorizationSeen = String(request.headers.authorization || "");
    request.resume();
    request.on("end", () => {
      response.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.write('{"partial":');
      response.once("close", () => upstreamClosed.resolve(Date.now()));
    });
  });
  const upstreamPort = await listen(upstream);
  const upstreamBase = `http://127.0.0.1:${upstreamPort}`;
  const env = {
    VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_CANCEL_SETTLEMENT_MODE: cancellationMode,
  };
  if (routeKind === "operator") {
    env.VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM = upstreamBase;
    env.VOID_OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS = "1000";
  } else {
    env.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM = upstreamBase;
    env.VOID_AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS = "1000";
  }

  const child = spawnGateway(env);
  try {
    const { ready } = await waitForGatewayReady(child);
    const startedAt = Date.now();
    const result = await Promise.race([
      postJson(ready.port, route),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("public timeout path did not settle")), 2_500),
      ),
    ]);
    const responseAt = Date.now();
    assert.equal(result.status, 502);
    const parsed = JSON.parse(result.body);
    assert.equal(
      parsed.error,
      routeKind === "operator"
        ? "operator_webhook_receiver_upstream_failed"
        : "agent_paid_work_submission_receiver_upstream_failed",
    );
    assert.equal(authorizationSeen, TOKEN);
    const closedAt = await Promise.race([
      upstreamClosed.promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("upstream connection remained open")), 700),
      ),
    ]);
    assert.ok(responseAt - startedAt >= 900, "route deadline was not exercised");
    assert.ok(responseAt - startedAt < 2_000, "bounded timeout/cleanup exceeded limit");
    assert.ok(closedAt <= responseAt + 700, "upstream teardown exceeded cleanup window");
  } finally {
    await stopGateway(child).catch(() => {});
    await closeServer(upstream);
  }
}

const invalidBases = [
  "https://example.com",
  "http://example.com:4186",
  "http://user@127.0.0.1:4186",
  "http://127.0.0.1:4186/path",
  "http://127.0.0.1:4186?query=1",
  "http://127.0.0.1:4186#fragment",
  "http://127.0.0.1:4186/",
  "http://127.0.0.2:4186",
  "http://[::1]:4186",
  "not-a-url",
];

for (const value of invalidBases) {
  await expectStartupHold("VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM", value);
  await expectStartupHold(
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
    value.replaceAll("4186", "4187"),
  );
}

for (const routeKind of ["operator", "paid_work"]) {
  for (const cancellationMode of ["never", "reject"]) {
    await runAdmittedTimeoutCase({ routeKind, cancellationMode });
  }
}

console.log("upstream_loopback_origin_binding=true");
console.log("unsafe_upstream_startup_rejected=true");
console.log("admitted_timeout_teardown_owned=true");
console.log("nonsettling_cleanup_bounded=true");
console.log("rejecting_cleanup_primary_truth_preserved=true");
console.log("VOID_AI_AGENT_PUBLIC_GATEWAY_UPSTREAM_ORIGIN_TIMEOUT_V1_PROOF_GREEN");
