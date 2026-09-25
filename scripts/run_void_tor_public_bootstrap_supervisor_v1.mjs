#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createTorPublicSeedClientAdapterV1 } from "../tools/void-tor-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_TOR_PUBLIC_BOOTSTRAP_SUPERVISOR_V1";
const AUTHORITY_MESSAGE_SCHEMA = "void_public_bootstrap_adapter_authority_message_v1";
const AUTHORITY_CHILD_SCHEMA = "void_public_bootstrap_adapter_authority_child_v1";
const RESPONSE_AUTHORITY_SCHEMA = "void_public_seed_response_authority_v1";

async function main() {
  const peers = String(process.env.VOID_TOR_PUBLIC_SEED_CLIENT_PEERS || "").trim();
  if (!peers) throw new Error("VOID_TOR_PUBLIC_SEED_CLIENT_PEERS is required");

  const configuredPort = String(process.env.VOID_TOR_PUBLIC_SEED_CLIENT_PORT || "").trim();
  const port = configuredPort ? Number(configuredPort) : 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("VOID_TOR_PUBLIC_SEED_CLIENT_PORT must be an integer from 0 through 65535");
  }

  const authoritySecret = crypto.randomBytes(32);
  const authorityGeneration = crypto.randomBytes(16).toString("hex");
  const authoritySequence = 1;

  const adapter = await createTorPublicSeedClientAdapterV1({
    peers,
    port,
    authority: {
      schema: RESPONSE_AUTHORITY_SCHEMA,
      generation: authorityGeneration,
      sequence: authoritySequence,
      secret: authoritySecret,
    },
  });
  const nodeEntry = String(
    process.env.VOID_TOR_PUBLIC_BOOTSTRAP_NODE_ENTRY || "dist/index.js",
  );
  const childWrapper = fileURLToPath(
    new URL("./run_void_public_bootstrap_child_v1.mjs", import.meta.url),
  );
  const child = childProcess.spawn(
    process.execPath,
    [childWrapper, nodeEntry],
    {
      env: {
        ...process.env,
        VOID_FOLLOWER_AUTOSTART_PEERS: adapter.base,
        VOID_FOLLOWER_AUTOSTART_PEER: adapter.base,
        VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
        VOID_TOR_PUBLIC_BOOTSTRAP_ACTIVE: "1",
      },
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    },
  );

  let stopping = false;
  let forwardedSignal = null;
  let adapterClosePromise = null;
  let authoritySent = false;
  let invalidationSent = false;

  function invalidateChildAuthority() {
    if (invalidationSent || !child.connected) return;
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
  }

  function closeAdapter() {
    if (adapterClosePromise) return adapterClosePromise;
    adapterClosePromise = new Promise((resolve, reject) => {
      if (!adapter.server.listening) {
        resolve();
        return;
      }
      adapter.server.close((error) => {
        if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }
        resolve();
      });
    });
    return adapterClosePromise;
  }

  function stop(signal) {
    if (stopping) return;
    stopping = true;
    forwardedSignal = signal;
    invalidateChildAuthority();
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    void closeAdapter().catch((error) => {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${error?.stack || error}`);
      process.exitCode = 1;
    });
  }

  child.on("message", (message) => {
    if (
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

  adapter.server.once("close", () => {
    if (!stopping) invalidateChildAuthority();
  });

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  child.once("error", async (error) => {
    console.error(`${MARKER}_CHILD_ERROR: ${error?.stack || error}`);
    stopping = true;
    invalidateChildAuthority();
    try {
      await closeAdapter();
    } catch (closeError) {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${closeError?.stack || closeError}`);
    }
    process.exit(1);
  });

  child.once("exit", async (code, signal) => {
    invalidateChildAuthority();
    try {
      await closeAdapter();
    } catch (error) {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${error?.stack || error}`);
      process.exit(1);
    }

    if (signal) {
      if (stopping && forwardedSignal === signal) {
        console.log(`${MARKER}_EXPECTED_CHILD_SIGNAL=${signal}`);
        process.exit(0);
      }
      console.error(`${MARKER}_UNEXPECTED_CHILD_SIGNAL=${signal}`);
      process.exit(1);
    }
    process.exit(Number.isInteger(code) ? code : 1);
  });

  console.log(`${MARKER}_ACTIVE`);
  console.log(`adapter_base=${adapter.base}`);
  console.log(`remote_peer_count=${adapter.peers.length}`);
  console.log("transport=tor_v3_http");
  console.log("historical_authority_channel=ipc_hmac_v1");
  console.log("historical_authority_secret_exposed=false");
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_provider_required=false");
  console.log("tailnet_required=false");
  console.log("direct_remote_fetch_from_node=false");
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
