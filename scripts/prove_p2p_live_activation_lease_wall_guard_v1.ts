// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import * as path from "node:path";

const EXPECTED_PATHS = Object.freeze([
  ".github/workflows/p2p-live-activation-lease-wall-v1.yml",
  "docs/architecture/p2p-live-activation-lease-wall-v1.md",
  "ops/mainnet0/p2p-live-activation-lease-wall-v1.env.example",
  "ops/mainnet0/run-p2p-live-activation-lease-wall-v1.sh",
  "ops/mainnet0/check-p2p-live-activation-lease-wall-v1.sh",
  "ops/mainnet0/void-p2p-live-activation-lease-wall-v1.service.example",
  "scripts/prove_p2p_live_activation_lease_wall_guard_v1.ts",
  "scripts/prove_p2p_live_activation_lease_wall_v1.ts",
  "src/p2p/live_activation_lease_wall_v1.ts",
  "src/p2p/run_live_activation_lease_wall_v1.ts",
]);

async function text(relative: string): Promise<string> {
  return readFile(path.resolve(relative), "utf8");
}

function mustContain(source: string, fragment: string, label: string): void {
  assert(source.includes(fragment), `${label} missing required fragment: ${fragment}`);
}

function mustNotContain(source: string, fragment: string, label: string): void {
  assert(!source.includes(fragment), `${label} contains forbidden fragment: ${fragment}`);
}

function occurrences(source: string, fragment: string): number {
  return source.split(fragment).length - 1;
}

async function main(): Promise<void> {
  for (const relative of EXPECTED_PATHS) {
    const metadata = await lstat(path.resolve(relative));
    assert(metadata.isFile(), `${relative} must be a regular file`);
    assert(!metadata.isSymbolicLink(), `${relative} must not be a symlink`);
  }
  for (const relative of [
    "ops/mainnet0/run-p2p-live-activation-lease-wall-v1.sh",
    "ops/mainnet0/check-p2p-live-activation-lease-wall-v1.sh",
  ]) {
    const metadata = await lstat(path.resolve(relative));
    assert((metadata.mode & 0o111) !== 0, `${relative} must be executable`);
  }

  const core = await text("src/p2p/live_activation_lease_wall_v1.ts");
  const runner = await text("src/p2p/run_live_activation_lease_wall_v1.ts");
  const proof = await text("scripts/prove_p2p_live_activation_lease_wall_v1.ts");
  const envExample = await text("ops/mainnet0/p2p-live-activation-lease-wall-v1.env.example");
  const launcher = await text("ops/mainnet0/run-p2p-live-activation-lease-wall-v1.sh");
  const health = await text("ops/mainnet0/check-p2p-live-activation-lease-wall-v1.sh");
  const service = await text("ops/mainnet0/void-p2p-live-activation-lease-wall-v1.service.example");
  const workflow = await text(".github/workflows/p2p-live-activation-lease-wall-v1.yml");
  const documentation = await text("docs/architecture/p2p-live-activation-lease-wall-v1.md");
  const runtimeCode = `${core}\n${runner}`;

  mustContain(core, "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1", "core");
  mustContain(core, "consume_permit", "core");
  mustContain(core, "readVoidP2pLiveActivationLeaseSealedSnapshotV1", "core");
  mustContain(core, "verifyVoidP2pLiveActivationLeaseSealedV1", "core");
  mustContain(core, "current_generation_changed", "core");
  mustContain(core, "sealed_file_drift", "core");
  mustContain(core, "local_revocation", "core");
  mustContain(core, "permit_lease_expired", "core");
  mustContain(core, "policy_lease_expired", "core");
  mustContain(core, "startup_binding_mismatch", "core");
  mustContain(core, "child_exited", "core");
  mustContain(core, "automatic_child_restart: false", "core");
  mustContain(core, "policy_rotation_under_existing_permit: false", "core");
  mustContain(core, "runtime_private_policy_or_activation_key_required: false", "core");
  mustContain(core, "money_movement_authority: false", "core");
  mustContain(core, "preserveHeld ? \"held\" : \"stopped\"", "core");
  mustContain(core, "await this.stopChild(`hold:${code}`)", "core");
  mustContain(core, "^[0-9]{40}-[0-9a-f]{64}$", "core");
  assert.equal(
    occurrences(core, 'from "./node_bound_activation_permit_wall_v1.js"'),
    1,
    "core must have one exact activation-permit dependency",
  );
  assert.equal(
    occurrences(core, 'from "./signed_trust_policy_wall_v1.js"'),
    1,
    "core must have one exact signed-policy dependency",
  );

  mustContain(runner, "run_signed_trust_policy_wall_v1.ts", "runner");
  mustNotContain(runner, "run_authenticated_edge_wall_v1.ts", "runner");
  mustContain(runner, "trust_policy_envelope: startup.trust_policy_envelope", "runner");
  mustContain(runner, "trust_root_set: startup.trust_root_set", "runner");
  mustContain(runner, "runtime_profile: startup.runtime_profile", "runner");
  mustNotContain(
    runner.slice(runner.indexOf("async function consumeStartup"), runner.indexOf("async function appendAudit")),
    "readVoidP2pTrustPolicyInputsV1",
    "consumeStartup",
  );
  mustContain(runner, "consumed.sealed_trust_root_set_file", "runner");
  mustContain(runner, "consumed.sealed_policy_envelope_file", "runner");
  mustContain(runner, "deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1", "runner");
  mustContain(runner, "VOID_P2P_EDGE_WALL_PERMISSIONLESS: \"0\"", "runner");
  mustContain(runner, 'name.startsWith("VOID_P2P_ACTIVATION_PERMIT_")', "runner");
  mustContain(runner, 'name.startsWith("VOID_P2P_TRUST_POLICY_")', "runner");
  mustContain(runner, 'name.startsWith("VOID_P2P_LIVE_ACTIVATION_LEASE_")', "runner");
  mustContain(runner, 'name.startsWith("VOID_P2P_EDGE_WALL_")', "runner");
  mustContain(runner, "fsConstants.O_NOFOLLOW", "runner");
  mustContain(runner, "audit log exceeds max bytes", "runner");
  mustContain(runner, "assertVoidP2pLiveActivationLeaseLoopbackHostV1", "runner");
  mustContain(runner, "shell: false", "runner");
  mustNotContain(runner, "shell: true", "runner");

  for (const forbidden of [
    "src/index",
    "native_account_state_store",
    "native_value_transfer",
    "walletconnect",
    "buy_void",
    "economic_activation",
    "eth_sendRawTransaction",
    "sendRawTransaction",
    "broadcastVoid",
    "child_process.exec",
  ]) {
    mustNotContain(runtimeCode, forbidden, "runtime code");
  }

  for (const proofFragment of [
    "sealed-file-drift",
    "current-pointer-change",
    "local-revocation",
    "permit-expiry",
    "certificate-drift",
    "child-crash",
    "startup-binding-mismatch",
    "automatic_child_restart",
    "policy_rotation_under_existing_permit",
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_GREEN",
  ]) {
    mustContain(proof, proofFragment, "runtime proof");
  }

  for (const gate of [
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_ENABLED=0",
    "VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED=0",
    "VOID_P2P_TRUST_POLICY_WALL_ENABLED=0",
    "VOID_P2P_EDGE_WALL_ENABLED=0",
    "VOID_P2P_EDGE_WALL_PERMISSIONLESS=0",
  ]) {
    mustContain(envExample, gate, "environment example");
  }
  mustContain(envExample, "VOID_P2P_ACTIVATION_RUNTIME_PROFILE_FILE=", "environment example");
  mustContain(envExample, "VOID_P2P_ACTIVATION_PERMIT_ENVELOPE_FILE=", "environment example");
  mustContain(envExample, "VOID_P2P_LIVE_ACTIVATION_LEASE_SHUTDOWN_LEAD_MS=", "environment example");
  mustNotContain(envExample, "PRIVATE_KEY_PEM=", "environment example");
  mustNotContain(envExample, "SIGNING_KEY_FILE=", "environment example");

  for (const marker of [
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_DISABLED",
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_ACTIVATION_GATE_DISABLED",
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_TRUST_GATE_DISABLED",
    "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_EDGE_GATE_DISABLED",
  ]) {
    mustContain(launcher, marker, "launcher");
  }
  mustContain(launcher, "set -euo pipefail", "launcher");
  mustContain(launcher, "run_live_activation_lease_wall_v1.ts", "launcher");

  mustContain(health, "127.0.0.1", "health check");
  mustContain(health, "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1", "health check");
  mustContain(health, 'status.state !== "running"', "health check");
  mustContain(health, "one_shot_permit_consumed !== true", "health check");
  mustContain(health, "automatic_child_restart !== false", "health check");
  mustContain(health, "policy_rotation_under_existing_permit !== false", "health check");

  mustContain(service, "NoNewPrivileges=true", "systemd example");
  mustContain(service, "ProtectSystem=strict", "systemd example");
  mustContain(service, "PrivateTmp=true", "systemd example");
  mustContain(service, "CapabilityBoundingSet=", "systemd example");
  mustContain(service, "Restart=no", "systemd example");
  mustContain(service, "Conflicts=void-p2p-authenticated-edge-wall-v1.service", "systemd example");
  mustContain(service, "Conflicts=void-p2p-signed-trust-policy-wall-v1.service", "systemd example");
  mustContain(service, "Conflicts=void-p2p-node-bound-activation-permit-wall-v1.service", "systemd example");
  mustContain(service, "run_live_activation_lease_wall_v1.ts verify", "systemd example");

  for (const command of [
    "prove_p2p_authenticated_edge_wall_v1.ts",
    "prove_p2p_authenticated_edge_wall_guard_v1.ts",
    "prove_p2p_signed_trust_policy_wall_v1.ts",
    "prove_p2p_signed_trust_policy_wall_guard_v1.ts",
    "prove_p2p_node_bound_activation_permit_wall_v1.ts",
    "prove_p2p_node_bound_activation_permit_wall_guard_v1.ts",
    "prove_p2p_live_activation_lease_wall_v1.ts",
    "prove_p2p_live_activation_lease_wall_guard_v1.ts",
    "tools/check_index_size.sh",
    "npm run build",
  ]) {
    mustContain(workflow, command, "workflow");
  }
  mustContain(workflow, 'node-version: "22"', "workflow");

  for (const fragment of [
    "time-of-check/time-of-use",
    "No rotation and no automatic restart",
    "preserves the held state",
    "does not deploy or enable",
    "private key",
  ]) {
    mustContain(documentation, fragment, "architecture document");
  }

  console.log("VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_GUARD_V1_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
