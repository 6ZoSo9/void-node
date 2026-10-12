#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  EXPECTED_COMPILED_IDENTITY_V1,
  MARKER,
  SOVEREIGN_REVIEW_AUTHORITY_V1,
  buildRoleAuthoritySovereignBytecodeReviewPacketV1,
} from "../tools/chain2050-role-authority-sovereign-bytecode-review-packet-v1.mjs";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol",
  ),
);
const currentMain =
  "d908d4a6550c9e9efe95df6869daaaeee2a63be0";

const sourceSha = crypto.createHash("sha256")
  .update(source)
  .digest("hex");
assert.equal(
  sourceSha,
  EXPECTED_COMPILED_IDENTITY_V1.contract_source_sha256,
);

const packet =
  buildRoleAuthoritySovereignBytecodeReviewPacketV1({
    sourceBytes: source,
    currentMainCommit: currentMain,
  });

assert.equal(packet.marker, MARKER);
assert.match(packet.packet_sha256, /^[a-f0-9]{64}$/);
assert.equal(
  packet.compiled_identity.reproducibility_id,
  "voidcraregdc1_98ae94aacbf76c6d8de48aa3f57b181dab7e15ee95aaf179fbbb16a40c0c3d73",
);
assert.equal(
  packet.compiled_identity.expected_deployed_runtime_sha256,
  "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
);
assert.equal(
  packet.compiled_identity.creation_bytecode_sha256,
  "c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733",
);
assert.equal(
  packet.authority_review.owner_only_registry_append,
  true,
);
assert.equal(
  packet.authority_review.two_step_owner_transfer,
  true,
);
assert.equal(
  packet.authority_review.direct_external_call_surface_detected,
  false,
);
assert.equal(
  packet.authority_review.delegatecall_surface_detected,
  false,
);
assert.equal(
  packet.authority_review.selfdestruct_surface_detected,
  false,
);
assert.equal(
  packet.authority_review.payable_receive_fallback_surface_detected,
  false,
);
assert.equal(packet.authority_review.immutable_count, 1);

for (const [key, value] of Object.entries(
  SOVEREIGN_REVIEW_AUTHORITY_V1,
)) {
  if (key === "sovereign_decision_required") {
    assert.equal(value, true);
  } else {
    assert.equal(value, false, key);
  }
}

assert.equal(
  packet.decision.status,
  "HOLD_PENDING_EXPLICIT_SOVEREIGN_BYTECODE_ACCEPTANCE",
);
assert.equal(packet.unresolved.owner_address, null);
assert.equal(packet.unresolved.deployer_address, null);
assert.equal(packet.unresolved.unsigned_transaction, null);
assert.equal(packet.unresolved.deployment_address, null);

const tampered = Buffer.from(source);
tampered[120] = tampered[120] ^ 1;
assert.throws(
  () =>
    buildRoleAuthoritySovereignBytecodeReviewPacketV1({
      sourceBytes: tampered,
      currentMainCommit: currentMain,
    }),
  /compiled_identity_source_hash_mismatch|source_authority_shape_mismatch/,
);

assert.throws(
  () =>
    buildRoleAuthoritySovereignBytecodeReviewPacketV1({
      sourceBytes: source,
      currentMainCommit: "bad",
    }),
  /current_main_commit_invalid/,
);

const tool = fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/chain2050-role-authority-sovereign-bytecode-review-packet-v1.mjs",
  ),
  "utf8",
);
for (const forbidden of [
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "signTransaction(",
  "Wallet(",
  "JsonRpcProvider",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(
    tool.includes(forbidden),
    false,
    "forbidden authority surface: " + forbidden,
  );
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_BYTECODE_REVIEW_PACKET_V1_GREEN",
);
console.log("packet_sha256=" + packet.packet_sha256);
console.log("source_sha256=" + sourceSha);
console.log(
  "expected_deployed_runtime_sha256=" +
    packet.compiled_identity.expected_deployed_runtime_sha256,
);
console.log("sovereign_decision_required=true");
console.log("sovereign_bytecode_acceptance=false");
console.log("owner_binding_resolved=false");
console.log("deployer_binding_resolved=false");
console.log("unsigned_transaction_constructed=false");
console.log("signing_authorized=false");
console.log("broadcast_authorized=false");
console.log("deployment_authorized=false");
console.log("production_activation_authorized=false");
