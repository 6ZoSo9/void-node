// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const GREEN = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_GUARD_V1_GREEN";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function text(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), "utf8");
}

function hasAll(source: string, fragments: readonly string[], label: string): void {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} is missing required boundary: ${fragment}`);
  }
}

function hasNone(source: string, fragments: readonly string[], label: string): void {
  for (const fragment of fragments) {
    assert(!source.includes(fragment), `${label} contains forbidden authority: ${fragment}`);
  }
}

async function main(): Promise<void> {
  const current = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(current), "..");
  const [core, runner, provisioner, launcher, service, environment, workflow, architecture] = await Promise.all([
    text(root, "src/p2p/node_bound_activation_permit_wall_v1.ts"),
    text(root, "src/p2p/run_node_bound_activation_permit_wall_v1.ts"),
    text(root, "ops/mainnet0/provision-p2p-activation-permit-authority-v1.sh"),
    text(root, "ops/mainnet0/run-p2p-node-bound-activation-permit-wall-v1.sh"),
    text(root, "ops/mainnet0/void-p2p-node-bound-activation-permit-wall-v1.service.example"),
    text(root, "ops/mainnet0/p2p-node-bound-activation-permit-wall-v1.env.example"),
    text(root, ".github/workflows/p2p-node-bound-activation-permit-wall-v1.yml"),
    text(root, "docs/architecture/p2p-node-bound-activation-permit-wall-v1.md"),
  ]);

  hasAll(core, [
    "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1",
    "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_V1\\n",
    "expected_edge_node_id",
    "expected_policy_sha256",
    "expected_policy_envelope_sha256",
    "expected_trust_root_set_sha256",
    "expected_runtime_profile_sha256",
    "activation_permit_state_dir",
    "trust_policy_state_dir",
    "wrong_state_directory",
    "permit_sequence_gap",
    "wrong_predecessor",
    "permit_replay",
    "activation_in_progress",
    "open(lockFile, \"wx\", 0o600)",
    "current activation-permit pointer escapes generations",
    "must be a real directory, not a symbolic link",
    "sealed_policy_envelope_file",
    "trust-root-set.json",
    "runtime-profile.json",
    "consumed.ndjson",
  ], "activation-permit core");
  hasNone(core, [
    "createServer(",
    "createConnection(",
    "fetch(",
    "node:http",
    "node:https",
    "node:tls",
    "child_process",
    "eth_sendRawTransaction",
    "eth_send_raw_transaction",
    "applyVoidNative",
    "broadcastVoid",
    "walletConnect",
  ], "activation-permit core");

  hasAll(runner, [
    "VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED",
    "VOID_P2P_TRUST_POLICY_WALL_ENABLED",
    "VOID_P2P_EDGE_WALL_ENABLED",
    "edgeNodeIdFromCertificate",
    "sealed_policy_envelope_file",
    "VOID_P2P_TRUST_POLICY_ROOT_SET_FILE",
    "VOID_P2P_TRUST_POLICY_ENVELOPE_FILE",
    "VOID_P2P_TRUST_POLICY_STATE_DIR",
    "run_signed_trust_policy_wall_v1.ts",
    "shell: false",
    "VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING: \"0\"",
    "delete output[name]",
  ], "activation-permit runner");
  hasNone(runner, [
    "createServer(",
    "fetch(",
    "node:http",
    "node:https",
    "eth_sendRawTransaction",
    "eth_send_raw_transaction",
    "applyVoidNative",
    "broadcastVoid",
  ], "activation-permit runner");
  assert(
    !runner.includes("loadVoidP2pAuthenticatedEdgeIdentityV1"),
    "permit verification must not read the edge private key",
  );
  assert(
    runner.indexOf("consumeLoaded(loaded)") < runner.indexOf("spawn(tsx"),
    "permit must be consumed before the trust-policy supervisor is spawned",
  );

  hasAll(provisioner, [
    "umask 077",
    "openssl genpkey -algorithm ED25519",
    "refusing to overwrite existing activation-permit authority material",
    "OFFLINE_ONLY_DO_NOT_COPY_PRIVATE_KEY_TO_RUNTIME_NODE",
  ], "authority provisioner");
  hasNone(provisioner, ["curl ", "wget ", "ssh ", "scp "], "authority provisioner");

  hasAll(launcher, [
    "VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED",
    "VOID_P2P_TRUST_POLICY_WALL_ENABLED",
    "VOID_P2P_EDGE_WALL_ENABLED",
    "exit 78",
    "run_node_bound_activation_permit_wall_v1.ts serve",
  ], "launcher");

  hasAll(service, [
    "Conflicts=void-p2p-signed-trust-policy-wall-v1.service void-p2p-authenticated-edge-wall-v1.service",
    "NoNewPrivileges=true",
    "ProtectSystem=strict",
    "PrivateDevices=true",
    "CapabilityBoundingSet=",
    "MemoryDenyWriteExecute=true",
    "Restart=no",
  ], "service example");

  hasAll(environment, [
    "VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED=0",
    "VOID_P2P_TRUST_POLICY_WALL_ENABLED=0",
    "VOID_P2P_EDGE_WALL_ENABLED=0",
    "VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_ENABLED=0",
    "VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING=0",
    "VOID_P2P_ACTIVATION_PERMIT_OFFLINE_ROOT_SET=0",
    "VOID_P2P_ACTIVATION_PERMIT_PROFILE_GENERATION=0",
  ], "environment example");

  hasAll(workflow, [
    "prove_p2p_authenticated_edge_wall_v1.ts",
    "prove_p2p_authenticated_edge_wall_guard_v1.ts",
    "prove_p2p_signed_trust_policy_wall_v1.ts",
    "prove_p2p_signed_trust_policy_wall_guard_v1.ts",
    "prove_p2p_node_bound_activation_permit_wall_v1.ts",
    "prove_p2p_node_bound_activation_permit_wall_guard_v1.ts",
    "tools/check_index_size.sh",
    "npm run build",
  ], "workflow");

  hasAll(architecture, [
    "membership authority",
    "activation authority",
    "one-shot",
    "fresh successor permit",
    "does not deploy",
    "does not enable",
    "does not move money",
  ], "architecture document");

  const combinedSource = `${core}\n${runner}`;
  hasNone(combinedSource, [
    "ledger mutation",
    "validator mutation",
    "transaction signer",
    "money movement authority",
  ], "source authority boundary");

  console.log(GREEN);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
