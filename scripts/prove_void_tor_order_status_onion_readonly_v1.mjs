#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { signVoidNodeOnionBindingV1 } from "../tools/lib/void-node-onion-binding-v1.mjs";
import { EXAMPLE_SOURCE_V1, materializeOrderStatus } from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";
import { orderStatusRoutePath } from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(ROOT, "tools/void-tor-onion-public-node-v1.mjs");
const MARKER = "VOID_TOR_ORDER_STATUS_READONLY_V1";
const DESCRIPTOR = "/.well-known/void-order-status-onion-v1.json";

function base32(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

function onionHostname(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  const raw = der.subarray(der.length - 32);
  const version = Buffer.from([3]);
  const checksum = createHash("sha3-256")
    .update(Buffer.concat([Buffer.from(".onion checksum"), raw, version]))
    .digest()
    .subarray(0, 2);
  const address = base32(Buffer.concat([raw, checksum, version]));
  assert.equal(address.length, 56);
  return `${address}.onion`;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function request(port, onion, requestPath, method = "GET", headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: { host: onion, connection: "close", ...headers },
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.once("end", () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    req.once("error", reject);
    req.end();
  });
}

function startServer(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`server timeout\nstdout=${stdout}\nstderr=${stderr}`));
    }, 10000);
    const inspect = () => {
      const ready = stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY");
      const match = stdout.match(/(?:^|\n)port=(\d+)(?:\n|$)/);
      if (ready && match) {
        clearTimeout(timer);
        resolve({ child, port: Number(match[1]) });
      }
    };
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); inspect(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("exit", (code) => {
      if (!stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY")) {
        clearTimeout(timer);
        reject(new Error(`server exited ${code}\nstdout=${stdout}\nstderr=${stderr}`));
      }
    });
  });
}

async function stopServer(server) {
  if (!server || server.child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => server.child.kill("SIGKILL"), 5000);
    server.child.once("exit", () => { clearTimeout(timer); resolve(); });
    server.child.kill("SIGTERM");
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "void-tor-order-status-v1-"));
const runtime = path.join(temporary, "runtime");
const publicNode = path.join(runtime, "public", "public-node");
const sourceRoot = path.join(temporary, "order-status");
const hostnameFile = path.join(temporary, "hostname");
const bindingFile = path.join(temporary, "binding.json");
let server = null;
let unconfigured = null;

try {
  await mkdir(publicNode, { recursive: true });
  await mkdir(sourceRoot, { recursive: true });
  await writeFile(path.join(publicNode, "index.json"), `${JSON.stringify({ marker: "VOID_TOR_ORDER_STATUS_FIXTURE", version: 1 }, null, 2)}\n`);

  const sourcePath = path.join(sourceRoot, `${EXAMPLE_SOURCE_V1.submission_id}.json`);
  const sourceBytes = Buffer.from(`${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}\n`);
  await writeFile(sourcePath, sourceBytes, { mode: 0o600 });
  await chmod(sourcePath, 0o600);

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const onion = onionHostname(publicKey);
  await writeFile(hostnameFile, `${onion}\n`, { mode: 0o600 });
  const now = Date.now();
  const binding = signVoidNodeOnionBindingV1({
    nodeId: "void-tor-order-status-fixture-node-v1",
    privateKey,
    publicKey,
    onionHostname: onion,
    virtualPort: 80,
    issuedAt: new Date(now - 60000),
    expiresAt: new Date(now + 86400000),
  });
  await writeFile(bindingFile, `${JSON.stringify(binding, null, 2)}\n`, { mode: 0o600 });

  server = await startServer(runtime, [
    "--host", "127.0.0.1", "--port", "0",
    "--hostname-file", hostnameFile,
    "--binding-file", bindingFile,
    "--virtual-port", "80",
    "--order-status-root", sourceRoot,
    "--order-status-max-concurrent-requests", "2",
  ]);

  const descriptor = await request(server.port, onion, DESCRIPTOR);
  assert.equal(descriptor.status, 200, descriptor.body);
  const descriptorValue = JSON.parse(descriptor.body);
  assert.equal(descriptorValue.marker, MARKER);
  assert.equal(descriptorValue.status, "active");
  assert.deepEqual(descriptorValue.protocol.methods, ["GET"]);
  assert.equal(descriptorValue.security.generic_proxy, false);
  assert.equal(descriptorValue.security.caller_selected_upstream, false);

  const transport = await request(server.port, onion, "/.well-known/void-tor-onion-transport-v1.json");
  assert.equal(transport.status, 200, transport.body);
  assert.equal(JSON.parse(transport.body).agent_surfaces.order_status_readonly_v1.status, "active");

  const route = orderStatusRoutePath(EXAMPLE_SOURCE_V1.submission_id);
  const found = await request(server.port, onion, route);
  assert.equal(found.status, 200, found.body);
  const response = JSON.parse(found.body);
  assert.equal(response.marker, "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_RESPONSE_V1");
  assert.deepEqual(response.order_status, materializeOrderStatus(EXAMPLE_SOURCE_V1));
  assert.equal(found.body.includes(sourceRoot), false);

  const missing = await request(server.port, onion, orderStatusRoutePath("voidawsr1_missing_tor_0001"));
  assert.equal(missing.status, 404, missing.body);
  assert.equal((await request(server.port, onion, route, "HEAD")).status, 405);
  assert.equal((await request(server.port, onion, route, "POST")).status, 405);
  assert.equal((await request(server.port, onion, route, "GET", { authorization: "Bearer no" })).status, 400);
  assert.equal((await request(server.port, onion, route, "GET", { origin: "https://example.invalid" })).status, 403);
  assert.equal((await request(server.port, onion, route, "GET", { host: "wrong.invalid" })).status, 403);
  assert.equal((await request(server.port, onion, `${route}?x=1`)).status, 404);
  assert.equal((await request(server.port, onion, "/public-node/index.json")).status, 200);
  assert.equal(hash(await readFile(sourcePath)), hash(sourceBytes));

  unconfigured = await startServer(runtime, [
    "--host", "127.0.0.1", "--port", "0",
    "--hostname-file", hostnameFile,
    "--binding-file", bindingFile,
    "--virtual-port", "80",
  ]);
  const unavailable = await request(unconfigured.port, onion, DESCRIPTOR);
  assert.equal(unavailable.status, 503);
  assert.equal(JSON.parse(unavailable.body).reason, "order-status-root-not-configured");
  assert.equal((await request(unconfigured.port, onion, route)).status, 503);

  process.stdout.write([
    "VOID_TOR_ORDER_STATUS_ONION_READONLY_V1_PROOF_GREEN",
    `marker=${MARKER}`,
    `route=${route}`,
    "exact_get_only=true",
    "signed_node_onion_binding_required=true",
    "generic_proxy=false",
    "caller_selected_upstream=false",
    "credential_headers_accepted=false",
    "browser_origin_requests_accepted=false",
    "source_bytes_unchanged=true",
    "fixture_loopback_probe=true",
    "live_onion_probe=false",
    "runtime_mutation=false",
    "service_restart=false",
    "tor_install_or_config_change=false",
    "authenticated_submission=false",
    "payment_execution=false",
    "work_credit_write=false",
    "wallet_or_signer_access=false",
    "",
  ].join("\n"));
} catch (error) {
  process.stderr.write("VOID_TOR_ORDER_STATUS_ONION_READONLY_V1_PROOF_FAIL\n");
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await stopServer(server);
  await stopServer(unconfigured);
  await rm(temporary, { recursive: true, force: true });
}
