#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createPublicSeedClientAdapterV1,
} from "../tools/void-public-seed-client-adapter-v1.mjs";
import {
  createTorPublicSeedClientAdapterV1,
} from "../tools/void-tor-public-seed-client-adapter-v1.mjs";
import {
  VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1,
  bootstrapTransportPlanV1,
  composeFollowerOriginsV1,
  requireBooleanEnvV1,
} from "./lib/void_multipath_public_bootstrap_supervisor_v1.mjs";

const MARKER = "VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1";
const AUTHORITY_MESSAGE_SCHEMA =
  "void_public_bootstrap_adapter_authority_message_v1";
const AUTHORITY_CHILD_SCHEMA =
  "void_public_bootstrap_adapter_authority_child_v1";
const RESPONSE_AUTHORITY_SCHEMA =
  "void_public_seed_response_authority_v1";

function configuredPort(name) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error(`${name} must be an integer from 0 through 65535`);
  }
  return value;
}

function closeServerOnce(server, state) {
  if (state.promise) return state.promise;
  state.promise = new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => {
      if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return state.promise;
}

async function main() {
  const plan = bootstrapTransportPlanV1({
    httpsPeers: process.env.VOID_PUBLIC_SEED_CLIENT_PEERS,
    torPeers: process.env.VOID_TOR_PUBLIC_SEED_CLIENT_PEERS,
    requireMultipath: requireBooleanEnvV1(
      "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH",
      false,
    ),
  });

  const authoritySecret = crypto.randomBytes(32);
  const authorityGeneration = crypto.randomBytes(16).toString("hex");
  const authoritySequence = 1;
  const responseAuthority = {
    schema: RESPONSE_AUTHORITY_SCHEMA,
    generation: authorityGeneration,
    sequence: authoritySequence,
    secret: authoritySecret,
  };

  const adapters = [];
  const closeStates = [];
  if (plan.httpsPeers) {
    const adapter = await createPublicSeedClientAdapterV1({
      peers: plan.httpsPeers,
      port: configuredPort("VOID_PUBLIC_SEED_CLIENT_PORT"),
      authority: responseAuthority,
    });
    adapters.push({ transport: "https", ...adapter });
    closeStates.push({ server: adapter.server, state: { promise: null } });
  }
  if (plan.torPeers) {
    const adapter = await createTorPublicSeedClientAdapterV1({
      peers: plan.torPeers,
      port: configuredPort("VOID_TOR_PUBLIC_SEED_CLIENT_PORT"),
      authority: responseAuthority,
    });
    adapters.push({ transport: "tor", ...adapter });
    closeStates.push({ server: adapter.server, state: { promise: null } });
  }

  const composed = composeFollowerOriginsV1(adapters);
  if (plan.requireMultipath && composed.transportClasses.length !== 2) {
    throw new Error("multipath acceptance lost a transport before node startup");
  }

  const nodeEntry = String(
    process.env.VOID_MULTIPATH_PUBLIC_BOOTSTRAP_NODE_ENTRY || "dist/index.js",
  );
  const nodeArgs = [
    fileURLToPath(
      new URL("./run_void_public_bootstrap_child_v1.mjs", import.meta.url),
    ),
    nodeEntry,
  ];
  const followerPeers = composed.followerOrigins.join(",");
  const child = childProcess.spawn(process.execPath, nodeArgs, {
    env: {
      ...process.env,
      VOID_FOLLOWER_AUTOSTART_PEERS: followerPeers,
      VOID_FOLLOWER_AUTOSTART_PEER: composed.followerOrigins[0],
      VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
      VOID_MULTIPATH_PUBLIC_BOOTSTRAP_ACTIVE: "1",
      VOID_TOR_PUBLIC_BOOTSTRAP_ACTIVE:
        composed.transportClasses.includes("tor") ? "1" : "0",
    },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });

  let stopping = false;
  let forwardedSignal = null;
  let authoritySent = false;
  let invalidationSent = false;

  async function closeAdapters() {
    const results = await Promise.allSettled(
      closeStates.map(({ server, state }) => closeServerOnce(server, state)),
    );
    const rejected = results.find((entry) => entry.status === "rejected");
    if (rejected) throw rejected.reason;
  }

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

  function stop(signal) {
    if (stopping) return;
    stopping = true;
    forwardedSignal = signal;
    invalidateChildAuthority();
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    void closeAdapters().catch((error) => {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${error?.stack || error}`);
      process.exitCode = 1;
    });
  }

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

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
      adapter_origins: composed.followerOrigins,
      secret_hex: authoritySecret.toString("hex"),
    }, (error) => {
      if (error) {
        console.error(`${MARKER}_AUTHORITY_SEND_ERROR`);
        stop("SIGTERM");
      }
    });
  });

  child.once("error", async (error) => {
    console.error(`${MARKER}_CHILD_ERROR: ${error?.stack || error}`);
    stopping = true;
    invalidateChildAuthority();
    try {
      await closeAdapters();
    } catch (closeError) {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${closeError?.stack || closeError}`);
    }
    process.exit(1);
  });

  child.once("exit", async (code, signal) => {
    invalidateChildAuthority();
    try {
      await closeAdapters();
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
  console.log(`schema=${VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1}`);
  console.log(`transport_classes=${composed.transportClasses.join(",")}`);
  console.log(`adapter_bases=${composed.followerOrigins.join(",")}`);
  console.log(`follower_failover_enabled=${composed.followerOrigins.length > 1}`);
  console.log(`multipath_required=${plan.requireMultipath}`);
  console.log(`historical_authority_adapter_count=${composed.followerOrigins.length}`);
  console.log("historical_authority_ipc_bound=true");
  console.log("historical_authority_secret_exposed=false");
  console.log("adapter_loopback_only=true");
  console.log("tailnet_required=false");
  console.log("manual_bootstrap_addrs_required=false");
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
