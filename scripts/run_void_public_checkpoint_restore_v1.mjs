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
import {
  assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1,
  loadVoidPublicCheckpointRestartAuthorityV1,
} from "./lib/void_public_checkpoint_restart_authority_v1.mjs";
import { autoRepairDataDir } from "../dist/chain/auto_repair.js";
import {
  computeVoidSegStoreContentSealV1,
  registerVoidSegStoreProcFdRootV1,
} from "../dist/chain/segstore_path_confinement_v1.js";
import {
  closeSelectedCheckpointGenerationV1,
  openSelectedCheckpointGenerationV1,
  prepareCheckpointStagingSelectionV1,
  publishPreparedCheckpointSelectionV1,
} from "./lib/void_public_checkpoint_restore_activation_v1.mjs";
import {
  closeOwnedCheckpointRestoreGenerationV1,
  createOwnedCheckpointRestoreGenerationV1,
  finalizeFailedOwnedCheckpointRestoreGenerationV1,
  ownedCheckpointRestoreGenerationPathStateV1,
} from "./lib/void_public_checkpoint_restore_generation_v1.mjs";
import {
  VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1,
  createVerifiedPublicBootstrapChallengeV1,
  verifyVerifiedPublicBootstrapResponseV1,
} from "../dist/http/follower_verified_public_bootstrap_authority_v1.js";

const MARKER = "VOID_PUBLIC_CHECKPOINT_RESTORE_V1";
const RESTORE_RESULT_SCHEMA =
  "void_public_checkpoint_restore_result_v1";
const AUTHORITY_WAIT_MS = 10_000;
const CHECKPOINT_JSON_MAX_BYTES_V1 = 8 * 1024 * 1024;
const CHECKPOINT_HEADER_TIMEOUT_DEFAULT_MS_V1 = 10_000;
const CHECKPOINT_HEADER_TIMEOUT_MAX_MS_V1 = 60_000;
const CHECKPOINT_BODY_TIMEOUT_DEFAULT_MS_V1 = 120_000;
const CHECKPOINT_BODY_TIMEOUT_MAX_MS_V1 = 300_000;
const CHECKPOINT_BODY_CANCEL_MAX_MS_V1 = 250;

function boundedRestoreIoMsV1(name, fallback, maximum) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  if (!/^[1-9][0-9]*$/.test(raw)) {
    fail(`${name} must be a positive integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 100 || value > maximum) {
    fail(`${name} must be between 100 and ${maximum}`);
  }
  return value;
}

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

function sendRestoreResultV1(message) {
  if (
    !process.connected ||
    typeof process.send !== "function"
  ) {
    fail("checkpoint restore result requires live supervisor IPC");
  }
  return new Promise((resolve, reject) => {
    process.send(
      {
        schema: RESTORE_RESULT_SCHEMA,
        ...message,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
}

function selectionMessageV1({
  dataDir,
  generationPath,
  selectorTarget,
  token,
  device,
  inode,
  checkpointId,
  contentSeal,
}) {
  return Object.freeze({
    data_dir: dataDir,
    generation_path: generationPath,
    selector_target: selectorTarget,
    token,
    device,
    inode,
    checkpoint_id: checkpointId,
    content_seal: contentSeal,
  });
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

async function boundedCancelReaderV1(reader, reason) {
  let timer;
  try {
    await Promise.race([
      Promise.resolve(reader.cancel(reason)).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, CHECKPOINT_BODY_CANCEL_MAX_MS_V1);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readResponseBodyBoundedV1(
  response,
  maxBytes,
  controller,
  route,
) {
  const rawLength = String(
    response.headers.get("content-length") || "",
  ).trim();
  if (rawLength) {
    if (!/^(0|[1-9][0-9]*)$/.test(rawLength)) {
      fail(`checkpoint response content-length malformed: ${route}`);
    }
    const advertised = Number(rawLength);
    if (
      !Number.isSafeInteger(advertised) ||
      advertised > maxBytes
    ) {
      fail(
        `checkpoint response exceeds retained byte bound: ${route} advertised=${rawLength} max=${maxBytes}`,
      );
    }
  }

  if (!response.body) {
    fail(`checkpoint response body unavailable: ${route}`);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  const bodyTimeoutMs = boundedRestoreIoMsV1(
    "VOID_PUBLIC_CHECKPOINT_RESTORE_BODY_TIMEOUT_MS",
    CHECKPOINT_BODY_TIMEOUT_DEFAULT_MS_V1,
    CHECKPOINT_BODY_TIMEOUT_MAX_MS_V1,
  );
  const bodyTimer = setTimeout(() => {
    controller.abort(
      new Error(
        `HOLD_PUBLIC_CHECKPOINT_RESTORE_BODY_TIMEOUT: ${route} exceeded ${bodyTimeoutMs}ms`,
      ),
    );
  }, bodyTimeoutMs);

  try {
    while (true) {
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      const { done, value } = await reader.read();
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        fail(`checkpoint response chunk invalid: ${route}`);
      }
      if (value.byteLength > maxBytes - total) {
        fail(
          `checkpoint response exceeds retained byte bound: ${route} max=${maxBytes}`,
        );
      }
      const chunk = Buffer.from(value);
      total += chunk.byteLength;
      chunks.push(chunk);
    }
  } catch (error) {
    await boundedCancelReaderV1(reader, error);
    throw error;
  } finally {
    clearTimeout(bodyTimer);
  }

  return Buffer.concat(chunks, total);
}

async function authorizedGet(adapterOrigin, route, maxBytes) {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0 ||
    maxBytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1
  ) {
    fail(`checkpoint response byte bound invalid: ${route}`);
  }

  const target = new URL(route, `${adapterOrigin}/`).href;
  const challenge = await waitForChallenge(target);
  const controller = new AbortController();
  const headerTimeoutMs = boundedRestoreIoMsV1(
    "VOID_PUBLIC_CHECKPOINT_RESTORE_HEADER_TIMEOUT_MS",
    CHECKPOINT_HEADER_TIMEOUT_DEFAULT_MS_V1,
    CHECKPOINT_HEADER_TIMEOUT_MAX_MS_V1,
  );
  const headerTimer = setTimeout(() => {
    controller.abort(
      new Error(
        `HOLD_PUBLIC_CHECKPOINT_RESTORE_HEADER_TIMEOUT: ${route} exceeded ${headerTimeoutMs}ms`,
      ),
    );
  }, headerTimeoutMs);

  let response;
  try {
    response = await fetch(target, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        [VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1]:
          challenge.nonce,
      },
    });
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(headerTimer);
  }

  const bytes = await readResponseBodyBoundedV1(
    response,
    maxBytes,
    controller,
    route,
  );
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

function computeContentSealForOpenGenerationV1(fd) {
  const fdRoot = `/proc/self/fd/${fd}`;
  const unregister =
    registerVoidSegStoreProcFdRootV1(fdRoot);
  try {
    return computeVoidSegStoreContentSealV1(fdRoot);
  } finally {
    unregister();
  }
}

function verifyLiveCheckpointPrefixV1(stagingFd, checkpointId) {
  const cp = childProcess.spawnSync(
    process.execPath,
    [
      checkpointTool,
      "verify-live-prefix",
      "--packet",
      "/proc/self/fd/3",
      "--proc-fd-root",
      "3",
      "--expected-checkpoint-id",
      checkpointId,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe", stagingFd],
    },
  );
  if (
    cp.status !== 0 ||
    !String(cp.stdout || "").includes(
      "VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_VERIFY_LIVE_PREFIX_GREEN",
    ) ||
    !String(cp.stdout || "").includes(
      "checkpoint_prefix_semantics_verified=true",
    )
  ) {
    fail(
      `existing checkpoint prefix verification failed: ${String(
        cp.stderr || cp.stdout || "",
      ).slice(0, 2000)}`,
    );
  }
}

function verifySemanticPacket(stagingFd) {
  const cp = childProcess.spawnSync(
    process.execPath,
    [
      checkpointTool,
      "verify",
      "--packet",
      "/proc/self/fd/3",
      "--proc-fd-root",
      "3",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe", stagingFd],
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
  const expected = [
    "checkpoint.json",
    "head.txt",
    "heads.json",
    "segments",
  ];
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
  const existingDataDir = lstatOrNull(dataDir);
  if (existingDataDir) {
    if (existingDataDir.isSymbolicLink()) {
      const selected = openSelectedCheckpointGenerationV1({
        dataDir,
      });
      try {
        const retainedManifestBytes = fs.readFileSync(
          path.join(selected.fdRoot, "checkpoint.json"),
        );
        const retainedManifest =
          validateVoidPublicCheckpointManifestBytesV1(
            retainedManifestBytes,
            {
              expectedCheckpointId: selected.checkpointId,
            },
          );
        const restartAuthority =
          loadVoidPublicCheckpointRestartAuthorityV1();
        assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
          retainedManifest,
          restartAuthority,
        );
        verifyLiveCheckpointPrefixV1(
          selected.fd,
          selected.checkpointId,
        );
        const contentSeal =
          computeContentSealForOpenGenerationV1(selected.fd);
        await sendRestoreResultV1({
          type: "existing_selector",
          selection: selectionMessageV1({
            dataDir,
            generationPath: selected.generationPath,
            selectorTarget: selected.selectorTarget,
            token: selected.token,
            device: selected.device,
            inode: selected.inode,
            checkpointId: selected.checkpointId,
            contentSeal,
          }),
        });
      } finally {
        closeSelectedCheckpointGenerationV1(selected);
      }
      console.log(`${MARKER}_SKIP_EXISTING_SELECTOR`);
      console.log(`data_dir=${dataDir}`);
      console.log("data_dir_mutated=false");
      console.log("checkpoint_restore_attempted=false");
      console.log("checkpoint_prefix_reverified=true");
      console.log("checkpoint_independent_prefix_authority_verified=true");
      console.log("checkpoint_restart_network_required=false");
      return;
    }

    fail(
      "checkpoint restore enabled requires DATA_DIR absent or a valid checkpoint selector",
    );
  }

  const discoveryResponse = await authorizedGet(
    adapterUrl.origin,
    "/__void/checkpoint/v1.json",
    CHECKPOINT_JSON_MAX_BYTES_V1,
  );
  const discovery =
    parseVoidPublicCheckpointDiscoveryBytesV1(
      discoveryResponse.bytes,
    );
  if (discovery.status === "unavailable") {
    await sendRestoreResultV1({
      type: "unavailable",
      data_dir: dataDir,
    });
    console.log(`${MARKER}_SKIP_UNAVAILABLE`);
    console.log(`data_dir=${dataDir}`);
    console.log("data_dir_mutated=false");
    console.log("checkpoint_restore_attempted=true");
    console.log("checkpoint_available=false");
    return;
  }

  let generation = null;
  let activated = false;
  try {
    generation = createOwnedCheckpointRestoreGenerationV1({
      dataDir,
      parent,
    });
    const staging = generation.namespacePath;
    const stagingRoot = generation.fdRoot;

    const checkpoint = discovery.checkpoint;
    const manifestRoute =
      `${checkpoint.packet_base_path}/checkpoint.json`;
    const manifestResponse = await authorizedGet(
      adapterUrl.origin,
      manifestRoute,
      CHECKPOINT_JSON_MAX_BYTES_V1,
    );
    const verifiedManifest =
      validateVoidPublicCheckpointManifestBytesV1(
        manifestResponse.bytes,
        {
          expectedCheckpoint: checkpoint,
          expectedCheckpointId: checkpoint.checkpoint_id,
        },
      );
    const restartAuthority =
      loadVoidPublicCheckpointRestartAuthorityV1();
    assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
      verifiedManifest,
      restartAuthority,
    );

    writeFileDurable(
      path.join(stagingRoot, "checkpoint.json"),
      manifestResponse.bytes,
    );

    const segmentsRoot = path.join(stagingRoot, "segments");
    ensureChildDirectory(stagingRoot, segmentsRoot);

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
        entry.bytes,
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

    verifySemanticPacket(generation.fd);

    // Retain checkpoint.json. Its content-addressed checkpoint_id is the
    // durable restart anchor for read-only canonical-prefix verification.
    const repaired = await autoRepairDataDir(stagingRoot, {
      sparseEvery: 16,
      dryRun: false,
    });
    if (!repaired || repaired.mutationsApplied !== true) {
      fail("checkpoint restore auto-repair did not reconstruct derived state");
    }
    verifyReconstructedHead(stagingRoot, verifiedManifest.head);
    exactPostRepairTopLevel(stagingRoot);

    const namespaceState =
      ownedCheckpointRestoreGenerationPathStateV1(generation);
    if (namespaceState.status !== "owned_path_live") {
      fail(
        `checkpoint staging namespace changed before activation: ${namespaceState.status}`,
      );
    }

    const contentSeal =
      computeVoidSegStoreContentSealV1(stagingRoot);

    const preparedSelection =
      prepareCheckpointStagingSelectionV1({
        staging,
        dataDir,
        parent,
        token: generation.token,
        expectedDevice: generation.device,
        expectedInode: generation.inode,
        checkpointId: verifiedManifest.checkpoint_id,
        contentSeal,
      });
    await sendRestoreResultV1({
      type: "selection_prepared",
      selection: selectionMessageV1({
        dataDir,
        generationPath: preparedSelection.staging,
        selectorTarget: preparedSelection.selectorTarget,
        token: preparedSelection.token,
        device: preparedSelection.device,
        inode: preparedSelection.inode,
        checkpointId: preparedSelection.checkpointId,
        contentSeal: preparedSelection.contentSeal,
      }),
    });

    const activation =
      publishPreparedCheckpointSelectionV1(preparedSelection);
    if (!activation?.selectorPublished) {
      fail("checkpoint selector activation did not complete");
    }
    // The parent-directory fsync above is the irreversible selector commit.
    // After this transition, resource retirement is cleanup-only and cannot
    // downgrade the exact committed selection to generic pre-commit failure.
    activated = true;

    const postCommitGenerationClose =
      closeOwnedCheckpointRestoreGenerationV1(
        generation,
        { committed: true },
      );
    generation = null;

    if (activation.postCommitCleanupError) {
      console.error(
        `${MARKER}_POST_COMMIT_PARENT_FD_CLOSE_WARNING=${activation.postCommitCleanupError}`,
      );
    }
    if (postCommitGenerationClose.cleanup_error_count > 0) {
      console.error(
        `${MARKER}_POST_COMMIT_GENERATION_CLOSE_WARNING_COUNT=${postCommitGenerationClose.cleanup_error_count}`,
      );
    }

    console.log(`${MARKER}_GREEN`);
    console.log(`checkpoint_id=${verifiedManifest.checkpoint_id}`);
    console.log(`checkpoint_head=${verifiedManifest.head}`);
    console.log(`checkpoint_block_count=${verifiedManifest.block_count}`);
    console.log(`checkpoint_segment_count=${verifiedManifest.segment_count}`);
    console.log(`checkpoint_payload_bytes=${verifiedManifest.payload_bytes}`);
    console.log(`checkpoint_segment_max_bytes=${VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1}`);
    console.log(`data_dir=${dataDir}`);
    console.log("semantic_verify=true");
    console.log("staging_generation_unique=true");
    console.log("staging_generation_fd_bound=true");
    console.log("staging_io_via_proc_fd_root=true");
    console.log("auto_repair_sparse_every=16");
    console.log("atomic_activation=true");
    console.log("selector_activation=true");
    console.log("selector_symlink_no_replace=true");
    console.log("activation_directory_rename=false");
    console.log("selector_generation_identity_bound=true");
    console.log("selector_selection_sent_via_ipc_before_publication=true");
    console.log("materialized_content_seal_bound=true");
    console.log("checkpoint_manifest_retained_for_restart_prefix_verify=true");
    console.log("checkpoint_independent_prefix_authority_verified=true");
    console.log("checkpoint_restart_network_required=false");
    console.log("parent_directory_fsync=true");
    console.log("parent_fsync_is_irreversible_commit=true");
    console.log("post_commit_cleanup_cannot_downgrade_terminal=true");
    console.log("existing_store_overwrite=false");
    console.log("checkpoint_publication_authority=false");
    console.log("runtime_node_started=false");
  } finally {
    if (!activated && generation) {
      const terminal =
        finalizeFailedOwnedCheckpointRestoreGenerationV1(
          generation,
        );
      console.error(
        `${MARKER}_STALE_GENERATION_TERMINAL=${terminal.status}`,
      );
      console.error(
        `stale_generation_path=${terminal.path}`,
      );
      console.error(
        `stale_generation_recursive_delete=${terminal.recursive_delete}`,
      );
      generation = null;
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
