#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const manifestPath =
  "ops/mainnet0/economic-epoch2-runtime-bytecode-manifest-v1.json";
const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function gitBlobSha1(file) {
  const bytes = fs.readFileSync(file);
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

assert.equal(
  m.marker,
  "VOID_ECONOMIC_EPOCH2_RUNTIME_BYTECODE_MANIFEST_V1",
);
assert.equal(m.version, 1);
assert.equal(m.status, "COMPILED_RUNTIME_MANIFEST_GREEN");

assert.equal(m.compiler.foundry_image, "ghcr.io/foundry-rs/foundry:v1.7.1");
assert.equal(
  m.compiler.foundry_image_digest_sha256,
  "8347b728d5d393dac1c018691b36f506d23b9dcd78341d40ea0fcb11c3a19cdd",
);
assert.equal(m.compiler.forge_version, "1.7.1");
assert.equal(
  m.compiler.forge_commit_sha,
  "4072e48705af9d93e3c0f6e29e93b5e9a40caed8",
);
assert.equal(m.compiler.solc_version, "0.8.24");
assert.equal(m.compiler.evm_version, "paris");

assert.equal(
  m.evidence.workflow,
  "VOID economic epoch2 runtime bytecode manifest v1",
);
assert.equal(
  m.evidence.workflow_head_sha,
  "380b3995c9c1e476da13cc60eab04f791a5dde0c",
);
assert.equal(m.evidence.workflow_run_id, "36271009158");
assert.equal(m.evidence.artifact_id, "10914904969");
assert.equal(
  m.evidence.artifact_zip_digest_sha256,
  "c7cec58b4c7b69b3d3e9fd48227b0a91606a33730a93cf773940522585fe043e",
);

const expected = {
  void_token: {
    address: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    contract: "VoidEpoch2TokenV1",
    source_path: "contracts/epoch2/VoidEpoch2TokenV1.sol",
    source_git_blob_sha1: "7c4297aadbc17b6214b4dde1f1766523cb499923",
    runtime_bytes: 4597,
    runtime_sha256:
      "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb",
  },
  treasury_custody: {
    address: "0x26c501a1edca3614f214face2d9b7be2aa7c864b",
    contract: "VoidEpoch2TreasuryCustodyV1",
    source_path: "contracts/epoch2/VoidEpoch2TreasuryCustodyV1.sol",
    source_git_blob_sha1: "73d73bd19a2d903f094dab9e202cc1bf7c2239f9",
    runtime_bytes: 1814,
    runtime_sha256:
      "e6c7bd5fdda1a30b3b34f69d5f64ae5ad41abf436fa3d1863c57a8b9e04283f9",
  },
  presale_fulfillment: {
    address: "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce",
    contract: "VoidEpoch2PresaleFulfillmentV1",
    source_path: "contracts/epoch2/VoidEpoch2PresaleFulfillmentV1.sol",
    source_git_blob_sha1: "d126bded1987dce0b91be8a4e55362d0f46579bb",
    runtime_bytes: 2725,
    runtime_sha256:
      "b200e702e07140921813c83a833d4f4abacea61dd5863f08b0d9c1147b8da225",
  },
};

assert.deepEqual(m.runtimes, expected);
for (const runtime of Object.values(m.runtimes)) {
  assert.equal(gitBlobSha1(runtime.source_path), runtime.source_git_blob_sha1);
  assert.match(runtime.runtime_sha256, /^[0-9a-f]{64}$/);
  assert.equal(Number.isSafeInteger(runtime.runtime_bytes), true);
  assert.equal(runtime.runtime_bytes > 0, true);
}

for (const key of [
  "rpc_call",
  "state_export",
  "genesis_build",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "token_movement",
  "contract_deployment",
  "public_activation",
  "funds_movement",
]) {
  assert.equal(m.authority[key], false, key);
}
assert.equal(m.authority.source_only, true);

console.log("VOID_ECONOMIC_EPOCH2_RUNTIME_BYTECODE_MANIFEST_V1_PROOF_GREEN");
console.log("void_token_runtime_sha256=" + m.runtimes.void_token.runtime_sha256);
console.log(
  "treasury_custody_runtime_sha256=" +
    m.runtimes.treasury_custody.runtime_sha256,
);
console.log(
  "presale_fulfillment_runtime_sha256=" +
    m.runtimes.presale_fulfillment.runtime_sha256,
);
console.log("compiler_foundry_image_digest_bound=true");
console.log("source_git_blobs_bound=true");
console.log("workflow_artifact_digest_bound=true");
console.log("genesis_build=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
