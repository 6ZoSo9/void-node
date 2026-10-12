#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED_CLOSEOUT_ID,
  verifyVoidEconomicEpoch2SignedArtifactCensusCloseoutV1,
} from "../tools/void-economic-epoch2-signed-artifact-census-closeout-v1.mjs";

const closeout = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-signed-artifact-census-closeout-v1.json",
    "utf8",
  ),
);
const registry = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json",
    "utf8",
  ),
);
const nimoDoc = fs.readFileSync(
  "docs/operators/nimo-epoch2-signed-artifact-metadata-census-v1.md",
  "utf8",
);

const result =
  verifyVoidEconomicEpoch2SignedArtifactCensusCloseoutV1(closeout);

assert.equal(result.ok, true);
assert.equal(result.closeout_id, EXPECTED_CLOSEOUT_ID);
assert.equal(
  registry.lineage_set_sha256,
  closeout.known_lineage_registry.lineage_set_sha256,
);
assert.equal(
  registry.interpretation.known_repository_evidence_lineage_count,
  closeout.known_lineage_registry.known_repository_evidence_lineage_count,
);
assert.match(
  nimoDoc,
  /Precision's receipt-bound content sweep closed the Precision-controlled artifact/,
);
assert.match(
  nimoDoc,
  /Nimo and encrypted backup\s+media as potentially relevant off-repo signed-artifact stores/,
);

assert.equal(
  closeout.decision.pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(
  closeout.decision.privileged_signer_nonce_or_key_replay_fence_proven,
  false,
);
assert.equal(
  closeout.decision.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(closeout.decision.migration_authorized, false);
assert.equal(closeout.decision.public_activation_authorized, false);
assert.equal(closeout.decision.funds_movement_authorized, false);
assert.equal(closeout.authority.transaction_broadcast, false);
assert.equal(closeout.authority.chain2050_write, false);
assert.equal(closeout.authority.funds_movement, false);

console.log(
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1_PROOF_GREEN",
);
console.log("closeout_id=" + EXPECTED_CLOSEOUT_ID);
console.log("precision_controlled_artifact_lane_complete=true");
console.log("nimo_controlled_artifact_lane_complete=true");
console.log("encrypted_void_authority_backup_lane_complete=true");
console.log("pending_legacy_signed_transaction_census_complete=true");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("funds_movement=false");
