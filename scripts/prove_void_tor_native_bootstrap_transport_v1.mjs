#!/usr/bin/env node
import assert from "node:assert/strict";
import net from "node:net";
import {
  normalizeOnionBase,
  normalizeOnionV3Hostname,
  requestOnionJson,
  validateTorNativeEndpoints,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";

const MARKER = "VOID_TOR_NATIVE_BOOTSTRAP_TRANSPORT_V1_PROOF";
const ONION = "ceirceirceirceirceirceirceirceirceirceirceirceircei7l4yd.onion";
const INVALID_ONION = `${"a".repeat(56)}.onion`;
const QUALIFICATION = `voidpsq1_${"b".repeat(64)}`;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function expectReject(fn, pattern) {
  await assert.rejects(fn, pattern);
}

const requestedHosts = [];
const fixture = net.createServer((socket) => {
  socket.once("data", (greeting) => {
    assert.deepEqual([...greeting], [0x05, 0x01, 0x00]);
    socket.write(Buffer.from([0x05, 0x00]));
    socket.once("data", (request) => {
      assert.equal(request[0], 0x05);
      assert.equal(request[1], 0x01);
      assert.equal(request[3], 0x03);
      const length = request[4];
      const hostname = request.subarray(5, 5 + length).toString("ascii");
      const port = request.readUInt16BE(5 + length);
      requestedHosts.push({ hostname, port });
      socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
      socket.once("data", (httpRequest) => {
        const text = httpRequest.toString("utf8");
        assert.match(text, /^GET \/__void\/ready\.json HTTP\/1\.1\r\n/);
        assert.match(text, new RegExp(`Host: ${ONION.replaceAll(".", "\\.")}`));
        const body = `${JSON.stringify({ ready: true, head: 1856587, gap: 0, txroot_live: 1 })}\n`;
        socket.end([
          "HTTP/1.1 200 OK",
          "Content-Type: application/json; charset=utf-8",
          "X-VOID-Public-Seed-Gateway: v1",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body,
        ].join("\r\n"));
      });
    });
  });
});

const badIdentity = net.createServer((socket) => {
  socket.once("data", () => {
    socket.write(Buffer.from([0x05, 0x00]));
    socket.once("data", () => {
      socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
      socket.once("data", () => {
        const body = "{}\n";
        socket.end([
          "HTTP/1.1 200 OK",
          "Content-Type: application/json",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body,
        ].join("\r\n"));
      });
    });
  });
});

const malformedJson = net.createServer((socket) => {
  socket.once("data", () => {
    socket.write(Buffer.from([0x05, 0x00]));
    socket.once("data", () => {
      socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
      socket.once("data", () => {
        const body = "{not-json}\n";
        socket.end([
          "HTTP/1.1 200 OK",
          "Content-Type: application/json",
          "X-VOID-Public-Seed-Gateway: v1",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body,
        ].join("\r\n"));
      });
    });
  });
});

try {
  assert.equal(normalizeOnionV3Hostname(ONION.toUpperCase()), ONION);
  assert.equal(normalizeOnionBase(`http://${ONION}`).base, `http://${ONION}`);
  assert.throws(() => normalizeOnionV3Hostname("seed.example.org"), /Tor v3/);
  assert.throws(() => normalizeOnionV3Hostname(INVALID_ONION), /checksum-valid Tor v3/);
  assert.throws(() => normalizeOnionBase(`https://${ONION}`), /http over Tor/);
  assert.throws(() => normalizeOnionBase(`http://${ONION}:8080`), /virtual port 80/);
  console.log("[PASS] canonical checksum-valid Tor v3 endpoint boundary");

  const now = Date.now();
  const rawEndpoint = {
    transport: "tor_v3_http",
    base: `http://${ONION}`,
    priority: 10,
    enabled: true,
    temporary: false,
    qualification_id: QUALIFICATION,
    qualified_at: new Date(now - 60_000).toISOString(),
    qualified_head: 1856587,
  };
  const endpoints = validateTorNativeEndpoints([rawEndpoint], now);
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].hostname, ONION);
  assert.throws(
    () => validateTorNativeEndpoints([{ ...rawEndpoint, unknown: true }], now),
    /keys mismatch/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([{ ...rawEndpoint, transport: "https" }], now),
    /tor_v3_http/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([{ ...rawEndpoint, temporary: true }], now),
    /temporary=false/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([
      { ...rawEndpoint, qualified_at: new Date(now - 2 * 60 * 60 * 1000 - 1).toISOString() },
    ], now),
    /qualification is stale/,
  );
  console.log("[PASS] closed and freshness-bounded onion manifest endpoint contract");

  const port = await listen(fixture);
  const response = await requestOnionJson({ base: `http://${ONION}`, socksPort: port, timeoutMs: 3000 });
  assert.deepEqual(response, { ready: true, head: 1856587, gap: 0, txroot_live: 1 });
  assert.deepEqual(requestedHosts, [{ hostname: ONION, port: 80 }]);
  await close(fixture);
  console.log("[PASS] SOCKS5 domain-name transport without DNS resolution");

  const badPort = await listen(badIdentity);
  await expectReject(
    () => requestOnionJson({ base: `http://${ONION}`, socksPort: badPort, timeoutMs: 3000 }),
    /identity header/,
  );
  await close(badIdentity);
  console.log("[PASS] gateway identity fail-closed boundary");

  const malformedPort = await listen(malformedJson);
  await expectReject(
    () => requestOnionJson({ base: `http://${ONION}`, socksPort: malformedPort, timeoutMs: 3000 }),
    /JSON is invalid/,
  );
  await close(malformedJson);
  console.log("[PASS] malformed onion response rejection");

  await expectReject(
    () => requestOnionJson({ base: `http://${ONION}`, socksHost: "192.0.2.10", socksPort: 9050 }),
    /numeric loopback/,
  );
  await expectReject(
    () => requestOnionJson({ base: `http://${ONION}`, path: "/__void/ready.json?leak=1", socksPort: 9050 }),
    /path is invalid/,
  );
  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      path: "/__void/ready.json\r\nX-Injected: true",
      socksPort: 9050,
    }),
    /path is invalid/,
  );
  console.log("[PASS] local-only Tor proxy and unsafe request-target boundary");

  console.log(`${MARKER}_GREEN`);
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_provider_required=false");
  console.log("socks_proxy_loopback_only=true");
  console.log("gateway_identity_required=true");
  console.log("qualification_freshness_required=true");
  console.log("unsafe_request_target_rejected=true");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  for (const server of [fixture, badIdentity, malformedJson]) {
    if (server.listening) await close(server);
  }
}
