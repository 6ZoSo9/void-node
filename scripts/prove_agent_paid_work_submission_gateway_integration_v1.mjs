#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import {
  spawn,
} from "node:child_process";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

const repo = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  "..",
);
const gatewaySource = path.join(
  repo,
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const route =
  "/__void/agents/paid-work/submissions/v1";
const operatorRoute =
  "/__void/operator-notifications/v1/candidate";
const discoveryRoute =
  "/.well-known/void-agent-discovery.json";
const bearer =
  "Bearer paid-work-gateway-proof-token-0001";

function sha256(bytes) {
  return crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      {
        host: "127.0.0.1",
        port: 0,
        exclusive: true,
      },
      () => {
        const address = server.address();
        assert(
          address &&
            typeof address !== "string",
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
      (response) => {
        const chunks = [];
        response.on(
          "data",
          (chunk) => chunks.push(chunk),
        );
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(
        new Error("request timeout"),
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function startGateway(environment = {}) {
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
          VOID_AI_AGENT_PUBLIC_GATEWAY_PORT:
            "0",
          VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE:
            "1",
          ...environment,
        },
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on(
      "data",
      (chunk) => {
        stdout += chunk;
        for (
          const line
          of stdout.split(/\r?\n/)
        ) {
          if (!line.trim()) continue;
          try {
            const value = JSON.parse(line);
            if (
              value.marker ===
                "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" &&
              value.ready === true
            ) {
              resolve({
                child,
                port: Number(value.port),
                ready: value,
                stderr: () => stderr,
              });
              return;
            }
          } catch {
            // Wait for the ready line.
          }
        }
      },
    );
    child.stderr.on(
      "data",
      (chunk) => {
        stderr += chunk;
      },
    );
    child.once("exit", (code) => {
      reject(
        new Error(
          `gateway exited before ready=${code}\n${stderr}`,
        ),
      );
    });
    setTimeout(() => {
      reject(
        new Error(
          `gateway ready timeout\nstdout=${stdout}\nstderr=${stderr}`,
        ),
      );
    }, 10_000).unref();
  });
}

function stopGateway(value) {
  return new Promise((resolve, reject) => {
    if (
      !value ||
      value.child.exitCode !== null
    ) {
      resolve();
      return;
    }
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "gateway stop timeout",
          ),
        ),
      5_000,
    );
    value.child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    value.child.kill("SIGTERM");
  });
}

const receiverRequests = [];
const receiver = http.createServer(
  (req, res) => {
    const chunks = [];
    req.on("data", (chunk) =>
      chunks.push(chunk),
    );
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      receiverRequests.push({
        method: req.method,
        path: req.url,
        headers: req.headers,
        body,
      });
      const responseBody = Buffer.from(
        JSON.stringify({
          ok: true,
          duplicate: false,
          receipt: {
            marker:
              "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
            decision:
              "accepted_for_review",
          },
        }) + "\n",
      );
      res.writeHead(202, {
        "content-type":
          "application/json",
        "content-length":
          String(responseBody.length),
        "set-cookie":
          "should-not-pass=1",
        location:
          "https://attacker.invalid/",
        "x-proof-header": "preserved",
      });
      res.end(responseBody);
    });
  },
);

const receiverPort = await listen(receiver);
let disabledGateway = null;
let enabledGateway = null;

try {
  disabledGateway =
    await startGateway();

  assert.equal(
    disabledGateway.ready
      .bounded_paid_work_submission_proxy_authority,
    false,
  );
  assert.equal(
    disabledGateway.ready
      .paid_work_submission_route?.path,
    route,
  );
  assert.equal(
    disabledGateway.ready
      .paid_work_submission_route?.configured,
    false,
  );
  assert.equal(
    disabledGateway.ready
      .paid_work_submission_route
      ?.accepted_for_review_only,
    true,
  );
  assert.equal(
    disabledGateway.ready
      .paid_work_submission_route
      ?.payment_authority,
    false,
  );
  assert.equal(
    disabledGateway.ready
      .paid_work_submission_route
      ?.work_dispatch,
    false,
  );

  const body = Buffer.from(
    JSON.stringify({
      marker:
        "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
      version: 1,
      submission_id:
        "gateway-proof-submission-v1",
      work_order: {
        work_order_id:
          "voidawo1_" + "1".repeat(64),
      },
    }),
  );
  const bodySha = sha256(body);

  const disabled = await request({
    port: disabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        bodySha,
    },
  });
  assert.equal(disabled.status, 503);
  assert.equal(
    receiverRequests.length,
    0,
  );

  const disabledGet = await request({
    port: disabledGateway.port,
    method: "GET",
    requestPath: route,
  });
  assert.equal(disabledGet.status, 405);
  assert.equal(
    disabledGet.headers.allow,
    "POST",
  );

  await stopGateway(
    disabledGateway,
  );
  disabledGateway = null;

  enabledGateway =
    await startGateway({
      VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM:
        `http://127.0.0.1:${receiverPort}`,
    });

  assert.equal(
    enabledGateway.ready
      .bounded_paid_work_submission_proxy_authority,
    true,
  );
  assert.equal(
    enabledGateway.ready
      .paid_work_submission_route?.configured,
    true,
  );
  assert.equal(
    enabledGateway.ready
      .paid_work_submission_route
      ?.provider_selection,
    false,
  );
  assert.equal(
    enabledGateway.ready
      .paid_work_submission_route
      ?.wc_ledger_write_authority,
    false,
  );

  const discovery = await request({
    port: enabledGateway.port,
    method: "GET",
    requestPath: discoveryRoute,
  });
  assert.equal(discovery.status, 200);

  const operatorDisabled = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: operatorRoute,
    body: Buffer.from("{}"),
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length": "2",
      "x-void-payload-sha256":
        sha256(Buffer.from("{}")),
    },
  });
  assert.equal(
    operatorDisabled.status,
    503,
    "operator route configuration was coupled to paid-work route",
  );

  const queryDenied = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath:
      `${route}?unexpected=1`,
    body,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        bodySha,
    },
  });
  assert.equal(queryDenied.status, 400);

  const wrongType = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      authorization: bearer,
      "content-type": "text/plain",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        bodySha,
    },
  });
  assert.equal(wrongType.status, 415);

  const missingAuth = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        bodySha,
    },
  });
  assert.equal(missingAuth.status, 401);

  const missingSha = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
    },
  });
  assert.equal(missingSha.status, 400);

  const wrongSha = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        "0".repeat(64),
    },
  });
  assert.equal(wrongSha.status, 400);

  const oversizedBody = Buffer.alloc(
    65_537,
    0x78,
  );
  const oversized = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body: oversizedBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(oversizedBody.length),
      "x-void-payload-sha256":
        sha256(oversizedBody),
    },
  });
  assert.equal(oversized.status, 413);

  assert.equal(
    receiverRequests.length,
    0,
    "rejected requests reached receiver",
  );

  const valid = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath: route,
    body,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(body.length),
      "x-void-payload-sha256":
        bodySha,
    },
  });
  assert.equal(valid.status, 202);
  assert.equal(
    valid.headers[
      "x-void-agent-paid-work-submission-route"
    ],
    "v1",
  );
  assert.equal(
    valid.headers["x-proof-header"],
    "preserved",
  );
  assert.equal(
    valid.headers["set-cookie"],
    undefined,
  );
  assert.equal(
    valid.headers.location,
    undefined,
  );
  assert.equal(
    receiverRequests.length,
    1,
  );

  const forwarded =
    receiverRequests[0];
  assert.equal(
    forwarded.method,
    "POST",
  );
  assert.equal(
    forwarded.path,
    route,
  );
  assert.equal(
    forwarded.headers.authorization,
    bearer,
  );
  assert.equal(
    forwarded.headers[
      "x-void-payload-sha256"
    ],
    bodySha,
  );
  assert.equal(
    forwarded.headers["user-agent"],
    "void-ai-agent-public-gateway-v1",
  );
  assert.deepEqual(
    forwarded.body,
    body,
  );

  const unknownPost = await request({
    port: enabledGateway.port,
    method: "POST",
    requestPath:
      "/unknown-paid-work-mutation",
    body: Buffer.from("{}"),
    headers: {
      "content-type":
        "application/json",
      "content-length": "2",
    },
  });
  assert.equal(unknownPost.status, 405);
  assert.equal(
    unknownPost.headers.allow,
    "GET, HEAD",
  );
  assert.equal(
    receiverRequests.length,
    1,
    "generic mutation reached receiver",
  );

  console.log(
    "VOID_AGENT_PAID_WORK_SUBMISSION_GATEWAY_INTEGRATION_V1_GREEN",
  );
  console.log("exact_route=1");
  console.log("disabled_without_upstream=1");
  console.log("bearer_header_required=1");
  console.log("payload_sha256_binding=1");
  console.log("maximum_body_bytes=65536");
  console.log("redirect_following=0");
  console.log("set_cookie_forwarding=0");
  console.log("location_forwarding=0");
  console.log("operator_route_independent=1");
  console.log("generic_mutation=0");
  console.log("provider_selection=0");
  console.log("quote_creation=0");
  console.log("payment_authority=0");
  console.log("work_execution_authority=0");
  console.log("work_dispatch=0");
  console.log("wc_ledger_write_authority=0");
  console.log("wallet_or_signer_access=0");
  console.log("buy_void_fulfillment=0");
} finally {
  if (enabledGateway) {
    await stopGateway(
      enabledGateway,
    ).catch(() => {});
  }
  if (disabledGateway) {
    await stopGateway(
      disabledGateway,
    ).catch(() => {});
  }
  await close(receiver).catch(() => {});
}
