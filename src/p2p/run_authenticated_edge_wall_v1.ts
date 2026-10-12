// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as path from "node:path";
import {
  VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER,
  VoidP2pAuthenticatedEdgeWallV1,
  type VoidP2pAuthenticatedEdgePeerTargetV1,
  type VoidP2pAuthenticatedEdgeWallModeV1,
} from "./authenticated_edge_wall_v1.js";

const DISABLED_MARKER = "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_DISABLED";
const STARTED_MARKER = "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STARTED";
const STOPPED_MARKER = "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STOPPED";

function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined ? fallback : value.trim();
}

function envInt(
  name: string,
  fallback: number,
  options: { allowZero?: boolean } = {},
): number {
  const raw = env(name);
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) throw new Error(`${name} must be an integer`);
  const value = Number(raw);
  const minimum = options.allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be >= ${minimum}`);
  }
  return value;
}

function envBool(name: string, fallback = false): boolean {
  const raw = env(name);
  if (!raw) return fallback;
  if (raw === "1" || raw.toLowerCase() === "true") return true;
  if (raw === "0" || raw.toLowerCase() === "false") return false;
  throw new Error(`${name} must be 1, 0, true, or false`);
}

function csvNodeIds(name: string): string[] {
  const raw = env(name);
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function parseMode(): VoidP2pAuthenticatedEdgeWallModeV1 {
  const value = env("VOID_P2P_EDGE_WALL_MODE", "listen");
  if (value !== "listen" && value !== "dial" && value !== "both") {
    throw new Error("VOID_P2P_EDGE_WALL_MODE must be listen, dial, or both");
  }
  return value;
}

function parsePeersJson(): VoidP2pAuthenticatedEdgePeerTargetV1[] {
  const raw = env("VOID_P2P_EDGE_WALL_PEERS_JSON", "[]");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("VOID_P2P_EDGE_WALL_PEERS_JSON must be valid JSON");
  }
  if (!Array.isArray(value)) {
    throw new Error("VOID_P2P_EDGE_WALL_PEERS_JSON must be a JSON array");
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`peer ${index} must be an object`);
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.host !== "string" || !record.host.trim()) {
      throw new Error(`peer ${index}.host must be a non-empty string`);
    }
    if (
      typeof record.port !== "number" ||
      !Number.isInteger(record.port) ||
      record.port < 1 ||
      record.port > 65535
    ) {
      throw new Error(`peer ${index}.port must be an integer from 1 to 65535`);
    }
    const expectedNodeId = record.expected_node_id;
    if (expectedNodeId !== undefined && typeof expectedNodeId !== "string") {
      throw new Error(`peer ${index}.expected_node_id must be a string`);
    }
    return {
      host: record.host.trim(),
      port: record.port,
      expected_node_id:
        typeof expectedNodeId === "string"
          ? expectedNodeId.trim().toLowerCase()
          : undefined,
    };
  });
}

function requiredPath(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is required when the wall is enabled`);
  return path.resolve(value);
}

async function main(): Promise<void> {
  if (env("VOID_P2P_EDGE_WALL_ENABLED") !== "1") {
    console.error(DISABLED_MARKER);
    process.exitCode = 78;
    return;
  }

  const dataDir = path.resolve(env("DATA_DIR", "data"));
  const mode = parseMode();
  const wall = new VoidP2pAuthenticatedEdgeWallV1({
    mode,
    network_id: env("VOID_P2P_EDGE_WALL_NETWORK_ID", "void-mainnet0-chain2050"),
    listen_host: env("VOID_P2P_EDGE_WALL_LISTEN_HOST", "0.0.0.0"),
    listen_port: envInt("VOID_P2P_EDGE_WALL_LISTEN_PORT", 4790, {
      allowZero: true,
    }),
    backend_host: env("VOID_P2P_EDGE_WALL_BACKEND_HOST", "127.0.0.1"),
    backend_port: envInt(
      "VOID_P2P_EDGE_WALL_BACKEND_PORT",
      envInt("P2P_PORT", 4700),
    ),
    key_file: requiredPath("VOID_P2P_EDGE_WALL_KEY_FILE"),
    cert_file: requiredPath("VOID_P2P_EDGE_WALL_CERT_FILE"),
    peers: parsePeersJson(),
    allow_node_ids: csvNodeIds("VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS"),
    deny_node_ids: csvNodeIds("VOID_P2P_EDGE_WALL_DENY_NODE_IDS"),
    permissionless: envBool("VOID_P2P_EDGE_WALL_PERMISSIONLESS", false),
    status_host: env("VOID_P2P_EDGE_WALL_STATUS_HOST", "127.0.0.1"),
    status_port: envInt("VOID_P2P_EDGE_WALL_STATUS_PORT", 4190, {
      allowZero: true,
    }),
    audit_log_file: path.resolve(
      env(
        "VOID_P2P_EDGE_WALL_AUDIT_LOG",
        path.join(dataDir, "p2p-edge-wall-v1", "audit.ndjson"),
      ),
    ),
    handshake_timeout_ms: envInt(
      "VOID_P2P_EDGE_WALL_HANDSHAKE_TIMEOUT_MS",
      10_000,
    ),
    max_clock_skew_ms: envInt("VOID_P2P_EDGE_WALL_MAX_CLOCK_SKEW_MS", 60_000),
    idle_timeout_ms: envInt("VOID_P2P_EDGE_WALL_IDLE_TIMEOUT_MS", 120_000),
    backend_connect_timeout_ms: envInt(
      "VOID_P2P_EDGE_WALL_BACKEND_CONNECT_TIMEOUT_MS",
      5_000,
    ),
    max_connections: envInt("VOID_P2P_EDGE_WALL_MAX_CONNECTIONS", 128),
    max_connections_per_ip: envInt(
      "VOID_P2P_EDGE_WALL_MAX_CONNECTIONS_PER_IP",
      8,
    ),
    max_pending_handshakes: envInt(
      "VOID_P2P_EDGE_WALL_MAX_PENDING_HANDSHAKES",
      32,
    ),
    max_auth_line_bytes: envInt(
      "VOID_P2P_EDGE_WALL_MAX_AUTH_LINE_BYTES",
      16 * 1024,
    ),
    quarantine_threshold: envInt(
      "VOID_P2P_EDGE_WALL_QUARANTINE_THRESHOLD",
      3,
    ),
    quarantine_base_ms: envInt(
      "VOID_P2P_EDGE_WALL_QUARANTINE_BASE_MS",
      30_000,
    ),
    quarantine_max_ms: envInt(
      "VOID_P2P_EDGE_WALL_QUARANTINE_MAX_MS",
      60 * 60_000,
    ),
    reconnect_min_ms: envInt("VOID_P2P_EDGE_WALL_RECONNECT_MIN_MS", 1_000),
    reconnect_max_ms: envInt("VOID_P2P_EDGE_WALL_RECONNECT_MAX_MS", 30_000),
  });

  await wall.start();
  console.log(
    JSON.stringify({
      marker: STARTED_MARKER,
      wall_marker: VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER,
      ...wall.getStatus(),
    }),
  );

  let stopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    try {
      await wall.stop();
      console.log(JSON.stringify({ marker: STOPPED_MARKER, signal }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          marker: "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STOP_FAILURE",
          signal,
          error: message,
        }),
      );
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(
    JSON.stringify({
      marker: "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_START_FAILURE",
      error: message,
    }),
  );
  process.exitCode = 1;
});
