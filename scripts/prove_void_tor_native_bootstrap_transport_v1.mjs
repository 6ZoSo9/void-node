#!/usr/bin/env node
import assert from "node:assert/strict";
import net from "node:net";
import {
  normalizeOnionBase,
  normalizeOnionV3Hostname,
  requestOnionJson,
  requestOnionRouteV1,
  validateTorNativeEndpoints,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";

const MARKER = "VOID_TOR_NATIVE_BOOTSTRAP_TRANSPORT_V1_PROOF";
const ONION = "ceirceirceirceirceirceirceirceirceirceirceirceircei7l4yd.onion";
const INVALID_ONION = `${"a".repeat(56)}.onion`;
const QUALIFICATION = `voidptq1_${"b".repeat(64)}`;

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

function writeFragments(socket, fragments, delayMs = 8) {
  for (const [index, fragment] of fragments.entries()) {
    setTimeout(() => socket.write(Buffer.from(fragment)), index * delayMs);
  }
}

const requestedHosts = [];
const fixture = net.createServer((socket) => {
  socket.once("data", (greeting) => {
    assert.deepEqual([...greeting], [0x05, 0x01, 0x00]);
    writeFragments(socket, [[0x05], [0x00]]);
    socket.once("data", (request) => {
      assert.equal(request[0], 0x05);
      assert.equal(request[1], 0x01);
      assert.equal(request[3], 0x03);
      const length = request[4];
      const hostname = request.subarray(5, 5 + length).toString("ascii");
      const port = request.readUInt16BE(5 + length);
      requestedHosts.push({ hostname, port });
      writeFragments(socket, [
        [0x05, 0x00],
        [0x00, 0x01, 127],
        [0, 0, 1, 0, 80],
      ]);
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

function typeConfusedFixture(expectedTarget, bodyValue) {
  return net.createServer((socket) => {
    socket.once("data", () => {
      socket.write(Buffer.from([0x05, 0x00]));
      socket.once("data", () => {
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
        socket.once("data", (httpRequest) => {
          const [requestLine] = httpRequest.toString("utf8").split("\r\n");
          assert.equal(requestLine, `GET ${expectedTarget} HTTP/1.1`);
          const body = `${JSON.stringify(bodyValue)}\n`;
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
}

const typeConfusedReady = typeConfusedFixture(
  "/__void/ready.json",
  { ready: true, head: "1856587", gap: "0", txroot_live: "1" },
);
const typeConfusedRange = typeConfusedFixture(
  "/blocks/range?from=10&to=10",
  [{ number: "10" }],
);

try {
  assert.equal(normalizeOnionV3Hostname(ONION.toUpperCase()), ONION);
  assert.equal(normalizeOnionBase(`http://${ONION}`).base, `http://${ONION}`);
  assert.throws(
    () => normalizeOnionV3Hostname(INVALID_ONION),
    /checksum-valid Tor v3|checksum|version/,
  );
  assert.throws(() => normalizeOnionV3Hostname("seed.example.org"), /Tor v3/);
  assert.throws(() => normalizeOnionBase(`https://${ONION}`), /http over Tor/);
  assert.throws(() => normalizeOnionBase(`http://${ONION}:8080`), /virtual port 80/);
  console.log("[PASS] checksum-valid canonical Tor v3 endpoint boundary");

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
    () => validateTorNativeEndpoints([{
      ...rawEndpoint,
      qualification_id: `voidpsq1_${"c".repeat(64)}`,
    }], now),
    /qualification ID is malformed/,
  );
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
    () => validateTorNativeEndpoints([{ ...rawEndpoint, base: `http://${INVALID_ONION}` }], now),
    /checksum-valid Tor v3|checksum|version/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([rawEndpoint], Number.NaN),
    /validation time is invalid/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([rawEndpoint], now, 59_999),
    /qualification age bound is invalid/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([rawEndpoint], now, 24 * 60 * 60 * 1000 + 1),
    /qualification age bound is invalid/,
  );
  assert.throws(
    () => validateTorNativeEndpoints([
      {
        ...rawEndpoint,
        qualified_at: new Date(now - 2 * 60 * 60 * 1000 - 1).toISOString(),
      },
    ], now),
    /qualification is stale/,
  );
  console.log("[PASS] closed fresh onion manifest endpoint contract");

  const port = await listen(fixture);
  const response = await requestOnionJson({
    base: `http://${ONION}`,
    socksPort: port,
    timeoutMs: 3000,
  });
  assert.deepEqual(response, { ready: true, head: 1856587, gap: 0, txroot_live: 1 });
  assert.deepEqual(requestedHosts, [{ hostname: ONION, port: 80 }]);
  await close(fixture);
  console.log("[PASS] fragmented SOCKS5 domain-name transport without DNS resolution");

  const badPort = await listen(badIdentity);
  await expectReject(
    () => requestOnionJson({ base: `http://${ONION}`, socksPort: badPort, timeoutMs: 3000 }),
    /identity header/,
  );
  await close(badIdentity);
  console.log("[PASS] gateway identity fail-closed boundary");

  const malformedPort = await listen(malformedJson);
  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      socksPort: malformedPort,
      timeoutMs: 3000,
    }),
    /JSON is invalid/,
  );
  await close(malformedJson);
  console.log("[PASS] malformed onion response rejection");

  const confusedReadyPort = await listen(typeConfusedReady);
  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      socksPort: confusedReadyPort,
      timeoutMs: 3000,
    }),
    /exact-green|positive integer/,
  );
  await close(typeConfusedReady);

  const confusedRangePort = await listen(typeConfusedRange);
  await expectReject(
    () => requestOnionRouteV1(
      `http://${ONION}`,
      "/blocks/range?from=10&to=10",
      { socksPort: confusedRangePort, timeoutMs: 3000 },
    ),
    /not contiguous/,
  );
  await close(typeConfusedRange);
  console.log("[PASS] numeric response types fail closed before adapter forwarding");

  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      socksHost: "192.0.2.10",
      socksPort: 9050,
    }),
    /numeric loopback/,
  );
  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      path: "/__void/ready.json?leak=1",
      socksPort: 9050,
    }),
    /path is invalid/,
  );
  await expectReject(
    () => requestOnionJson({
      base: `http://${ONION}`,
      path: "/__void/ready.json\r\nX-Leak: 1",
      socksPort: 9050,
    }),
    /path is invalid/,
  );
  console.log("[PASS] local-only Tor proxy and request-target safety boundary");

  await expectReject(
    () => requestOnionRouteV1(`http://${ONION}`, "/admin", { socksPort: 9050 }),
    /route is not public/,
  );
  await expectReject(
    () => requestOnionRouteV1(
      `http://${ONION}`,
      "/__void/ready.json?leak=1",
      { socksPort: 9050 },
    ),
    /does not accept query parameters/,
  );
  await expectReject(
    () => requestOnionRouteV1(
      `http://${ONION}`,
      "/__void/ready.json\r\nX-Leak: 1",
      { socksPort: 9050 },
    ),
    /public route is invalid/,
  );
  await expectReject(
    () => requestOnionRouteV1(
      `http://${ONION}`,
      "/blocks/range?from=0&to=999",
      { socksPort: 9050 },
    ),
    /exceeds 999/,
  );
  console.log("[PASS] remote private and unsafe routes rejected before SOCKS connect");

  console.log(`${MARKER}_GREEN`);
  console.log("checksum_valid_onion_identity_required=true");
  console.log("qualification_freshness_required=true");
  console.log("tor_qualification_receipt_prefix_required=true");
  console.log("unsafe_request_target_rejected=true");
  console.log("socks_handshake_fragmentation_proven=true");
  console.log("remote_private_route_requested=false");
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_provider_required=false");
  console.log("socks_proxy_loopback_only=true");
  console.log("gateway_identity_required=true");
  console.log("response_numeric_types_strict=true");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  for (const server of [
    fixture,
    badIdentity,
    malformedJson,
    typeConfusedReady,
    typeConfusedRange,
  ]) {
    if (server.listening) await close(server);
  }
}
