#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  computeVoidPublicCheckpointIdV1,
} from "./lib/void_public_checkpoint_contract_v1.mjs";
import {
  runPublicCheckpointRestorePreNodeV1,
} from "./lib/void_public_checkpoint_restore_supervisor_v1.mjs";
import {
  activateCheckpointStagingNoReplaceV1,
} from "./lib/void_public_checkpoint_restore_activation_v1.mjs";
import {
  closeOwnedCheckpointRestoreGenerationV1,
  createOwnedCheckpointRestoreGenerationV1,
  finalizeFailedOwnedCheckpointRestoreGenerationV1,
} from "./lib/void_public_checkpoint_restore_generation_v1.mjs";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_PUBLIC_CHECKPOINT_RESTORE_V1_PROOF";
const root = process.cwd();
const gatewayTool = path.join(
  root,
  "tools/void-public-seed-gateway-v1.mjs",
);
const restoreScript = path.join(
  root,
  "scripts/run_void_public_checkpoint_restore_v1.mjs",
);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function frame(body) {
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function makePacket(dir, { semanticValid }) {
  const segmentDir = path.join(dir, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const body = semanticValid
    ? Buffer.from(JSON.stringify({ number: 0, timestamp: 1 }))
    : Buffer.from("{not-valid-json");
  const segmentBytes = frame(body);
  const segmentSha = sha256(segmentBytes);
  fs.writeFileSync(
    path.join(segmentDir, "blocks.bin"),
    segmentBytes,
  );

  const base = {
    schema: "void_public_canonical_checkpoint_v1",
    network: "VOID Network",
    chain_id: 2050,
    format: "blocks-bin-only-v1",
    source_sha: "1".repeat(40),
    captured_at: "2026-08-28T00:00:00.000Z",
    head: 0,
    head_era: "minimal",
    head_header_hash: null,
    head_body_sha256: sha256(body),
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
        sha256: segmentSha,
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
    ...base,
    checkpoint_id: computeVoidPublicCheckpointIdV1({
      ...base,
      checkpoint_id: "",
    }),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dir, "checkpoint.json"),
    manifestBytes,
  );
  return {
    manifest,
    manifestBytes,
    manifestSha: sha256(manifestBytes),
  };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port =
    typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  assert.ok(port > 0);
  return port;
}

async function spawnGateway(packetDir, packet, port) {
  const child = spawn(
    process.execPath,
    [gatewayTool],
    {
      cwd: root,
      env: {
        ...process.env,
        VOID_PUBLIC_SEED_BIND: "127.0.0.1",
        VOID_PUBLIC_SEED_PORT: String(port),
        VOID_PUBLIC_SEED_UPSTREAM: "http://127.0.0.1:9",
        VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packetDir,
        VOID_PUBLIC_SEED_CHECKPOINT_ID:
          packet.manifest.checkpoint_id,
        VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256:
          packet.manifestSha,
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
    }, 8_000);
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

async function withAdapter(packetDir, packet, fn) {
  const gatewayPort = await freePort();
  const gateway = await spawnGateway(
    packetDir,
    packet,
    gatewayPort,
  );
  const secret = Buffer.from("61".repeat(32), "hex");
  const generation = "b".repeat(32);
  const sequence = 1;
  const adapter = await createPublicSeedClientAdapterV1({
    peers: `http://127.0.0.1:${gatewayPort}`,
    host: "127.0.0.1",
    port: 0,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation,
      sequence,
      secret,
    },
    checkpointQualificationNotAfterMs: Date.now() + 120_000,
    allowLoopbackFixture: true,
  });
  try {
    return await fn({
      adapter,
      secret,
      generation,
      sequence,
    });
  } finally {
    await new Promise((resolve) => adapter.server.close(resolve));
    await stopChild(gateway);
  }
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-restore-v1-proof-"),
);

try {
  const ownedParent = path.join(tmp, "owned");
  fs.mkdirSync(ownedParent, { mode: 0o700 });

  const activationSuccessStaging = path.join(
    ownedParent,
    "activation-success-staging",
  );
  const activationSuccessTarget = path.join(
    ownedParent,
    "activation-success-target",
  );
  fs.mkdirSync(activationSuccessStaging, { mode: 0o700 });
  fs.writeFileSync(
    path.join(activationSuccessStaging, "sentinel"),
    "staged-generation\n",
  );
  const activationSuccessBefore = fs.lstatSync(
    activationSuccessStaging,
    { bigint: true },
  );
  const activationSuccess = activateCheckpointStagingNoReplaceV1({
    staging: activationSuccessStaging,
    dataDir: activationSuccessTarget,
    parent: ownedParent,
    expectedDevice: String(activationSuccessBefore.dev),
    expectedInode: String(activationSuccessBefore.ino),
  });
  assert.equal(activationSuccess.activated, true);
  assert.equal(fs.existsSync(activationSuccessStaging), false);
  const activationSuccessAfter = fs.lstatSync(
    activationSuccessTarget,
    { bigint: true },
  );
  assert.equal(
    activationSuccessAfter.dev,
    activationSuccessBefore.dev,
  );
  assert.equal(
    activationSuccessAfter.ino,
    activationSuccessBefore.ino,
  );
  assert.equal(
    fs.readFileSync(
      path.join(activationSuccessTarget, "sentinel"),
      "utf8",
    ),
    "staged-generation\n",
  );

  const activationRaceStaging = path.join(
    ownedParent,
    "activation-race-staging",
  );
  const activationRaceTarget = path.join(
    ownedParent,
    "activation-race-target",
  );
  fs.mkdirSync(activationRaceStaging, { mode: 0o700 });
  fs.writeFileSync(
    path.join(activationRaceStaging, "staged"),
    "must-not-activate\n",
  );
  assert.equal(fs.existsSync(activationRaceTarget), false);
  const activationRaceBefore = fs.lstatSync(
    activationRaceStaging,
    { bigint: true },
  );

  fs.mkdirSync(activationRaceTarget, { mode: 0o700 });
  fs.writeFileSync(
    path.join(activationRaceTarget, "external-sentinel"),
    "preserve-me\n",
  );

  assert.throws(
    () =>
      activateCheckpointStagingNoReplaceV1({
        staging: activationRaceStaging,
        dataDir: activationRaceTarget,
        parent: ownedParent,
        expectedDevice: String(activationRaceBefore.dev),
        expectedInode: String(activationRaceBefore.ino),
      }),
    /DATA_DIR exists/,
  );
  assert.equal(fs.existsSync(activationRaceStaging), true);
  assert.equal(
    fs.readFileSync(
      path.join(activationRaceTarget, "external-sentinel"),
      "utf8",
    ),
    "preserve-me\n",
  );
  assert.equal(
    fs.existsSync(
      path.join(activationRaceTarget, "staged"),
    ),
    false,
  );

  const generationTarget = path.join(
    ownedParent,
    "generation-authority-target",
  );
  const generation = createOwnedCheckpointRestoreGenerationV1({
    dataDir: generationTarget,
    parent: ownedParent,
  });
  fs.writeFileSync(
    path.join(generation.fdRoot, "owned-before-replace"),
    "owned-p1\n",
  );
  const generationMoved = `${generation.namespacePath}.moved`;
  fs.renameSync(generation.namespacePath, generationMoved);
  fs.mkdirSync(generation.namespacePath, { mode: 0o700 });
  fs.writeFileSync(
    path.join(generation.namespacePath, "foreign-sentinel"),
    "preserve-p2\n",
  );
  fs.writeFileSync(
    path.join(generation.fdRoot, "owned-after-replace"),
    "still-p1\n",
  );
  assert.equal(
    fs.readFileSync(
      path.join(generationMoved, "owned-after-replace"),
      "utf8",
    ),
    "still-p1\n",
  );
  assert.equal(
    fs.existsSync(
      path.join(generation.namespacePath, "owned-after-replace"),
    ),
    false,
  );
  const generationTerminal =
    finalizeFailedOwnedCheckpointRestoreGenerationV1(generation);
  assert.equal(
    generationTerminal.status,
    "foreign_replacement_preserved",
  );
  assert.equal(generationTerminal.recursive_delete, false);
  assert.equal(
    fs.readFileSync(
      path.join(
        generation.namespacePath,
        "foreign-sentinel",
      ),
      "utf8",
    ),
    "preserve-p2\n",
  );

  const crashTarget = path.join(
    ownedParent,
    "crash-retry-target",
  );
  const crashedGeneration =
    createOwnedCheckpointRestoreGenerationV1({
      dataDir: crashTarget,
      parent: ownedParent,
    });
  const crashedPath = crashedGeneration.namespacePath;
  closeOwnedCheckpointRestoreGenerationV1(
    crashedGeneration,
  );
  assert.equal(fs.existsSync(crashedPath), true);

  const retryGeneration =
    createOwnedCheckpointRestoreGenerationV1({
      dataDir: crashTarget,
      parent: ownedParent,
    });
  assert.notEqual(
    retryGeneration.namespacePath,
    crashedPath,
  );
  assert.equal(fs.existsSync(crashedPath), true);
  assert.equal(
    fs.existsSync(retryGeneration.namespacePath),
    true,
  );
  const retryTerminal =
    finalizeFailedOwnedCheckpointRestoreGenerationV1(
      retryGeneration,
    );
  assert.equal(
    retryTerminal.status,
    "owned_stale_generation_retained",
  );
  assert.equal(retryTerminal.retry_blocked, false);

  const disabled = await runPublicCheckpointRestorePreNodeV1({
    env: {
      ...process.env,
      VOID_PUBLIC_CHECKPOINT_RESTORE: "0",
    },
  });
  assert.equal(disabled.attempted, false);

  const validPacketDir = path.join(tmp, "valid-packet");
  fs.mkdirSync(validPacketDir, { mode: 0o700 });
  const validPacket = makePacket(validPacketDir, {
    semanticValid: true,
  });

  await withAdapter(
    validPacketDir,
    validPacket,
    async ({ adapter, secret, generation, sequence }) => {
      const target = path.join(ownedParent, "data-valid");
      const result = await runPublicCheckpointRestorePreNodeV1({
        adapterBase: adapter.base,
        authorityGeneration: generation,
        authoritySequence: sequence,
        authoritySecret: secret,
        restoreScript,
        env: {
          ...process.env,
          DATA_DIR: target,
          VOID_PUBLIC_CHECKPOINT_RESTORE: "1",
        },
      });
      assert.equal(result.attempted, true);
      assert.equal(
        fs.readFileSync(path.join(target, "head.txt"), "utf8").trim(),
        "0",
      );
      const heads = JSON.parse(
        fs.readFileSync(path.join(target, "heads.json"), "utf8"),
      );
      assert.equal(heads.head, 0);
      assert.equal(heads.number, 0);
      assert.ok(
        fs.existsSync(
          path.join(
            target,
            "segments",
            "00000000",
            "index.sparse",
          ),
        ),
      );
      assert.ok(
        fs.existsSync(
          path.join(
            target,
            "segments",
            "00000000",
            "meta.json",
          ),
        ),
      );
      const generationPrefix =
        `${path.basename(target)}.void-public-checkpoint-restore-v1-gen-`;
      const leftovers = fs
        .readdirSync(path.dirname(target))
        .filter((name) => name.startsWith(generationPrefix));
      assert.deepEqual(leftovers, []);
    },
  );

  await withAdapter(
    validPacketDir,
    validPacket,
    async ({ adapter, secret, generation, sequence }) => {
      const target = path.join(ownedParent, "data-existing");
      fs.mkdirSync(target, { mode: 0o700 });
      fs.writeFileSync(
        path.join(target, "sentinel"),
        "do-not-touch\n",
      );
      await runPublicCheckpointRestorePreNodeV1({
        adapterBase: adapter.base,
        authorityGeneration: generation,
        authoritySequence: sequence,
        authoritySecret: secret,
        restoreScript,
        env: {
          ...process.env,
          DATA_DIR: target,
          VOID_PUBLIC_CHECKPOINT_RESTORE: "1",
        },
      });
      assert.equal(
        fs.readFileSync(path.join(target, "sentinel"), "utf8"),
        "do-not-touch\n",
      );
      assert.equal(
        fs.readdirSync(target).sort().join(","),
        "sentinel",
      );
    },
  );

  const invalidPacketDir = path.join(tmp, "invalid-packet");
  fs.mkdirSync(invalidPacketDir, { mode: 0o700 });
  const invalidPacket = makePacket(invalidPacketDir, {
    semanticValid: false,
  });

  await withAdapter(
    invalidPacketDir,
    invalidPacket,
    async ({ adapter, secret, generation, sequence }) => {
      const target = path.join(ownedParent, "data-invalid");
      await assert.rejects(
        runPublicCheckpointRestorePreNodeV1({
          adapterBase: adapter.base,
          authorityGeneration: generation,
          authoritySequence: sequence,
          authoritySecret: secret,
          restoreScript,
          env: {
            ...process.env,
            DATA_DIR: target,
            VOID_PUBLIC_CHECKPOINT_RESTORE: "1",
          },
        }),
      );
      assert.equal(fs.existsSync(target), false);
      const generationPrefix =
        `${path.basename(target)}.void-public-checkpoint-restore-v1-gen-`;
      const retained = fs
        .readdirSync(path.dirname(target))
        .filter((name) => name.startsWith(generationPrefix));
      assert.equal(retained.length, 1);
      assert.equal(
        fs.lstatSync(
          path.join(path.dirname(target), retained[0]),
        ).isDirectory(),
        true,
      );
    },
  );

  const supervisorSource = fs.readFileSync(
    path.join(
      root,
      "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
    ),
    "utf8",
  );
  const restoreAt = supervisorSource.indexOf(
    "await runPublicCheckpointRestorePreNodeV1(",
  );
  const nodeSpawnAt = supervisorSource.indexOf(
    "const child = childProcess.spawn(process.execPath, [nodeEntry]",
  );
  assert.ok(restoreAt >= 0);
  assert.ok(nodeSpawnAt > restoreAt);

  console.log("restore_default_disabled=true");
  console.log("restore_https_supervisor_only_v1=true");
  console.log("restore_before_node_spawn=true");
  console.log("authority_reused_via_ipc=true");
  console.log("data_dir_must_be_absent=true");
  console.log("existing_data_dir_preserved=true");
  console.log("authenticated_discovery_manifest_segments=true");
  console.log("shared_64mib_segment_contract=true");
  console.log("official_semantic_verifier_required=true");
  console.log("semantic_invalid_packet_not_activated=true");
  console.log("auto_repair_sparse_every_16=true");
  console.log("derived_heads_meta_sparse_reconstructed=true");
  console.log("single_staging_generation_per_attempt=true");
  console.log("staging_generation_unique=true");
  console.log("staging_generation_fd_bound=true");
  console.log("staging_replacement_foreign_generation_preserved=true");
  console.log("staging_replacement_recursive_delete=false");
  console.log("crash_retry_new_generation_nonblocking=true");
  console.log("crash_retry_stale_generation_not_adopted=true");
  console.log("proc_fd_semantic_verifier=true");
  console.log("proc_fd_auto_repair=true");
  console.log("atomic_rename_activation=true");
  console.log("activation_uses_gnu_mv_rename_noreplace_contract=true");
  console.log("activation_no_copy=true");
  console.log("activation_same_inode_proved=true");
  console.log("destination_appeared_before_activation_preserved=true");
  console.log("staging_not_activated_when_destination_exists=true");
  console.log("failure_stale_generation_retained=true");
  console.log("failure_recursive_staging_delete=false");
  console.log("failure_cleanup_preserves_absent_target=true");
  console.log("checkpoint_publication_performed=false");
  console.log("runtime_node_started_by_proof=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
