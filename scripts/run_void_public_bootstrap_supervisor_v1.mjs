#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";
import {
  openCheckpointGenerationForRestoreResultV1,
  runPublicCheckpointRestorePreNodeV1,
} from "./lib/void_public_checkpoint_restore_supervisor_v1.mjs";
import {
  closeSelectedCheckpointGenerationV1,
} from "./lib/void_public_checkpoint_restore_activation_v1.mjs";
import {
  observeVoidPublicCheckpointCapabilityTimingV1,
  parseVoidPublicCheckpointCapabilityTimingConfigV1,
} from "./lib/void_public_checkpoint_capability_timing_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_SUPERVISOR_V1";
const AUTHORITY_MESSAGE_SCHEMA = "void_public_bootstrap_adapter_authority_message_v1";
const AUTHORITY_CHILD_SCHEMA = "void_public_bootstrap_adapter_authority_child_v1";
const RESPONSE_AUTHORITY_SCHEMA = "void_public_seed_response_authority_v1";

async function main() {
  const capabilityTimingStartedUnixMs = Date.now();
  const capabilityTimingStartedNs = process.hrtime.bigint();
  let capabilityTimingConfig = null;
  try {
    capabilityTimingConfig =
      parseVoidPublicCheckpointCapabilityTimingConfigV1(process.env);
  } catch (error) {
    console.error(
      `${MARKER}_CAPABILITY_TIMING_CONFIG_WARNING=${error?.message || error}`,
    );
  }

  const localRestartRaw = String(
    process.env.VOID_PUBLIC_CHECKPOINT_LOCAL_RESTART || "0",
  ).trim();
  if (!["0", "1"].includes(localRestartRaw)) {
    throw new Error(
      "VOID_PUBLIC_CHECKPOINT_LOCAL_RESTART must be exactly 0 or 1",
    );
  }
  const localRestart = localRestartRaw === "1";
  const peers = String(
    process.env.VOID_PUBLIC_SEED_CLIENT_PEERS || "",
  ).trim();
  if (!localRestart && !peers) {
    throw new Error("VOID_PUBLIC_SEED_CLIENT_PEERS is required");
  }
  if (
    localRestart &&
    String(process.env.VOID_PUBLIC_CHECKPOINT_RESTORE || "0").trim() !== "1"
  ) {
    throw new Error(
      "checkpoint local restart requires VOID_PUBLIC_CHECKPOINT_RESTORE=1",
    );
  }
  if (localRestart) {
    const logicalDataDir = path.resolve(
      String(process.env.DATA_DIR || "data"),
    );
    const st = fs.lstatSync(logicalDataDir);
    if (!st.isSymbolicLink()) {
      throw new Error(
        "checkpoint local restart requires an existing DATA_DIR selector symlink",
      );
    }
  }

  const configuredPort = String(process.env.VOID_PUBLIC_SEED_CLIENT_PORT || "").trim();
  const port = configuredPort ? Number(configuredPort) : 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("VOID_PUBLIC_SEED_CLIENT_PORT must be an integer from 0 through 65535");
  }

  const authoritySecret = crypto.randomBytes(32);
  const authorityGeneration = crypto.randomBytes(16).toString("hex");
  const authoritySequence = 1;

  const adapter = localRestart
    ? null
    : await createPublicSeedClientAdapterV1({
        peers,
        port,
        authority: {
          schema: RESPONSE_AUTHORITY_SCHEMA,
          generation: authorityGeneration,
          sequence: authoritySequence,
          secret: authoritySecret,
        },
      });

  const restoreResult = await runPublicCheckpointRestorePreNodeV1({
    adapterBase: adapter?.base || "http://127.0.0.1:9",
    authorityGeneration,
    authoritySequence,
    authoritySecret,
  });
  if (localRestart && restoreResult.outcome !== "existing_selector") {
    throw new Error(
      `checkpoint local restart requires existing_selector outcome, got ${restoreResult.outcome}`,
    );
  }

  const logicalDataDir = path.resolve(
    String(process.env.DATA_DIR || "data"),
  );
  const selected =
    openCheckpointGenerationForRestoreResultV1({
      dataDir: logicalDataDir,
      restoreResult,
    });

  const nodeEntry = String(process.env.VOID_PUBLIC_BOOTSTRAP_NODE_ENTRY || "dist/index.js");
  const childEnv = {
    ...process.env,
  };
  if (localRestart) {
    delete childEnv.VOID_FOLLOWER_AUTOSTART_PEERS;
    delete childEnv.VOID_FOLLOWER_AUTOSTART_PEER;
    delete childEnv.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE;
  } else {
    childEnv.VOID_FOLLOWER_AUTOSTART_PEERS = adapter.base;
    childEnv.VOID_FOLLOWER_AUTOSTART_PEER = adapter.base;
    childEnv.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE = "1";
  }
  const childStdio = ["inherit", "inherit", "inherit", "ipc"];

  if (selected) {
    childEnv.DATA_DIR = selected.childRoot;
    childEnv.VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1 = "1";
    childEnv.VOID_SEGSTORE_INHERITED_DATA_FD_V1 =
      String(selected.childFd);
    childEnv.VOID_SEGSTORE_INHERITED_DATA_DEV_V1 =
      selected.device;
    childEnv.VOID_SEGSTORE_INHERITED_DATA_INO_V1 =
      selected.inode;
    childEnv.VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1 =
      selected.contentSeal;
    childStdio.push(selected.fd);
  }

  let child;
  try {
    child = childProcess.spawn(process.execPath, [nodeEntry], {
      env: childEnv,
      stdio: childStdio,
    });
  } finally {
    if (selected) {
      closeSelectedCheckpointGenerationV1(selected);
    }
  }

  const nodeSpawnedNs = process.hrtime.bigint();
  if (capabilityTimingConfig) {
    observeVoidPublicCheckpointCapabilityTimingV1({
      config: capabilityTimingConfig,
      restoreResult,
      supervisorStartedUnixMs: capabilityTimingStartedUnixMs,
      supervisorStartedNs: capabilityTimingStartedNs,
      nodeSpawnedNs,
      nodePid: child.pid,
    }).then((receipt) => {
      if (receipt) {
        console.log(
          `${MARKER}_CAPABILITY_TIMING_RECEIPT=${capabilityTimingConfig.receiptFile}`,
        );
      }
    }).catch((error) => {
      console.error(
        `${MARKER}_CAPABILITY_TIMING_WARNING=${error?.message || error}`,
      );
    });
  }

  let stopping = false;
  let authoritySent = false;
  let invalidationSent = false;

  const invalidateChildAuthority = () => {
    if (localRestart || invalidationSent || !child.connected) return;
    invalidationSent = true;
    child.send({
      schema: AUTHORITY_MESSAGE_SCHEMA,
      type: "invalidate",
      sequence: authoritySequence + 1,
      generation: authorityGeneration,
    }, (error) => {
      if (error && !stopping) {
        console.error(`${MARKER}_AUTHORITY_INVALIDATION_ERROR`);
      }
    });
  };

  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    invalidateChildAuthority();
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    if (adapter) adapter.server.close();
  };

  child.on("message", (message) => {
    if (
      localRestart ||
      authoritySent ||
      !message ||
      typeof message !== "object" ||
      Array.isArray(message) ||
      message.schema !== AUTHORITY_CHILD_SCHEMA ||
      message.type !== "ready"
    ) {
      return;
    }
    if (!child.connected) return;

    authoritySent = true;
    child.send({
      schema: AUTHORITY_MESSAGE_SCHEMA,
      type: "authority",
      sequence: authoritySequence,
      generation: authorityGeneration,
      adapter_origin: adapter.base,
      secret_hex: authoritySecret.toString("hex"),
    }, (error) => {
      if (error) {
        console.error(`${MARKER}_AUTHORITY_SEND_ERROR`);
        stop("SIGTERM");
      }
    });
  });

  if (adapter) {
    adapter.server.once("close", () => {
      if (!stopping) invalidateChildAuthority();
    });
  }

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  child.once("error", (error) => {
    console.error(`${MARKER}_CHILD_ERROR: ${error?.stack || error}`);
    stop("SIGTERM");
  });
  child.once("exit", (code, signal) => {
    const finish = () => {
      if (signal) {
        console.error(`${MARKER}_CHILD_SIGNAL=${signal}`);
        process.exit(1);
      }
      process.exit(Number.isInteger(code) ? code : 1);
    };
    if (adapter) {
      adapter.server.close(finish);
    } else {
      finish();
    }
  });

  console.log(`${MARKER}_ACTIVE`);
  console.log(
    `adapter_base=${adapter?.base || "none_local_checkpoint_restart"}`,
  );
  console.log(`remote_peer_count=${adapter ? adapter.peers.length : 0}`);
  console.log(
    `historical_authority_channel=${localRestart ? "none_local_checkpoint_restart" : "ipc_hmac_v1"}`,
  );
  console.log("historical_authority_secret_exposed=false");
  console.log(`checkpoint_local_restart=${localRestart ? "true" : "false"}`);
  console.log(`public_sync_active=${localRestart ? "false" : "true"}`);
  console.log("tailnet_required=false");
  console.log("direct_remote_fetch_from_node=false");
  console.log(`checkpoint_selector_active=${selected ? "true" : "false"}`);
  console.log(`checkpoint_generation_fd_inherited=${selected ? "true" : "false"}`);
  console.log(`checkpoint_selection_ipc_bound=${restoreResult.selection ? "true" : "false"}`);
  console.log(`checkpoint_content_seal_bound=${selected ? "true" : "false"}`);
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("treasury_authority=false");
  console.log("work_credit_authority=false");
  console.log("money_movement_authority=false");
}

main().catch((error) => {
  console.error(`${MARKER}_FAIL: ${error?.stack || error}`);
  process.exit(1);
});
