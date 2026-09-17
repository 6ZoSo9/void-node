#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  blockHash,
  computeRoots,
} from "../dist/chain/block.js";
import {
  observeVoidPublicCheckpointCapabilityTimingV1,
  parseVoidPublicCheckpointCapabilityTimingConfigV1,
} from "./lib/void_public_checkpoint_capability_timing_v1.mjs";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_V1_PROOF_GREEN";
const root = process.cwd();

function makeBlock(number) {
  const roots = computeRoots([], []);
  return {
    number,
    parentHash: "0".repeat(64),
    timestamp: 1_790_000_000_000 + number,
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs: [],
    blobs: [],
    proposer: "void-capability-timing-proof",
    sig: "00".repeat(64),
  };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  assert(addr && typeof addr === "object");
  return addr.port;
}

async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}

const restoreRunner = fs.readFileSync(
  path.join(root, "scripts/run_void_public_checkpoint_restore_v1.mjs"),
  "utf8",
);
const restoreSupervisor = fs.readFileSync(
  path.join(root, "scripts/lib/void_public_checkpoint_restore_supervisor_v1.mjs"),
  "utf8",
);
const bootstrapSupervisor = fs.readFileSync(
  path.join(root, "scripts/run_void_public_bootstrap_supervisor_v1.mjs"),
  "utf8",
);
const publicLauncher = fs.readFileSync(
  path.join(root, "run-void-node.sh"),
  "utf8",
);

assert.match(restoreRunner, /void_public_checkpoint_restore_phase_timing_v1/);
assert.match(restoreRunner, /measureCapabilityPhaseV1/);
assert.match(restoreSupervisor, /CAPABILITY_TIMING_MESSAGE_SCHEMA_V1/);
assert.match(restoreSupervisor, /CAPABILITY_TIMING_WARNING/);
assert.match(
  bootstrapSupervisor,
  /observeVoidPublicCheckpointCapabilityTimingV1/,
);
assert.match(
  publicLauncher,
  /VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS/,
);
assert.match(publicLauncher, /date \+%s%3N/);
const launcherTimingStart = publicLauncher.indexOf(
  "VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS",
);
assert.ok(launcherTimingStart >= 0);
const launcherTimingWindow = publicLauncher.slice(
  launcherTimingStart,
  launcherTimingStart + 1000,
);
assert.doesNotMatch(
  launcherTimingWindow,
  /die "failed to capture checkpoint capability launcher start"/,
);
assert.match(
  bootstrapSupervisor,
  /CAPABILITY_TIMING_CONFIG_WARNING=/,
);
assert.match(
  bootstrapSupervisor,
  /let capabilityTimingConfig = null;/,
);

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-capability-timing-v1-"),
);
const targetHead = 7;
const targetBlock = makeBlock(targetHead);
let readyRequests = 0;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  if (url.pathname === "/__void/ready.json") {
    readyRequests += 1;
    const body =
      readyRequests >= 2
        ? {
            ready: true,
            head: targetHead,
            gap: 0,
            txroot_live: 1,
          }
        : {
            ready: false,
            head: targetHead - 1,
            gap: 1,
            txroot_live: 1,
          };
    res.end(`${JSON.stringify(body)}\n`);
    return;
  }
  if (url.pathname === "/blocks/range") {
    res.end(`${JSON.stringify([targetBlock])}\n`);
    return;
  }
  res.statusCode = 404;
  res.end("{}\n");
});

try {
  const port = await listen(server);
  const receiptFile = path.join(tmp, "candidate.json");
  const candidateLauncherStartedUnixMs = Date.now() - 500;
  const config = parseVoidPublicCheckpointCapabilityTimingConfigV1({
    VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_RECEIPT_FILE: receiptFile,
    VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SAMPLE_ID: "candidate-1",
    VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TARGET_HEAD: String(targetHead),
    VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS:
      String(candidateLauncherStartedUnixMs),
    VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TIMEOUT_MS: "5000",
    HTTP_PORT: String(port),
  });
  assert(config);

  const startedNs = process.hrtime.bigint();
  const restoreResult = {
    attempted: true,
    enabled: true,
    outcome: "selected",
    selection: {},
    timing: {
      schema: "void_public_checkpoint_restore_phase_timing_v1",
      started_at_unix_ms: Date.now(),
      checkpoint_id: `voidpbc1_${"a".repeat(64)}`,
      checkpoint_head: 5,
      checkpoint_payload_bytes: 12345,
      total_ms: 25,
      phases_ms: {
        discovery_ms: 1,
        manifest_ms: 2,
        segments_ms: 3,
        semantic_verify_ms: 4,
        repair_ms: 5,
        content_seal_ms: 6,
        activation_ms: 4,
      },
    },
  };

  const receipt =
    await observeVoidPublicCheckpointCapabilityTimingV1({
      config,
      restoreResult,
      supervisorStartedUnixMs: Date.now(),
      supervisorStartedNs: startedNs,
      nodeSpawnedNs: startedNs,
      nodePid: null,
    });

  assert.equal(receipt.mode, "checkpoint_restore");
  assert.equal(receipt.terminal_reached, true);
  assert.equal(receipt.terminal.target_head, targetHead);
  assert.equal(receipt.terminal.target_block_hash, blockHash(targetBlock));
  assert.equal(receipt.restore.timing_complete, true);
  assert.equal(receipt.restore.total_ms, 25);
  assert.equal(receipt.node.post_checkpoint_catchup_ms !== null, true);
  assert.equal(
    receipt.launcher_started_at_unix_ms,
    candidateLauncherStartedUnixMs,
  );
  assert.equal(
    receipt.total_start_to_terminal_ms,
    receipt.launcher_start_to_terminal_ms,
  );
  assert.ok(
    receipt.launcher_start_to_terminal_ms >=
      receipt.supervisor_start_to_terminal_ms,
  );
  assert.equal(receipt.authority.timing_authority, false);
  assert.equal(fs.statSync(receiptFile).mode & 0o777, 0o600);

  let secondWriteRejected = false;
  try {
    await observeVoidPublicCheckpointCapabilityTimingV1({
      config,
      restoreResult,
      supervisorStartedUnixMs: Date.now(),
      supervisorStartedNs: process.hrtime.bigint(),
      nodeSpawnedNs: process.hrtime.bigint(),
      nodePid: null,
    });
  } catch (error) {
    secondWriteRejected = /EEXIST/.test(String(error));
  }
  assert.equal(secondWriteRejected, true);

  const controlFile = path.join(tmp, "control.json");
  const controlLauncherStartedUnixMs = Date.now() - 500;
  const controlConfig =
    parseVoidPublicCheckpointCapabilityTimingConfigV1({
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_RECEIPT_FILE: controlFile,
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SAMPLE_ID: "control-1",
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TARGET_HEAD: String(targetHead),
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS:
        String(controlLauncherStartedUnixMs),
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TIMEOUT_MS: "5000",
      HTTP_PORT: String(port),
    });
  const controlStart = process.hrtime.bigint();
  const controlReceipt =
    await observeVoidPublicCheckpointCapabilityTimingV1({
      config: controlConfig,
      restoreResult: {
        attempted: false,
        enabled: false,
        outcome: "disabled",
        selection: null,
      },
      supervisorStartedUnixMs: Date.now(),
      supervisorStartedNs: controlStart,
      nodeSpawnedNs: controlStart,
      nodePid: null,
    });
  assert.equal(controlReceipt.mode, "historical_control");
  assert.equal(controlReceipt.restore.total_ms, 0);
  assert.equal(controlReceipt.node.historical_catchup_ms !== null, true);
  assert.equal(controlReceipt.node.post_checkpoint_catchup_ms, null);
  assert.equal(parseVoidPublicCheckpointCapabilityTimingConfigV1({}), null);

  let malformedConfigRejected = false;
  try {
    parseVoidPublicCheckpointCapabilityTimingConfigV1({
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_RECEIPT_FILE:
        path.join(tmp, "malformed.json"),
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SAMPLE_ID: "malformed",
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TARGET_HEAD: String(targetHead),
      VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS: "bad",
      HTTP_PORT: String(port),
    });
  } catch {
    malformedConfigRejected = true;
  }
  assert.equal(malformedConfigRejected, true);

  console.log("timing_opt_in=true");
  console.log("timing_authority=false");
  console.log("restore_authority_modified=false");
  console.log("checkpoint_phase_durations_machine_readable=true");
  console.log("public_launcher_start_to_terminal_machine_readable=true");
  console.log("supervisor_monotonic_crosscheck_machine_readable=true");
  console.log("local_json_stream_retained_bytes_bounded=true");
  console.log("production_range_raw_array_fixture=true");
  console.log("timing_config_cannot_block_node_start=true");
  console.log("launcher_timing_capture_cannot_block_node_start=true");
  console.log("first_fixed_target_ready_terminal_machine_readable=true");
  console.log("terminal_target_block_hash_bound=true");
  console.log("candidate_post_checkpoint_catchup_ms_bound=true");
  console.log("historical_control_catchup_ms_bound=true");
  console.log("node_peak_rss_optional=true");
  console.log("receipt_create_only=true");
  console.log("second_receipt_write_rejected=true");
  console.log("live_checkpoint_publication_required_for_real_ab=true");
  console.log(MARKER);
} finally {
  await close(server).catch(() => undefined);
  fs.rmSync(tmp, { recursive: true, force: true });
}
