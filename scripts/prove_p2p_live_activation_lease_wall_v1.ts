// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER,
  VoidP2pLiveActivationLeaseHoldV1,
  VoidP2pLiveActivationLeaseWallV1,
  readVoidP2pLiveActivationLeaseSealedSnapshotV1,
  verifyVoidP2pLiveActivationLeaseSealedV1,
  voidP2pLiveActivationLeaseEdgeNodeIdV1,
  type VoidP2pLiveActivationLeaseManagedChildV1,
  type VoidP2pLiveActivationLeaseStartupV1,
} from "../src/p2p/live_activation_lease_wall_v1.js";
import {
  VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
  VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1,
  consumeVoidP2pNodeBoundActivationPermitV1,
  createVoidP2pActivationPermitRootSetV1,
  hashVoidP2pActivationPermitDocumentV1,
  hashVoidP2pActivationRuntimeProfileV1,
  parseVoidP2pActivationRuntimeProfileV1,
  signVoidP2pNodeBoundActivationPermitV1,
  verifyVoidP2pNodeBoundActivationPermitV1,
  type VoidP2pActivationPermitConsumptionResultV1,
  type VoidP2pNodeBoundActivationPermitV1,
} from "../src/p2p/node_bound_activation_permit_wall_v1.js";
import {
  VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1,
  createVoidP2pTrustRootSetV1,
  parseVoidP2pSignedTrustPolicyV1,
  signVoidP2pTrustPolicyV1,
  verifyVoidP2pSignedTrustPolicyV1,
} from "../src/p2p/signed_trust_policy_wall_v1.js";

const GREEN = "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_GREEN";
const NETWORK = "void-mainnet0-chain2050";
const PEER_A = "a".repeat(64);
const PEER_B = "b".repeat(64);
const BASE_NOW = Date.parse("2026-07-22T23:00:00.000Z");

function keyPair(): Readonly<{ private_key_pem: string; public_key_pem: string }> {
  const pair = generateKeyPairSync("ed25519");
  return Object.freeze({
    private_key_pem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    public_key_pem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  });
}

function signTrustTwice(
  policy: ReturnType<typeof parseVoidP2pSignedTrustPolicyV1>,
  first: ReturnType<typeof keyPair>,
  second: ReturnType<typeof keyPair>,
) {
  const once = signVoidP2pTrustPolicyV1({
    policy,
    private_key_pem: first.private_key_pem,
  });
  return signVoidP2pTrustPolicyV1({
    policy,
    private_key_pem: second.private_key_pem,
    existing_signatures: once.signatures,
  });
}

function signPermitTwice(
  permit: VoidP2pNodeBoundActivationPermitV1,
  first: ReturnType<typeof keyPair>,
  second: ReturnType<typeof keyPair>,
) {
  const once = signVoidP2pNodeBoundActivationPermitV1({
    permit,
    private_key_pem: first.private_key_pem,
  });
  return signVoidP2pNodeBoundActivationPermitV1({
    permit,
    private_key_pem: second.private_key_pem,
    existing_signatures: once.signatures,
  });
}

function createIdentity(directory: string, name: string): Readonly<{ key: string; cert: string }> {
  const key = path.join(directory, `${name}.key.pem`);
  const cert = path.join(directory, `${name}.cert.pem`);
  execFileSync("openssl", [
    "req", "-x509", "-new", "-newkey", "ed25519", "-nodes",
    "-keyout", key,
    "-out", cert,
    "-subj", `/CN=${name}`,
    "-days", "2",
  ], { stdio: "ignore" });
  return Object.freeze({ key, cert });
}

type FakeChildController = Readonly<{
  managed: VoidP2pLiveActivationLeaseManagedChildV1;
  crash: (code?: number) => void;
  stop_reasons: string[];
}>;

function fakeChild(name: string): FakeChildController {
  let resolveExit!: (value: Readonly<{ code: number | null; signal: string | null }>) => void;
  let exited = false;
  const stopReasons: string[] = [];
  const exit = new Promise<Readonly<{ code: number | null; signal: string | null }>>((resolve) => {
    resolveExit = resolve;
  });
  const finish = (code: number | null, signal: string | null): void => {
    if (exited) return;
    exited = true;
    resolveExit(Object.freeze({ code, signal }));
  };
  return Object.freeze({
    managed: Object.freeze({
      id: name,
      pid: 4242,
      exited: exit,
      stop: async (reason: string) => {
        stopReasons.push(reason);
        finish(0, "SIGTERM");
      },
    }),
    crash: (code = 1) => finish(code, null),
    stop_reasons: stopReasons,
  });
}

type Fixture = Readonly<{
  root: string;
  now: { value: number };
  state_dir: string;
  startup: VoidP2pLiveActivationLeaseStartupV1;
  consume: () => Promise<VoidP2pActivationPermitConsumptionResultV1>;
  wall: VoidP2pLiveActivationLeaseWallV1;
  children: FakeChildController[];
  identity: Readonly<{ key: string; cert: string }>;
}>;

async function fixture(parent: string, name: string): Promise<Fixture> {
  const root = path.join(parent, name);
  await import("node:fs/promises").then(({ mkdir }) => mkdir(root, { recursive: true }));
  const identity = createIdentity(root, "edge");
  const edgeNodeId = await voidP2pLiveActivationLeaseEdgeNodeIdV1(identity.cert);
  const stateDir = path.join(root, "activation-state");
  const trustStateDir = path.join(root, "trust-state");
  const trustA = keyPair();
  const trustB = keyPair();
  const trustC = keyPair();
  const trustRoots = createVoidP2pTrustRootSetV1({
    network_id: NETWORK,
    threshold: 2,
    public_key_pems: [trustA.public_key_pem, trustB.public_key_pem, trustC.public_key_pem],
  });
  const trustPolicy = parseVoidP2pSignedTrustPolicyV1({
    schema: VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1,
    network_id: NETWORK,
    epoch: "1",
    issued_at: new Date(BASE_NOW - 60_000).toISOString(),
    not_before: new Date(BASE_NOW - 30_000).toISOString(),
    expires_at: new Date(BASE_NOW + 120_000).toISOString(),
    allow_node_ids: [PEER_A, PEER_B],
    deny_node_ids: [],
    peers: [{ host: "198.51.100.10", port: 4790, expected_node_id: PEER_A }],
  });
  const trustEnvelope = signTrustTwice(trustPolicy, trustA, trustB);
  const trustVerified = verifyVoidP2pSignedTrustPolicyV1({
    envelope: trustEnvelope,
    root_set: trustRoots,
    options: {
      expected_network_id: NETWORK,
      now_ms: BASE_NOW,
      max_clock_skew_ms: 0,
      max_policy_lifetime_ms: 300_000,
    },
  });
  const runtimeProfile = parseVoidP2pActivationRuntimeProfileV1({
    schema: VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
    network_id: NETWORK,
    control: {
      activation_permit_state_dir: stateDir,
      trust_policy_state_dir: trustStateDir,
    },
    edge: {
      mode: "both",
      listen_host: "0.0.0.0",
      listen_port: 4790,
      backend_host: "127.0.0.1",
      backend_port: 4700,
      status_host: "127.0.0.1",
      status_port: 4190,
      key_file: identity.key,
      cert_file: identity.cert,
      audit_log: path.join(root, "edge-audit.ndjson"),
    },
    limits: {
      handshake_timeout_ms: 10_000,
      max_clock_skew_ms: 60_000,
      idle_timeout_ms: 120_000,
      backend_connect_timeout_ms: 5_000,
      max_connections: 128,
      max_connections_per_ip: 8,
      max_pending_handshakes: 32,
      max_auth_line_bytes: 16_384,
      quarantine_threshold: 3,
      quarantine_base_ms: 30_000,
      quarantine_max_ms: 3_600_000,
      reconnect_min_ms: 1_000,
      reconnect_max_ms: 30_000,
    },
  });
  const profileHashed = hashVoidP2pActivationRuntimeProfileV1(runtimeProfile);
  const permitA = keyPair();
  const permitB = keyPair();
  const permitC = keyPair();
  const permitRoots = createVoidP2pActivationPermitRootSetV1({
    network_id: NETWORK,
    threshold: 2,
    public_key_pems: [permitA.public_key_pem, permitB.public_key_pem, permitC.public_key_pem],
  });
  const permitDocument: VoidP2pNodeBoundActivationPermitV1 = {
    schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1,
    network_id: NETWORK,
    edge_node_id: edgeNodeId,
    sequence: "1",
    issued_at: new Date(BASE_NOW - 20_000).toISOString(),
    not_before: new Date(BASE_NOW - 10_000).toISOString(),
    expires_at: new Date(BASE_NOW + 90_000).toISOString(),
    policy_epoch: trustVerified.policy.epoch,
    policy_sha256: trustVerified.policy_sha256,
    policy_envelope_sha256: trustVerified.envelope_sha256,
    trust_root_set_sha256: hashVoidP2pActivationPermitDocumentV1(trustRoots),
    runtime_profile_sha256: profileHashed.profile_sha256,
  };
  const permitEnvelope = signPermitTwice(permitDocument, permitA, permitB);
  const permitVerified = verifyVoidP2pNodeBoundActivationPermitV1({
    envelope: permitEnvelope,
    root_set: permitRoots,
    options: {
      expected_network_id: NETWORK,
      expected_edge_node_id: edgeNodeId,
      expected_policy_epoch: trustVerified.policy.epoch,
      expected_policy_sha256: trustVerified.policy_sha256,
      expected_policy_envelope_sha256: trustVerified.envelope_sha256,
      expected_trust_root_set_sha256: hashVoidP2pActivationPermitDocumentV1(trustRoots),
      expected_runtime_profile_sha256: profileHashed.profile_sha256,
      now_ms: BASE_NOW,
      max_clock_skew_ms: 0,
      max_permit_lifetime_ms: 300_000,
    },
  });
  const startup: VoidP2pLiveActivationLeaseStartupV1 = Object.freeze({
    trust_verified: trustVerified,
    permit_verified: permitVerified,
    trust_policy_envelope: trustEnvelope,
    trust_root_set: trustRoots,
    runtime_profile: runtimeProfile,
    runtime_profile_sha256: profileHashed.profile_sha256,
    edge_node_id: edgeNodeId,
    trust_root_set_sha256: hashVoidP2pActivationPermitDocumentV1(trustRoots),
  });
  const now = { value: BASE_NOW };
  let consumed: VoidP2pActivationPermitConsumptionResultV1 | null = null;
  const consume = async (): Promise<VoidP2pActivationPermitConsumptionResultV1> => {
    if (consumed) return consumed;
    consumed = await consumeVoidP2pNodeBoundActivationPermitV1({
      verified: permitVerified,
      trust_policy_envelope: startup.trust_policy_envelope,
      trust_root_set: startup.trust_root_set,
      runtime_profile: startup.runtime_profile,
      state_dir: stateDir,
      now_ms: now.value,
    });
    return consumed;
  };
  const children: FakeChildController[] = [];
  const wall = new VoidP2pLiveActivationLeaseWallV1({
    expected_network_id: NETWORK,
    activation_state_dir: stateDir,
    shutdown_lead_ms: 5_000,
    child_stop_timeout_ms: 1_000,
    now_ms: () => now.value,
    load_and_verify_startup: async () => startup,
    consume_permit: async () => consume(),
    load_and_verify_sealed: async (loaded, consumedResult, expected, nowMs) => {
      const snapshot = await readVoidP2pLiveActivationLeaseSealedSnapshotV1({
        activation_state_dir: stateDir,
        generation: consumedResult.generation,
      });
      return verifyVoidP2pLiveActivationLeaseSealedV1({
        snapshot,
        startup: loaded,
        consumed: consumedResult,
        expected_snapshot: expected,
        trust_options: {
          expected_network_id: NETWORK,
          max_clock_skew_ms: 0,
          max_policy_lifetime_ms: 300_000,
        },
        permit_options: {
          max_clock_skew_ms: 0,
          max_permit_lifetime_ms: 300_000,
        },
        now_ms: nowMs,
      });
    },
    spawn_child: async () => {
      const child = fakeChild(`${name}-child-${children.length + 1}`);
      children.push(child);
      return child.managed;
    },
  });
  return Object.freeze({ root, now, state_dir: stateDir, startup, consume, wall, children, identity });
}

async function expectHold(
  code: string,
  action: () => Promise<unknown>,
): Promise<VoidP2pLiveActivationLeaseHoldV1> {
  try {
    await action();
  } catch (error) {
    assert(error instanceof VoidP2pLiveActivationLeaseHoldV1);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected hold ${code}`);
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function main(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "void-p2p-live-activation-lease-proof-"));
  try {
    const healthy = await fixture(root, "healthy");
    const started = await healthy.wall.start("proof-start");
    assert.equal(started.marker, VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_MARKER);
    assert.equal(started.state, "running");
    assert.equal(started.one_shot_permit_consumed, true);
    assert.equal(started.child_spawn_count, 1);
    assert.equal(started.automatic_child_restart, false);
    assert.equal(started.policy_rotation_under_existing_permit, false);
    assert.equal(started.permissionless_admission_forced_off, true);
    assert.equal(started.runtime_private_policy_or_activation_key_required, false);
    assert.equal(started.ledger_authority, false);
    assert.equal(started.validator_authority, false);
    assert.equal(started.wallet_or_transaction_signer_authority, false);
    assert.equal(started.money_movement_authority, false);
    const revalidated = await healthy.wall.reconcile("same-generation");
    assert.equal(revalidated.state, "running");
    assert.equal(revalidated.child_spawn_count, 1);
    await healthy.wall.stop("proof-stop");
    assert.equal(healthy.wall.getStatus().state, "stopped");
    await expectHold("invalid_lifecycle", () => healthy.wall.start("replay-start"));

    const drift = await fixture(root, "sealed-drift");
    await drift.wall.start();
    const consumedDrift = await drift.consume();
    await writeFile(consumedDrift.sealed_runtime_profile_file, `${JSON.stringify({ tampered: true })}\n`);
    await expectHold("sealed_file_drift", () => drift.wall.reconcile("sealed-file-drift"));
    assert.equal(drift.wall.getStatus().state, "held");
    assert.equal(drift.wall.getStatus().child_spawn_count, 1);
    assert.equal(drift.children[0]?.stop_reasons[0], "hold:sealed_file_drift");
    await drift.wall.stop("held-shutdown");
    assert.equal(drift.wall.getStatus().state, "held");

    const pointer = await fixture(root, "current-pointer-change");
    await pointer.wall.start();
    const current = path.join(pointer.state_dir, "current");
    await unlink(current);
    await symlink("generations/0000000000000000000000000000000000000002-deadbeef", current);
    await expectHold("current_generation_changed", () => pointer.wall.reconcile("pointer-change"));
    assert.equal(pointer.wall.getStatus().state, "held");

    const revoked = await fixture(root, "local-revocation");
    await revoked.wall.start();
    await writeFile(path.join(revoked.state_dir, "revoke"), "operator hold\n", { mode: 0o600 });
    await expectHold("local_revocation", () => revoked.wall.reconcile("local-revoke"));
    assert.equal(revoked.wall.getStatus().child_id, null);

    const expired = await fixture(root, "permit-expiry");
    await expired.wall.start();
    expired.now.value = BASE_NOW + 86_000;
    await expectHold("permit_lease_expired", () => expired.wall.reconcile("permit-expiry"));
    assert.equal(expired.wall.getStatus().state, "held");

    const certDrift = await fixture(root, "certificate-drift");
    await certDrift.wall.start();
    const replacement = createIdentity(certDrift.root, "replacement-edge");
    await writeFile(certDrift.identity.cert, await readFile(replacement.cert));
    await expectHold("wrong_edge_node", () => certDrift.wall.reconcile("certificate-drift"));
    assert.equal(certDrift.wall.getStatus().state, "held");

    const crashed = await fixture(root, "child-crash");
    await crashed.wall.start();
    crashed.children[0]!.crash(17);
    await settle();
    assert.equal(crashed.wall.getStatus().state, "held");
    assert.equal(crashed.wall.getStatus().unexpected_child_exit_count, 1);
    assert.equal(crashed.wall.getStatus().child_spawn_count, 1);
    assert.equal(crashed.wall.getStatus().child_id, null);
    await expectHold("invalid_lifecycle", () => crashed.wall.reconcile("no-restart"));

    const startupMismatch = await fixture(root, "startup-binding-mismatch");
    const wrongStartup = Object.freeze({
      ...startupMismatch.startup,
      runtime_profile_sha256: "f".repeat(64),
    });
    const wrongWall = new VoidP2pLiveActivationLeaseWallV1({
      expected_network_id: NETWORK,
      activation_state_dir: startupMismatch.state_dir,
      now_ms: () => BASE_NOW,
      load_and_verify_startup: async () => wrongStartup,
      consume_permit: async () => { throw new Error("must not consume mismatched startup"); },
      load_and_verify_sealed: async (_a, _b, expected) => expected,
      spawn_child: async () => { throw new Error("must not spawn mismatched startup"); },
    });
    await expectHold("startup_binding_mismatch", () => wrongWall.start("binding-mismatch"));

    console.log(GREEN);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
