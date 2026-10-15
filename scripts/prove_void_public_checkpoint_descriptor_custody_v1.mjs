#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const GATEWAY = path.join(ROOT, "tools", "void-public-seed-gateway-v1.mjs");
const SOURCE = fs.readFileSync(GATEWAY, "utf8");
const MARKER = "VOID_PUBLIC_CHECKPOINT_DESCRIPTOR_CUSTODY_V1_GREEN";
const MANIFEST_MAX_BYTES = 8 * 1024 * 1024;

assert.match(SOURCE, /CHECKPOINT_PROC_FD_ROOT_V1\s*=\s*"\/proc\/self\/fd"/u);
assert.match(SOURCE, /fs\.constants\.O_NOFOLLOW/u);
assert.match(SOURCE, /fs\.constants\.O_DIRECTORY/u);
assert.match(SOURCE, /fs\.readSync\(\s*opened\.fd,/u);
assert.match(SOURCE, /before\.size > maximumBytes/u);
assert.match(SOURCE, /before\.size !== expectedBytes/u);
assert.match(
  SOURCE,
  /const VOID_PUBLIC_CHECKPOINT_MANIFEST_MAX_BYTES_V1 = 8 \* 1024 \* 1024;/u,
);
assert.equal(
  (SOURCE.match(
    /"checkpoint\.json",\s*VOID_PUBLIC_CHECKPOINT_MANIFEST_MAX_BYTES_V1,/gu,
  ) || []).length,
  2,
  "both manifest reads must be bounded before allocation",
);
assert.ok(
  SOURCE.indexOf("before.size > maximumBytes") <
    SOURCE.indexOf("Buffer.allocUnsafe(before.size)"),
  "size ceiling must be checked before allocation",
);
assert.match(SOURCE, /assertCheckpointRootPathPinnedV1/u);
assert.match(SOURCE, /openCheckpointDirectoryPathV1/u);
assert.match(SOURCE, /openCheckpointFileV1/u);
assert.doesNotMatch(SOURCE, /safeCheckpointFileV1/u);
assert.doesNotMatch(SOURCE, /noSymlinkComponentsV1/u);

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
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
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  return port;
}

function makePacket(packet) {
  const segmentDir = path.join(packet, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true, mode: 0o755 });
  const segmentBytes = Buffer.from(
    "VOID_PUBLIC_CHECKPOINT_DESCRIPTOR_CUSTODY_V1_SEGMENT\n",
    "utf8",
  );
  fs.writeFileSync(path.join(segmentDir, "blocks.bin"), segmentBytes, {
    mode: 0o644,
  });

  const body = {
    schema: "void_public_canonical_checkpoint_v1",
    network: "VOID Network",
    chain_id: 2050,
    format: "blocks-bin-only-v1",
    source_sha: "1".repeat(40),
    captured_at: "2026-10-14T00:00:00.000Z",
    head: 0,
    head_era: "minimal",
    head_header_hash: null,
    head_body_sha256: sha256(segmentBytes),
    block_count: 1,
    segment_span: 10_000,
    segment_count: 1,
    payload_bytes: segmentBytes.length,
    segments: [
      {
        name: "00000000",
        path: "segments/00000000/blocks.bin",
        first: 0,
        last: 0,
        blocks: 1,
        bytes: segmentBytes.length,
        sha256: sha256(segmentBytes),
      },
    ],
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
  const manifest = {
    ...body,
    checkpoint_id: checkpointId(body),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(packet, "checkpoint.json"), manifestBytes, {
    mode: 0o644,
  });
  return Object.freeze({
    manifest,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    segmentBytes,
  });
}

async function spawnGateway(packet, meta, port) {
  const child = spawn(process.execPath, [GATEWAY], {
    cwd: ROOT,
    env: {
      ...process.env,
      VOID_PUBLIC_SEED_BIND: "127.0.0.1",
      VOID_PUBLIC_SEED_PORT: String(port),
      VOID_PUBLIC_SEED_UPSTREAM: "http://127.0.0.1:9",
      VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packet,
      VOID_PUBLIC_SEED_CHECKPOINT_ID: meta.manifest.checkpoint_id,
      VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256: meta.manifestSha256,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `gateway startup timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
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
      reject(
        new Error(
          `gateway exited ${code} stdout=${stdout} stderr=${stderr}`,
        ),
      );
    });
  });

  return Object.freeze({
    child,
    stdout: () => stdout,
    stderr: () => stderr,
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const forced = setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 2_000);
  await exited;
  clearTimeout(forced);
}

async function getJson(port, route) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: route,
        method: "GET",
        headers: { accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          const bytes = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(bytes.toString("utf8"));
          } catch (error) {
            void error;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            bytes,
            json,
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

async function getBytes(port, route) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: route,
        method: "GET",
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            bytes: Buffer.concat(chunks),
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-checkpoint-descriptor-custody-v1-"),
);
let runtime = null;

try {
  const packet = path.join(tempRoot, "packet");
  const replacement = path.join(tempRoot, "replacement");
  const retained = path.join(tempRoot, "retained-original");
  const oversized = path.join(tempRoot, "oversized");

  fs.mkdirSync(packet, { recursive: true, mode: 0o755 });
  fs.mkdirSync(replacement, { recursive: true, mode: 0o755 });
  fs.mkdirSync(oversized, { recursive: true, mode: 0o755 });

  const packetMeta = makePacket(packet);
  const replacementMeta = makePacket(replacement);
  const oversizedMeta = makePacket(oversized);
  const oversizedManifestPath = path.join(oversized, "checkpoint.json");
  fs.truncateSync(oversizedManifestPath, MANIFEST_MAX_BYTES + 1);
  assert.equal(
    fs.statSync(oversizedManifestPath).size,
    MANIFEST_MAX_BYTES + 1,
    "oversized manifest fixture must exceed the source ceiling",
  );

  assert.deepEqual(
    replacementMeta.manifestBytes,
    packetMeta.manifestBytes,
    "replacement manifest must be byte-identical",
  );
  assert.deepEqual(
    replacementMeta.segmentBytes,
    packetMeta.segmentBytes,
    "replacement segment must be byte-identical",
  );
  assert.equal(
    replacementMeta.manifestSha256,
    packetMeta.manifestSha256,
    "replacement manifest digest must be identical",
  );

  const packetBefore = fs.statSync(packet);
  const replacementBefore = fs.statSync(replacement);
  assert.notEqual(
    `${packetBefore.dev}:${packetBefore.ino}`,
    `${replacementBefore.dev}:${replacementBefore.ino}`,
    "fixture roots must be distinct filesystem generations",
  );

  const oversizedPort = await freePort();
  await assert.rejects(
    () =>
      spawnGateway(
        oversized,
        {
          ...oversizedMeta,
          manifestSha256: "0".repeat(64),
        },
        oversizedPort,
      ),
    /checkpoint entry size invalid/u,
    "oversized manifest must HOLD before hash/schema admission",
  );

  const port = await freePort();
  runtime = await spawnGateway(packet, packetMeta, port);

  const discoveryRoute = "/__void/checkpoint/v1.json";
  const manifestRoute =
    `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}/checkpoint.json`;
  const segmentRoute =
    `/checkpoints/v1/${packetMeta.manifest.checkpoint_id}` +
    "/segments/00000000/blocks.bin";

  const initialDiscovery = await getJson(port, discoveryRoute);
  assert.equal(initialDiscovery.status, 200);
  assert.equal(initialDiscovery.json?.status, "available");
  assert.equal(
    initialDiscovery.json?.checkpoint?.checkpoint_id,
    packetMeta.manifest.checkpoint_id,
  );

  const initialManifest = await getBytes(port, manifestRoute);
  assert.equal(initialManifest.status, 200);
  assert.deepEqual(initialManifest.bytes, packetMeta.manifestBytes);

  const initialSegment = await getBytes(port, segmentRoute);
  assert.equal(initialSegment.status, 200);
  assert.deepEqual(initialSegment.bytes, packetMeta.segmentBytes);

  // Replace the entire visible checkpoint root after the gateway admitted the
  // original generation. The replacement contains byte-identical valid content,
  // so a hash-only or pathname-only design would continue serving it. The
  // retained-root contract must instead HOLD on the root generation change.
  fs.renameSync(packet, retained);
  fs.renameSync(replacement, packet);

  const visibleAfter = fs.statSync(packet);
  assert.equal(
    `${visibleAfter.dev}:${visibleAfter.ino}`,
    `${replacementBefore.dev}:${replacementBefore.ino}`,
    "visible packet path must now name replacement generation",
  );

  const discoveryAfter = await getJson(port, discoveryRoute);
  assert.equal(
    discoveryAfter.status,
    200,
    "discovery metadata is startup-bound and may remain available",
  );
  assert.equal(discoveryAfter.json?.status, "available");

  const manifestAfter = await getJson(port, manifestRoute);
  assert.equal(manifestAfter.status, 503);
  assert.deepEqual(manifestAfter.json, {
    ok: false,
    error: "checkpoint_integrity_hold",
  });

  const segmentAfter = await getJson(port, segmentRoute);
  assert.equal(segmentAfter.status, 503);
  assert.deepEqual(segmentAfter.json, {
    ok: false,
    error: "checkpoint_integrity_hold",
  });

  assert.deepEqual(
    fs.readFileSync(path.join(packet, "checkpoint.json")),
    packetMeta.manifestBytes,
    "replacement manifest remains byte-identical after rejection",
  );
  assert.deepEqual(
    fs.readFileSync(
      path.join(packet, "segments", "00000000", "blocks.bin"),
    ),
    packetMeta.segmentBytes,
    "replacement segment remains byte-identical after rejection",
  );

  console.log(MARKER);
  console.log("checkpoint_root_descriptor_retained=true");
  console.log("checkpoint_file_reads_descriptor_bound=true");
  console.log("checkpoint_manifest_bounded_before_allocation=true");
  console.log("oversized_manifest_rejected_before_allocation=true");
  console.log("byte_identical_root_replacement_rejected=true");
  console.log("manifest_root_generation_replacement_rejected=true");
  console.log("segment_root_generation_replacement_rejected=true");
  console.log("checkpoint_discovery_startup_metadata_preserved=true");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (runtime) await stopChild(runtime.child);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
