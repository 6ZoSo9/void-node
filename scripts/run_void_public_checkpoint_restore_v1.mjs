#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
  parseVoidPublicCheckpointDiscoveryBytesV1,
  validateVoidPublicCheckpointManifestBytesV1,
  validateVoidPublicCheckpointSegmentBytesV1,
} from "./lib/void_public_checkpoint_contract_v1.mjs";
import { autoRepairDataDir } from "../dist/chain/auto_repair.js";
import {
  VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1,
  createVerifiedPublicBootstrapChallengeV1,
  verifyVerifiedPublicBootstrapResponseV1,
} from "../dist/http/follower_verified_public_bootstrap_authority_v1.js";

const MARKER = "VOID_PUBLIC_CHECKPOINT_RESTORE_V1";
const RESTORE_STAGING_SUFFIX = ".void-public-checkpoint-restore-v1-staging";
const AUTHORITY_WAIT_MS = 10_000;
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkpointTool = path.join(
  repoRoot,
  "tools/void-public-canonical-checkpoint-v1.mjs",
);

function fail(message) {
  const error = new Error(message);
  error.voidCheckpointRestoreFailureV1 = true;
  throw error;
}

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function assertSafeParent(dataDir) {
  const parent = path.dirname(dataDir);
  const canonicalParent = fs.realpathSync(parent);
  if (canonicalParent !== parent) {
    fail("DATA_DIR parent must not traverse symlinks");
  }
  const st = fs.lstatSync(parent);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    fail("DATA_DIR parent must be a real directory");
  }
  if (typeof process.getuid === "function" && st.uid !== process.getuid()) {
    fail("DATA_DIR parent must be owned by the current user");
  }
  if ((st.mode & 0o002) !== 0) {
    fail("DATA_DIR parent must not be world-writable");
  }
  return parent;
}

function ensureDirectory(dir) {
  if (lstatOrNull(dir)) fail(`restore directory already exists: ${dir}`);
  fs.mkdirSync(dir, { mode: 0o700 });
  fsyncDirectory(path.dirname(dir));
}

function ensureChildDirectory(parent, dir) {
  const existing = lstatOrNull(dir);
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) {
      fail(`restore path is not a real directory: ${dir}`);
    }
    return;
  }
  fs.mkdirSync(dir, { mode: 0o700 });
  fsyncDirectory(parent);
}

function writeFileDurable(file, bytes) {
  if (lstatOrNull(file)) fail(`restore file already exists: ${file}`);
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    let offset = 0;
    const body = Buffer.from(bytes);
    while (offset < body.length) {
      const written = fs.writeSync(
        fd,
        body,
        offset,
        body.length - offset,
        offset,
      );
      if (written <= 0) fail(`short restore write: ${file}`);
      offset += written;
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDirectory(path.dirname(file));
}

function removeFileDurable(file) {
  const st = lstatOrNull(file);
  if (!st || !st.isFile() || st.isSymbolicLink()) {
    fail(`durable unlink target is not a regular file: ${file}`);
  }
  fs.unlinkSync(file);
  fsyncDirectory(path.dirname(file));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForChallenge(url) {
  const deadline = Date.now() + AUTHORITY_WAIT_MS;
  while (Date.now() < deadline) {
    const challenge = createVerifiedPublicBootstrapChallengeV1(url);
    if (challenge) return challenge;
    await sleep(10);
  }
  fail("checkpoint restore did not receive bootstrap response authority");
}

async function authorizedGet(adapterOrigin, route) {
  const target = new URL(route, `${adapterOrigin}/`).href;
  const challenge = await waitForChallenge(target);
  const response = await fetch(target, {
    method: "GET",
    redirect: "error",
    headers: {
      [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]:
        challenge.nonce,
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    !verifyVerifiedPublicBootstrapResponseV1(
      response,
      bytes,
      challenge,
    )
  ) {
    fail(`checkpoint response authority verification failed: ${route}`);
  }
  return { response, bytes };
}

function verifySemanticPacket(packetDir) {
  const cp = childProcess.spawnSync(
    process.execPath,
    [
      checkpointTool,
      "verify",
      "--packet",
      packetDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (
    cp.status !== 0 ||
    !String(cp.stdout || "").includes(
      "VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_VERIFY_GREEN",
    ) ||
    !String(cp.stdout || "").includes(
      "canonical_semantics_verified=true",
    ) ||
    !String(cp.stdout || "").includes(
      "authority_boundary_verified=true",
    )
  ) {
    fail(
      `checkpoint semantic verification failed: ${String(
        cp.stderr || cp.stdout || "",
      ).slice(0, 2000)}`,
    );
  }
}

function verifyReconstructedHead(dataDir, expectedHead) {
  const headTxt = path.join(dataDir, "head.txt");
  const headsJson = path.join(dataDir, "heads.json");
  const txt = fs.readFileSync(headTxt, "utf8").trim();
  if (txt !== String(expectedHead)) {
    fail(`reconstructed head.txt mismatch: ${txt}`);
  }
  const heads = JSON.parse(fs.readFileSync(headsJson, "utf8"));
  if (
    heads?.head !== expectedHead ||
    heads?.number !== expectedHead
  ) {
    fail("reconstructed heads.json mismatch");
  }
}

function exactPostRepairTopLevel(dataDir) {
  const actual = fs.readdirSync(dataDir).sort();
  const expected = ["head.txt", "heads.json", "segments"];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `post-repair data generation top-level mismatch: ${actual.join(",")}`,
    );
  }
}

async function main() {
  const adapterOrigin = String(
    process.env.VOID_PUBLIC_CHECKPOINT_ADAPTER_ORIGIN || "",
  ).trim();
  if (!adapterOrigin) {
    fail("VOID_PUBLIC_CHECKPOINT_ADAPTER_ORIGIN is required");
  }
  let adapterUrl;
  try {
    adapterUrl = new URL(adapterOrigin);
  } catch {
    fail("checkpoint adapter origin is invalid");
  }
  const adapterHost = adapterUrl.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (
    adapterUrl.protocol !== "http:" ||
    !["127.0.0.1", "::1"].includes(adapterHost) ||
    adapterUrl.username ||
    adapterUrl.password ||
    adapterUrl.search ||
    adapterUrl.hash ||
    (adapterUrl.pathname !== "/" && adapterUrl.pathname !== "")
  ) {
    fail("checkpoint adapter must be one credential-free loopback origin");
  }

  const dataDir = path.resolve(
    String(process.env.DATA_DIR || path.join(repoRoot, "data")),
  );
  if (dataDir === path.parse(dataDir).root) {
    fail("DATA_DIR must not be a filesystem root");
  }
  const parent = assertSafeParent(dataDir);
  if (lstatOrNull(dataDir)) {
    console.log(`${MARKER}_SKIP_EXISTING_DATA_DIR`);
    console.log(`data_dir=${dataDir}`);
    console.log("data_dir_mutated=false");
    console.log("checkpoint_restore_attempted=false");
    return;
  }

  const staging = `${dataDir}${RESTORE_STAGING_SUFFIX}`;
  if (lstatOrNull(staging)) {
    fail(`stale checkpoint restore staging directory exists: ${staging}`);
  }

  const discoveryResponse = await authorizedGet(
    adapterUrl.origin,
    "/__void/checkpoint/v1.json",
  );
  const discovery =
    parseVoidPublicCheckpointDiscoveryBytesV1(
      discoveryResponse.bytes,
    );
  if (discovery.status === "unavailable") {
    console.log(`${MARKER}_SKIP_UNAVAILABLE`);
    console.log(`data_dir=${dataDir}`);
    console.log("data_dir_mutated=false");
    console.log("checkpoint_restore_attempted=true");
    console.log("checkpoint_available=false");
    return;
  }

  let stagingCreated = false;
  let activated = false;
  try {
    ensureDirectory(staging);
    stagingCreated = true;

    const checkpoint = discovery.checkpoint;
    const manifestRoute =
      `${checkpoint.packet_base_path}/checkpoint.json`;
    const manifestResponse = await authorizedGet(
      adapterUrl.origin,
      manifestRoute,
    );
    const verifiedManifest =
      validateVoidPublicCheckpointManifestBytesV1(
        manifestResponse.bytes,
        {
          expectedCheckpoint: checkpoint,
          expectedCheckpointId: checkpoint.checkpoint_id,
        },
      );

    writeFileDurable(
      path.join(staging, "checkpoint.json"),
      manifestResponse.bytes,
    );

    const segmentsRoot = path.join(staging, "segments");
    ensureChildDirectory(staging, segmentsRoot);

    for (const entry of verifiedManifest.manifest.segments) {
      if (
        entry.bytes <= 0 ||
        entry.bytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1
      ) {
        fail(`checkpoint segment outside byte contract: ${entry.name}`);
      }
      const route =
        `${checkpoint.packet_base_path}/${entry.path}`;
      const segmentResponse = await authorizedGet(
        adapterUrl.origin,
        route,
      );
      validateVoidPublicCheckpointSegmentBytesV1(
        route,
        segmentResponse.bytes,
        verifiedManifest,
      );

      const segmentDir = path.join(segmentsRoot, entry.name);
      ensureChildDirectory(segmentsRoot, segmentDir);
      writeFileDurable(
        path.join(segmentDir, "blocks.bin"),
        segmentResponse.bytes,
      );
    }

    verifySemanticPacket(staging);

    removeFileDurable(path.join(staging, "checkpoint.json"));

    const repaired = await autoRepairDataDir(staging, {
      sparseEvery: 16,
      dryRun: false,
    });
    if (!repaired || repaired.mutationsApplied !== true) {
      fail("checkpoint restore auto-repair did not reconstruct derived state");
    }
    verifyReconstructedHead(staging, verifiedManifest.head);
    exactPostRepairTopLevel(staging);

    if (lstatOrNull(dataDir)) {
      fail("DATA_DIR appeared before checkpoint activation");
    }
    fs.renameSync(staging, dataDir);
    fsyncDirectory(parent);
    activated = true;
    stagingCreated = false;

    console.log(`${MARKER}_GREEN`);
    console.log(`checkpoint_id=${verifiedManifest.checkpoint_id}`);
    console.log(`checkpoint_head=${verifiedManifest.head}`);
    console.log(`checkpoint_block_count=${verifiedManifest.block_count}`);
    console.log(`checkpoint_segment_count=${verifiedManifest.segment_count}`);
    console.log(`checkpoint_payload_bytes=${verifiedManifest.payload_bytes}`);
    console.log(`checkpoint_segment_max_bytes=${VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1}`);
    console.log(`data_dir=${dataDir}`);
    console.log("semantic_verify=true");
    console.log("auto_repair_sparse_every=16");
    console.log("atomic_activation=true");
    console.log("parent_directory_fsync=true");
    console.log("existing_store_overwrite=false");
    console.log("checkpoint_publication_authority=false");
    console.log("runtime_node_started=false");
  } finally {
    if (!activated && stagingCreated && lstatOrNull(staging)) {
      fs.rmSync(staging, { recursive: true, force: true });
      fsyncDirectory(parent);
    }
  }
}

main()
  .then(() => {
    if (
      process.connected &&
      typeof process.disconnect === "function"
    ) {
      process.disconnect();
    }
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(`${MARKER}_HOLD: ${error?.stack || error}`);
    if (
      process.connected &&
      typeof process.disconnect === "function"
    ) {
      process.disconnect();
    }
    process.exitCode = 1;
  });
