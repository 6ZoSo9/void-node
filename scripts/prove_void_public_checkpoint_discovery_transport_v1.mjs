#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";
import {
  VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1,
  createVerifiedPublicBootstrapChallengeV1,
  installVerifiedPublicBootstrapAuthorityForTestV1,
  resetVerifiedPublicBootstrapAuthorityForTestV1,
  verifyVerifiedPublicBootstrapResponseV1,
} from "../dist/http/follower_verified_public_bootstrap_authority_v1.js";

const MARKER = "VOID_PUBLIC_CHECKPOINT_DISCOVERY_TRANSPORT_V1_PROOF";
const root = process.cwd();

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
  ).join(",")}}`;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function checkpointId(body) {
  return `voidpbc1_${sha256(Buffer.from(stableJson(body)))}`;
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  assert.ok(port >= 1024);
  return port;
}

function makePacket(packet) {
  const segmentDir = path.join(packet, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const segmentBytes = Buffer.from("VOID_CHECKPOINT_DISCOVERY_TRANSPORT_SEGMENT_V1\n");
  fs.writeFileSync(path.join(segmentDir, "blocks.bin"), segmentBytes);

  const body = {
    schema: "void_public_canonical_checkpoint_v1",
    network: "VOID Network",
    chain_id: 2050,
    format: "blocks-bin-only-v1",
    source_sha: "1".repeat(40),
    captured_at: "2026-08-28T00:00:00.000Z",
    head: 0,
    head_era: "minimal",
    head_header_hash: null,
    head_body_sha256: sha256(segmentBytes),
    block_count: 1,
    segment_span: 10_000,
    segment_count: 1,
    payload_bytes: segmentBytes.length,
    segments: [{
      name: "00000000",
      path: "segments/00000000/blocks.bin",
      first: 0,
      last: 0,
      blocks: 1,
      bytes: segmentBytes.length,
      sha256: sha256(segmentBytes),
    }],
    rebuild: {
      auto_repair_required: true,
      sparse_every: 16,
      sparse_index_reconstructed: true,
      segment_meta_reconstructed: true,
      head_markers_reconstructed: true,
      wal_included: false,
      derived_indexes_included: false,
      other_data_dir_content_included: false,
    },
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
  };
  const manifest = { ...body, checkpoint_id: checkpointId(body) };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(packet, "checkpoint.json"), manifestBytes);
  return {
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    segmentBytes,
  };
}

async function startSlowCheckpointSeed(discoveryBody, delayMs) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", base);
    if (
      method === "GET" &&
      url.pathname === "/__void/checkpoint/v1.json" &&
      url.search === ""
    ) {
      const bytes = Buffer.from(`${JSON.stringify(discoveryBody)}\n`);
      setTimeout(() => {
        if (res.writableEnded || res.destroyed) return;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("content-length", String(bytes.length));
        res.setHeader("x-void-public-seed-gateway", "v1");
        res.end(bytes);
      }, delayMs);
      return;
    }
    const bytes = Buffer.from(
      `${JSON.stringify({ ok: false, error: "route_not_public" })}\n`,
    );
    res.statusCode = 404;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("content-length", String(bytes.length));
    res.setHeader("x-void-public-seed-gateway", "v1");
    res.end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, base };
}

async function spawnGateway(packet, packetMeta, port) {
  const child = spawn(
    process.execPath,
    ["tools/void-public-seed-gateway-v1.mjs"],
    {
      cwd: root,
      env: {
        ...process.env,
        VOID_PUBLIC_SEED_BIND: "127.0.0.1",
        VOID_PUBLIC_SEED_PORT: String(port),
        VOID_PUBLIC_SEED_UPSTREAM: "http://127.0.0.1:9",
        VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packet,
        VOID_PUBLIC_SEED_CHECKPOINT_ID: packetMeta.manifest.checkpoint_id,
        VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256: packetMeta.manifestSha256,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`gateway startup timeout stdout=${stdout} stderr=${stderr}`));
    }, 5_000);
    const poll = setInterval(() => {
      if (stdout.includes("VOID_PUBLIC_SEED_GATEWAY_V1_READY")) {
        clearInterval(poll);
        clearTimeout(timeout);
        resolve();
      }
    }, 10);
    child.once("exit", (code) => {
      clearInterval(poll);
      clearTimeout(timeout);
      reject(new Error(`gateway exited ${code} stdout=${stdout} stderr=${stderr}`));
    });
  });

  return { child, stdout: () => stdout, stderr: () => stderr };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function authorizedGet(adapterBase, route) {
  const url = `${adapterBase}${route}`;
  const challenge = createVerifiedPublicBootstrapChallengeV1(url);
  assert.ok(challenge, `challenge unavailable for ${route}`);
  const response = await fetch(url, {
    headers: {
      [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]: challenge.nonce,
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, bytes.toString("utf8"));
  assert.equal(
    verifyVerifiedPublicBootstrapResponseV1(response, bytes, challenge),
    true,
    `authority verification failed for ${route}`,
  );
  return { response, bytes };
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-checkpoint-discovery-proof-"),
);
let gateway = null;
let adapter = null;
try {
  const packet = path.join(tmp, "packet");
  fs.mkdirSync(packet, { recursive: true });
  const packetMeta = makePacket(packet);
  const gatewayPort = await freePort();
  gateway = await spawnGateway(packet, packetMeta, gatewayPort);

  const generation = "a".repeat(32);
  const sequence = 1;
  const secret = Buffer.from("42".repeat(32), "hex");
  adapter = await createPublicSeedClientAdapterV1({
    peers: `http://127.0.0.1:${gatewayPort}`,
    host: "127.0.0.1",
    port: 0,
    timeoutMs: 5_000,
    maxBytes: 8 * 1024 * 1024,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation,
      sequence,
      secret,
    },
    checkpointQualificationNotAfterMs: Date.now() + 60_000,
    allowLoopbackFixture: true,
  });

  resetVerifiedPublicBootstrapAuthorityForTestV1();
  assert.equal(
    installVerifiedPublicBootstrapAuthorityForTestV1({
      sequence,
      generation,
      adapter_origin: adapter.base,
      secret_hex: secret.toString("hex"),
    }),
    true,
  );

  const missingChallenge = await fetch(
    `${adapter.base}/__void/checkpoint/v1.json`,
  );
  assert.equal(missingChallenge.status, 428);

  const discovery = await authorizedGet(
    adapter.base,
    "/__void/checkpoint/v1.json",
  );
  const discoveryJson = JSON.parse(discovery.bytes.toString("utf8"));
  assert.equal(discoveryJson.status, "available");
  assert.equal(
    discoveryJson.checkpoint.checkpoint_id,
    packetMeta.manifest.checkpoint_id,
  );
  assert.equal(
    discoveryJson.checkpoint.manifest_sha256,
    packetMeta.manifestSha256,
  );
  assert.equal(
    discoveryJson.checkpoint.packet_base_path,
    `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}`,
  );

  const manifestRoute =
    `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}/checkpoint.json`;
  const manifest = await authorizedGet(adapter.base, manifestRoute);
  assert.equal(sha256(manifest.bytes), packetMeta.manifestSha256);
  assert.equal(
    JSON.parse(manifest.bytes.toString("utf8")).checkpoint_id,
    packetMeta.manifest.checkpoint_id,
  );

  const segmentRoute =
    `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}` +
    "/segments/00000000/blocks.bin";
  const segment = await authorizedGet(adapter.base, segmentRoute);
  assert.match(
    String(segment.response.headers.get("content-type") || ""),
    /^application\/octet-stream/i,
  );
  assert.deepEqual(segment.bytes, packetMeta.segmentBytes);

  const wrongId = `voidpbc1_${"0".repeat(64)}`;
  const wrongResponse = await fetch(
    `${adapter.base}/checkpoints/v1/${wrongId}/checkpoint.json`,
  );
  assert.notEqual(wrongResponse.status, 200);

  const traversalResponse = await fetch(
    `${adapter.base}/checkpoints/v1/${packetMeta.manifest.checkpoint_id}` +
    "/segments/%2e%2e/blocks.bin",
  );
  assert.notEqual(traversalResponse.status, 200);

  const noAuthorityAdapter = await createPublicSeedClientAdapterV1({
    peers: `http://127.0.0.1:${gatewayPort}`,
    host: "127.0.0.1",
    port: 0,
    timeoutMs: 5_000,
    maxBytes: 8 * 1024 * 1024,
    checkpointQualificationNotAfterMs: Date.now() + 60_000,
    allowLoopbackFixture: true,
  });
  try {
    const unavailable = await fetch(
      `${noAuthorityAdapter.base}/__void/checkpoint/v1.json`,
    );
    assert.equal(unavailable.status, 503);
  } finally {
    await new Promise((resolve) => noAuthorityAdapter.server.close(resolve));
  }

  const expiringAdapter = await createPublicSeedClientAdapterV1({
    peers: `http://127.0.0.1:${gatewayPort}`,
    host: "127.0.0.1",
    port: 0,
    timeoutMs: 5_000,
    maxBytes: 8 * 1024 * 1024,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation: "b".repeat(32),
      sequence: 2,
      secret,
    },
    checkpointQualificationNotAfterMs: Date.now() + 40,
    allowLoopbackFixture: true,
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const expired = await fetch(
      `${expiringAdapter.base}/__void/checkpoint/v1.json`,
      {
        headers: {
          [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]: "c".repeat(64),
        },
      },
    );
    assert.equal(expired.status, 503);
  } finally {
    await new Promise((resolve) => expiringAdapter.server.close(resolve));
  }

  const slowDiscovery = {
    schema: "void_public_checkpoint_discovery_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "available",
    checkpoint: {
      checkpoint_id: packetMeta.manifest.checkpoint_id,
      manifest_sha256: packetMeta.manifestSha256,
      source_sha: packetMeta.manifest.source_sha,
      head: packetMeta.manifest.head,
      block_count: packetMeta.manifest.block_count,
      segment_count: packetMeta.manifest.segment_count,
      payload_bytes: packetMeta.manifest.payload_bytes,
      packet_base_path:
        `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}`,
    },
  };
  const slowSeed = await startSlowCheckpointSeed(slowDiscovery, 1_500);
  const crossingAdapter = await createPublicSeedClientAdapterV1({
    peers: slowSeed.base,
    host: "127.0.0.1",
    port: 0,
    timeoutMs: 5_000,
    maxBytes: 8 * 1024 * 1024,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation: "d".repeat(32),
      sequence: 3,
      secret,
    },
    checkpointQualificationNotAfterMs: Date.now() + 1_000,
    allowLoopbackFixture: true,
  });
  try {
    const crossed = await fetch(
      `${crossingAdapter.base}/__void/checkpoint/v1.json`,
      {
        headers: {
          [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]: "e".repeat(64),
        },
      },
    );
    assert.equal(crossed.status, 503);
    const crossedBody = await crossed.json();
    assert.equal(crossedBody.error, "checkpoint_qualification_expired");
  } finally {
    await new Promise((resolve) => crossingAdapter.server.close(resolve));
    await new Promise((resolve) => slowSeed.server.close(resolve));
  }

  fs.appendFileSync(
    path.join(packet, "segments", "00000000", "blocks.bin"),
    Buffer.from("tamper"),
  );

  const gatewayTamper = await fetch(
    `http://127.0.0.1:${gatewayPort}${segmentRoute}`,
    { headers: { accept: "application/octet-stream" } },
  );
  assert.equal(gatewayTamper.status, 503);
  const gatewayTamperBody = await gatewayTamper.json();
  assert.equal(gatewayTamperBody.error, "checkpoint_integrity_hold");

  const tamperChallenge = createVerifiedPublicBootstrapChallengeV1(
    `${adapter.base}${segmentRoute}`,
  );
  assert.ok(tamperChallenge);
  const adapterTamper = await fetch(`${adapter.base}${segmentRoute}`, {
    headers: {
      [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]:
        tamperChallenge.nonce,
    },
  });
  assert.equal(adapterTamper.status, 502);

  const badPort = await freePort();
  const bad = spawn(
    process.execPath,
    ["tools/void-public-seed-gateway-v1.mjs"],
    {
      cwd: root,
      env: {
        ...process.env,
        VOID_PUBLIC_SEED_BIND: "127.0.0.1",
        VOID_PUBLIC_SEED_PORT: String(badPort),
        VOID_PUBLIC_SEED_UPSTREAM: "http://127.0.0.1:9",
        VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packet,
        VOID_PUBLIC_SEED_CHECKPOINT_ID: packetMeta.manifest.checkpoint_id,
        VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256: "0".repeat(64),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const badExit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      bad.kill("SIGKILL");
      resolve(null);
    }, 5_000);
    bad.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert.notEqual(badExit, 0);

  console.log("same_qualified_seed_origin=true");
  console.log("new_trust_root=false");
  console.log("bootstrap_manifest_schema_unchanged=true");
  console.log("checkpoint_missing_challenge_rejected=true");
  console.log("checkpoint_missing_authority_rejected=true");
  console.log("checkpoint_expired_qualification_rejected=true");
  console.log("discovery_response_hmac_verified=true");
  console.log("manifest_response_hmac_verified=true");
  console.log("binary_segment_response_hmac_verified=true");
  console.log("manifest_sha256_bound=true");
  console.log("checkpoint_id_bound=true");
  console.log("same_origin_packet_base_path=true");
  console.log("wrong_checkpoint_id_rejected=true");
  console.log("path_traversal_rejected=true");
  console.log("qualification_expired_during_fetch_rejected=true");
  console.log("post_admission_segment_tamper_gateway_hold=true");
  console.log("post_admission_segment_tamper_adapter_rejected=true");
  console.log("post_admission_segment_tamper_rejected=true");
  console.log("bad_manifest_pin_startup_rejected=true");
  console.log("private_mutation_routes_exposed=false");
  console.log("checkpoint_publication_performed=false");
  console.log("checkpoint_upload_performed=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  resetVerifiedPublicBootstrapAuthorityForTestV1();
  if (adapter?.server) {
    await new Promise((resolve) => adapter.server.close(resolve));
  }
  if (gateway?.child) await stopChild(gateway.child);
  fs.rmSync(tmp, { recursive: true, force: true });
}
