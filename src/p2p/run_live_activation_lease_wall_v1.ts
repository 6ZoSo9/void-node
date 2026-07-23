// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { spawn, type ChildProcess } from "node:child_process";
import {
  chmod,
  constants as fsConstants,
  lstat,
  mkdir,
  open,
} from "node:fs/promises";
import { createServer, type Server } from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
  VoidP2pLiveActivationLeaseHoldV1,
  VoidP2pLiveActivationLeaseWallV1,
  assertVoidP2pLiveActivationLeaseLoopbackHostV1,
  readVoidP2pLiveActivationLeaseSealedSnapshotV1,
  verifyVoidP2pLiveActivationLeaseSealedV1,
  voidP2pLiveActivationLeaseEdgeNodeIdV1,
  type VoidP2pLiveActivationLeaseAuditRecordV1,
  type VoidP2pLiveActivationLeaseManagedChildV1,
  type VoidP2pLiveActivationLeaseStartupV1,
} from "./live_activation_lease_wall_v1.js";
import {
  consumeVoidP2pNodeBoundActivationPermitV1,
  deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1,
  hashVoidP2pActivationPermitDocumentV1,
  hashVoidP2pActivationRuntimeProfileV1,
  readVoidP2pActivationPermitJsonFileV1,
  verifyVoidP2pNodeBoundActivationPermitV1,
  type VoidP2pActivationPermitVerificationOptionsV1,
  type VoidP2pActivationPermitConsumptionResultV1,
} from "./node_bound_activation_permit_wall_v1.js";
import {
  readVoidP2pTrustPolicyInputsV1,
  verifyVoidP2pSignedTrustPolicyV1,
  type VoidP2pTrustPolicyVerificationOptionsV1,
} from "./signed_trust_policy_wall_v1.js";

const DISABLED_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_DISABLED";
const ACTIVATION_GATE_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_ACTIVATION_GATE_DISABLED";
const TRUST_GATE_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_TRUST_GATE_DISABLED";
const EDGE_GATE_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_EDGE_GATE_DISABLED";
const VERIFIED_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_VERIFIED";
const STARTED_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_STARTED";
const RECONCILE_HOLD_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_RECONCILE_HELD";
const STOPPED_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_STOPPED";
const CHILD_STOPPED_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_CHILD_STOPPED";
const FAILURE_MARKER = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_FAILURE";

function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined ? fallback : value.trim();
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function envInt(name: string, fallback: number, allowZero = false): number {
  const raw = env(name);
  if (!raw) return fallback;
  if (!/^[0-9]+$/.test(raw)) throw new Error(`${name} must be an integer`);
  const value = Number(raw);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be >= ${minimum}`);
  }
  return value;
}

function trustOptions(nowMs?: number): VoidP2pTrustPolicyVerificationOptionsV1 {
  return Object.freeze({
    expected_network_id: env(
      "VOID_P2P_ACTIVATION_PERMIT_NETWORK_ID",
      "void-mainnet0-chain2050",
    ),
    ...(nowMs === undefined ? {} : { now_ms: nowMs }),
    max_clock_skew_ms: envInt("VOID_P2P_TRUST_POLICY_MAX_CLOCK_SKEW_MS", 60_000, true),
    max_policy_lifetime_ms: envInt(
      "VOID_P2P_TRUST_POLICY_MAX_LIFETIME_MS",
      30 * 24 * 60 * 60_000,
    ),
    max_allow_node_ids: envInt("VOID_P2P_TRUST_POLICY_MAX_ALLOW_NODE_IDS", 1_024),
    max_deny_node_ids: envInt("VOID_P2P_TRUST_POLICY_MAX_DENY_NODE_IDS", 1_024),
    max_peers: envInt("VOID_P2P_TRUST_POLICY_MAX_PEERS", 256, true),
    max_document_bytes: envInt("VOID_P2P_TRUST_POLICY_MAX_DOCUMENT_BYTES", 1024 * 1024),
  });
}

function permitOptions(): Omit<
  VoidP2pActivationPermitVerificationOptionsV1,
  | "expected_network_id"
  | "expected_edge_node_id"
  | "expected_policy_epoch"
  | "expected_policy_sha256"
  | "expected_policy_envelope_sha256"
  | "expected_trust_root_set_sha256"
  | "expected_runtime_profile_sha256"
  | "now_ms"
> {
  return Object.freeze({
    max_clock_skew_ms: envInt("VOID_P2P_ACTIVATION_PERMIT_MAX_CLOCK_SKEW_MS", 60_000, true),
    max_permit_lifetime_ms: envInt(
      "VOID_P2P_ACTIVATION_PERMIT_MAX_LIFETIME_MS",
      24 * 60 * 60_000,
    ),
    max_document_bytes: envInt("VOID_P2P_ACTIVATION_PERMIT_MAX_DOCUMENT_BYTES", 1024 * 1024),
  });
}

function inputPaths(): Readonly<{
  network_id: string;
  trust_root_set_file: string;
  trust_policy_envelope_file: string;
  runtime_profile_file: string;
  permit_root_set_file: string;
  permit_envelope_file: string;
  activation_state_dir: string;
}> {
  return Object.freeze({
    network_id: env("VOID_P2P_ACTIVATION_PERMIT_NETWORK_ID", "void-mainnet0-chain2050"),
    trust_root_set_file: path.resolve(requiredEnv("VOID_P2P_TRUST_POLICY_ROOT_SET_FILE")),
    trust_policy_envelope_file: path.resolve(requiredEnv("VOID_P2P_TRUST_POLICY_ENVELOPE_FILE")),
    runtime_profile_file: path.resolve(requiredEnv("VOID_P2P_ACTIVATION_RUNTIME_PROFILE_FILE")),
    permit_root_set_file: path.resolve(requiredEnv("VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_FILE")),
    permit_envelope_file: path.resolve(requiredEnv("VOID_P2P_ACTIVATION_PERMIT_ENVELOPE_FILE")),
    activation_state_dir: path.resolve(requiredEnv("VOID_P2P_ACTIVATION_PERMIT_STATE_DIR")),
  });
}

async function loadStartup(nowMs: number): Promise<VoidP2pLiveActivationLeaseStartupV1> {
  const paths = inputPaths();
  const [trustInputs, runtimeProfileInput, permitRootSet, permitEnvelope] = await Promise.all([
    readVoidP2pTrustPolicyInputsV1({
      root_set_file: paths.trust_root_set_file,
      envelope_file: paths.trust_policy_envelope_file,
    }),
    readVoidP2pActivationPermitJsonFileV1(paths.runtime_profile_file),
    readVoidP2pActivationPermitJsonFileV1(paths.permit_root_set_file),
    readVoidP2pActivationPermitJsonFileV1(paths.permit_envelope_file),
  ]);
  const trustVerified = verifyVoidP2pSignedTrustPolicyV1({
    envelope: trustInputs.envelope,
    root_set: trustInputs.root_set,
    options: trustOptions(nowMs),
  });
  const profile = hashVoidP2pActivationRuntimeProfileV1(runtimeProfileInput);
  if (profile.profile.control.activation_permit_state_dir !== paths.activation_state_dir) {
    throw new Error("runtime profile activation state directory differs from configured state directory");
  }
  const edgeNodeId = await voidP2pLiveActivationLeaseEdgeNodeIdV1(profile.profile.edge.cert_file);
  const trustRootHash = hashVoidP2pActivationPermitDocumentV1(trustInputs.root_set);
  const permitVerified = verifyVoidP2pNodeBoundActivationPermitV1({
    envelope: permitEnvelope,
    root_set: permitRootSet,
    options: Object.freeze({
      ...permitOptions(),
      expected_network_id: paths.network_id,
      expected_edge_node_id: edgeNodeId,
      expected_policy_epoch: trustVerified.policy.epoch,
      expected_policy_sha256: trustVerified.policy_sha256,
      expected_policy_envelope_sha256: trustVerified.envelope_sha256,
      expected_trust_root_set_sha256: trustRootHash,
      expected_runtime_profile_sha256: profile.profile_sha256,
      now_ms: nowMs,
    }),
  });
  if (trustVerified.derived_edge_environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS !== "0") {
    throw new Error("verified policy did not force permissionless edge admission off");
  }
  return Object.freeze({
    trust_verified: trustVerified,
    permit_verified: permitVerified,
    trust_policy_envelope: trustInputs.envelope,
    trust_root_set: trustInputs.root_set,
    runtime_profile: profile.profile,
    runtime_profile_sha256: profile.profile_sha256,
    edge_node_id: edgeNodeId,
    trust_root_set_sha256: trustRootHash,
  });
}

async function consumeStartup(
  startup: VoidP2pLiveActivationLeaseStartupV1,
): Promise<VoidP2pActivationPermitConsumptionResultV1> {
  return consumeVoidP2pNodeBoundActivationPermitV1({
    verified: startup.permit_verified,
    trust_policy_envelope: startup.trust_policy_envelope,
    trust_root_set: startup.trust_root_set,
    runtime_profile: startup.runtime_profile,
    state_dir: startup.runtime_profile.control.activation_permit_state_dir,
  });
}

async function appendAudit(
  filename: string,
  record: VoidP2pLiveActivationLeaseAuditRecordV1,
  maxBytes: number,
): Promise<void> {
  const resolved = path.resolve(filename);
  const directory = path.dirname(resolved);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const directoryInfo = await lstat(directory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error("live activation lease audit directory must be a real directory");
  }
  const line = `${JSON.stringify(record)}\n`;
  const lineBytes = Buffer.byteLength(line, "utf8");
  if (lineBytes > 64 * 1024) throw new Error("audit record is too large");
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const handle = await open(
    resolved,
    fsConstants.O_APPEND | fsConstants.O_CREAT | fsConstants.O_WRONLY | noFollow,
    0o600,
  );
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) throw new Error("audit target is not a file");
    if (metadata.size + lineBytes > maxBytes) {
      throw new Error(`audit log exceeds max bytes=${maxBytes}`);
    }
    await handle.chmod(0o600);
    await handle.write(line, null, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function childExitPromise(child: ChildProcess): Promise<Readonly<{
  code: number | null;
  signal: string | null;
}>> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(Object.freeze({ code, signal: signal ?? null })));
  });
}

function managedChildFactory(repositoryRoot: string, tsx: string, trustRunner: string) {
  return async (
    startup: VoidP2pLiveActivationLeaseStartupV1,
    consumed: VoidP2pActivationPermitConsumptionResultV1,
  ): Promise<VoidP2pLiveActivationLeaseManagedChildV1> => {
    const childEnvironment: NodeJS.ProcessEnv = { ...process.env };
    for (const name of Object.keys(childEnvironment)) {
      if (
        name.startsWith("VOID_P2P_ACTIVATION_PERMIT_") ||
        name.startsWith("VOID_P2P_TRUST_POLICY_") ||
        name.startsWith("VOID_P2P_LIVE_ACTIVATION_LEASE_") ||
        name.startsWith("VOID_P2P_EDGE_WALL_")
      ) {
        delete childEnvironment[name];
      }
    }
    Object.assign(
      childEnvironment,
      deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1(startup.runtime_profile),
      startup.trust_verified.derived_edge_environment,
      {
        VOID_P2P_TRUST_POLICY_WALL_ENABLED: "1",
        VOID_P2P_EDGE_WALL_ENABLED: "1",
        VOID_P2P_EDGE_WALL_PERMISSIONLESS: "0",
        VOID_P2P_TRUST_POLICY_NETWORK_ID: startup.trust_verified.policy.network_id,
        VOID_P2P_TRUST_POLICY_ROOT_SET_FILE: consumed.sealed_trust_root_set_file,
        VOID_P2P_TRUST_POLICY_ENVELOPE_FILE: consumed.sealed_policy_envelope_file,
        VOID_P2P_TRUST_POLICY_STATE_DIR: startup.runtime_profile.control.trust_policy_state_dir,
      },
    );
    const child = spawn(tsx, [trustRunner, "serve"], {
      cwd: repositoryRoot,
      env: childEnvironment,
      stdio: "inherit",
      shell: false,
    });
    const exited = childExitPromise(child);
    const id = [
      "activation",
      startup.permit_verified.permit.sequence,
      startup.permit_verified.permit_sha256.slice(0, 12),
      String(child.pid ?? "pending"),
    ].join("-");
    let stopPromise: Promise<void> | null = null;
    const stop = async (reason: string, timeoutMs: number): Promise<void> => {
      if (stopPromise) return stopPromise;
      stopPromise = (async () => {
        if (child.exitCode !== null || child.signalCode !== null) {
          await exited;
          return;
        }
        child.kill("SIGTERM");
        const timeout = new Promise<"timeout">((resolve) => {
          setTimeout(() => resolve("timeout"), timeoutMs).unref();
        });
        const outcome = await Promise.race([exited.then(() => "exited" as const), timeout]);
        if (outcome === "timeout") {
          child.kill("SIGKILL");
          await exited;
        }
        console.error(JSON.stringify({
          marker: CHILD_STOPPED_MARKER,
          reason,
          child_id: id,
          sequence: startup.permit_verified.permit.sequence,
          permit_sha256: startup.permit_verified.permit_sha256,
          generation: consumed.generation,
        }));
      })();
      return stopPromise;
    };
    return Object.freeze({ id, pid: child.pid ?? null, exited, stop });
  };
}

async function verifyCommand(): Promise<void> {
  const now = Date.now();
  const startup = await loadStartup(now);
  const lead = envInt("VOID_P2P_LIVE_ACTIVATION_LEASE_SHUTDOWN_LEAD_MS", 5_000, true);
  const permitRemaining = Date.parse(startup.permit_verified.permit.expires_at) - now;
  const policyRemaining = Date.parse(startup.trust_verified.policy.expires_at) - now;
  if (permitRemaining <= lead || policyRemaining <= lead) {
    throw new Error("permit or policy is inside the configured shutdown lead window");
  }
  console.log(JSON.stringify({
    marker: VERIFIED_MARKER,
    wall_marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
    network_id: startup.trust_verified.policy.network_id,
    edge_node_id: startup.edge_node_id,
    sequence: startup.permit_verified.permit.sequence,
    permit_sha256: startup.permit_verified.permit_sha256,
    permit_expires_at: startup.permit_verified.permit.expires_at,
    policy_epoch: startup.trust_verified.policy.epoch,
    policy_sha256: startup.trust_verified.policy_sha256,
    policy_expires_at: startup.trust_verified.policy.expires_at,
    runtime_profile_sha256: startup.runtime_profile_sha256,
    one_shot_consumed: false,
    child_started: false,
    permissionless: false,
  }));
}

async function listenStatus(
  wall: VoidP2pLiveActivationLeaseWallV1,
): Promise<Readonly<{ server: Server; address: unknown }>> {
  const host = assertVoidP2pLiveActivationLeaseLoopbackHostV1(
    env("VOID_P2P_LIVE_ACTIVATION_LEASE_STATUS_HOST", "127.0.0.1"),
  );
  const port = envInt("VOID_P2P_LIVE_ACTIVATION_LEASE_STATUS_PORT", 4192, true);
  const server = createServer((request, response) => {
    if (
      request.method !== "GET" ||
      request.url !== "/__void/p2p-live-activation-lease-wall-v1/status"
    ) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not_found" }));
      return;
    }
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(JSON.stringify(wall.getStatus()));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  return Object.freeze({ server, address: server.address() });
}

async function serveCommand(): Promise<void> {
  if (env("VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_ENABLED") !== "1") {
    console.error(DISABLED_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED") !== "1") {
    console.error(ACTIVATION_GATE_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_TRUST_POLICY_WALL_ENABLED") !== "1") {
    console.error(TRUST_GATE_MARKER);
    process.exitCode = 78;
    return;
  }
  if (env("VOID_P2P_EDGE_WALL_ENABLED") !== "1") {
    console.error(EDGE_GATE_MARKER);
    process.exitCode = 78;
    return;
  }

  const paths = inputPaths();
  const currentFile = fileURLToPath(import.meta.url);
  const repositoryRoot = path.resolve(path.dirname(currentFile), "../..");
  const tsx = path.join(repositoryRoot, "node_modules", ".bin", "tsx");
  const trustRunner = path.join(repositoryRoot, "src", "p2p", "run_signed_trust_policy_wall_v1.ts");
  const auditFile = path.resolve(
    env(
      "VOID_P2P_LIVE_ACTIVATION_LEASE_AUDIT_LOG",
      path.join(paths.activation_state_dir, "live-activation-lease-audit-v1.ndjson"),
    ),
  );
  const auditMaxBytes = envInt(
    "VOID_P2P_LIVE_ACTIVATION_LEASE_AUDIT_MAX_BYTES",
    64 * 1024 * 1024,
  );
  const wall = new VoidP2pLiveActivationLeaseWallV1({
    expected_network_id: paths.network_id,
    activation_state_dir: paths.activation_state_dir,
    shutdown_lead_ms: envInt(
      "VOID_P2P_LIVE_ACTIVATION_LEASE_SHUTDOWN_LEAD_MS",
      5_000,
      true,
    ),
    child_stop_timeout_ms: envInt(
      "VOID_P2P_LIVE_ACTIVATION_LEASE_CHILD_STOP_TIMEOUT_MS",
      15_000,
    ),
    load_and_verify_startup: () => loadStartup(Date.now()),
    consume_permit: consumeStartup,
    load_and_verify_sealed: async (startup, consumed, expected, nowMs) => {
      const snapshot = await readVoidP2pLiveActivationLeaseSealedSnapshotV1({
        activation_state_dir: paths.activation_state_dir,
        generation: consumed.generation,
        max_document_bytes: Math.max(
          envInt("VOID_P2P_TRUST_POLICY_MAX_DOCUMENT_BYTES", 1024 * 1024),
          envInt("VOID_P2P_ACTIVATION_PERMIT_MAX_DOCUMENT_BYTES", 1024 * 1024),
        ),
      });
      return verifyVoidP2pLiveActivationLeaseSealedV1({
        snapshot,
        startup,
        consumed,
        expected_snapshot: expected,
        trust_options: trustOptions(),
        permit_options: permitOptions(),
        now_ms: nowMs,
      });
    },
    spawn_child: managedChildFactory(repositoryRoot, tsx, trustRunner),
    audit: (record) => appendAudit(auditFile, record, auditMaxBytes),
  });

  await wall.start();
  const status = await listenStatus(wall);
  console.log(JSON.stringify({
    marker: STARTED_MARKER,
    wall_marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
    status_address: status.address,
    audit_log: auditFile,
    revoke_file: path.join(paths.activation_state_dir, "revoke"),
    status: wall.getStatus(),
  }));

  const pollMs = envInt("VOID_P2P_LIVE_ACTIVATION_LEASE_POLL_MS", 5_000);
  let reconciling = false;
  let stopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    await wall.stop(signal).catch((error: unknown) => {
      console.error(error instanceof Error ? error.stack || error.message : String(error));
      process.exitCode = 1;
    });
    await new Promise<void>((resolve) => status.server.close(() => resolve()));
    console.log(JSON.stringify({
      marker: STOPPED_MARKER,
      wall_marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
      signal,
      status: wall.getStatus(),
    }));
  };
  const timer = setInterval(() => {
    if (reconciling || stopping) return;
    reconciling = true;
    void wall.reconcile("poll").catch((error: unknown) => {
      const code = error instanceof VoidP2pLiveActivationLeaseHoldV1
        ? error.code
        : "reconcile_failed";
      console.error(JSON.stringify({
        marker: RECONCILE_HOLD_MARKER,
        wall_marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
        code,
        error: error instanceof Error ? error.message : String(error),
        status: wall.getStatus(),
      }));
      void stop(`hold:${code}`);
    }).finally(() => {
      reconciling = false;
    });
  }, pollMs);
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "serve";
  if (command === "verify") {
    await verifyCommand();
    return;
  }
  if (command !== "serve") throw new Error(`unsupported command: ${command}`);
  await serveCommand();
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    marker: FAILURE_MARKER,
    wall_marker: VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
    code: error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "start_failure",
    error: error instanceof Error ? error.stack || error.message : String(error),
  }));
  process.exitCode = 1;
});
