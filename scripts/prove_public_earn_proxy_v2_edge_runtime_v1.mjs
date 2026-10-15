#!/usr/bin/env node
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";
import {
  readVoidPublicEarnProxyV2RateStateV1,
} from "../tools/void-public-earn-proxy-v2-rate-state-v1.mjs";

const ROOT = process.cwd();
const edgeSource = fs.readFileSync(
  path.join(ROOT, "ops", "public", "void-public-earn-proxy-v2-edge-v1.mjs"),
  "utf8",
);
assert.match(edgeSource, /socket\.on\("error", onClientError\)/u);
assert.match(edgeSource, /clientSocket\.once\("close", onClientClose\)/u);
assert.match(edgeSource, /public_earn_edge_client_disconnected/u);
const EDGE = path.join(
  ROOT,
  "ops",
  "public",
  "void-public-earn-proxy-v2-edge-v1.mjs",
);
const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function proxy4(source, sourcePort = 50000) {
  const octets = source.split(".").map(Number);
  assert.equal(octets.length, 4);
  const address = Buffer.alloc(12);
  address.set(octets, 0);
  address.set([127, 0, 0, 1], 4);
  address.writeUInt16BE(sourcePort, 8);
  address.writeUInt16BE(443, 10);
  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x11;
  header.writeUInt16BE(address.length, 14);
  return Buffer.concat([header, address]);
}

function requestParts({
  source,
  sourcePort = 50000,
  target,
  body = Buffer.from("{}\n", "utf8"),
  authorization = null,
  extraHeaders = [],
  declaredLength = null,
  includeProxy = true,
}) {
  const headers = [
    "POST " + target + " HTTP/1.1",
    "Host: public.example",
    "Content-Type: application/json",
    "Content-Length: " +
      String(declaredLength === null ? body.length : declaredLength),
    ...(authorization === null
      ? []
      : ["Authorization: " + authorization]),
    ...extraHeaders,
    "Connection: close",
    "",
    "",
  ];
  return Object.freeze({
    head: Buffer.concat([
      includeProxy ? proxy4(source, sourcePort) : Buffer.alloc(0),
      Buffer.from(headers.join("\r\n"), "ascii"),
    ]),
    body,
  });
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

async function sendRawChunks(port, chunks) {
  const socket = net.createConnection({
    host: "127.0.0.1",
    port,
  });
  socket.setNoDelay(true);
  const received = [];
  socket.on("data", (chunk) => received.push(Buffer.from(chunk)));
  await once(socket, "connect");

  for (const [index, chunk] of chunks.entries()) {
    socket.write(chunk);
    if (index + 1 < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  await once(socket, "close");
  const response = Buffer.concat(received).toString("utf8");
  const split = response.indexOf("\r\n\r\n");
  assert.ok(split > 0, response);
  const head = response.slice(0, split);
  const body = response.slice(split + 4);
  const match = /^HTTP\/1\.1 (\d{3}) /u.exec(head);
  assert.ok(match, response);
  return Object.freeze({
    status: Number(match[1]),
    head,
    body,
  });
}

async function sendRequest(port, options, { splitBody = false } = {}) {
  const parts = requestParts(options);
  return sendRawChunks(
    port,
    splitBody
      ? [parts.head, parts.body]
      : [Buffer.concat([parts.head, parts.body])],
  );
}

async function resetAfterAdapterAdmission(
  port,
  options,
  expectedAdapterCalls,
) {
  const parts = requestParts(options);
  const socket = net.createConnection({
    host: "127.0.0.1",
    port,
  });
  socket.setNoDelay(true);
  socket.on("error", () => {});
  await once(socket, "connect");
  socket.write(Buffer.concat([parts.head, parts.body]));
  for (
    let index = 0;
    index < 160 && adapterCalls.length < expectedAdapterCalls;
    index += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(
    adapterCalls.length >= expectedAdapterCalls,
    true,
    "reset fixture must reach delayed adapter before reset",
  );
  assert.equal(
    typeof socket.resetAndDestroy,
    "function",
    "supported Node runtimes must expose resetAndDestroy",
  );
  const closed = once(socket, "close");
  socket.resetAndDestroy();
  await closed;
}

function startEdge({
  port,
  adapterPort,
  stateFile,
}) {
  const logs = [];
  const child = spawn(process.execPath, [EDGE], {
    cwd: ROOT,
    env: {
      ...process.env,
      VOID_PUBLIC_EARN_PROXY_V2_EDGE_PROOF_MODE: "1",
      VOID_PUBLIC_EARN_PROXY_V2_EDGE_PORT: String(port),
      VOID_PUBLIC_EARN_PROXY_V2_ADAPTER_UPSTREAM:
        "http://127.0.0.1:" + String(adapterPort),
      VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_FILE: stateFile,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) =>
    logs.push(chunk.toString("utf8")),
  );
  child.stderr.on("data", (chunk) =>
    logs.push(chunk.toString("utf8")),
  );
  return { child, logs };
}

async function ready(runtime) {
  for (let index = 0; index < 160; index += 1) {
    if (runtime.child.exitCode !== null) {
      throw new Error(runtime.logs.join(""));
    }
    for (const line of runtime.logs
      .join("")
      .split(/\r?\n/u)
      .filter(Boolean)) {
      try {
        const value = JSON.parse(line);
        if (
          value?.marker ===
            "VOID_PUBLIC_EARN_PROXY_V2_EDGE_RUNTIME_V1" &&
          value.ready === true
        ) {
          return value;
        }
      } catch (error) {
        void error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    "public Earn edge readiness timeout: " +
      runtime.logs.join(""),
  );
}

async function stop(runtime) {
  if (runtime.child.exitCode !== null) return;
  const exit = once(runtime.child, "exit");
  runtime.child.kill("SIGTERM");
  await exit;
}

const adapterCalls = [];
let delayNextAdapterResponse = false;
const adapter = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const call = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body,
  };
  adapterCalls.push(call);
  if (delayNextAdapterResponse) {
    delayNextAdapterResponse = false;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  let status = 202;
  let payload = { ok: true, accepted: true };
  if (
    req.url === VOID_PUBLIC_EARN_CLAIM_PATH_V1 &&
    req.headers.authorization
  ) {
    status = 400;
    payload = {
      ok: false,
      error: "claim_authorization_header_not_allowed",
    };
  }
  if (
    req.url === VOID_PUBLIC_EARN_SUBMIT_PATH_V1 &&
    !req.headers.authorization
  ) {
    status = 401;
    payload = {
      ok: false,
      error: "earning_capability_authorization_required",
    };
  }

  const bytes = Buffer.from(
    JSON.stringify(payload) + "\n",
    "utf8",
  );
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(bytes.length),
    "cache-control": "no-store",
  });
  res.end(bytes);
});

const adapterPort = await listen(adapter);
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-earn-edge-v1-"),
);
fs.chmodSync(root, 0o700);
const stateFile = path.join(root, "rate-state.json");

try {
  let runtime = startEdge({
    port: 0,
    adapterPort,
    stateFile,
  });
  let info = await ready(runtime);

  assert.equal(info.host, "127.0.0.1");
  assert.equal(info.exact_claim_submit_post_only, true);
  assert.equal(info.proxy_v2_required, true);
  assert.equal(info.http_parser_stream_binding_proven, true);
  assert.equal(info.durable_rate_state_source_proven, true);
  assert.equal(info.admitted_event_persisted_before_forward, true);
  assert.equal(info.source_identity_forwarded_downstream, false);
  assert.equal(info.route_body_capability_checks_modified, false);
  assert.equal(info.existing_inner_adapter_limiter_modified, false);
  assert.equal(info.connector_process_identity_proven, false);
  assert.equal(info.installed_listener_ownership_proven, false);
  assert.equal(info.live_state_custody_proven, false);
  assert.equal(info.local_transport_trust_proven, false);
  assert.equal(info.runtime_integration, false);
  assert.equal(info.work_credit_write, false);
  assert.equal(info.funds_movement, false);

  const firstClaim = await sendRequest(
    info.port,
    {
      source: "203.0.113.10",
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
      extraHeaders: [
        "Forwarded: for=198.51.100.9",
        "X-Forwarded-For: 198.51.100.9",
        "X-Real-IP: 198.51.100.9",
      ],
    },
    { splitBody: true },
  );
  assert.equal(firstClaim.status, 202);
  assert.equal(adapterCalls.length, 1);
  assert.equal(adapterCalls[0].url, VOID_PUBLIC_EARN_CLAIM_PATH_V1);
  assert.equal(adapterCalls[0].headers.forwarded, undefined);
  assert.equal(adapterCalls[0].headers["x-forwarded-for"], undefined);
  assert.equal(adapterCalls[0].headers["x-real-ip"], undefined);

  for (let index = 1; index < 6; index += 1) {
    const response = await sendRequest(info.port, {
      source: "203.0.113.10",
      sourcePort: 50000 + index,
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    });
    assert.equal(response.status, 202);
  }
  assert.equal(adapterCalls.length, 6);

  const claimLimited = await sendRequest(info.port, {
    source: "203.0.113.10",
    sourcePort: 59999,
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  });
  assert.equal(claimLimited.status, 429);
  assert.equal(adapterCalls.length, 6);

  const otherSourceClaim = await sendRequest(info.port, {
    source: "203.0.113.11",
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  });
  assert.equal(otherSourceClaim.status, 202);
  assert.equal(adapterCalls.length, 7);

  const claimWithAuthorization = await sendRequest(info.port, {
    source: "203.0.113.12",
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    authorization: "Bearer preserved_for_downstream_rejection",
  });
  assert.equal(claimWithAuthorization.status, 400);
  assert.equal(adapterCalls.length, 8);
  assert.equal(
    adapterCalls.at(-1).headers.authorization,
    "Bearer preserved_for_downstream_rejection",
  );

  const submitIndependent = await sendRequest(info.port, {
    source: "203.0.113.10",
    target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
    authorization: "Bearer submit_capability_shape",
  });
  assert.equal(submitIndependent.status, 202);
  assert.equal(adapterCalls.length, 9);
  assert.equal(
    adapterCalls.at(-1).headers.authorization,
    "Bearer submit_capability_shape",
  );

  const submitSpamStart = adapterCalls.length;
  for (let index = 0; index < 30; index += 1) {
    const response = await sendRequest(info.port, {
      source: "203.0.113.20",
      sourcePort: 53000 + index,
      target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
    });
    assert.equal(response.status, 401);
  }
  assert.equal(adapterCalls.length, submitSpamStart + 30);

  const submitSpamLimited = await sendRequest(info.port, {
    source: "203.0.113.20",
    sourcePort: 53999,
    target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  });
  assert.equal(submitSpamLimited.status, 429);
  assert.equal(adapterCalls.length, submitSpamStart + 30);

  const callsBeforeWrongRoute = adapterCalls.length;
  const wrongRoute = await sendRequest(info.port, {
    source: "203.0.113.30",
    target: "/wc/public-earning-pilot-v1/other",
  });
  assert.equal(wrongRoute.status, 400);
  assert.equal(adapterCalls.length, callsBeforeWrongRoute);

  const direct = requestParts({
    source: "203.0.113.31",
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    includeProxy: false,
  });
  const directResponse = await sendRawChunks(
    info.port,
    [Buffer.concat([direct.head, direct.body])],
  );
  assert.equal(directResponse.status, 400);
  assert.equal(adapterCalls.length, callsBeforeWrongRoute);

  const callsBeforeOversizedClaim = adapterCalls.length;
  const oversizedClaim = requestParts({
    source: "203.0.113.40",
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    body: Buffer.alloc(0),
    declaredLength: 64 * 1024 + 1,
  });
  const oversizedClaimResponse = await sendRawChunks(
    info.port,
    [oversizedClaim.head],
  );
  assert.equal(oversizedClaimResponse.status, 413);
  assert.equal(adapterCalls.length, callsBeforeOversizedClaim);

  delayNextAdapterResponse = true;
  const callsBeforeReset = adapterCalls.length;
  await resetAfterAdapterAdmission(
    info.port,
    {
      source: "203.0.113.41",
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    },
    callsBeforeReset + 1,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    runtime.child.exitCode,
    null,
    "client reset after admission must not terminate Earn edge process",
  );
  const afterReset = await sendRequest(info.port, {
    source: "203.0.113.42",
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  });
  assert.equal(afterReset.status, 202);
  assert.equal(adapterCalls.length, callsBeforeReset + 2);

  const persisted = readVoidPublicEarnProxyV2RateStateV1(
    stateFile,
  );
  assert.equal(
    persisted.some(
      (event) =>
        event.route === "submit" &&
        event.source_key.length > 0,
    ),
    true,
  );

  await stop(runtime);
  runtime = startEdge({
    port: 0,
    adapterPort,
    stateFile,
  });
  info = await ready(runtime);

  const replay = await sendRequest(info.port, {
    source: "203.0.113.10",
    sourcePort: 62000,
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  });
  assert.equal(replay.status, 429);
  await stop(runtime);

  console.log("VOID_PUBLIC_EARN_PROXY_V2_EDGE_RUNTIME_V1_GREEN");
  console.log("proxy_v2_http_stream_bound=true");
  console.log("header_body_handoff_bound=true");
  console.log("exact_claim_submit_only=true");
  console.log("durable_rate_debit_before_forward=true");
  console.log("source_port_rotation_does_not_reset_claim_bucket=true");
  console.log("source_a_exhaustion_does_not_deny_source_b=true");
  console.log("claim_submit_buckets_independent=true");
  console.log("spoofable_source_headers_forwarded=false");
  console.log("claim_authorization_check_preserved_downstream=true");
  console.log("submit_authorization_check_preserved_downstream=true");
  console.log("unauthenticated_submit_spam_outer_limited=true");
  console.log("generic_mutation_route_forwarded=false");
  console.log("restart_rate_state_preserved=true");
  console.log("post_admission_client_reset_process_survives=true");
  console.log("connector_process_identity_proven=false");
  console.log("installed_listener_ownership_proven=false");
  console.log("live_state_custody_proven=false");
  console.log("local_transport_trust_proven=false");
  console.log("tailscale_funnel_configuration_verified=false");
  console.log("runtime_integration=false");
  console.log("work_credit_write=false");
  console.log("funds_movement=false");
} finally {
  await new Promise((resolve, reject) =>
    adapter.close((error) =>
      error ? reject(error) : resolve(),
    ),
  );
  fs.rmSync(root, { recursive: true, force: true });
}
