#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { registerFollowerRoutes } from "../src/http/follower_routes.ts";

const MARKER = "VOID_FOLLOWER_LOW_CATCHUP_PULL_LIMIT_V1_PROOF_GREEN";
const ENV_NAMES = [
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_FOLLOWER_AUTOSTART_PEER",
  "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
  "VOID_FOLLOWER_CATCHUP_PULL_LIMIT",
  "VOID_FOLLOWER_PULL_LIMIT",
  "VOID_FOLLOWER_AUTOSTART_INTERVAL_MS",
  "VOID_FOLLOWER_CATCHUP_INTERVAL_MS",
  "VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS",
];
const saved = new Map(ENV_NAMES.map((name) => [name, process.env[name]]));

try {
  process.env.VOID_FOLLOWER_AUTOSTART_PEERS = "http://127.0.0.1:4100";
  delete process.env.VOID_FOLLOWER_AUTOSTART_PEER;
  process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE = "1";
  process.env.VOID_FOLLOWER_CATCHUP_PULL_LIMIT = "3";
  process.env.VOID_FOLLOWER_PULL_LIMIT = "999";
  process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS = "60000";
  process.env.VOID_FOLLOWER_CATCHUP_INTERVAL_MS = "10000";
  process.env.VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS = "120000";

  const app = { post() {}, get() {} };
  const node = {
    async pullOnce() {
      return {
        ok: true,
        imported: 0,
        filled: 0,
        myHead: 0,
        theirHead: 0,
      };
    },
  };

  registerFollowerRoutes(app, node);

  assert.equal(
    process.env.VOID_FOLLOWER_PULL_LIMIT,
    "3",
    "autostart widened the explicitly configured catch-up pull limit",
  );

  console.log(MARKER);
  console.log("configured_catchup_pull_limit=3");
  console.log("effective_follower_pull_limit=3");
  console.log("default_catchup_pull_limit=999");
} finally {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
