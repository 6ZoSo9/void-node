#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import {
  Hold,
  loadProfile,
  httpGetViaSocks,
  runClient,
  validateOnionHostname,
  validateProfile,
  verifyBinding,
  verifyDescriptor,
} from "../tools/void-tor-agent-access-client-v1.mjs";

const FIXED_NOW = Date.parse("2026-07-31T08:45:00.000Z");
const DURABLE_NOW = Date.parse("2026-08-30T08:45:00.000Z");
const ONION = "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion";
const ROOT = new URL("../", import.meta.url);

function bytes(path) {
  return readFileSync(new URL(path, ROOT));
}

function json(path) {
  return JSON.parse(bytes(path).toString("utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function expectHold(fn, pattern) {
  let held = false;
  try {
    fn();
  } catch (error) {
    held = true;
    assert(error instanceof Hold);
    assert.match(error.message, pattern);
  }
  assert.equal(held, true, `expected Hold matching ${pattern}`);
}

async function expectAsyncHold(fn, pattern) {
  let held = false;
  try {
    await fn();
  } catch (error) {
    held = true;
    assert(error instanceof Hold);
    assert.match(error.message, pattern);
  }
  assert.equal(held, true, `expected async Hold matching ${pattern}`);
}

function waitReadable(socket) {
  return new Promise((resolve, reject) => {
    const onReadable = () => done(resolve);
    const onEnd = () => done(() => reject(new Error("socket ended early")));
    const onClose = () => done(() => reject(new Error("socket closed early")));
    const onError = (error) => done(() => reject(error));
    const cleanup = () => {
      socket.off("readable", onReadable);
      socket.off("end", onEnd);
      socket.off("close", onClose);
      socket.off("error", onError);
    };
    const done = (callback) => {
      cleanup();
      callback();
    };
    socket.once("readable", onReadable);
    socket.once("end", onEnd);
    socket.once("close", onClose);
    socket.once("error", onError);
  });
}

async function readExact(socket, length) {
  const chunks = [];
  let total = 0;
  while (total < length) {
    const chunk = socket.read(length - total);
    if (chunk !== null) {
      chunks.push(chunk);
      total += chunk.length;
      continue;
    }
    await waitReadable(socket);
  }
  return Buffer.concat(chunks, total);
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function closeServer(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

function descriptorWithTimestamp(fixture, value) {
  const clone = structuredClone(fixture);
  clone.generated_at = value;
  return Buffer.from(`${JSON.stringify(clone, null, 2)}\n`, "utf8");
}

function writeResponse(response, status, body, type = "application/json; charset=utf-8") {
  response.sendDate = false;
  response.writeHead(status, {
    "content-type": type,
    "content-length": String(body.length),
    "cache-control": "no-store",
    connection: "close",
  });
  response.end(body);
}

async function startFixtureEnvironment({ corruptQuote = false, failFirstConnects = 0 } = {}) {
  const binding = bytes("fixtures/tor-agent-access/node-onion-binding-v1.fixture.json");
  const descriptor = json("fixtures/tor-agent-access/void-tor-onion-transport-v1.fixture.json");
  const mcp = json("fixtures/tor-agent-access/void-agent-mcp-onion-v1.fixture.json");
  const indexBody = bytes("fixtures/tor-agent-access/datanet-index-v1.fixture.json");
  const quoteBodyOriginal = bytes("fixtures/tor-agent-access/paid-read-quote-v1.fixture.json");
  const quoteBody = corruptQuote
    ? Buffer.concat([quoteBodyOriginal.subarray(0, quoteBodyOriginal.length - 2), Buffer.from(" \n")])
    : quoteBodyOriginal;
  const schemaBody = bytes("fixtures/tor-agent-access/paid-read-quote-v1.schema.fixture.json");

  const requestLog = [];
  const httpServer = http.createServer((request, response) => {
    requestLog.push({ method: request.method, url: request.url, host: request.headers.host });
    const path = request.url;
    if (request.method !== "GET") {
      writeResponse(response, 405, Buffer.from("method not allowed\n"), "text/plain; charset=utf-8");
      return;
    }
    if (path === "/.well-known/void-node-onion-binding-v1.json"
      || path === "/public-node/transports/tor-v1-binding.json") {
      writeResponse(response, 200, binding);
      return;
    }
    if (path === "/.well-known/void-tor-onion-transport-v1.json") {
      writeResponse(response, 200, descriptorWithTimestamp(descriptor, "2026-07-31T08:42:15.000Z"));
      return;
    }
    if (path === "/public-node/transports/tor-v1.json") {
      writeResponse(response, 200, descriptorWithTimestamp(descriptor, "2026-07-31T08:42:16.000Z"));
      return;
    }
    if (path === "/.well-known/void-agent-mcp-onion-v1.json") {
      writeResponse(response, 200, descriptorWithTimestamp(mcp, "2026-07-31T08:42:17.000Z"));
      return;
    }
    if (path === "/public-node/agents/mcp-tor-v1.json") {
      writeResponse(response, 200, descriptorWithTimestamp(mcp, "2026-07-31T08:42:18.000Z"));
      return;
    }
    if (path === "/public-node/datanet/index.json") {
      writeResponse(response, 200, indexBody);
      return;
    }
    if (path === "/public-node/datanet/paid-read-quote-v1.json") {
      writeResponse(response, 200, quoteBody);
      return;
    }
    if (path === "/public-node/datanet/paid-read-quote-v1.schema.json") {
      writeResponse(response, 200, schemaBody);
      return;
    }
    writeResponse(response, 404, Buffer.from("not found\n"), "text/plain; charset=utf-8");
  });
  const httpPort = await listen(httpServer);

  const socksLog = [];
  let socksConnectionCount = 0;
  const socksServer = net.createServer((client) => {
    void (async () => {
      const greeting = await readExact(client, 3);
      assert.deepEqual([...greeting], [0x05, 0x01, 0x00]);
      client.write(Buffer.from([0x05, 0x00]));
      const header = await readExact(client, 5);
      assert.deepEqual([...header.subarray(0, 4)], [0x05, 0x01, 0x00, 0x03]);
      const domainLength = header[4];
      const tail = await readExact(client, domainLength + 2);
      const hostname = tail.subarray(0, domainLength).toString("ascii");
      const port = tail.readUInt16BE(domainLength);
      socksConnectionCount += 1;
      socksLog.push({ atyp: header[3], hostname, port, connection: socksConnectionCount });
      if (socksConnectionCount <= failFirstConnects) {
        client.end(Buffer.from([0x05, 0x04, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        return;
      }
      const upstream = net.createConnection({ host: "127.0.0.1", port: httpPort });
      await once(upstream, "connect");
      client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
      client.pipe(upstream);
      upstream.pipe(client);
      upstream.once("error", () => client.destroy());
      client.once("error", () => upstream.destroy());
    })().catch((error) => { console.error("fixture_socks_error", error); client.destroy(); });
  });
  const socksPort = await listen(socksServer);

  return {
    httpServer,
    socksServer,
    socksPort,
    socksLog,
    requestLog,
    async close() {
      await closeServer(socksServer);
      await closeServer(httpServer);
    },
  };
}

const loaded = loadProfile(new URL("config/void-tor-agent-access-client-v1.json", ROOT));
assert.equal(validateOnionHostname(ONION), ONION);
assert.equal(loaded.profile.marker, "VOID_TOR_AGENT_ACCESS_CLIENT_PROFILE_V1");
assert.equal(loaded.profile.trust.binding_sha256, sha256(bytes("fixtures/tor-agent-access/node-onion-binding-v1.fixture.json")));

const binding = json("fixtures/tor-agent-access/node-onion-binding-v1.fixture.json");
const summary = verifyBinding(binding, loaded.profile, { nowMs: FIXED_NOW });
assert.equal(summary.nodeId, loaded.profile.trust.node_id);
assert.equal(summary.onionHostname, ONION);

const durableDescriptor = json("fixtures/tor-agent-access/void-tor-onion-transport-v1.fixture.json");
const durableDescriptorSummary = verifyDescriptor(
  durableDescriptor,
  summary,
  loaded.profile,
  { nowMs: DURABLE_NOW },
);
assert.equal(durableDescriptorSummary.generatedAt, durableDescriptor.generated_at);

const additiveOrderStatusDescriptor = structuredClone(durableDescriptor);
additiveOrderStatusDescriptor.agent_surfaces.order_status_readonly_v1 = {
  marker: "VOID_TOR_ORDER_STATUS_READONLY_V1",
  status: "active",
  reason: null,
  uri_template: `http://${ONION}/public-agent/services/v1/orders/:submission_id/status.json`,
  descriptor_paths: [
    "/.well-known/void-order-status-onion-v1.json",
    "/public-node/agents/order-status-tor-v1.json",
  ],
  methods: ["GET"],
  application_authority: "read_only",
};
const additiveSummary = verifyDescriptor(
  additiveOrderStatusDescriptor,
  summary,
  loaded.profile,
  { nowMs: DURABLE_NOW },
);
assert.equal(additiveSummary.mcpSurface.marker, "VOID_TOR_AGENT_MCP_READONLY_V1");

const malformedOrderStatusDescriptor = structuredClone(additiveOrderStatusDescriptor);
malformedOrderStatusDescriptor.agent_surfaces.order_status_readonly_v1.methods = ["POST"];
expectHold(
  () => verifyDescriptor(
    malformedOrderStatusDescriptor,
    summary,
    loaded.profile,
    { nowMs: DURABLE_NOW },
  ),
  /order-status agent surface/,
);

const unknownAgentSurfaceDescriptor = structuredClone(additiveOrderStatusDescriptor);
unknownAgentSurfaceDescriptor.agent_surfaces.unreviewed_surface_v1 = {
  marker: "UNREVIEWED",
};
expectHold(
  () => verifyDescriptor(
    unknownAgentSurfaceDescriptor,
    summary,
    loaded.profile,
    { nowMs: DURABLE_NOW },
  ),
  /unreviewed_surface_v1 is not allowed/,
);

const futureDescriptor = structuredClone(durableDescriptor);
futureDescriptor.generated_at = "2026-07-31T08:47:01.000Z";
expectHold(
  () => verifyDescriptor(futureDescriptor, summary, loaded.profile, { nowMs: FIXED_NOW }),
  /unreasonably in the future/,
);

const tampered = structuredClone(binding);
tampered.signature.value = `${tampered.signature.value.slice(0, -2)}AA`;
expectHold(() => verifyBinding(tampered, loaded.profile, { nowMs: FIXED_NOW }), /signature/);

const wrongFingerprint = structuredClone(loaded.profile);
wrongFingerprint.trust.public_key_fingerprint_sha256 = "0".repeat(64);
expectHold(() => verifyBinding(binding, wrongFingerprint, { nowMs: FIXED_NOW }), /fingerprint/);

const invalidOnion = structuredClone(loaded.profile);
invalidOnion.transport.onion_hostname = `${"a".repeat(56)}.onion`;
expectHold(() => validateProfile(invalidOnion), /checksum|payload/);

const nonLoopback = structuredClone(loaded.profile);
nonLoopback.transport.socks_proxy.host = "192.0.2.10";
expectHold(() => validateProfile(nonLoopback), /127\.0\.0\.1 or ::1/);

const environment = await startFixtureEnvironment();
try {
  const profile = structuredClone(loaded.profile);
  profile.transport.socks_proxy.port = environment.socksPort;
  profile.limits.request_timeout_ms = 3000;
  const receipt = await runClient(profile, {
    nowMs: DURABLE_NOW,
    profileFileSha256: loaded.sha256,
  });
  assert.equal(receipt.marker, "VOID_TOR_AGENT_ACCESS_CLIENT_V1_RECEIPT");
  assert.equal(receipt.status, "green");
  assert.equal(receipt.transport.remote_dns, true);
  assert.equal(receipt.transport.local_onion_dns_resolution, false);
  assert.equal(receipt.identity.ed25519_signature_verified, true);
  assert.equal(receipt.identity.onion_v3_checksum_verified, true);
  assert.equal(receipt.identity.binding_aliases_byte_identical, true);
  assert.equal(receipt.identity.descriptor_aliases_semantically_identical, true);
  assert.equal(receipt.identity.descriptor_timestamp_policy, "chronology-only-not-session-freshness");
  assert.deepEqual(receipt.identity.descriptor_generated_at, [
    "2026-07-31T08:42:15.000Z",
    "2026-07-31T08:42:16.000Z",
  ]);
  assert.equal(receipt.capabilities.required.length, 3);
  assert(receipt.capabilities.required.every((item) => item.status === "exact"));
  assert.equal(receipt.capabilities.optional.length, 5);
  assert(receipt.capabilities.optional.every((item) => item.status === "unavailable"));
  assert.equal(receipt.capabilities.discovery_parity, "absent");
  assert.equal(receipt.capabilities.mcp_readonly.status, "advertised");
  assert.equal(receipt.capabilities.mcp_readonly.execution_proven, false);
  assert.equal(receipt.summary.mutation_authority_granted, false);
  assert.equal(receipt.summary.payment_execution, false);
  assert.equal(receipt.summary.fund_movement, false);
  assert.equal(environment.socksLog.length, 14);
  assert(environment.socksLog.every((item) => item.atyp === 0x03));
  assert(environment.socksLog.every((item) => item.hostname === ONION));
  assert(environment.socksLog.every((item) => item.port === 80));
  assert(environment.requestLog.every((item) => item.host === ONION));
  assert(environment.requestLog.every((item) => item.method === "GET"));
} finally {
  await environment.close();
}


const retryEnvironment = await startFixtureEnvironment({ failFirstConnects: 1 });
try {
  const profile = structuredClone(loaded.profile);
  profile.transport.socks_proxy.port = retryEnvironment.socksPort;
  profile.limits.request_attempts = 2;
  profile.limits.retry_delay_ms = 1;
  profile.limits.request_timeout_ms = 3000;
  const response = await httpGetViaSocks(profile, "/public-node/datanet/index.json");
  assert.equal(response.status, 200);
  assert.equal(response.attempts, 2);
  assert.equal(retryEnvironment.socksLog.length, 2);
} finally {
  await retryEnvironment.close();
}

const corruptEnvironment = await startFixtureEnvironment({ corruptQuote: true });
try {
  const profile = structuredClone(loaded.profile);
  profile.transport.socks_proxy.port = corruptEnvironment.socksPort;
  profile.limits.request_timeout_ms = 3000;
  await expectAsyncHold(
    () => runClient(profile, { nowMs: FIXED_NOW, profileFileSha256: loaded.sha256 }),
    /paid_read_quote body SHA mismatch/,
  );
} finally {
  await corruptEnvironment.close();
}

console.log("VOID_TOR_AGENT_ACCESS_CLIENT_V1_PROOF_GREEN");
console.log("socks5_domain_addressing=true");
console.log("local_onion_dns_resolution=false");
console.log("signed_binding_verified=true");
console.log("bounded_transport_retry_verified=true");
console.log("descriptor_dynamic_timestamp_tolerated=true");
console.log("descriptor_durable_timestamp_policy_verified=true");
console.log("descriptor_future_skew_rejected=true");
console.log("required_route_hash_pins_enforced=true");
console.log("optional_missing_capabilities_reported_honestly=true");
console.log("mcp_descriptor_advertised_not_execution_claimed=true");
console.log("additive_order_status_surface_accepted=true");
console.log("malformed_order_status_surface_rejected=true");
console.log("unknown_agent_surface_rejected=true");
console.log("mutation=false");
console.log("payment_execution=false");
console.log("fund_movement=false");
