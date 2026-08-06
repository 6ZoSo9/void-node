#!/usr/bin/env node
import childProcess from "node:child_process";
import process from "node:process";
import { createPublicSeedClientAdapterV1 } from "../tools/void-public-seed-client-adapter-v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_SUPERVISOR_V1";

async function main() {
  const peers = String(process.env.VOID_PUBLIC_SEED_CLIENT_PEERS || "").trim();
  if (!peers) throw new Error("VOID_PUBLIC_SEED_CLIENT_PEERS is required");

  const adapter = await createPublicSeedClientAdapterV1({ peers });
  const nodeEntry = String(process.env.VOID_PUBLIC_BOOTSTRAP_NODE_ENTRY || "dist/index.js");
  const child = childProcess.spawn(process.execPath, [nodeEntry], {
    env: {
      ...process.env,
      VOID_FOLLOWER_AUTOSTART_PEERS: adapter.base,
      VOID_FOLLOWER_AUTOSTART_PEER: adapter.base,
      VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1",
    },
    stdio: "inherit",
  });

  let stopping = false;
  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    adapter.server.close();
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  child.once("error", (error) => {
    console.error(`${MARKER}_CHILD_ERROR: ${error?.stack || error}`);
    stop("SIGTERM");
  });
  child.once("exit", (code, signal) => {
    adapter.server.close(() => {
      if (signal) {
        console.error(`${MARKER}_CHILD_SIGNAL=${signal}`);
        process.exit(1);
      }
      process.exit(Number.isInteger(code) ? code : 1);
    });
  });

  console.log(`${MARKER}_ACTIVE`);
  console.log(`adapter_base=${adapter.base}`);
  console.log(`remote_peer_count=${adapter.peers.length}`);
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
