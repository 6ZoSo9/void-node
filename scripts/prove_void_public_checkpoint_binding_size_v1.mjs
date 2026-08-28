#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import {
  VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
  computeVoidPublicCheckpointIdV1,
} from "./lib/void_public_checkpoint_contract_v1.mjs";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";
import {
  VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1,
  VOID_PUBLIC_SEED_AUTHORITY_HMAC_HEADER_V1,
  createVerifiedPublicBootstrapChallengeV1,
  installVerifiedPublicBootstrapAuthorityForTestV1,
  resetVerifiedPublicBootstrapAuthorityForTestV1,
  verifyVerifiedPublicBootstrapResponseV1,
} from "../dist/http/follower_verified_public_bootstrap_authority_v1.js";

const MARKER = "VOID_PUBLIC_CHECKPOINT_BINDING_SIZE_V1_PROOF";
const root = process.cwd();
const producer = path.join(
  root,
  "tools/void-public-canonical-checkpoint-v1.mjs",
);
const secret = Buffer.from("73".repeat(32), "hex");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
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

function packetBody(segmentBytes, segmentSha256) {
  return {
    schema: "void_public_canonical_checkpoint_v1",
    network: "VOID Network",
    chain_id: 2050,
    format: "blocks-bin-only-v1",
    source_sha: "1".repeat(40),
    captured_at: "2026-08-28T00:00:00.000Z",
    head: 0,
    head_era: "minimal",
    head_header_hash: null,
    head_body_sha256: segmentSha256,
    block_count: 1,
    segment_span: 10_000,
    segment_count: 1,
    payload_bytes: segmentBytes,
    segments: [{
      name: "00000000",
      path: "segments/00000000/blocks.bin",
      first: 0,
      last: 0,
      blocks: 1,
      bytes: segmentBytes,
      sha256: segmentSha256,
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
}

function makePacket(dir, bytes) {
  const segmentDir = path.join(dir, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const segmentPath = path.join(segmentDir, "blocks.bin");
  fs.writeFileSync(segmentPath, bytes);
  const segmentSha256 = sha256(bytes);
  const body = packetBody(bytes.length, segmentSha256);
  const draft = { ...body, checkpoint_id: "" };
  const manifest = {
    ...body,
    checkpoint_id: computeVoidPublicCheckpointIdV1(draft),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(dir, "checkpoint.json"), manifestBytes);
  return {
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    segmentBytes: Buffer.from(bytes),
  };
}

function discoveryFor(packet, overrides = {}) {
  return {
    schema: "void_public_checkpoint_discovery_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "available",
    checkpoint: {
      checkpoint_id: packet.manifest.checkpoint_id,
      manifest_sha256: packet.manifestSha256,
      source_sha: packet.manifest.source_sha,
      head: packet.manifest.head,
      block_count: packet.manifest.block_count,
      segment_count: packet.manifest.segment_count,
      payload_bytes: packet.manifest.payload_bytes,
      packet_base_path:
        `/checkpoints/v1/${packet.manifest.checkpoint_id}`,
      ...overrides,
    },
  };
}

async function spawnGateway(packetDir, packet, port) {
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
        VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packetDir,
        VOID_PUBLIC_SEED_CHECKPOINT_ID: packet.manifest.checkpoint_id,
        VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256:
          packet.manifestSha256,
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
      reject(
        new Error(
          `gateway startup timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
    }, 15_000);
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
      reject(
        new Error(
          `gateway exited ${code} stdout=${stdout} stderr=${stderr}`,
        ),
      );
    });
  });
  return child;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
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

async function startFixtureSeed({
  discovery,
  manifestBytes,
  segmentBytes,
}) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const checkpointId = discovery.checkpoint.checkpoint_id;
  const manifestRoute =
    `/checkpoints/v1/${checkpointId}/checkpoint.json`;
  const segmentRoute =
    `/checkpoints/v1/${checkpointId}` +
    "/segments/00000000/blocks.bin";
  const discoveryBytes = Buffer.from(`${JSON.stringify(discovery)}\n`);

  const server = http.createServer((req, res) => {
    const method = String(req.method || "GET").toUpperCase();
    const route = String(req.url || "/");
    if (method !== "GET") {
      res.statusCode = 405;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-void-public-seed-gateway", "v1");
      res.end('{"error":"method_not_allowed"}\n');
      return;
    }
    let body;
    let type;
    if (route === "/__void/checkpoint/v1.json") {
      body = discoveryBytes;
      type = "application/json; charset=utf-8";
    } else if (route === manifestRoute) {
      body = manifestBytes;
      type = "application/json; charset=utf-8";
    } else if (route === segmentRoute) {
      body = segmentBytes;
      type = "application/octet-stream";
    } else {
      body = Buffer.from('{"error":"route_not_public"}\n');
      type = "application/json; charset=utf-8";
      res.statusCode = 404;
      res.setHeader("content-type", type);
      res.setHeader("content-length", String(body.length));
      res.setHeader("x-void-public-seed-gateway", "v1");
      res.end(body);
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", type);
    res.setHeader("content-length", String(body.length));
    res.setHeader("x-void-public-seed-gateway", "v1");
    res.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, base, manifestRoute, segmentRoute };
}

async function startAdapter(seedBase, generationChar, sequence) {
  const adapter = await createPublicSeedClientAdapterV1({
    peers: seedBase,
    host: "127.0.0.1",
    port: 0,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation: generationChar.repeat(32),
      sequence,
      secret,
    },
    checkpointQualificationNotAfterMs: Date.now() + 120_000,
    allowLoopbackFixture: true,
  });
  resetVerifiedPublicBootstrapAuthorityForTestV1();
  assert.equal(
    installVerifiedPublicBootstrapAuthorityForTestV1({
      sequence,
      generation: generationChar.repeat(32),
      adapter_origin: adapter.base,
      secret_hex: secret.toString("hex"),
    }),
    true,
  );
  return adapter;
}

async function authorizedGet(adapterBase, route) {
  const url = `${adapterBase}${route}`;
  const challenge = createVerifiedPublicBootstrapChallengeV1(url);
  assert.ok(challenge);
  const response = await fetch(url, {
    headers: {
      [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]:
        challenge.nonce,
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, bytes.toString("utf8"));
  assert.equal(
    verifyVerifiedPublicBootstrapResponseV1(
      response,
      bytes,
      challenge,
    ),
    true,
  );
  return { response, bytes };
}

async function challengedReject(adapterBase, route) {
  const url = `${adapterBase}${route}`;
  const challenge = createVerifiedPublicBootstrapChallengeV1(url);
  assert.ok(challenge);
  const response = await fetch(url, {
    headers: {
      [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]:
        challenge.nonce,
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.notEqual(response.status, 200);
  assert.equal(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_HMAC_HEADER_V1),
    null,
  );
  return { response, bytes };
}

function makeOversizeGatewayPacket(dir) {
  const segmentDir = path.join(dir, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const segmentPath = path.join(segmentDir, "blocks.bin");
  fs.closeSync(fs.openSync(segmentPath, "w"));
  fs.truncateSync(
    segmentPath,
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 + 1,
  );
  const body = packetBody(
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 + 1,
    "0".repeat(64),
  );
  const draft = { ...body, checkpoint_id: "" };
  const manifest = {
    ...body,
    checkpoint_id: computeVoidPublicCheckpointIdV1(draft),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(dir, "checkpoint.json"), manifestBytes);
  return {
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
  };
}

function makeOversizeProducerSource(dir) {
  const segmentDir = path.join(dir, "segments", "00000000");
  const walDir = path.join(dir, "wal");
  fs.mkdirSync(segmentDir, { recursive: true });
  fs.mkdirSync(walDir, { recursive: true });
  const segmentPath = path.join(segmentDir, "blocks.bin");
  fs.closeSync(fs.openSync(segmentPath, "w"));
  fs.truncateSync(
    segmentPath,
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 + 1,
  );
  fs.writeFileSync(
    path.join(dir, "heads.json"),
    `${JSON.stringify({ head: 0, number: 0, hash: "0x0" })}\n`,
  );
  fs.writeFileSync(path.join(dir, "head.txt"), "0\n");
  fs.writeFileSync(path.join(walDir, "wal.jsonl"), "");
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-binding-size-v1-"),
);

let gateway = null;
let adapter = null;
try {
  const sourceSha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim();
  assert.match(sourceSha, /^[0-9a-f]{40}$/);
  const oversizeSource = path.join(tmp, "producer-oversize-source");
  makeOversizeProducerSource(oversizeSource);
  const producerOversize = spawnSync(
    process.execPath,
    [
      producer,
      "capture",
      "--data-dir", oversizeSource,
      "--output", path.join(tmp, "producer-oversize-packet"),
      "--repo-root", root,
      "--expected-source-sha", sourceSha,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(producerOversize.status, 0);
  assert.match(
    producerOversize.stderr,
    /segment exceeds checkpoint byte ceiling/,
  );

  const gatewayOversizeDir = path.join(tmp, "gateway-oversize");
  fs.mkdirSync(gatewayOversizeDir, { recursive: true });
  const gatewayOversize = makeOversizeGatewayPacket(
    gatewayOversizeDir,
  );
  const oversizePort = await freePort();
  const oversizeChild = spawn(
    process.execPath,
    ["tools/void-public-seed-gateway-v1.mjs"],
    {
      cwd: root,
      env: {
        ...process.env,
        VOID_PUBLIC_SEED_BIND: "127.0.0.1",
        VOID_PUBLIC_SEED_PORT: String(oversizePort),
        VOID_PUBLIC_SEED_UPSTREAM: "http://127.0.0.1:9",
        VOID_PUBLIC_SEED_CHECKPOINT_ROOT: gatewayOversizeDir,
        VOID_PUBLIC_SEED_CHECKPOINT_ID:
          gatewayOversize.manifest.checkpoint_id,
        VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256:
          gatewayOversize.manifestSha256,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const oversizeExit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (oversizeChild.exitCode === null) oversizeChild.kill("SIGKILL");
      resolve(null);
    }, 8_000);
    oversizeChild.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert.notEqual(oversizeExit, 0);

  const capDir = path.join(tmp, "cap-packet");
  fs.mkdirSync(capDir, { recursive: true });
  const capBytes = Buffer.alloc(
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
    0x5a,
  );
  const capPacket = makePacket(capDir, capBytes);
  const gatewayPort = await freePort();
  gateway = await spawnGateway(capDir, capPacket, gatewayPort);
  adapter = await startAdapter(
    `http://127.0.0.1:${gatewayPort}`,
    "a",
    1,
  );
  const capDiscovery = await authorizedGet(
    adapter.base,
    "/__void/checkpoint/v1.json",
  );
  const capDiscoveryBody = JSON.parse(
    capDiscovery.bytes.toString("utf8"),
  );
  assert.equal(
    capDiscoveryBody.checkpoint.payload_bytes,
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
  );
  const capManifestRoute =
    `/checkpoints/v1/${capPacket.manifest.checkpoint_id}/checkpoint.json`;
  await authorizedGet(adapter.base, capManifestRoute);
  const capSegmentRoute =
    `/checkpoints/v1/${capPacket.manifest.checkpoint_id}` +
    "/segments/00000000/blocks.bin";
  const capSegment = await authorizedGet(
    adapter.base,
    capSegmentRoute,
  );
  assert.equal(
    capSegment.bytes.length,
    VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
  );
  assert.equal(
    sha256(capSegment.bytes),
    capPacket.manifest.segments[0].sha256,
  );
  await new Promise((resolve) => adapter.server.close(resolve));
  adapter = null;
  await stopChild(gateway);
  gateway = null;

  const tinyDir = path.join(tmp, "tiny-packet");
  fs.mkdirSync(tinyDir, { recursive: true });
  const tinyPacket = makePacket(
    tinyDir,
    Buffer.from("VOID_BINDING_SEGMENT_V1\n"),
  );

  const rawMismatchSeed = await startFixtureSeed({
    discovery: discoveryFor(tinyPacket),
    manifestBytes: Buffer.from(JSON.stringify(tinyPacket.manifest)),
    segmentBytes: tinyPacket.segmentBytes,
  });
  adapter = await startAdapter(rawMismatchSeed.base, "b", 1);
  await authorizedGet(adapter.base, "/__void/checkpoint/v1.json");
  const rawMismatch = await challengedReject(
    adapter.base,
    rawMismatchSeed.manifestRoute,
  );
  assert.equal(rawMismatch.response.status, 502);
  await new Promise((resolve) => adapter.server.close(resolve));
  adapter = null;
  await new Promise((resolve) => rawMismatchSeed.server.close(resolve));

  const tupleMismatchSeed = await startFixtureSeed({
    discovery: discoveryFor(tinyPacket, {
      head: 1,
      block_count: 2,
      segment_count: 1,
    }),
    manifestBytes: tinyPacket.manifestBytes,
    segmentBytes: tinyPacket.segmentBytes,
  });
  adapter = await startAdapter(tupleMismatchSeed.base, "c", 1);
  await authorizedGet(adapter.base, "/__void/checkpoint/v1.json");
  const tupleMismatch = await challengedReject(
    adapter.base,
    tupleMismatchSeed.manifestRoute,
  );
  assert.equal(tupleMismatch.response.status, 502);
  await new Promise((resolve) => adapter.server.close(resolve));
  adapter = null;
  await new Promise((resolve) => tupleMismatchSeed.server.close(resolve));

  const wrongSegment = Buffer.from(tinyPacket.segmentBytes);
  wrongSegment[0] ^= 1;
  const segmentMismatchSeed = await startFixtureSeed({
    discovery: discoveryFor(tinyPacket),
    manifestBytes: tinyPacket.manifestBytes,
    segmentBytes: wrongSegment,
  });
  adapter = await startAdapter(segmentMismatchSeed.base, "d", 1);
  await authorizedGet(adapter.base, "/__void/checkpoint/v1.json");
  await authorizedGet(adapter.base, segmentMismatchSeed.manifestRoute);
  const segmentMismatch = await challengedReject(
    adapter.base,
    segmentMismatchSeed.segmentRoute,
  );
  assert.equal(segmentMismatch.response.status, 502);
  await new Promise((resolve) => adapter.server.close(resolve));
  adapter = null;
  await new Promise((resolve) => segmentMismatchSeed.server.close(resolve));

  console.log(
    `checkpoint_segment_max_bytes=${VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1}`,
  );
  console.log("producer_cap_plus_one_rejected=true");
  console.log("gateway_cap_plus_one_rejected=true");
  console.log("default_adapter_exact_cap_fetch_green=true");
  console.log("discovery_manifest_raw_sha_bound=true");
  console.log("discovery_manifest_totals_bound=true");
  console.log("verified_manifest_segment_length_bound=true");
  console.log("verified_manifest_segment_sha256_bound=true");
  console.log("split_generation_manifest_not_resigned=true");
  console.log("split_generation_segment_not_resigned=true");
  console.log("new_trust_root=false");
  console.log("checkpoint_publication_performed=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  resetVerifiedPublicBootstrapAuthorityForTestV1();
  if (adapter?.server) {
    await new Promise((resolve) => adapter.server.close(resolve));
  }
  await stopChild(gateway);
  fs.rmSync(tmp, { recursive: true, force: true });
}
