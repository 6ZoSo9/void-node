// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

function findRepositoryRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.cwd(),
    path.resolve(here, ".."),
    path.resolve(here, "../.."),
  ];
  for (const candidate of candidates) {
    if (
      fs.existsSync(
        path.join(candidate, "src/p2p/authenticated_edge_wall_v1.ts"),
      )
    ) {
      return candidate;
    }
  }
  throw new Error("could not resolve repository root for wall guard");
}

const root = findRepositoryRoot();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireAll(label: string, text: string, needles: readonly string[]): void {
  for (const needle of needles) {
    assert(
      text.includes(needle),
      `${label} is missing required wall boundary or marker: ${needle}`,
    );
  }
}

const moduleText = read("src/p2p/authenticated_edge_wall_v1.ts");
const cliText = read("src/p2p/run_authenticated_edge_wall_v1.ts");
const proofText = read("scripts/prove_p2p_authenticated_edge_wall_v1.ts");
const provisionText = read(
  "ops/mainnet0/provision-p2p-authenticated-edge-wall-v1.sh",
);
const runText = read("ops/mainnet0/run-p2p-authenticated-edge-wall-v1.sh");
const envText = read("ops/mainnet0/p2p-authenticated-edge-wall-v1.env.example");
const serviceText = read(
  "ops/mainnet0/void-p2p-authenticated-edge-wall-v1.service.example",
);
const architectureText = read(
  "docs/architecture/p2p-authenticated-edge-wall-v1.md",
);
const workflowText = read(
  ".github/workflows/p2p-authenticated-edge-wall-v1.yml",
);

requireAll("wall module", moduleText, [
  "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1",
  'minVersion: "TLSv1.3"',
  'maxVersion: "TLSv1.3"',
  "requestCert: true",
  "rejectUnauthorized: false",
  "exportKeyingMaterial",
  "EXPORTER-VOID-P2P-AUTHENTICATED-EDGE-WALL-V1",
  "VOID_P2P_EDGE_CHALLENGE_V1",
  "VOID_P2P_EDGE_AUTH_V1",
  "VOID_P2P_EDGE_ACCEPT_V1",
  "authentication replay detected",
  "duplicate authenticated peer session",
  "fail-closed admission requires allow_node_ids",
  "backend_host must be loopback-only in wall v1",
  "status_host must be loopback-only in wall v1",
  "peer node id does not match pinned target identity",
  "peer node id is not allowlisted",
  "peer node id is denied",
  "network id mismatch",
  "TLS channel binding mismatch",
  "max_pending_handshakes",
  "max_connections_per_ip",
  "quarantine_threshold",
  "ledger_mutation_authority: false",
  "validator_mutation_authority: false",
  "wallet_or_signer_authority: false",
]);

requireAll("wall CLI", cliText, [
  'env("VOID_P2P_EDGE_WALL_ENABLED") !== "1"',
  "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_DISABLED",
  "VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS",
  "VOID_P2P_EDGE_WALL_DENY_NODE_IDS",
  "VOID_P2P_EDGE_WALL_PERMISSIONLESS",
  "VOID_P2P_EDGE_WALL_PEERS_JSON",
  "expected_node_id",
]);

requireAll("runtime proof", proofText, [
  "proveAuthenticatedBridge",
  "proveUnauthorizedPeerRejected",
  "proveWrongNetworkRejected",
  "proveFailClosedConfiguration",
  "HELLO_FROM_BACKEND_A",
  "HELLO_FROM_BACKEND_B",
  "serverBackend.connections.value, 0",
  "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_GREEN",
]);

requireAll("identity provisioner", provisionText, [
  "openssl genpkey -algorithm ED25519",
  "refusing to overwrite existing identity material",
  "private_key_printed=false",
  "private_key_exported=false",
  "VOID_P2P_AUTHENTICATED_EDGE_WALL_IDENTITY_V1_PROVISIONED",
]);

requireAll("run wrapper", runText, [
  'VOID_P2P_EDGE_WALL_ENABLED:-0',
  "exit 78",
  "run_authenticated_edge_wall_v1.ts",
]);

requireAll("environment example", envText, [
  "VOID_P2P_EDGE_WALL_ENABLED=0",
  "VOID_P2P_EDGE_WALL_PERMISSIONLESS=0",
  "VOID_P2P_EDGE_WALL_BACKEND_HOST=127.0.0.1",
  "VOID_P2P_EDGE_WALL_STATUS_HOST=127.0.0.1",
]);

requireAll("systemd example", serviceText, [
  "NoNewPrivileges=true",
  "ProtectSystem=strict",
  "MemoryDenyWriteExecute=true",
  "RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX",
]);

requireAll("architecture", architectureText, [
  "sidecar wall",
  "does not modify `src/index.ts`",
  "TLS 1.3",
  "Ed25519",
  "TLS exporter",
  "fail closed",
  "No ledger authority",
  "No validator authority",
  "No wallet or signer authority",
  "disabled by default",
]);

requireAll("workflow", workflowText, [
  "prove_p2p_authenticated_edge_wall_v1.ts",
  "prove_p2p_authenticated_edge_wall_guard_v1.ts",
  "tools/check_index_size.sh",
  "npm run build",
]);

const sourceSurface = `${moduleText}\n${cliText}`;
for (const forbidden of [
  "ethers",
  "Wallet",
  "eth_sendRawTransaction",
  "eth_send_raw_transaction",
  "validator_register",
  "account_state_store",
  "native_value_transfer",
  "buy-void",
  "wc-public-earning",
  "process.env.NODE_PRIVKEY_PATH",
  "src/index.ts",
]) {
  assert(
    !sourceSurface.includes(forbidden),
    `wall source crossed a forbidden authority or lane boundary: ${forbidden}`,
  );
}

for (const imported of moduleText.matchAll(/from\s+["']([^"']+)["']/g)) {
  assert(
    imported[1].startsWith("node:"),
    `wall module must remain dependency-free; found import ${imported[1]}`,
  );
}

console.log("VOID_P2P_AUTHENTICATED_EDGE_WALL_GUARD_V1_GREEN");
