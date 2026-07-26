#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const gatewaySource = path.join(
  repo,
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const route =
  "/__void/operator-notifications/v1/candidate";
const discoveryRoute =
  "/.well-known/void-agent-discovery.json";
const bearer = "Bearer gateway-proof-token-0001";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      { host: "127.0.0.1", port: 0, exclusive: true },
      () => {
        const address = server.address();
        assert(
          address && typeof address !== "string",
          "unexpected listen address",
        );
        resolve(address.port);
      },
    );
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

function request({
  port,
  method,
  requestPath,
  headers = {},
  body = null,
}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers,
        timeout: 5_000,
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

    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", reject);

    if (body !== null) {
      req.write(body);
    }

    req.end();
  });
}

function startGateway(extraEnvironment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [gatewaySource],
      {
        cwd: repo,
        env: {
          ...process.env,
          VOID_REPO_ROOT: repo,
          VOID_AI_AGENT_PUBLIC_GATEWAY_HOST:
            "127.0.0.1",
          VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
          VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
          ...extraEnvironment,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error(
          `gateway startup timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
    }, 10_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;

      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) continue;

        try {
          const ready = JSON.parse(line);
          if (
            ready.marker !== "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" ||
            ready.ready !== true
          ) {
            continue;
          }

          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            child,
            port: ready.port,
            ready,
            getStderr: () => stderr,
          });
          return;
        } catch {
          // Continue until a complete JSON readiness line arrives.
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `gateway exited before ready code=${code} signal=${signal} stderr=${stderr}`,
        ),
      );
    });
  });
}

function stopGateway(instance) {
  return new Promise((resolve, reject) => {
    const { child } = instance;

    if (child.exitCode !== null) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error(
          `gateway stop timeout stderr=${instance.getStderr()}`,
        ),
      );
    }, 8_000);

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0 || signal === "SIGTERM") {
        resolve();
      } else {
        reject(
          new Error(
            `gateway stop failed code=${code} signal=${signal} stderr=${instance.getStderr()}`,
          ),
        );
      }
    });

    child.kill("SIGTERM");
  });
}

const receiverRequests = [];

const receiver = http.createServer((req, res) => {
  const chunks = [];

  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);

    receiverRequests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    });

    const responseBody = Buffer.from(
      JSON.stringify({
        ok: true,
        marker:
          "VOID_OPERATOR_WEBHOOK_RECEIVER_GATEWAY_INTEGRATION_V1",
        rpc_mutation: false,
        money_movement: false,
      }) + "\n",
    );

    res.writeHead(202, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(responseBody.length),
      "set-cookie": "receiver-secret=must-not-forward",
      location: "https://example.invalid/not-forwarded",
      "x-upstream-receiver": "proof",
    });
    res.end(responseBody);
  });
});

let disabledGateway;
let enabledGateway;

try {
  const receiverPort = await listen(receiver);

  disabledGateway = await startGateway();

  assert.deepEqual(
    disabledGateway.ready.allowed_methods,
    ["GET", "HEAD"],
    "discovery method contract changed",
  );
  assert.equal(
    disabledGateway.ready.mutation_authority,
    false,
    "generic mutation authority changed",
  );
  assert.equal(
    disabledGateway.ready.proxy_authority,
    false,
    "generic proxy authority changed",
  );
  assert.equal(
    disabledGateway.ready
      .bounded_operator_notification_proxy_authority,
    false,
    "disabled route unexpectedly reports proxy authority",
  );

  const disabledBody = Buffer.from(
    JSON.stringify({ candidate_id: "disabled-proof" }),
  );
  const disabledSha = sha256(disabledBody);
  const disabled = await request({
    port: disabledGateway.port,
    method: "POST",
    requestPath: route,
    body: disabledBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(disabledBody.length),
      "x-void-payload-sha256": disabledSha,
    },
  });

  assert.equal(
    disabled.status,
    503,
    "disabled receiver route should return 503",
  );
  assert.equal(
    receiverRequests.length,
    0,
    "disabled route reached the receiver",
  );

  const disabledGet = await request({
    port: disabledGateway.port,
    method: "GET",
    requestPath: route,
  });
  assert.equal(disabledGet.status, 405);
  assert.equal(disabledGet.headers.allow, "POST");

  await stopGateway(disabledGateway);
  disabledGateway = null;

  enabledGateway = await startGateway({
    VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM:
      `http://127.0.0.1:${receiverPort}`,
  });

  assert.equal(
    enabledGateway.ready
      .bounded_operator_notification_proxy_authority,
    true,
    "configured route does not report bounded proxy authority",
  );
  assert.equal(
    enabledGateway.ready.operator_notification_route?.path,
    route,
  );
  assert.deepEqual(
    enabledGateway.ready.operator_notification_route?.methods,
    ["POST"],
  );
  assert.equal(
    enabledGateway.ready.operator_notification_route
      ?.generic_mutation,
    false,
  );
  assert.equal(
    enabledGateway.ready.operator_notification_route
      ?.money_movement,
    false,
  );

  const discovery = await request({
    port: enabledGateway.port,
    method: "GET",
    requestPath: discoveryRoute,
  });
  assert.equal(
    discovery.status,
    200,
    "discovery route regressed",
  );

  const routeGet = await request({
    port: enabledGateway.port,
    method: "GET",
    requestPath: route,
  });
  assert.equal(routeGet.status, 405);
  assert.equal(routeGet.headers.allow, "POST");
  assert.equal(routeGet.body.length, 0);

  const validBody = Buffer.from(
    JSON.stringify({
      schema: "void_operator_notification_candidate_v1",
      notification_id: "gateway-integration-proof-v1",
      candidate_id: "candidate-proof-v1",
      source: "proof",
    }),
  );
  const validSha = sha256(validBody);

  const queryDenied = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: `${route}?unexpected=1`,
    body: validBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(validBody.length),
      "x-void-payload-sha256": validSha,
    },
  });
  assert.equal(queryDenied.status, 400);

  const wrongType = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: validBody,
    headers: {
      authorization: bearer,
      "content-type": "text/plain",
      "content-length": String(validBody.length),
      "x-void-payload-sha256": validSha,
    },
  });
  assert.equal(wrongType.status, 415);

  const missingAuth = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: validBody,
    headers: {
      "content-type": "application/json",
      "content-length": String(validBody.length),
      "x-void-payload-sha256": validSha,
    },
  });
  assert.equal(missingAuth.status, 401);

  const missingSha = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: validBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(validBody.length),
    },
  });
  assert.equal(missingSha.status, 400);

  const mismatchedSha = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: validBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(validBody.length),
      "x-void-payload-sha256": "0".repeat(64),
    },
  });
  assert.equal(mismatchedSha.status, 400);

  const invalidBody = Buffer.from("{");
  const invalidJson = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: invalidBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(invalidBody.length),
      "x-void-payload-sha256": sha256(invalidBody),
    },
  });
  assert.equal(invalidJson.status, 400);

  const oversizedBody = Buffer.from(
    JSON.stringify({ value: "x".repeat(70_000) }),
  );
  const oversized = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: oversizedBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(oversizedBody.length),
      "x-void-payload-sha256": sha256(oversizedBody),
    },
  });
  assert.equal(oversized.status, 413);

  assert.equal(
    receiverRequests.length,
    0,
    "rejected requests reached the receiver",
  );

  const accepted = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: validBody,
    headers: {
      authorization: bearer,
      "content-type": "application/json",
      "content-length": String(validBody.length),
      "x-void-payload-sha256": validSha,
    },
  });

  assert.equal(accepted.status, 202);
  assert.equal(
    accepted.headers["x-void-operator-webhook-route"],
    "v1",
  );
  assert.equal(
    accepted.headers["x-upstream-receiver"],
    "proof",
  );
  assert.equal(
    accepted.headers["set-cookie"],
    undefined,
    "set-cookie leaked through the gateway",
  );
  assert.equal(
    accepted.headers.location,
    undefined,
    "location leaked through the gateway",
  );
  assert.equal(accepted.headers["cache-control"], "no-store");

  const acceptedJson = JSON.parse(
    accepted.body.toString("utf8"),
  );
  assert.equal(acceptedJson.ok, true);
  assert.equal(acceptedJson.rpc_mutation, false);
  assert.equal(acceptedJson.money_movement, false);

  assert.equal(receiverRequests.length, 1);
  const receiverLast = receiverRequests[0];

  assert.equal(receiverLast.method, "POST");
  assert.equal(receiverLast.url, route);
  assert.equal(
    receiverLast.headers.authorization,
    bearer,
  );
  assert.equal(
    receiverLast.headers["content-type"],
    "application/json",
  );
  assert.equal(
    receiverLast.headers["x-void-payload-sha256"],
    validSha,
  );
  assert.equal(
    receiverLast.headers["user-agent"],
    "void-ai-agent-public-gateway-v1",
  );
  assert.deepEqual(receiverLast.body, validBody);

  const unknownPost = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: "/unknown-mutation",
    body: Buffer.from("{}"),
    headers: {
      "content-type": "application/json",
      "content-length": "2",
    },
  });
  assert.equal(unknownPost.status, 405);
  assert.equal(unknownPost.headers.allow, "GET, HEAD");
  assert.equal(
    receiverRequests.length,
    1,
    "generic mutation reached the receiver",
  );

  console.log(
    "VOID_OPERATOR_WEBHOOK_RECEIVER_GATEWAY_INTEGRATION_V1_GREEN",
  );
  console.log("exact_route=1");
  console.log("disabled_without_upstream=1");
  console.log("bearer_header_required=1");
  console.log("payload_sha256_binding=1");
  console.log("maximum_body_bytes=65536");
  console.log("redirect_following=0");
  console.log("set_cookie_forwarding=0");
  console.log("location_forwarding=0");
  console.log("generic_mutation=0");
  console.log("rpc_mutation=0");
  console.log("money_movement=0");
} finally {
  if (enabledGateway) {
    await stopGateway(enabledGateway).catch(() => {});
  }
  if (disabledGateway) {
    await stopGateway(disabledGateway).catch(() => {});
  }
  await close(receiver).catch(() => {});
}
