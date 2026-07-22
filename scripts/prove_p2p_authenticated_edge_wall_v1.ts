// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import {
  VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER,
  VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STATUS_PATH,
  VoidP2pAuthenticatedEdgeWallV1,
  loadVoidP2pAuthenticatedEdgeIdentityV1,
} from "../src/p2p/authenticated_edge_wall_v1.js";

type TestIdentity = Readonly<{
  key_file: string;
  cert_file: string;
  node_id: string;
}>;

type BackendProbe = Readonly<{
  server: net.Server;
  port: number;
  connections: { value: number };
  received: string[];
  stop: () => Promise<void>;
}>;

function provisionIdentity(root: string, name: string): TestIdentity {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const keyFile = path.join(dir, "key.pem");
  const certFile = path.join(dir, "cert.pem");
  execFileSync("openssl", [
    "genpkey",
    "-algorithm",
    "ED25519",
    "-out",
    keyFile,
  ]);
  execFileSync("openssl", [
    "req",
    "-new",
    "-x509",
    "-key",
    keyFile,
    "-out",
    certFile,
    "-days",
    "2",
    "-subj",
    `/CN=void-edge-wall-proof-${name}`,
  ]);
  fs.chmodSync(keyFile, 0o600);
  fs.chmodSync(certFile, 0o600);
  const identity = loadVoidP2pAuthenticatedEdgeIdentityV1({
    key_file: keyFile,
    cert_file: certFile,
  });
  return {
    key_file: keyFile,
    cert_file: certFile,
    node_id: identity.node_id,
  };
}

async function listen(server: net.Server, port = 0): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return address.port;
}

async function startBackendProbe(greeting: string): Promise<BackendProbe> {
  const sockets = new Set<net.Socket>();
  const received: string[] = [];
  const connections = { value: 0 };
  const server = net.createServer((socket) => {
    sockets.add(socket);
    connections.value += 1;
    socket.setNoDelay(true);
    socket.on("data", (chunk) => received.push(chunk.toString("utf8")));
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
    socket.write(greeting);
  });
  const port = await listen(server);
  return {
    server,
    port,
    connections,
    received,
    stop: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function waitFor(
  predicate: () => boolean,
  description: string,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    `timeout waiting for ${description}${
      lastError ? `: ${String(lastError)}` : ""
    }`,
  );
}

async function getJson(host: string, port: number, requestPath: string): Promise<{
  statusCode: number;
  body: Record<string, unknown>;
}> {
  return await new Promise((resolve, reject) => {
    const request = http.get(
      { host, port, path: requestPath, timeout: 2_000 },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.once("end", () => {
          try {
            resolve({
              statusCode: response.statusCode || 0,
              body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.once("error", reject);
    request.once("timeout", () => request.destroy(new Error("HTTP timeout")));
  });
}

function baseConfig(input: {
  identity: TestIdentity;
  backendPort: number;
  auditFile: string;
}) {
  return {
    listen_host: "127.0.0.1",
    listen_port: 0,
    backend_host: "127.0.0.1",
    backend_port: input.backendPort,
    key_file: input.identity.key_file,
    cert_file: input.identity.cert_file,
    status_host: "127.0.0.1",
    status_port: 0,
    audit_log_file: input.auditFile,
    handshake_timeout_ms: 1_000,
    max_clock_skew_ms: 60_000,
    idle_timeout_ms: 10_000,
    backend_connect_timeout_ms: 1_000,
    max_connections: 16,
    max_connections_per_ip: 8,
    max_pending_handshakes: 8,
    max_auth_line_bytes: 16 * 1024,
    quarantine_threshold: 2,
    quarantine_base_ms: 100,
    quarantine_max_ms: 1_000,
    reconnect_min_ms: 50,
    reconnect_max_ms: 100,
  } as const;
}

async function proveAuthenticatedBridge(root: string): Promise<void> {
  const identityA = provisionIdentity(root, "bridge-a");
  const identityB = provisionIdentity(root, "bridge-b");
  const backendA = await startBackendProbe("HELLO_FROM_BACKEND_A\n");
  const backendB = await startBackendProbe("HELLO_FROM_BACKEND_B\n");
  const wallB = new VoidP2pAuthenticatedEdgeWallV1({
    ...baseConfig({
      identity: identityB,
      backendPort: backendB.port,
      auditFile: path.join(root, "bridge-b.audit.ndjson"),
    }),
    mode: "listen",
    network_id: "void-proof-network-v1",
    allow_node_ids: [identityA.node_id],
  });
  let wallA: VoidP2pAuthenticatedEdgeWallV1 | null = null;
  try {
    await wallB.start();
    const listenAddress = wallB.getListenAddress();
    assert(listenAddress, "listening wall must expose its bound address");

    wallA = new VoidP2pAuthenticatedEdgeWallV1({
      ...baseConfig({
        identity: identityA,
        backendPort: backendA.port,
        auditFile: path.join(root, "bridge-a.audit.ndjson"),
      }),
      mode: "dial",
      network_id: "void-proof-network-v1",
      peers: [
        {
          host: "127.0.0.1",
          port: listenAddress.port,
          expected_node_id: identityB.node_id,
        },
      ],
      allow_node_ids: [identityB.node_id],
    });
    await wallA.start();

    await waitFor(
      () => Number(wallA?.getStatus().active_session_count) === 1,
      "outbound authenticated session",
    );
    await waitFor(
      () => Number(wallB.getStatus().active_session_count) === 1,
      "inbound authenticated session",
    );
    await waitFor(
      () => backendA.received.join("").includes("HELLO_FROM_BACKEND_B"),
      "B backend traffic to cross the wall into A backend",
    );
    await waitFor(
      () => backendB.received.join("").includes("HELLO_FROM_BACKEND_A"),
      "A backend traffic to cross the wall into B backend",
    );

    assert.equal(backendA.connections.value, 1);
    assert.equal(backendB.connections.value, 1);

    const statusAddress = wallB.getStatusAddress();
    assert(statusAddress);
    const statusResponse = await getJson(
      "127.0.0.1",
      statusAddress.port,
      VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STATUS_PATH,
    );
    assert.equal(statusResponse.statusCode, 200);
    assert.equal(statusResponse.body.marker, VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER);
    assert.equal(statusResponse.body.network_id, "void-proof-network-v1");
    assert.equal(statusResponse.body.active_session_count, 1);
    const boundaries = statusResponse.body.boundaries as Record<string, unknown>;
    assert.equal(boundaries.tls_minimum, "TLSv1.3");
    assert.equal(boundaries.channel_binding_exporter_required, true);
    assert.equal(boundaries.local_backend_only, true);
    assert.equal(boundaries.loopback_status_only, true);
    assert.equal(boundaries.ledger_mutation_authority, false);
  } finally {
    await Promise.allSettled([wallA?.stop(), wallB.stop()]);
    await Promise.allSettled([backendA.stop(), backendB.stop()]);
  }
}

async function proveUnauthorizedPeerRejected(root: string): Promise<void> {
  const allowedIdentity = provisionIdentity(root, "policy-allowed");
  const serverIdentity = provisionIdentity(root, "policy-server");
  const deniedIdentity = provisionIdentity(root, "policy-denied");
  const serverBackend = await startBackendProbe("SERVER_BACKEND_SHOULD_NOT_OPEN\n");
  const deniedBackend = await startBackendProbe("DENIED_BACKEND_SHOULD_NOT_OPEN\n");
  const serverWall = new VoidP2pAuthenticatedEdgeWallV1({
    ...baseConfig({
      identity: serverIdentity,
      backendPort: serverBackend.port,
      auditFile: path.join(root, "policy-server.audit.ndjson"),
    }),
    mode: "listen",
    network_id: "void-proof-policy-v1",
    allow_node_ids: [allowedIdentity.node_id],
  });
  let deniedWall: VoidP2pAuthenticatedEdgeWallV1 | null = null;
  try {
    await serverWall.start();
    const address = serverWall.getListenAddress();
    assert(address);
    deniedWall = new VoidP2pAuthenticatedEdgeWallV1({
      ...baseConfig({
        identity: deniedIdentity,
        backendPort: deniedBackend.port,
        auditFile: path.join(root, "policy-denied.audit.ndjson"),
      }),
      mode: "dial",
      network_id: "void-proof-policy-v1",
      peers: [
        {
          host: "127.0.0.1",
          port: address.port,
          expected_node_id: serverIdentity.node_id,
        },
      ],
      allow_node_ids: [serverIdentity.node_id],
    });
    await deniedWall.start();
    await waitFor(
      () => {
        const counters = serverWall.getStatus().counters as Record<string, number>;
        return counters.policy_failures >= 1;
      },
      "unauthorized peer policy rejection",
    );
    assert.equal(serverBackend.connections.value, 0);
    assert.equal(deniedBackend.connections.value, 0);
    assert.equal(serverWall.getStatus().active_session_count, 0);
  } finally {
    await Promise.allSettled([deniedWall?.stop(), serverWall.stop()]);
    await Promise.allSettled([serverBackend.stop(), deniedBackend.stop()]);
  }
}

async function proveWrongNetworkRejected(root: string): Promise<void> {
  const serverIdentity = provisionIdentity(root, "network-server");
  const wrongNetworkIdentity = provisionIdentity(root, "network-wrong-client");
  const serverBackend = await startBackendProbe("NETWORK_SERVER_BACKEND\n");
  const clientBackend = await startBackendProbe("NETWORK_CLIENT_BACKEND\n");
  const serverWall = new VoidP2pAuthenticatedEdgeWallV1({
    ...baseConfig({
      identity: serverIdentity,
      backendPort: serverBackend.port,
      auditFile: path.join(root, "network-server.audit.ndjson"),
    }),
    mode: "listen",
    network_id: "void-proof-network-good-v1",
    allow_node_ids: [wrongNetworkIdentity.node_id],
  });
  let clientWall: VoidP2pAuthenticatedEdgeWallV1 | null = null;
  try {
    await serverWall.start();
    const address = serverWall.getListenAddress();
    assert(address);
    clientWall = new VoidP2pAuthenticatedEdgeWallV1({
      ...baseConfig({
        identity: wrongNetworkIdentity,
        backendPort: clientBackend.port,
        auditFile: path.join(root, "network-client.audit.ndjson"),
      }),
      mode: "dial",
      network_id: "void-proof-network-wrong-v1",
      peers: [
        {
          host: "127.0.0.1",
          port: address.port,
          expected_node_id: serverIdentity.node_id,
        },
      ],
      allow_node_ids: [serverIdentity.node_id],
    });
    await clientWall.start();
    await waitFor(
      () => {
        const serverCounters = serverWall.getStatus().counters as Record<
          string,
          number
        >;
        const clientCounters = clientWall?.getStatus().counters as Record<
          string,
          number
        >;
        return (
          serverCounters.auth_failures >= 1 ||
          (clientCounters?.auth_failures || 0) >= 1
        );
      },
      "wrong-network authentication rejection",
    );
    assert.equal(serverBackend.connections.value, 0);
    assert.equal(clientBackend.connections.value, 0);
    assert.equal(serverWall.getStatus().active_session_count, 0);
  } finally {
    await Promise.allSettled([clientWall?.stop(), serverWall.stop()]);
    await Promise.allSettled([serverBackend.stop(), clientBackend.stop()]);
  }
}

async function proveFailClosedConfiguration(root: string): Promise<void> {
  const identity = provisionIdentity(root, "fail-closed");
  const backend = await startBackendProbe("FAIL_CLOSED_BACKEND\n");
  try {
    assert.throws(
      () =>
        new VoidP2pAuthenticatedEdgeWallV1({
          ...baseConfig({
            identity,
            backendPort: backend.port,
            auditFile: path.join(root, "fail-closed.audit.ndjson"),
          }),
          mode: "listen",
          network_id: "void-proof-fail-closed-v1",
          allow_node_ids: [],
        }),
      /fail-closed admission requires allow_node_ids/,
    );
    assert.throws(
      () =>
        new VoidP2pAuthenticatedEdgeWallV1({
          ...baseConfig({
            identity,
            backendPort: backend.port,
            auditFile: path.join(root, "remote-status.audit.ndjson"),
          }),
          mode: "listen",
          network_id: "void-proof-loopback-v1",
          allow_node_ids: [identity.node_id],
          status_host: "0.0.0.0",
        }),
      /status_host must be loopback-only/,
    );
    assert.throws(
      () =>
        new VoidP2pAuthenticatedEdgeWallV1({
          ...baseConfig({
            identity,
            backendPort: backend.port,
            auditFile: path.join(root, "remote-backend.audit.ndjson"),
          }),
          mode: "listen",
          network_id: "void-proof-local-backend-v1",
          allow_node_ids: [identity.node_id],
          backend_host: "192.0.2.10",
        }),
      /backend_host must be loopback-only/,
    );
  } finally {
    await backend.stop();
  }
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-p2p-edge-wall-proof-"));
  try {
    await proveAuthenticatedBridge(root);
    await proveUnauthorizedPeerRejected(root);
    await proveWrongNetworkRejected(root);
    await proveFailClosedConfiguration(root);
    console.log("VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_GREEN");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
