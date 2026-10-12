// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relative: string): Promise<string> {
  return readFile(path.join(repositoryRoot, relative), "utf8");
}

function includesAll(text: string, needles: readonly string[], label: string): void {
  for (const needle of needles) {
    assert(text.includes(needle), `${label} is missing required boundary: ${needle}`);
  }
}

async function main(): Promise<void> {
  const [core, runner, wrapper, provisioner, environment, service, workflow, docs, index] =
    await Promise.all([
      read("src/p2p/signed_trust_policy_wall_v1.ts"),
      read("src/p2p/run_signed_trust_policy_wall_v1.ts"),
      read("ops/mainnet0/run-p2p-signed-trust-policy-wall-v1.sh"),
      read("ops/mainnet0/provision-p2p-trust-policy-authority-v1.sh"),
      read("ops/mainnet0/p2p-signed-trust-policy-wall-v1.env.example"),
      read("ops/mainnet0/void-p2p-signed-trust-policy-wall-v1.service.example"),
      read(".github/workflows/p2p-signed-trust-policy-wall-v1.yml"),
      read("docs/architecture/p2p-signed-trust-policy-wall-v1.md"),
      read("src/index.ts"),
    ]);

  includesAll(
    core,
    [
      "VOID_P2P_SIGNED_TRUST_POLICY_V1\\n",
      "void-p2p-trust-root-set-v1",
      "void-p2p-signed-trust-policy-envelope-v1",
      "threshold_not_met",
      "unknown_signer",
      "root_network_mismatch",
      "policy_network_mismatch",
      "fail_closed_empty_allowlist",
      "VOID_P2P_EDGE_WALL_PERMISSIONLESS: \"0\"",
      "policy_rollback",
      "epoch_reuse",
      "broken_policy_chain",
      "invalid_genesis_epoch",
      "activation.lock",
      'open(lockPath, "wx", 0o600)',
      "rename(temporaryLink, path.join(stateDir, \"current\"))",
      "fsyncDirectory(stateDir)",
      "current pointer must be a symbolic link",
    ],
    "trust-policy core",
  );

  includesAll(
    runner,
    [
      'env("VOID_P2P_TRUST_POLICY_WALL_ENABLED") !== "1"',
      'env("VOID_P2P_EDGE_WALL_ENABLED") !== "1"',
      "...activated.verified.derived_edge_environment",
      'VOID_P2P_EDGE_WALL_ENABLED: "1"',
      "run_authenticated_edge_wall_v1.ts",
      "spawn(tsx, [edgeRunner]",
      'shell: false',
      "VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING",
      "VOID_P2P_TRUST_POLICY_ACTIVATION_ENABLED",
    ],
    "trust-policy runner",
  );

  assert(!/from\s+["']node:(?:http|https|tls|dgram)["']/.test(core), "core must not open a network surface");
  assert(!/\b(?:createServer|listen|connect)\s*\(/.test(core), "core must not create listeners or sockets");
  assert(!/\bfetch\s*\(/.test(core), "core must not fetch policy from a network");
  assert(!/\b(?:exec|execFile)\s*\(/.test(runner), "runner must not invoke a shell command executor");

  const authorityCorpus = `${core}\n${runner}`.toLowerCase();
  for (const forbidden of [
    "eth_sendrawtransaction",
    "native_account_state",
    "native-value-transfer",
    "native_block_execution",
    "buy_void",
    "buy-void",
    "wc/public",
    "validator_submission",
    "validator-recovery",
    "wallet_private_key",
    "transaction_signer",
  ]) {
    assert(!authorityCorpus.includes(forbidden), `forbidden authority reference present: ${forbidden}`);
  }

  includesAll(
    wrapper,
    [
      'VOID_P2P_TRUST_POLICY_WALL_ENABLED:-0',
      'VOID_P2P_EDGE_WALL_ENABLED:-0',
      "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_DISABLED",
      "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_EDGE_GATE_DISABLED",
      "exit 78",
      "exec \"$TSX\" src/p2p/run_signed_trust_policy_wall_v1.ts serve",
    ],
    "disabled launcher",
  );

  includesAll(
    provisioner,
    [
      "refusing to overwrite existing trust authority material",
      "openssl genpkey -algorithm ED25519",
      "void-p2p-trust-root-set-v1",
      "flag: \"wx\"",
      "OFFLINE_ONLY_DO_NOT_COPY_PRIVATE_KEY_TO_RUNTIME_NODE",
    ],
    "offline authority provisioner",
  );

  assert(/^VOID_P2P_TRUST_POLICY_WALL_ENABLED=0$/m.test(environment));
  assert(/^VOID_P2P_EDGE_WALL_ENABLED=0$/m.test(environment));
  assert(!/^VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS=/m.test(environment));
  assert(!/^VOID_P2P_EDGE_WALL_DENY_NODE_IDS=/m.test(environment));
  assert(!/^VOID_P2P_EDGE_WALL_PEERS_JSON=/m.test(environment));
  assert(!/^VOID_P2P_EDGE_WALL_PERMISSIONLESS=/m.test(environment));
  assert(!/SIGNING_KEY_FILE=/.test(environment), "runtime environment must not name an offline signing key");

  includesAll(
    service,
    [
      "Conflicts=void-p2p-authenticated-edge-wall-v1.service",
      "NoNewPrivileges=true",
      "ProtectSystem=strict",
      "ProtectHome=read-only",
      "ReadOnlyPaths=/etc/void/p2p-trust-policy-wall-v1",
      "CapabilityBoundingSet=",
      "MemoryDenyWriteExecute=true",
      "RestartPreventExitStatus=78",
    ],
    "systemd example",
  );

  includesAll(
    workflow,
    [
      "Prove signed P2P trust policy wall runtime",
      "prove_p2p_signed_trust_policy_wall_v1.ts",
      "prove_p2p_signed_trust_policy_wall_guard_v1.ts",
      "tools/check_index_size.sh",
      "npm run build",
    ],
    "workflow",
  );

  includesAll(
    docs,
    [
      "threshold-signed",
      "Anti-rollback and atomic activation",
      "No ledger authority",
      "No deployment authority",
      "VOID_P2P_EDGE_WALL_PERMISSIONLESS=0",
      "previous_policy_sha256",
    ],
    "architecture document",
  );

  assert(!index.includes("P2P_SIGNED_TRUST_POLICY_WALL_V1"));
  assert(!index.includes("signed_trust_policy_wall_v1"));
  assert(!index.includes("run_signed_trust_policy_wall_v1"));

  console.log("VOID_P2P_SIGNED_TRUST_POLICY_WALL_GUARD_V1_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
