#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import {
  encodeV3OnionHostname,
} from "../tools/lib/void-tor-onion-descriptor-v1.mjs";
import {
  signVoidNodeOnionBindingV1,
} from "../tools/lib/void-node-onion-binding-v1.mjs";

const MARKER = "VOID_TOR_AGENT_AND_REVENUE_ACTIVATION_V1_EXACT_GREEN";
const MCP_MARKER = "VOID_TOR_AGENT_MCP_READONLY_V1";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendPath = join(
  repoRoot,
  "tools",
  "void-tor-onion-public-node-v1.mjs",
);

function listen(server) {
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      resolvePromise(address.port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolvePromise, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolvePromise();
    });
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });
}

function request({
  port,
  hostname,
  path,
  method = "GET",
  headers = {},
  body,
}) {
  return new Promise((resolvePromise, reject) => {
    const outgoing = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          Host: hostname,
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        response.on("end", () => {
          const payload = Buffer.concat(chunks);
          resolvePromise({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: payload,
            text: payload.toString("utf8"),
          });
        });
      },
    );
    outgoing.once("error", reject);
    if (body !== undefined) outgoing.write(body);
    outgoing.end();
  });
}

function waitForReady(child) {
  return new Promise((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`backend readiness timeout\nstdout=${stdout}\nstderr=${stderr}`));
    }, 10_000);

    const inspect = () => {
      if (!stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY")) return;
      const match = stdout.match(/^port=(\d+)$/m);
      if (!match) return;
      clearTimeout(timeout);
      resolvePromise({
        port: Number(match[1]),
        stdout,
        stderr,
      });
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      inspect();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(
        `backend exited before readiness code=${code} signal=${signal}\nstdout=${stdout}\nstderr=${stderr}`,
      ));
    });
  });
}

function stopChild(child) {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null) {
      resolvePromise();
      return;
    }
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolvePromise();
    });
    child.kill("SIGTERM");
  });
}

function json(value) {
  return JSON.parse(value);
}

function readBody(requestValue) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    requestValue.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    requestValue.on("end", () => resolvePromise(Buffer.concat(chunks)));
    requestValue.on("error", reject);
  });
}

const temporaryRoot = mkdtempSync(join(os.tmpdir(), "void-tor-stage1-proof-"));
const publicRoot = join(temporaryRoot, "public");
mkdirSync(join(publicRoot, "public-node"), { recursive: true });
writeFileSync(
  join(publicRoot, "public-node", "index.json"),
  `${JSON.stringify({ marker: "fixture-public-index" }, null, 2)}\n`,
);
writeFileSync(join(publicRoot, "fixture.txt"), "fixture-static\n");

const onionHostname = encodeV3OnionHostname(randomBytes(32));
const hostnameFile = join(temporaryRoot, "hostname");
writeFileSync(hostnameFile, `${onionHostname}\n`, { mode: 0o600 });

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const issuedAt = new Date(Date.now() - 60_000);
const expiresAt = new Date(Date.now() + 86_400_000);
const binding = signVoidNodeOnionBindingV1({
  nodeId: "void-stage1-proof-node",
  publicKey,
  privateKey,
  onionHostname,
  virtualPort: 80,
  issuedAt,
  expiresAt,
});
const bindingFile = join(temporaryRoot, "binding.json");
writeFileSync(
  bindingFile,
  `${JSON.stringify(binding, null, 2)}\n`,
  { mode: 0o600 },
);

const captures = [];
const upstream = http.createServer(async (incoming, response) => {
  const body = await readBody(incoming);
  let parsed = null;
  if (body.length > 0) {
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch {
      parsed = null;
    }
  }
  captures.push({
    method: incoming.method,
    url: incoming.url,
    headers: { ...incoming.headers },
    body: body.toString("utf8"),
  });

  if (incoming.url !== "/mcp") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end("{}");
    return;
  }

  if (parsed?.method === "fixture/timeout") {
    setTimeout(() => {
      if (!response.destroyed) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end('{"jsonrpc":"2.0","id":"late","result":{}}');
      }
    }, 1_000);
    return;
  }

  if (parsed?.method === "fixture/oversized") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id ?? null,
      result: {
        data: "x".repeat(4_096),
      },
    }));
    return;
  }

  if (incoming.method === "GET") {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "mcp-session-id": "fixture-session",
      "x-upstream-secret": "must-not-forward",
    });
    response.end(
      'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/message"}\n\n',
    );
    return;
  }

  if (incoming.method === "DELETE") {
    response.writeHead(200, {
      "content-type": "application/json",
      "mcp-session-id": "fixture-session",
    });
    response.end('{"jsonrpc":"2.0","id":"delete","result":{}}');
    return;
  }

  response.writeHead(200, {
    "content-type": "application/json",
    "mcp-session-id": "fixture-session",
    "x-upstream-secret": "must-not-forward",
  });
  response.end(JSON.stringify({
    jsonrpc: "2.0",
    id: parsed?.id ?? null,
    result: {
      tools: [],
      mutation: false,
    },
  }));
});

let child;
try {
  const upstreamPort = await listen(upstream);
  child = spawn(
    process.execPath,
    [
      backendPath,
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--hostname-file",
      hostnameFile,
      "--virtual-port",
      "80",
      "--binding-file",
      bindingFile,
      "--mcp-upstream-port",
      String(upstreamPort),
      "--mcp-timeout-ms",
      "250",
      "--mcp-max-request-bytes",
      "256",
      "--mcp-max-response-bytes",
      "1024",
      "--mcp-max-concurrent-requests",
      "2",
    ],
    {
      cwd: temporaryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const ready = await waitForReady(child);
  const gatewayPort = ready.port;
  const onionAuthority = onionHostname;

  const descriptor = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/.well-known/void-agent-mcp-onion-v1.json",
  });
  assert.equal(descriptor.status, 200);
  const descriptorJson = json(descriptor.text);
  assert.equal(descriptorJson.marker, MCP_MARKER);
  assert.equal(descriptorJson.status, "active");
  assert.equal(
    descriptorJson.transport.uri,
    `http://${onionHostname}/mcp`,
  );
  assert.deepEqual(
    descriptorJson.protocol.methods,
    ["GET", "POST", "DELETE"],
  );
  assert.equal(
    descriptorJson.identity.signed_void_node_binding,
    true,
  );
  assert.equal(descriptorJson.authority.read_only, true);
  assert.equal(descriptorJson.authority.paid_work_submission, false);
  assert.equal(descriptorJson.security.generic_proxy, false);

  const descriptorHead = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/public-node/agents/mcp-tor-v1.json",
    method: "HEAD",
  });
  assert.equal(descriptorHead.status, 200);
  assert.equal(descriptorHead.body.length, 0);

  const torDescriptor = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/.well-known/void-tor-onion-transport-v1.json",
  });
  assert.equal(torDescriptor.status, 200);
  const torJson = json(torDescriptor.text);
  assert.equal(
    torJson.agent_surfaces.mcp_readonly_v1.marker,
    MCP_MARKER,
  );
  assert.equal(
    torJson.agent_surfaces.mcp_readonly_v1.uri,
    `http://${onionHostname}/mcp`,
  );
  assert.equal(
    torJson.agent_surfaces.mcp_readonly_v1.application_authority,
    "read_only",
  );

  const staticResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/fixture.txt",
  });
  assert.equal(staticResult.status, 200);
  assert.equal(staticResult.text, "fixture-static\n");

  const wrongHost = await request({
    port: gatewayPort,
    hostname: "attacker.invalid",
    path: "/mcp",
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"wrong-host","method":"tools/list"}',
  });
  assert.equal(wrongHost.status, 403);

  const queryRejected = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp?forward=http://attacker.invalid",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"query","method":"tools/list"}',
  });
  assert.equal(queryRejected.status, 404);

  const methodRejected = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "PUT",
  });
  assert.equal(methodRejected.status, 405);
  assert.equal(methodRejected.headers.allow, "GET, POST, DELETE");

  const wrongType = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: "{}",
  });
  assert.equal(wrongType.status, 415);

  const oversizedRequestBody = JSON.stringify({
    jsonrpc: "2.0",
    id: "large",
    method: "tools/list",
    padding: "x".repeat(300),
  });
  const oversizedRequest = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(oversizedRequestBody),
    },
    body: oversizedRequestBody,
  });
  assert.equal(oversizedRequest.status, 413);

  const beforeCredential = captures.length;
  const credentialRejected = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      Authorization: "Bearer must-not-forward",
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"credential","method":"tools/list"}',
  });
  assert.equal(credentialRejected.status, 400);
  assert.equal(captures.length, beforeCredential);

  const originRejected = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      Origin: `http://${onionHostname}`,
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"origin","method":"tools/list"}',
  });
  assert.equal(originRejected.status, 403);

  const postBody = JSON.stringify({
    jsonrpc: "2.0",
    id: "tools",
    method: "tools/list",
  });
  const postResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2026-07-28",
      "X-Forwarded-For": "203.0.113.5",
      Forwarded: "for=203.0.113.5",
    },
    body: postBody,
  });
  assert.equal(postResult.status, 200);
  assert.equal(postResult.headers["mcp-session-id"], "fixture-session");
  assert.equal(postResult.headers["x-upstream-secret"], undefined);
  assert.equal(json(postResult.text).result.mutation, false);

  const postCapture = captures.at(-1);
  assert.equal(postCapture.method, "POST");
  assert.equal(postCapture.url, "/mcp");
  assert.equal(
    postCapture.headers.host,
    `127.0.0.1:${upstreamPort}`,
  );
  assert.equal(postCapture.headers.authorization, undefined);
  assert.equal(postCapture.headers.cookie, undefined);
  assert.equal(postCapture.headers.origin, undefined);
  assert.equal(postCapture.headers.forwarded, undefined);
  assert.equal(postCapture.headers["x-forwarded-for"], undefined);
  assert.equal(
    postCapture.headers["mcp-protocol-version"],
    "2026-07-28",
  );

  const getResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "MCP-Session-Id": "fixture-session",
      "Last-Event-ID": "7",
    },
  });
  assert.equal(getResult.status, 200);
  assert.match(
    String(getResult.headers["content-type"]),
    /^text\/event-stream/,
  );
  assert.match(getResult.text, /notifications\/message/);
  const getCapture = captures.at(-1);
  assert.equal(getCapture.headers["mcp-session-id"], "fixture-session");
  assert.equal(getCapture.headers["last-event-id"], "7");

  const deleteResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "DELETE",
    headers: {
      "MCP-Session-Id": "fixture-session",
    },
  });
  assert.equal(deleteResult.status, 200);

  const oversizedResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"oversized","method":"fixture/oversized"}',
  });
  assert.equal(oversizedResult.status, 502);
  assert.match(oversizedResult.text, /too large/);

  const timeoutResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"timeout","method":"fixture/timeout"}',
  });
  assert.equal(timeoutResult.status, 504);
  assert.match(timeoutResult.text, /timed out/);

  const savedBinding = readFileSync(bindingFile);
  writeFileSync(bindingFile, "{\n", { mode: 0o600 });
  const invalidDescriptor = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/.well-known/void-agent-mcp-onion-v1.json",
  });
  assert.equal(invalidDescriptor.status, 503);
  const invalidMcp = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"invalid-binding","method":"tools/list"}',
  });
  assert.equal(invalidMcp.status, 503);
  writeFileSync(bindingFile, savedBinding, { mode: 0o600 });

  await closeServer(upstream);
  const unavailableResult = await request({
    port: gatewayPort,
    hostname: onionAuthority,
    path: "/mcp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"jsonrpc":"2.0","id":"unavailable","method":"tools/list"}',
  });
  assert.equal(unavailableResult.status, 502);
  assert.match(unavailableResult.text, /unavailable/);

  const httpConfigSource = readFileSync(
    join(repoRoot, "integrations/mcp/src/http-config.ts"),
    "utf8",
  );
  assert.match(httpConfigSource, /HTTP transport is read-only/);
  assert.match(httpConfigSource, /forbids VOID_MCP_TOKEN_FILE/);
  const httpServerSource = readFileSync(
    join(repoRoot, "integrations/mcp/src/http-server.ts"),
    "utf8",
  );
  assert.match(
    httpServerSource,
    /requires a read-only bridge config/,
  );
  const serverSource = readFileSync(
    join(repoRoot, "integrations/mcp/src/server.ts"),
    "utf8",
  );
  assert.match(
    serverSource,
    /if \(config\.allowSubmit\) \{\s*registerSubmitTool/s,
  );

  console.log(MARKER);
} finally {
  if (child) await stopChild(child);
  if (upstream.listening) await closeServer(upstream);
  rmSync(temporaryRoot, { recursive: true, force: true });
}
