#!/usr/bin/env node
import childProcess from "node:child_process";
import process from "node:process";

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

  const adapters = [];
  const closeStates = [];
  if (plan.httpsPeers) {
    const adapter = await createPublicSeedClientAdapterV1({
      peers: plan.httpsPeers,
      port: configuredPort("VOID_PUBLIC_SEED_CLIENT_PORT"),
    });
    adapters.push({ transport: "https", ...adapter });
    closeStates.push({ server: adapter.server, state: { promise: null } });
  }
  if (plan.torPeers) {
    const adapter = await createTorPublicSeedClientAdapterV1({
      peers: plan.torPeers,
      port: configuredPort("VOID_TOR_PUBLIC_SEED_CLIENT_PORT"),
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
  const followerPeers = composed.followerOrigins.join(",");
  const child = childProcess.spawn(process.execPath, [nodeEntry], {
    env: {
      ...process.env,
      VOID_FOLLOWER_AUTOSTART_PEERS: followerPeers,
      VOID_FOLLOWER_AUTOSTART_PEER: composed.followerOrigins[0],
      VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
      VOID_MULTIPATH_PUBLIC_BOOTSTRAP_ACTIVE: "1",
      VOID_TOR_PUBLIC_BOOTSTRAP_ACTIVE:
        composed.transportClasses.includes("tor") ? "1" : "0",
    },
    stdio: "inherit",
  });

  let stopping = false;
  let forwardedSignal = null;
  async function closeAdapters() {
    const results = await Promise.allSettled(
      closeStates.map(({ server, state }) => closeServerOnce(server, state)),
    );
    const rejected = results.find((entry) => entry.status === "rejected");
    if (rejected) throw rejected.reason;
  }

  function stop(signal) {
    if (stopping) return;
    stopping = true;
    forwardedSignal = signal;
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    void closeAdapters().catch((error) => {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${error?.stack || error}`);
      process.exitCode = 1;
    });
  }

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  child.once("error", async (error) => {
    console.error(`${MARKER}_CHILD_ERROR: ${error?.stack || error}`);
    stopping = true;
    try {
      await closeAdapters();
    } catch (closeError) {
      console.error(`${MARKER}_ADAPTER_CLOSE_ERROR: ${closeError?.stack || closeError}`);
    }
    process.exit(1);
  });

  child.once("exit", async (code, signal) => {
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
