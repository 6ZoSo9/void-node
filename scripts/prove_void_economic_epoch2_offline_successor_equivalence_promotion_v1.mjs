#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED,
  VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
  promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1,
  verifyVoidEconomicEpoch2OfflineSuccessorEquivalencePromotionV1,
} from "../tools/void-economic-epoch2-offline-successor-equivalence-promotion-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const readBytes = (path) => fs.readFileSync(path);
const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));

const clientNeutralBytes = readBytes(EXPECTED.client_neutral.path);
const isolatedBytes = readBytes(EXPECTED.isolated.path);
const besuBytes = readBytes(EXPECTED.besu.path);
const promotion = readJson(EXPECTED.promotion_path);
const candidate = readJson(
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);

assert.equal(
  VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
  "VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1",
);
assert.equal(
  promotion.marker,
  VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
);
assert.equal(promotion.version, 1);
assert.equal(
  promotion.status,
  "OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTED_MIGRATION_HOLD",
);
assert.equal(promotion.promotion_id, EXPECTED.promotion_id);
assert.equal(
  promotion.gates.offline_successor_equivalence_proven,
  true,
);
assert.equal(promotion.gates.migration_authorized, false);
assert.equal(promotion.gates.public_activation_authorized, false);
assert.equal(promotion.gates.funds_movement_authorized, false);

const verified =
  verifyVoidEconomicEpoch2OfflineSuccessorEquivalencePromotionV1({
    promotion,
    clientNeutralEvidenceBytes: clientNeutralBytes,
    isolatedEvidenceBytes: isolatedBytes,
    besuEvidenceBytes: besuBytes,
    migrationCandidate: candidate,
  });
assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_VERIFIED",
);
assert.equal(verified.promotion_id, EXPECTED.promotion_id);
assert.equal(verified.offline_successor_equivalence_proven, true);
assert.equal(verified.migration_authorized, false);
assert.equal(verified.public_activation_authorized, false);
assert.equal(verified.funds_movement_authorized, false);

const prePromotion = structuredClone(candidate);
prePromotion.funds_safety.offline_successor_equivalence_proven = false;
delete prePromotion.funds_safety.offline_successor_equivalence_evidence;

const derived =
  promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1({
    clientNeutralEvidenceBytes: clientNeutralBytes,
    isolatedEvidenceBytes: isolatedBytes,
    besuEvidenceBytes: besuBytes,
    migrationCandidate: prePromotion,
  });
assert.deepEqual(derived.promotion, promotion);
assert.equal(
  derived.updated_migration_candidate.funds_safety
    .offline_successor_equivalence_proven,
  true,
);
assert.equal(
  derived.updated_migration_candidate.funds_safety
    .offline_successor_equivalence_evidence,
  EXPECTED.promotion_path,
);
assert.equal(
  derived.updated_migration_candidate.launch_authority.money_movement,
  false,
);

const classified = classifyVoidEconomicEvmSuccessorMigrationV1(candidate);
assert.equal(classified.ok, false);
assert.equal(classified.status, "HOLD");
assert.equal(
  classified.missing_gates.includes(
    "offline_successor_equivalence_proof_required",
  ),
  false,
);
assert.equal(
  classified.missing_gates.includes(
    "offline_successor_equivalence_evidence_required",
  ),
  false,
);
for (const gate of [
  "production_validator_set_binding_required",
  "successor_state_root_public_void_anchor_required",
  "public_economic_verification_path_required",
]) {
  assert.ok(classified.missing_gates.includes(gate), gate);
}

{
  const tampered = Buffer.from(clientNeutralBytes);
  tampered[tampered.length - 2] =
    tampered[tampered.length - 2] === 0x7d ? 0x20 : 0x7d;
  assert.throws(
    () =>
      promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1({
        clientNeutralEvidenceBytes: tampered,
        isolatedEvidenceBytes: isolatedBytes,
        besuEvidenceBytes: besuBytes,
        migrationCandidate: prePromotion,
      }),
    /client_neutral_evidence_git_blob_sha1_mismatch/,
  );
}

{
  const tampered = Buffer.from(isolatedBytes);
  tampered[0] ^= 1;
  assert.throws(
    () =>
      promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1({
        clientNeutralEvidenceBytes: clientNeutralBytes,
        isolatedEvidenceBytes: tampered,
        besuEvidenceBytes: besuBytes,
        migrationCandidate: prePromotion,
      }),
    /isolated_evidence_git_blob_sha1_mismatch/,
  );
}

{
  const tampered = structuredClone(promotion);
  tampered.promotion_id = "voide2osep1_" + "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2OfflineSuccessorEquivalencePromotionV1({
        promotion: tampered,
        clientNeutralEvidenceBytes: clientNeutralBytes,
        isolatedEvidenceBytes: isolatedBytes,
        besuEvidenceBytes: besuBytes,
        migrationCandidate: candidate,
      }),
    /offline_equivalence_committed_promotion_invalid/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.funds_safety.offline_successor_equivalence_evidence =
    "ops/mainnet0/not-the-offline-equivalence-promotion.json";
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2OfflineSuccessorEquivalencePromotionV1({
        promotion,
        clientNeutralEvidenceBytes: clientNeutralBytes,
        isolatedEvidenceBytes: isolatedBytes,
        besuEvidenceBytes: besuBytes,
        migrationCandidate: bad,
      }),
    /offline_equivalence_migration_candidate_binding_missing/,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_AUTHORITY_V1,
)) {
  if (key === "source_promotion_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-offline-successor-equivalence-promotion-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1_PROOF_GREEN",
);
console.log("promotion_id=" + EXPECTED.promotion_id);
console.log("client_neutral_git_blob_bound=true");
console.log("isolated_equivalence_git_blob_bound=true");
console.log("besu_equivalence_git_blob_bound=true");
console.log("same_client_neutral_manifest_file=true");
console.log("offline_successor_equivalence_proven=true");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
