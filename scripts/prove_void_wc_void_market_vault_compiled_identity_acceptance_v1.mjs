#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { keccak256 } from "ethers";
import { canonicalJson } from "../tools/void-wc-void-market-vault-compiler-identity-v1.mjs";

import {
  EXPECTED,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1,
  verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1,
} from "../tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";

const ROOT = process.cwd();
const CONTRACT_PATH =
  "contracts/mainnet/WCVoidMarketVaultV2.sol";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const packetBytes = fs.readFileSync(
  path.join(ROOT, EXPECTED.packet_path),
);
assert.equal(packetBytes.length, EXPECTED.packet_json_bytes);
assert.equal(sha256(packetBytes), EXPECTED.packet_json_sha256);

const packet = JSON.parse(packetBytes.toString("utf8"));
assert.equal(packet.packet_id, EXPECTED.packet_id);
assert.equal(
  packet.accepted_identity.identity_id,
  EXPECTED.identity_id,
);
assert.equal(
  packet.accepted_identity.identity_json_sha256,
  EXPECTED.identity_json_sha256,
);
assert.equal(
  packet.accepted_identity.identity_json_bytes,
  EXPECTED.identity_json_bytes,
);

const contractBytes = fs.readFileSync(
  path.join(ROOT, CONTRACT_PATH),
);
assert.equal(contractBytes.length, EXPECTED.contract_source_bytes);
assert.equal(sha256(contractBytes), EXPECTED.contract_source_sha256);

const creationBytesActual = Buffer.from(
  String(packet?.artifacts?.creation_bytecode_hex || "").replace(/^0x/, ""),
  "hex",
);
const runtimeBytesActual = Buffer.from(
  String(packet?.artifacts?.runtime_template_hex || "").replace(/^0x/, ""),
  "hex",
);
console.log("diagnostic_creation_bytecode_bytes=" + creationBytesActual.length);
console.log("diagnostic_creation_bytecode_sha256=" + sha256(creationBytesActual));
console.log(
  "diagnostic_creation_bytecode_keccak256=" +
    keccak256("0x" + creationBytesActual.toString("hex")),
);
console.log("diagnostic_runtime_template_bytes=" + runtimeBytesActual.length);
console.log("diagnostic_runtime_template_sha256=" + sha256(runtimeBytesActual));
console.log(
  "diagnostic_runtime_template_keccak256=" +
    keccak256("0x" + runtimeBytesActual.toString("hex")),
);
console.log(
  "diagnostic_immutable_layout_sha256=" +
    sha256(
      Buffer.from(
        JSON.stringify(packet?.artifacts?.immutable_layout ?? {}),
        "utf8",
      ),
    ),
);

const rotatedPacket = structuredClone(packet);
rotatedPacket.artifacts.creation_bytecode_bytes = creationBytesActual.length;
rotatedPacket.artifacts.creation_bytecode_sha256 = sha256(creationBytesActual);
rotatedPacket.artifacts.creation_bytecode_keccak256 =
  keccak256("0x" + creationBytesActual.toString("hex"));
rotatedPacket.artifacts.runtime_template_bytes = runtimeBytesActual.length;
rotatedPacket.artifacts.runtime_template_sha256 = sha256(runtimeBytesActual);
rotatedPacket.artifacts.runtime_template_keccak256 =
  keccak256("0x" + runtimeBytesActual.toString("hex"));
rotatedPacket.artifacts.immutable_layout_sha256 = sha256(
  Buffer.from(canonicalJson(rotatedPacket.artifacts.immutable_layout), "utf8"),
);
const { packet_id: _rotatedOldId, ...rotatedBody } = rotatedPacket;
rotatedPacket.packet_id =
  "voidwcvcia1_" +
  sha256(Buffer.from(canonicalJson(rotatedBody), "utf8"));
const rotatedBytes = Buffer.from(
  JSON.stringify(rotatedPacket, null, 2) + "\n",
  "utf8",
);
console.log("diagnostic_rotated_packet_id=" + rotatedPacket.packet_id);
console.log("diagnostic_rotated_packet_json_bytes=" + rotatedBytes.length);
console.log("diagnostic_rotated_packet_json_sha256=" + sha256(rotatedBytes));
console.log(
  "diagnostic_rotated_immutable_layout_sha256=" +
    rotatedPacket.artifacts.immutable_layout_sha256,
);

const decision =
  verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(packet);
if (decision.ok === false) {
  console.error("compiled_identity_acceptance_hold=" + JSON.stringify(decision));
}
assert.equal(decision.ok, true);
if (decision.ok === false) throw new Error(decision.reason);

assert.equal(
  decision.status,
  "compiled_identity_accepted_held_on_chain2050_vault_deployment_attestation",
);
assert.equal(
  decision.marker,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1,
);
assert.equal(decision.packet_id, EXPECTED.packet_id);
assert.equal(
  decision.packet_json_sha256,
  EXPECTED.packet_json_sha256,
);
assert.equal(decision.packet_json_bytes, EXPECTED.packet_json_bytes);
assert.equal(decision.identity_id, EXPECTED.identity_id);
assert.equal(
  decision.creation_bytecode_keccak256,
  EXPECTED.creation_bytecode_keccak256,
);
assert.equal(
  decision.runtime_template_keccak256,
  EXPECTED.runtime_template_keccak256,
);
assert.equal(decision.compiled_identity_accepted, true);
assert.equal(decision.deployment_attested, false);
assert.equal(decision.final_role_bindings_attested, false);
assert.equal(decision.inventory_funding_verified, false);
assert.equal(decision.inventory_lock_verified, false);
assert.equal(decision.market_activation_authorized, false);
assert.equal(decision.public_presale_activation_authorized, false);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
)) {
  if (key === "pure_artifact_validation_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const bad = structuredClone(packet);
  bad.accepted_identity.identity_json_sha256 =
    "0".repeat(64);
  const result =
    verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(bad);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "acceptance_packet_id_invalid");
}

{
  const bad = structuredClone(packet);
  bad.artifacts.creation_bytecode_hex =
    "0x00" + bad.artifacts.creation_bytecode_hex.slice(4);
  const result =
    verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(bad);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "acceptance_packet_id_invalid");
}

{
  const bad = structuredClone(packet);
  bad.artifacts.runtime_template_keccak256 =
    "0x" + "0".repeat(64);
  const result =
    verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(bad);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "acceptance_packet_id_invalid");
}

const serialized = JSON.stringify(packet);
for (const forbidden of [
  "private_key",
  "privateKey",
  "mnemonic",
  "seed_phrase",
  "password",
]) {
  assert.equal(serialized.includes(forbidden), false, forbidden);
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1_PROOF_GREEN",
);
console.log("packet_id=" + EXPECTED.packet_id);
console.log(
  "packet_json_sha256=" + EXPECTED.packet_json_sha256,
);
console.log(
  "packet_json_bytes=" + EXPECTED.packet_json_bytes,
);
console.log("identity_id=" + EXPECTED.identity_id);
console.log(
  "identity_json_sha256=" + EXPECTED.identity_json_sha256,
);
console.log(
  "source_commit=" + EXPECTED.source_commit,
);
console.log(
  "creation_bytecode_sha256=" +
    EXPECTED.creation_bytecode_sha256,
);
console.log(
  "creation_bytecode_keccak256=" +
    EXPECTED.creation_bytecode_keccak256,
);
console.log(
  "runtime_template_sha256=" +
    EXPECTED.runtime_template_sha256,
);
console.log(
  "runtime_template_keccak256=" +
    EXPECTED.runtime_template_keccak256,
);
console.log(
  "immutable_layout_sha256=" +
    EXPECTED.immutable_layout_sha256,
);
console.log("compiled_identity_accepted=true");
console.log("deployment_attested=false");
console.log("final_role_bindings_attested=false");
console.log("inventory_funding_verified=false");
console.log("inventory_lock_verified=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");
