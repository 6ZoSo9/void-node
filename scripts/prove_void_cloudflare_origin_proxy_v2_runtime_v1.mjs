#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_HOST_V1,
} from "../tools/void-cloudflare-origin-proxy-v2-source-v1.mjs";
import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
  classifyVoidPublic443ProxyV2DispatchV1,
} from "../tools/void-public-443-proxy-v2-dispatch-v1.mjs";

const MARKER = "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1";
const EARN_MAX_RESPONSE_BYTES = 1024 * 1024;
const runtimeFile = path.join(
  process.cwd(),
  "ops",
  "public",
  "void-cloudflare-origin-proxy-v2-adapter-v1.mjs",
);
const runtimeSource = fs.readFileSync(runtimeFile, "utf8");
const earnEdgeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "ops",
    "public",
    "void-public-earn-proxy-v2-edge-v1.mjs",
  ),
  "utf8",
);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function rawResponse(status, body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  return Buffer.concat([
    Buffer.from(
      [
        "HTTP/1.1 " + String(status) + " Test",
        "Connection: close",
        "Content-Type: application/json",
        "Content-Length: " + String(bytes.length),
        "",
        "",
      ].join("\r\n"),
      "ascii",
    ),
    bytes,
  ]);
}

function parseForwardedHttp(wire) {
  const source = parseVoidAgentCredentialRequestProxyV2SourceV1(wire);
  assert.equal(source.ok, true);
  const httpBytes = wire.subarray(source.consumed_bytes);
  const headerEnd = httpBytes.indexOf("\r\n\r\n", 0, "ascii");
  assert.ok(headerEnd >= 0);
  const lines = httpBytes
    .subarray(0, headerEnd)
    .toString("latin1")
    .split("\r\n");
  const requestLine = lines.shift();
  const headers = Object.create(null);
  for (const line of lines) {
    const colon = line.indexOf(":");
    assert.ok(colon > 0, line);
    const name = line.slice(0, colon).toLowerCase();
    assert.equal(Object.hasOwn(headers, name), false, name);
    headers[name] = line.slice(colon + 1).trim();
  }
  const length = Number(headers["content-length"]);
  assert.ok(Number.isSafeInteger(length) && length >= 0);
  const body = Buffer.from(httpBytes.subarray(headerEnd + 4));
  assert.equal(body.length, length);
  return { source, requestLine, headers, body };
}

function parseStatus(bytes) {
  const headerEnd = bytes.indexOf("\r\n\r\n", 0, "ascii");
  assert.ok(headerEnd >= 0);
  const line = bytes.subarray(0, headerEnd).toString("latin1").split("\r\n")[0];
  const match = /^HTTP\/1\.1 ([0-9]{3}) /u.exec(line);
  assert.ok(match, line);
  return Number(match[1]);
}

function makeRequest({
  target,
  source = "203.0.113.10",
  body = Buffer.from("{}", "utf8"),
  method = "POST",
  host = VOID_CLOUDFLARE_ORIGIN_HOST_V1,
  extraHeaders = [],
  includeContentLength = true,
  contentLengthOverride = null,
  contentType = "application/json",
}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  const headers = [
    ["Host", host],
    ["CF-Connecting-IP", source],
    ["Content-Type", contentType],
  ];
  if (includeContentLength) {
    headers.push([
      "Content-Length",
      String(
        contentLengthOverride === null
          ? bytes.length
          : contentLengthOverride,
      ),
    ]);
  }
  if (target === VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1) {
    headers.push([
      "X-Void-Payload-Sha256",
      crypto.createHash("sha256").update(bytes).digest("hex"),
    ]);
  }
  headers.push(...extraHeaders);
  return Buffer.concat([
    Buffer.from(
      method +
        " " +
        target +
        " HTTP/1.1\r\n" +
        headers.map(([name, value]) => name + ": " + value).join("\r\n") +
        "\r\n\r\n",
      "latin1",
    ),
    bytes,
  ]);
}

function sendRaw(port, chunks) {
  const parts = Array.isArray(chunks) ? chunks : [chunks];
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const response = [];
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    socket.on("data", (chunk) => response.push(Buffer.from(chunk)));
    socket.once("error", (error) => finish(reject, error));
    socket.once("end", () =>
      finish(resolve, Buffer.concat(response)),
    );
    socket.once("connect", () => {
      let index = 0;
      const writeNext = () => {
        if (index >= parts.length) {
          socket.end();
          return;
        }
        socket.write(parts[index]);
        index += 1;
        if (index >= parts.length) {
          socket.end();
          return;
        }
        setTimeout(writeNext, 5);
      };
      writeNext();
    });
  });
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      finish(
        reject,
        new Error("runtime ready timeout stderr=" + stderr.slice(-1000)),
      );
    }, 10_000);

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      for (const line of stdout.split("\n")) {
        if (!line.startsWith("{")) continue;
        try {
          const value = JSON.parse(line);
          if (value.marker === MARKER && value.ready === true) {
            finish(resolve, value);
            return;
          }
        } catch {
          // Ignore partial/non-JSON lines while waiting for readiness.
        }
      }
    });
    child.once("exit", (code, signal) => {
      finish(
        reject,
        new Error(
          "runtime exited before ready code=" +
            String(code) +
            " signal=" +
            String(signal) +
            " stderr=" +
            stderr.slice(-1000),
        ),
      );
    });
  });
}

const calls = [];
const dispatcherErrors = [];
let responseMode = "normal";

const dispatcher = net.createServer({ allowHalfOpen: true }, (socket) => {
  const chunks = [];
  socket.on("error", () => {});
  socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  socket.once("end", () => {
    try {
      const wire = Buffer.concat(chunks);
      const classified = classifyVoidPublic443ProxyV2DispatchV1({
        connection_prefix: wire,
      });
      assert.equal(classified.ok, true);
      const forwarded = parseForwardedHttp(wire);
      calls.push({ classified, forwarded });

      let body = Buffer.from(
        JSON.stringify({ ok: true, route: classified.dispatch_target }) + "\n",
        "utf8",
      );
      if (responseMode === "oversize_earn") {
        body = Buffer.alloc(EARN_MAX_RESPONSE_BYTES + 1, 0x61);
      }
      socket.end(rawResponse(200, body));
    } catch (error) {
      dispatcherErrors.push(error);
      socket.destroy();
    }
  });
});

const dispatcherPort = await listen(dispatcher);
const child = spawn(process.execPath, [runtimeFile], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_PROOF_MODE: "1",
    VOID_CLOUDFLARE_ORIGIN_PROXY_V2_ADAPTER_PORT: "0",
    VOID_CLOUDFLARE_ORIGIN_PROXY_V2_DISPATCHER_PORT:
      String(dispatcherPort),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let ready;
try {
  ready = await waitForReady(child);
  assert.equal(ready.listen_host, "127.0.0.1");
  assert.ok(Number.isSafeInteger(ready.listen_port) && ready.listen_port > 0);
  assert.equal(ready.dispatcher_host, "127.0.0.1");
  assert.equal(ready.dispatcher_port, dispatcherPort);
  assert.equal(ready.signed_public_origin_preserved, true);
  assert.equal(ready.exact_sensitive_routes_only, true);
  assert.equal(ready.source_identity_forwarded_as_http_header, false);
  assert.equal(ready.cloudflare_header_transport_trusted, false);
  assert.equal(ready.cloudflared_uid_isolation_proven, false);
  assert.equal(ready.cloudflare_worker_route_absence_proven, false);
  assert.equal(ready.pseudo_ipv4_overwrite_disabled_proven, false);
  assert.equal(ready.tunnel_path_ownership_verified, false);
  assert.equal(ready.dispatcher_exclusive_reachability_proven, false);
  assert.equal(ready.production_service_installed, false);
  assert.equal(ready.runtime_integration, false);
  assert.equal(ready.work_credit_write, false);
  assert.equal(ready.credential_issuance, false);
  assert.equal(ready.public_presale_activation, false);
  assert.equal(ready.funds_movement, false);

  const credentialBody = Buffer.from('{"request":"credential"}', "utf8");
  const credentialWire = makeRequest({
    target: VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
    body: credentialBody,
    extraHeaders: [
      ["Forwarded", "for=198.51.100.99"],
      ["X-Forwarded-For", "198.51.100.99"],
      ["X-Real-IP", "198.51.100.99"],
      ["True-Client-IP", "198.51.100.99"],
      ["Cookie", "secret=must-not-forward"],
    ],
  });
  const splitAt = Math.floor(credentialWire.length / 2);
  const credentialResponse = await sendRaw(
    ready.listen_port,
    [
      credentialWire.subarray(0, splitAt),
      credentialWire.subarray(splitAt),
    ],
  );
  assert.equal(parseStatus(credentialResponse), 200);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].classified.dispatch_target,
    VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  );
  assert.equal(calls[0].forwarded.source.family, "tcp4");
  assert.equal(calls[0].forwarded.source.source_address, "203.0.113.10");
  assert.equal(calls[0].forwarded.source.source_port, 0);
  assert.equal(calls[0].forwarded.source.destination_port, 443);
  assert.equal(
    calls[0].forwarded.requestLine,
    "POST " + VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1 + " HTTP/1.1",
  );
  assert.equal(
    calls[0].forwarded.headers.host,
    VOID_CLOUDFLARE_ORIGIN_HOST_V1,
  );
  assert.equal(
    calls[0].forwarded.headers["content-type"],
    "application/json",
  );
  assert.match(
    calls[0].forwarded.headers["x-void-payload-sha256"],
    /^[0-9a-f]{64}$/u,
  );
  assert.equal(
    calls[0].forwarded.headers.authorization,
    undefined,
  );
  assert.equal(
    calls[0].forwarded.headers["cf-connecting-ip"],
    undefined,
  );
  assert.equal(calls[0].forwarded.headers.forwarded, undefined);
  assert.equal(
    calls[0].forwarded.headers["x-forwarded-for"],
    undefined,
  );
  assert.equal(calls[0].forwarded.headers["x-real-ip"], undefined);
  assert.equal(calls[0].forwarded.headers["true-client-ip"], undefined);
  assert.equal(calls[0].forwarded.headers.cookie, undefined);
  assert.deepEqual(calls[0].forwarded.body, credentialBody);

  const claimResponse = await sendRaw(
    ready.listen_port,
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      source: "2001:db8::1234",
      body: Buffer.from('{"claim":true}', "utf8"),
      extraHeaders: [
        ["Forwarded", "for=192.0.2.1"],
        ["CF-Ray", "opaque-ray-id"],
      ],
    }),
  );
  assert.equal(parseStatus(claimResponse), 200);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1].classified.dispatch_target,
    VOID_PUBLIC_443_DISPATCH_EARN_V1,
  );
  assert.equal(calls[1].forwarded.source.family, "tcp6");
  assert.equal(calls[1].forwarded.source.source_port, 0);
  assert.equal(calls[1].forwarded.source.destination_port, 443);
  assert.equal(
    calls[1].forwarded.headers["cf-connecting-ip"],
    undefined,
  );
  assert.equal(calls[1].forwarded.headers["cf-ray"], undefined);

  const submitAuthorization =
    "Bearer wcep1." + "1".repeat(32) + "." + "A".repeat(43);
  const submitResponse = await sendRaw(
    ready.listen_port,
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
      source: "198.51.100.77",
      body: Buffer.from('{"result":true}', "utf8"),
      extraHeaders: [["Authorization", submitAuthorization]],
    }),
  );
  assert.equal(parseStatus(submitResponse), 200);
  assert.equal(calls.length, 3);
  assert.equal(
    calls[2].forwarded.headers.authorization,
    submitAuthorization,
  );

  const noDispatchBefore = calls.length;
  const invalidRequests = [
    makeRequest({
      target: "/health",
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1 + "?x=1",
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      method: "GET",
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      host: "evil.example",
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      extraHeaders: [["CF-Connecting-IP", "192.0.2.10"]],
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      extraHeaders: [["CF-Pseudo-IPv4", "192.0.2.123"]],
    }),
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      extraHeaders: [["Transfer-Encoding", "chunked"]],
    }),
  ];
  for (const request of invalidRequests) {
    const response = await sendRaw(ready.listen_port, request);
    assert.equal(parseStatus(response), 400);
  }
  assert.equal(calls.length, noDispatchBefore);

  const missingLength = makeRequest({
    target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
    includeContentLength: false,
  });
  assert.equal(
    parseStatus(await sendRaw(ready.listen_port, missingLength)),
    411,
  );
  assert.equal(calls.length, noDispatchBefore);

  const wrongType = makeRequest({
    target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
    contentType: "text/plain",
  });
  assert.equal(
    parseStatus(await sendRaw(ready.listen_port, wrongType)),
    415,
  );
  assert.equal(calls.length, noDispatchBefore);

  const oversizedClaim = makeRequest({
    target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
    body: Buffer.alloc(0),
    contentLengthOverride: 64 * 1024 + 1,
  });
  assert.equal(
    parseStatus(await sendRaw(ready.listen_port, oversizedClaim)),
    413,
  );
  assert.equal(calls.length, noDispatchBefore);

  const normalClaim = makeRequest({
    target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
    body: Buffer.from("{}", "utf8"),
  });
  const pipelined = Buffer.concat([
    normalClaim,
    Buffer.from("GET / HTTP/1.1\r\nHost: x\r\n\r\n", "ascii"),
  ]);
  assert.equal(
    parseStatus(await sendRaw(ready.listen_port, pipelined)),
    400,
  );
  assert.equal(calls.length, noDispatchBefore);

  responseMode = "oversize_earn";
  const oversizeResponse = await sendRaw(
    ready.listen_port,
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      body: Buffer.from("{}", "utf8"),
    }),
  );
  assert.equal(parseStatus(oversizeResponse), 502);
  assert.equal(calls.length, noDispatchBefore + 1);
  responseMode = "normal";

  assert.equal(dispatcherErrors.length, 0);
  await close(dispatcher);

  const unavailable = await sendRaw(
    ready.listen_port,
    makeRequest({
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      body: Buffer.from("{}", "utf8"),
    }),
  );
  assert.equal(parseStatus(unavailable), 502);

  for (const required of [
    'const HOST = "127.0.0.1";',
    "deriveVoidCloudflareOriginProxyV2SourceV1",
    "cloudflare_header_transport_trusted: false",
    "cloudflared_uid_isolation_proven: false",
    "cloudflare_worker_route_absence_proven: false",
    "pseudo_ipv4_overwrite_disabled_proven: false",
    "tunnel_path_ownership_verified: false",
    "dispatcher_exclusive_reachability_proven: false",
    "production_service_installed: false",
    "runtime_integration: false",
    "source_identity_forwarded_as_http_header: false",
    "socket.pause();",
  ]) {
    assert.ok(runtimeSource.includes(required), required);
  }
  for (const forbidden of [
    "node:child_process",
    "/usr/sbin/nft",
    "nft ",
    "systemctl ",
    "tailscale ",
    "cloudflared tunnel",
    'host: "0.0.0.0"',
  ]) {
    assert.equal(runtimeSource.includes(forbidden), false, forbidden);
  }

  assert.match(
    earnEdgeSource,
    /const CLAIM_MAX_BODY_BYTES = 64 \* 1024;/u,
  );
  assert.match(
    earnEdgeSource,
    /const SUBMIT_MAX_BODY_BYTES = 512 \* 1024;/u,
  );
  assert.match(
    earnEdgeSource,
    /const MAX_RESPONSE_BYTES = 1024 \* 1024;/u,
  );
  assert.match(
    earnEdgeSource,
    /const REQUEST_TIMEOUT_MS = 30_000;/u,
  );

  console.log("VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1_PROOF_GREEN");
  console.log("signed_public_origin_preserved=true");
  console.log("exact_sensitive_routes_only=true");
  console.log("strict_proxy_v2_to_dispatcher=true");
  console.log("credential_body_ceiling_bytes=65536");
  console.log("earn_claim_body_ceiling_bytes=65536");
  console.log("earn_submit_body_ceiling_bytes=524288");
  console.log("earn_response_ceiling_bytes=1048576");
  console.log("source_identity_forwarded_as_http_header=false");
  console.log("spoofable_forwarding_headers_forwarded=false");
  console.log("split_request_delivery_preserved=true");
  console.log("buffered_trailing_bytes_rejected=true");
  console.log("post_classification_read_paused=true");
  console.log("oversize_response_fails_closed=true");
  console.log("dispatcher_unavailable_fails_closed=true");
  console.log("cloudflare_header_transport_trusted=false");
  console.log("cloudflared_uid_isolation_proven=false");
  console.log("tunnel_path_ownership_verified=false");
  console.log("runtime_integration=false");
  console.log("funds_movement=false");
} finally {
  if (dispatcher.listening) {
    await close(dispatcher);
  }
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
  }
  if (child.exitCode === null) {
    await new Promise((resolve) => child.once("exit", resolve));
  }
}
