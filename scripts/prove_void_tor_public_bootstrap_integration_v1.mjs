#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  contentId,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";
import { createTorPublicSeedClientAdapterV1 } from "../tools/void-tor-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_TOR_PUBLIC_BOOTSTRAP_INTEGRATION_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RESOLVER = path.join(ROOT, "scripts", "resolve_void_tor_public_bootstrap_v1.mjs");
const ONION = "ceirceirceirceirceirceirceirceirceirceirceirceircei7l4yd.onion";
const QUALIFICATION = `voidptq1_${"b".repeat(64)}`;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-bootstrap-integration-"));
const manifestPath = path.join(temporary, "bootstrap.json");
const stringChainManifestPath = path.join(
  temporary,
  "bootstrap-string-chain-id.json",
);
const requested = [];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runResolver(args, env) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(process.execPath, [RESOLVER, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function responseFor(requestLine) {
  const match = /^(GET|HEAD) ([^ ]+) HTTP\/1\.1$/.exec(requestLine);
  if (!match) throw new Error(`unexpected HTTP request line ${requestLine}`);
  const method = match[1];
  const route = match[2];
  let body;
  if (route === "/__void/ready.json") {
    body = { ready: true, head: 1856587, gap: 0, txroot_live: 1 };
  } else if (route === "/blocks/range?from=10&to=12") {
    body = [{ number: 10 }, { number: 11 }, { number: 12 }];
  } else {
    throw new Error(`unexpected public route ${route}`);
  }
  const bytes = Buffer.from(`${JSON.stringify(body)}\n`);
  return Buffer.from([
    "HTTP/1.1 200 OK",
    "Content-Type: application/json; charset=utf-8",
    "X-VOID-Public-Seed-Gateway: v1",
    `Content-Length: ${bytes.length}`,
    "Connection: close",
    "",
    method === "HEAD" ? "" : bytes.toString("utf8"),
  ].join("\r\n"));
}

function createSocksFixture() {
  return net.createServer((socket) => {
    socket.once("data", (greeting) => {
      assert.deepEqual([...greeting], [0x05, 0x01, 0x00]);
      socket.write(Buffer.from([0x05, 0x00]));
      socket.once("data", (connectRequest) => {
        assert.equal(connectRequest[0], 0x05);
        assert.equal(connectRequest[1], 0x01);
        assert.equal(connectRequest[3], 0x03);
        const length = connectRequest[4];
        const hostname = connectRequest.subarray(5, 5 + length).toString("ascii");
        const port = connectRequest.readUInt16BE(5 + length);
        requested.push({ hostname, port });
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
        socket.once("data", (httpRequest) => {
          const text = httpRequest.toString("utf8");
          const [requestLine] = text.split("\r\n");
          assert.match(text, new RegExp(`\r\nHost: ${ONION.replaceAll(".", "\\.")}\r\n`));
          socket.end(responseFor(requestLine));
        });
      });
    });
  });
}

const socks = createSocksFixture();
let adapter = null;

try {
  const now = Date.now();
  const manifestBody = {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "stable_tor_seed",
    generated_at: new Date(now - 60_000).toISOString(),
    expires_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    sync_endpoints: [],
    onion_endpoints: [
      {
        transport: "tor_v3_http",
        base: `http://${ONION}`,
        priority: 0,
        enabled: true,
        temporary: false,
        qualification_id: QUALIFICATION,
        qualified_at: new Date(now - 60_000).toISOString(),
        qualified_head: 1856587,
      },
    ],
    private_tailnet_endpoints_published: false,
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
    notes: "Tor-native integration fixture",
  };
  const manifest = {
    ...manifestBody,
    manifest_id: contentId("voidpbm1_", manifestBody, "manifest_id"),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  const stringChainManifestBody = {
    ...manifestBody,
    chain_id: String(manifestBody.chain_id),
  };
  const stringChainManifest = {
    ...stringChainManifestBody,
    manifest_id: contentId(
      "voidpbm1_",
      stringChainManifestBody,
      "manifest_id",
    ),
  };
  fs.writeFileSync(
    stringChainManifestPath,
    `${JSON.stringify(stringChainManifest, null, 2)}\n`,
    { mode: 0o600 },
  );

  const stringChain = await runResolver(
    [
      "--manifest-file",
      stringChainManifestPath,
      "--expected-manifest-id",
      stringChainManifest.manifest_id,
    ],
    {
      VOID_TOR_SOCKS_HOST: "192.0.2.1",
      VOID_TOR_SOCKS_PORT: "19051",
      VOID_TOR_BOOTSTRAP_TIMEOUT_MS: "1000",
    },
  );
  assert.equal(stringChain.code, 1);
  assert.match(stringChain.stderr, /network contract mismatch/);
  assert.equal(requested.length, 0);
  console.log(
    "[PASS] direct resolver rejects string Tor manifest chain IDs before SOCKS access",
  );

  const socksPort = await listen(socks);
  const resolver = await runResolver(
    ["--manifest-file", manifestPath, "--expected-manifest-id", manifest.manifest_id],
    { VOID_TOR_SOCKS_PORT: String(socksPort), VOID_TOR_BOOTSTRAP_TIMEOUT_MS: "3000" },
  );
  assert.equal(resolver.code, 0, resolver.stderr);
  assert.equal(resolver.signal, null);
  assert.equal(resolver.stdout.trim(), `http://${ONION}`);
  assert.match(resolver.stderr, /VOID_TOR_PUBLIC_BOOTSTRAP_RESOLVER_V1_GREEN/);
  assert.match(resolver.stderr, /manifest_source=local_content_addressed_tor_root/);
  assert.match(resolver.stderr, /dns_resolution_required=false/);
  console.log("[PASS] pinned local Tor manifest resolver");

  const wrongRoot = await runResolver(
    ["--manifest-file", manifestPath, "--expected-manifest-id", `voidpbm1_${"c".repeat(64)}`],
    { VOID_TOR_SOCKS_PORT: String(socksPort), VOID_TOR_BOOTSTRAP_TIMEOUT_MS: "3000" },
  );
  assert.equal(wrongRoot.code, 1);
  assert.match(wrongRoot.stderr, /expected trust-root ID/);
  console.log("[PASS] manifest substitution rejection");

  await assert.rejects(
    () => createTorPublicSeedClientAdapterV1({
      peers: resolver.stdout.trim(),
      port: 1.5,
      socksPort,
      timeoutMs: 3000,
    }),
    /adapter port must be an integer/,
  );
  console.log("[PASS] direct adapter numeric configuration boundary");

  adapter = await createTorPublicSeedClientAdapterV1({
    peers: resolver.stdout.trim(),
    port: 0,
    socksPort,
    timeoutMs: 3000,
  });

  const readyResponse = await fetch(`${adapter.base}/__void/ready.json`);
  assert.equal(readyResponse.status, 200);
  assert.equal(readyResponse.headers.get("x-void-public-seed-gateway"), "v1");
  assert.deepEqual(await readyResponse.json(), {
    ready: true,
    head: 1856587,
    gap: 0,
    txroot_live: 1,
  });

  const rangeResponse = await fetch(`${adapter.base}/blocks/range?from=10&to=12`);
  assert.equal(rangeResponse.status, 200);
  assert.deepEqual(await rangeResponse.json(), [
    { number: 10 },
    { number: 11 },
    { number: 12 },
  ]);

  const privateResponse = await fetch(`${adapter.base}/admin`);
  assert.equal(privateResponse.status, 404);
  const mutationResponse = await fetch(`${adapter.base}/follower/start`, { method: "POST" });
  assert.equal(mutationResponse.status, 405);

  const statusResponse = await fetch(`${adapter.base}/__void/tor-public-seed-client-v1.json`);
  const status = await statusResponse.json();
  assert.equal(status.ok, true);
  assert.equal(status.dns_resolution_required, false);
  assert.equal(status.domain_registrar_required, false);
  assert.equal(status.certificate_authority_required, false);
  assert.equal(status.socks_proxy_loopback_only, true);

  const pollutedStatusResponse = await fetch(
    `${adapter.base}/__void/tor-public-seed-client-v1.json?leak=1`,
  );
  assert.equal(pollutedStatusResponse.status, 400);
  const pollutedStatus = await pollutedStatusResponse.json();
  assert.equal(pollutedStatus.error, "invalid_request");
  console.log("[PASS] Tor resolver-to-loopback-adapter composition");

  assert.equal(requested.length, 3);
  assert.deepEqual(requested, requested.map(() => ({ hostname: ONION, port: 80 })));
  console.log("[PASS] local rejections produce zero additional SOCKS requests");

  console.log(`${MARKER}_GREEN`);
  console.log("checksum_valid_onion_identity_required=true");
  console.log("local_manifest_id_pinned=true");
  console.log("strict_numeric_manifest_chain_id_required=true");
  console.log("manifest_substitution_rejected=true");
  console.log("adapter_numeric_parameters_bounded=true");
  console.log("local_status_query_rejected=true");
  console.log("resolver_adapter_composed=true");
  console.log("block_range_contiguous=true");
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_provider_required=false");
  console.log("private_mutation_routes_exposed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (adapter?.server?.listening) {
    await new Promise((resolve) => adapter.server.close(resolve));
  }
  if (socks.listening) await close(socks);
  fs.rmSync(temporary, { recursive: true, force: true });
}
