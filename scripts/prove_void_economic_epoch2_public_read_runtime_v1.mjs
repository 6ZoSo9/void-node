#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

import {
  buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-public-read-runtime-evidence-v1.mjs";
import {
  promoteVoidEconomicEpoch2PublicReadRuntimeV1,
} from "../tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const ABSENT_TX =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function waitHttp(url, expected = 200) {
  for (let index = 0; index < 80; index += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === expected) return response;
    } catch (_error) {
      void _error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("endpoint_not_ready:" + url);
}

function spawnNode(file, env) {
  const child = spawn(process.execPath, [file], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  return { child, stderr: () => stderr };
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const publicState = JSON.parse(
  fs.readFileSync(
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
    "utf8",
  ),
);
const token = publicState.accounts.find(
  (row) => String(row.address).toLowerCase() === TOKEN,
);
assert.ok(token);
const tokenCode = String(token.runtime_code_hex).toLowerCase();
const tokenCodeSha = crypto
  .createHash("sha256")
  .update(Buffer.from(tokenCode.slice(2), "hex"))
  .digest("hex");

const rpcServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  let result;
  switch (request.method) {
    case "eth_chainId":
      result = "0x802";
      break;
    case "eth_getBlockByNumber":
      assert.deepEqual(request.params, ["0x0", false]);
      result = { number: "0x0", hash: BLOCK_HASH, stateRoot: STATE_ROOT };
      break;
    case "eth_getBalance":
      assert.deepEqual(request.params, [TOKEN, "0x0"]);
      result = "0x0";
      break;
    case "eth_getCode":
      assert.deepEqual(request.params, [TOKEN, "0x0"]);
      result = tokenCode;
      break;
    case "eth_getTransactionReceipt":
      assert.deepEqual(request.params, [ABSENT_TX]);
      result = null;
      break;
    default:
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32601, message: "method not found" },
      }));
      return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
});

const rpcPort = await listen(rpcServer);
const readPort = await freePort();
const compositionPort = await freePort();
let runtime = null;
let composition = null;

try {
  runtime = spawnNode(
    "ops/public/void-economic-epoch2-public-read-runtime-v1.mjs",
    {
      VOID_EPOCH2_PUBLIC_READ_HOST: "127.0.0.1",
      VOID_EPOCH2_PUBLIC_READ_PORT: String(readPort),
      VOID_EPOCH2_SUCCESSOR_RPC_ENDPOINT:
        "http://127.0.0.1:" + String(rpcPort) + "/",
    },
  );

  const readBase = "http://127.0.0.1:" + String(readPort);
  const statusPath =
    "/public-node/economic/epoch2/read-status-v1.json";
  await waitHttp(readBase + statusPath);

  composition = spawnNode(
    "ops/public/void-public-app-composition-gateway-v1.mjs",
    {
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM:
        "http://127.0.0.1:" + String(rpcPort),
      VOID_NODE_UPSTREAM:
        "http://127.0.0.1:" + String(rpcPort),
      VOID_EPOCH2_PUBLIC_READ_UPSTREAM: readBase + "/",
      VOID_PUBLIC_EXPECTED_PEERS: "0",
      VOID_PUBLIC_NODE_LABEL: "CI",
      VOID_PUBLIC_NETWORK_NAME: "Mainnet-0",
      VOID_TXROOT_QUARANTINED: "1",
    },
  );

  const base = "http://127.0.0.1:" + String(compositionPort);
  await waitHttp(base + statusPath);

  const statusResponse = await fetch(base + statusPath, {
    headers: { Origin: "https://voidchain.org" },
  });
  assert.equal(statusResponse.status, 200);
  assert.equal(
    statusResponse.headers.get("access-control-allow-origin"),
    "https://voidchain.org",
  );
  const status = await statusResponse.json();
  assert.equal(status.ok, true);
  assert.equal(
    status.marker,
    "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1",
  );
  assert.equal(status.block_hash, BLOCK_HASH);
  assert.equal(status.state_root, STATE_ROOT);
  assert.equal(status.production_successor_rpc_endpoint_selected, true);
  assert.equal(status.live_balance_receipt_code_gateway_ready, true);
  assert.equal(status.raw_public_rpc_allowed, false);
  assert.equal(status.authoritative_chain2050_write, false);

  const balance = await fetch(
    base +
      "/public-node/economic/epoch2/balance-v1?address=" +
      TOKEN,
  );
  assert.equal(balance.status, 200);
  const balanceBody = await balance.json();
  assert.equal(balanceBody.result, "0x0");
  assert.equal(balanceBody.block_hash, BLOCK_HASH);
  assert.equal(balanceBody.state_root, STATE_ROOT);
  assert.equal(balanceBody.exact_block_identity_revalidated, true);

  const code = await fetch(
    base +
      "/public-node/economic/epoch2/code-v1?address=" +
      TOKEN,
  );
  assert.equal(code.status, 200);
  const codeBody = await code.json();
  assert.equal(codeBody.result, tokenCode);
  assert.equal(codeBody.code_sha256, tokenCodeSha);
  assert.equal(codeBody.exact_block_identity_revalidated, true);

  const receipt = await fetch(
    base +
      "/public-node/economic/epoch2/receipt-v1?tx=" +
      ABSENT_TX,
  );
  assert.equal(receipt.status, 404);
  const receiptBody = await receipt.json();
  assert.equal(receiptBody.ok, true);
  assert.equal(receiptBody.receipt_found, false);
  assert.equal(receiptBody.live_receipt_lookup_transport_verified, true);
  assert.equal(receiptBody.successful_receipt_semantics_source_proven, true);
  assert.equal(receiptBody.block_hash, BLOCK_HASH);
  assert.equal(receiptBody.state_root, STATE_ROOT);

  const invalid = await fetch(
    base + "/public-node/economic/epoch2/balance-v1?address=bad",
  );
  assert.equal(invalid.status, 400);

  const rawPost = await fetch(base + "/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendRawTransaction",
      params: ["0x00"],
    }),
  });
  assert.equal(rawPost.status, 405);
} finally {
  await stop(composition?.child);
  await stop(runtime?.child);
  await new Promise((resolve) => rpcServer.close(resolve));
}

const runtimeSource = fs.readFileSync(
  "ops/public/void-economic-epoch2-public-read-runtime-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "debug_",
  "admin_",
]) {
  assert.equal(runtimeSource.includes(forbidden), false, forbidden);
}

const compositionSource = fs.readFileSync(
  "ops/public/void-public-app-composition-gateway-v1.mjs",
  "utf8",
);
for (const required of [
  "VOID_EPOCH2_PUBLIC_READ_UPSTREAM",
  "EPOCH2_PUBLIC_READ_PATHS",
  "epoch2PublicReadQueryAllowedV1",
  "epoch2_public_economic_read_raw_rpc_proxy: false",
]) {
  assert.ok(compositionSource.includes(required), required);
}

const installer = fs.readFileSync(
  "ops/mainnet0/install-void-economic-epoch2-public-read-runtime-v1.sh",
  "utf8",
);
for (const required of [
  "--p2p-enabled=false",
  "--discovery-enabled=false",
  "127.0.0.1:$RPC_PORT:8545",
  'START_SERVICES="${START_SERVICES:-0}"',
  'RESTART_COMPOSITION="${RESTART_COMPOSITION:-0}"',
  "COMPOSITION_UNIT_TEMPLATE=",
  "composition_installed_by_this_run=0",
  'install -m 0644 "$COMPOSITION_UNIT_TEMPLATE" "$COMPOSITION_UNIT_PATH"',
  'systemctl --user enable "$REPLICA_UNIT" "$READ_UNIT" "$COMPOSITION_UNIT"',
  "VOID_EPOCH2_PUBLIC_READ_UPSTREAM=http://127.0.0.1:$READ_PORT/",
  "Environment=VOID_PUBLIC_NODE_LABEL=Precision public seed",
  "composition_runtime_not_ready",
]) {
  assert.ok(installer.includes(required), required);
}
for (const forbidden of [
  "--p2p-enabled=true",
  "--cap-add=SETUID",
  "--cap-add=SETGID",
  "--user root",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
]) {
  assert.equal(installer.includes(forbidden), false, forbidden);
}

const replicaUnitStart = installer.indexOf(
  'cat >"$tmp/$REPLICA_UNIT" <<UNIT',
);
const readUnitStart = installer.indexOf(
  'cat >"$tmp/$READ_UNIT" <<UNIT',
);
assert.ok(replicaUnitStart >= 0, "replica unit template missing");
assert.ok(readUnitStart > replicaUnitStart, "read unit template ordering invalid");
const replicaUnitSource = installer.slice(replicaUnitStart, readUnitStart);
const readUnitSource = installer.slice(readUnitStart);
for (const required of [
  "Environment=DOCKER_HOST=$docker_host",
  "NoNewPrivileges=true",
  "RestrictSUIDSGID=true",
  "--user $besu_uid:$besu_gid",
  "--entrypoint /opt/besu/bin/besu",
  "--cap-drop=ALL",
  "--security-opt=no-new-privileges:true",
  "--read-only",
  "--tmpfs /tmp:rw,exec,nosuid,nodev,size=128m,mode=1777",
  "--tmpfs /var/lib/besu:rw,nosuid,nodev,size=512m,uid=$besu_uid,gid=$besu_gid,mode=700",
  "--p2p-enabled=false",
  "--discovery-enabled=false",
  "127.0.0.1:$RPC_PORT:8545",
]) {
  assert.ok(replicaUnitSource.includes(required), required);
}
for (const forbidden of [
  "ProtectHome",
  "PrivateTmp",
  "ProtectSystem",
  "ReadOnlyPaths",
]) {
  assert.equal(
    new RegExp("(^|\\n)" + forbidden + "=").test(replicaUnitSource),
    false,
    "rootless Docker wrapper must not create a mount namespace: " + forbidden,
  );
}
for (const required of [
  "ProtectHome=read-only",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "NoNewPrivileges=true",
  "ReadOnlyPaths=$ROOT",
]) {
  assert.ok(readUnitSource.includes(required), required);
}
for (const required of [
  '"$docker_bin" context show',
  '"$docker_bin" context inspect',
  "local_unix_docker_host_required",
  "docker_socket_missing",
  "docker_runtime_unreachable",
  "-lc 'id -u besu'",
  "-lc 'id -g besu'",
  'test "$besu_uid" = "1000"',
  'test "$besu_gid" = "1000"',
]) {
  assert.ok(installer.includes(required), required);
}

const loopback = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-public-read-loopback-transport-v1.json",
    "utf8",
  ),
);
const migration = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

const facts = {
  marker: "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_FACTS_V1",
  version: 1,
  hostname: "zoso-Precision-Tower-7810",
  source_commit: "1".repeat(40),
  replica_service_identity:
    "void-economic-epoch2-successor-read-replica-v1.service",
  replica_service_active: true,
  replica_main_pid: 111,
  read_service_identity:
    "void-economic-epoch2-public-read-runtime-v1.service",
  read_service_active: true,
  read_main_pid: 222,
  composition_service_identity:
    "void-public-app-composition-gateway-v1.service",
  composition_service_active: true,
  composition_main_pid: 333,
  replica_unit_sha256: "2".repeat(64),
  read_unit_sha256: "3".repeat(64),
  composition_dropin_sha256: "4".repeat(64),
  genesis_file_sha256:
    "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941",
  rpc_endpoint: "http://127.0.0.1:18552/",
  read_base: "http://127.0.0.1:4124",
  composition_base: "http://127.0.0.1:8082",
  public_base: "https://seed.nullfeed.org",
  block_number: "0x0",
  block_hash: BLOCK_HASH,
  state_root: STATE_ROOT,
  token_address: TOKEN,
  live_balance_result: "0x0",
  live_balance_read_verified: true,
  live_code_sha256: tokenCodeSha,
  live_code_nonempty: true,
  live_code_read_verified: true,
  absent_receipt_transaction_hash: ABSENT_TX,
  live_receipt_lookup_transport_verified: true,
  live_receipt_found: false,
  successful_receipt_semantics_source_proven: true,
  local_status_route_accepted: true,
  local_balance_route_accepted: true,
  local_code_route_accepted: true,
  local_receipt_route_accepted: true,
  composition_status_route_accepted: true,
  composition_balance_route_accepted: true,
  composition_code_route_accepted: true,
  composition_receipt_route_accepted: true,
  external_status_route_accepted: true,
  external_balance_route_accepted: true,
  external_code_route_accepted: true,
  external_receipt_route_accepted: true,
  external_receipt_http_status: 404,
  voidchain_org_cors_verified: true,
  raw_public_rpc_allowed: false,
  production_successor_rpc_endpoint_selected: true,
  live_balance_receipt_code_gateway_ready: true,
  runtime_route_active: true,
  public_gateway_active: true,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  wallet_access: false,
  private_key_access: false,
  credential_content_access: false,
  validator_mutation: false,
  token_movement: false,
  funds_movement: false,
  migration_authorized: false,
  public_activation_authorized: false,
};

const evidence =
  buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1({
    facts,
    observedAtUtc: "2030-01-01T00:00:00Z",
    validUntilUtc: "2030-01-01T00:30:00Z",
    hostName: "zoso-Precision-Tower-7810",
  });
const evidenceBytes = Buffer.from(
  JSON.stringify(evidence, null, 2) + "\n",
  "utf8",
);
const evidenceSha = crypto
  .createHash("sha256")
  .update(evidenceBytes)
  .digest("hex");

const promoted = promoteVoidEconomicEpoch2PublicReadRuntimeV1({
  evidenceBytes,
  expectedFileSha256: evidenceSha,
  expectedEvidenceId: evidence.evidence_id,
  evaluationTimeUtc: "2030-01-01T00:10:00Z",
  loopbackPolicy: loopback,
  migrationCandidate: migration,
});

assert.equal(
  promoted.promotion.gates.production_successor_rpc_endpoint_selected,
  true,
);
assert.equal(
  promoted.promotion.gates.public_balance_receipt_code_verification_ready,
  true,
);
assert.equal(promoted.promotion.gates.runtime_route_active, true);
assert.equal(promoted.promotion.gates.public_gateway_active, true);
assert.equal(
  promoted.promotion.gates.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(promoted.promotion.gates.authoritative_chain2050_write, false);
assert.equal(promoted.promotion.gates.migration_authorized, false);
assert.equal(promoted.promotion.gates.public_activation_authorized, false);
assert.equal(promoted.promotion.gates.funds_movement_authorized, false);

const classified = classifyVoidEconomicEvmSuccessorMigrationV1(
  promoted.updated_migration_candidate,
);
assert.equal(classified.ok, false);
assert.equal(classified.status, "HOLD");
assert.equal(
  classified.missing_gates.includes(
    "public_economic_verification_path_required",
  ),
  false,
);
assert.equal(
  classified.missing_gates.includes(
    "successor_state_root_public_void_anchor_required",
  ),
  true,
);
assert.deepEqual(
  classified.missing_gates,
  ["successor_state_root_public_void_anchor_required"],
);

{
  const bad = structuredClone(facts);
  bad.external_code_route_accepted = false;
  assert.throws(
    () =>
      buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1({
        facts: bad,
        observedAtUtc: "2030-01-01T00:00:00Z",
        validUntilUtc: "2030-01-01T00:30:00Z",
        hostName: "zoso-Precision-Tower-7810",
      }),
    /public_read_runtime_facts_invalid/,
  );
}

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1_PROOF_GREEN");
console.log("production_successor_rpc_endpoint_selected=true");
console.log("live_balance_receipt_code_gateway_ready=true");
console.log("public_balance_receipt_code_verification_ready=true");
console.log("public_economic_verification_path_remaining=false");
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("migration_missing_gate_count=1");