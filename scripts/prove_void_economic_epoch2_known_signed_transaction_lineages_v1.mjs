#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
    .join(",") + "}";
};
const sha256 = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

function jsonFilesUnder(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const path = root + "/" + entry.name;
    if (entry.isDirectory()) {
      out.push(...jsonFilesUnder(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(path);
    }
  }
  return out.sort();
}

const FUNDING_TRANSACTION_HASH_LOCATIONS = new Map([
  [
    "VOID_ROLE_AUTHORITY_FRESH_PRE_SIGN_REVALIDATION_PRECISION_V1",
    new Set(["$.funding_transaction_hash"]),
  ],
  [
    "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1",
    new Set(["$.funding_transaction_hash"]),
  ],
  [
    "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1",
    new Set(["$.lineage.funding_transaction_hash"]),
  ],
]);

const BUY_VOID_TRANSACTION_HASH_LOCATIONS = new Map([
  [
    "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1",
    new Set([
      "$.deployment.transaction_hash",
      "$.inventory_funding.send_to_ops.transaction_hash",
      "$.inventory_funding.ops_spend.transaction_hash",
    ]),
  ],
]);

const DELIVERY_TRANSACTION_HASH_LOCATIONS = new Map([
  [
    "VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1",
    new Set(["$.checkpoint_promotion_plan.delivery_transaction_hash"]),
  ],
]);

const REVIEWED_NULL_TRANSACTION_HASH_PLACEHOLDERS = new Map([
  [
    "VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1",
    new Set(["$.unresolved.deployment_transaction_hash"]),
  ],
  [
    "VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1",
    new Set(["$.unresolved.deployment_transaction_hash"]),
  ],
]);

const REVIEWED_EXACT_UNSIGNED_TRANSACTION_HASH_LOCATIONS = new Map([
  [
    "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1",
    new Set(["$.exact_unsigned_transaction_hash"]),
  ],
]);

const REVIEWED_SUCCESSOR_ONLY_TRANSACTION_HASH_LOCATIONS = new Map([
  [
    "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
    new Set(["$.transaction_proof.transaction_hash"]),
  ],
]);

function canonicalTransactionHash(value, errorCode) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-f]{64}$/.test(value)
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function collectSignedTransactionHashes(
  value,
  out,
  context = { marker: null, path: "$" },
) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectSignedTransactionHashes(
        value[index],
        out,
        { marker: context.marker, path: context.path + "[" + index + "]" },
      );
    }
    return;
  }
  if (!value || typeof value !== "object") return;

  const marker =
    typeof value.marker === "string" ? value.marker : context.marker;

  for (const [key, item] of Object.entries(value)) {
    const childPath = context.path + "." + key;
    let reviewedTransactionHashField = false;

    if (key === "funding_transaction_hash") {
      reviewedTransactionHashField = true;
      const allowed = FUNDING_TRANSACTION_HASH_LOCATIONS.get(marker);
      if (!allowed || !allowed.has(childPath)) {
        throw new Error("unknown_funding_transaction_hash_schema_or_path");
      }
      out.add(
        canonicalTransactionHash(
          item,
          "invalid_funding_transaction_hash_field",
        ),
      );
    }

    if (key === "signed_transaction_hash") {
      reviewedTransactionHashField = true;
      out.add(
        canonicalTransactionHash(
          item,
          "invalid_signed_transaction_hash_field",
        ),
      );
    }

    if (key === "transaction_hash") {
      const allowed = BUY_VOID_TRANSACTION_HASH_LOCATIONS.get(marker);
      const successorOnly =
        REVIEWED_SUCCESSOR_ONLY_TRANSACTION_HASH_LOCATIONS.get(marker);
      if (allowed?.has(childPath)) {
        reviewedTransactionHashField = true;
        out.add(
          canonicalTransactionHash(
            item,
            "invalid_reviewed_transaction_hash_field",
          ),
        );
      } else if (successorOnly?.has(childPath)) {
        reviewedTransactionHashField = true;
        canonicalTransactionHash(
          item,
          "invalid_successor_only_transaction_hash_field",
        );
      } else if (allowed || successorOnly) {
        throw new Error("unknown_reviewed_transaction_hash_path");
      }
    }

    if (key === "exact_unsigned_transaction_hash") {
      const allowed =
        REVIEWED_EXACT_UNSIGNED_TRANSACTION_HASH_LOCATIONS.get(marker);
      if (!allowed || !allowed.has(childPath)) {
        throw new Error(
          "unknown_exact_unsigned_transaction_hash_schema_or_path",
        );
      }
      reviewedTransactionHashField = true;
      canonicalTransactionHash(
        item,
        "invalid_exact_unsigned_transaction_hash_field",
      );
    }

    if (key === "delivery_transaction_hash") {
      const allowed = DELIVERY_TRANSACTION_HASH_LOCATIONS.get(marker);
      if (allowed?.has(childPath)) reviewedTransactionHashField = true;
      if (allowed?.has(childPath)) {
        out.add(
          canonicalTransactionHash(
            item,
            "invalid_delivery_transaction_hash_field",
          ),
        );
      } else if (allowed) {
        throw new Error("unknown_delivery_transaction_hash_path");
      }
    }

    if (
      key.endsWith("transaction_hash") &&
      key !== "unsigned_transaction_hash" &&
      key !== "exact_unsigned_transaction_hash" &&
      !reviewedTransactionHashField
    ) {
      const reviewedNullPaths =
        REVIEWED_NULL_TRANSACTION_HASH_PLACEHOLDERS.get(marker);
      if (reviewedNullPaths?.has(childPath)) {
        if (item !== null) {
          throw new Error(
            "reviewed_null_transaction_hash_placeholder_became_nonnull:" +
              String(marker) + ":" + childPath,
          );
        }
      } else {
        throw new Error(
          "unreviewed_transaction_hash_like_field:" +
            String(marker) + ":" + childPath,
        );
      }
    }

    collectSignedTransactionHashes(
      item,
      out,
      { marker, path: childPath },
    );
  }
}

assert.throws(
  () => collectSignedTransactionHashes(
    { signed_transaction_hash: "0x" + "A".repeat(64) },
    new Set(),
  ),
  /invalid_signed_transaction_hash_field/,
);
assert.throws(
  () => collectSignedTransactionHashes(
    { signed_transaction_hash: 42 },
    new Set(),
  ),
  /invalid_signed_transaction_hash_field/,
);
assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_ROLE_AUTHORITY_FRESH_PRE_SIGN_REVALIDATION_PRECISION_V1",
      funding_transaction_hash: "0x" + "A".repeat(64),
    },
    new Set(),
  ),
  /invalid_funding_transaction_hash_field/,
);
assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "UNKNOWN_SCHEMA",
      funding_transaction_hash: "0x" + "1".repeat(64),
    },
    new Set(),
  ),
  /unknown_funding_transaction_hash_schema_or_path/,
);
{
  const discovered = new Set();
  collectSignedTransactionHashes(
    {
      marker: "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1",
      funding_transaction_hash: "0x" + "1".repeat(64),
    },
    discovered,
  );
  collectSignedTransactionHashes(
    {
      marker: "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1",
      lineage: {
        funding_transaction_hash: "0x" + "2".repeat(64),
      },
    },
    discovered,
  );
  assert.deepEqual(
    [...discovered].sort(),
    ["0x" + "1".repeat(64), "0x" + "2".repeat(64)],
  );
}

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_REQUEST_EVIDENCE_V1",
      funding_transaction_hash: "0x" + "3".repeat(64),
    },
    new Set(),
  ),
  /unknown_funding_transaction_hash_schema_or_path/,
);

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1",
      deployment: {
        transaction_hash: "0x" + "A".repeat(64),
      },
    },
    new Set(),
  ),
  /invalid_reviewed_transaction_hash_field/,
);

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1",
      unexpected: {
        transaction_hash: "0x" + "1".repeat(64),
      },
    },
    new Set(),
  ),
  /unknown_reviewed_transaction_hash_path/,
);

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1",
      delivery_transaction_hash: "0x" + "1".repeat(64),
    },
    new Set(),
  ),
  /unknown_delivery_transaction_hash_path/,
);

{
  const discovered = new Set();
  collectSignedTransactionHashes(
    {
      marker:
        "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1",
      exact_unsigned_transaction_hash: "0x" + "1".repeat(64),
    },
    discovered,
  );
  assert.deepEqual([...discovered], []);
}

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker:
        "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1",
      exact_unsigned_transaction_hash: "0x" + "A".repeat(64),
    },
    new Set(),
  ),
  /invalid_exact_unsigned_transaction_hash_field/,
);

{
  const discovered = new Set();
  collectSignedTransactionHashes(
    {
      marker: "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
      transaction_proof: {
        transaction_hash: "0x" + "2".repeat(64),
      },
    },
    discovered,
  );
  assert.deepEqual([...discovered], []);
}

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
      transaction_hash: "0x" + "2".repeat(64),
    },
    new Set(),
  ),
  /unknown_reviewed_transaction_hash_path/,
);

assert.throws(
  () => collectSignedTransactionHashes(
    {
      marker: "FUTURE_REVIEW_REQUIRED",
      newly_added_transaction_hash: "0x" + "1".repeat(64),
    },
    new Set(),
  ),
  /unreviewed_transaction_hash_like_field/,
);

for (const marker of [
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1",
  "VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1",
]) {
  const discovered = new Set();
  collectSignedTransactionHashes(
    {
      marker,
      unresolved: {
        deployment_transaction_hash: null,
      },
    },
    discovered,
  );
  assert.deepEqual([...discovered], []);
  assert.throws(
    () => collectSignedTransactionHashes(
      {
        marker,
        unresolved: {
          deployment_transaction_hash: "0x" + "3".repeat(64),
        },
      },
      new Set(),
    ),
    /reviewed_null_transaction_hash_placeholder_became_nonnull/,
  );
}

const registry = readJson(
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json",
);
const nonceCandidate = readJson(
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json",
);
const deployment = readJson(
  "ops/mainnet0/chain2050-role-authority-signed-transaction-verification-precision-v1.json",
);
const deploymentCheckpoint = readJson(
  "ops/mainnet0/chain2050-role-authority-checkpoint-request-precision-evidence-v1.json",
);
const deployerFunding = readJson(
  "ops/mainnet0/chain2050-role-authority-fresh-pre-sign-revalidation-precision-v1.json",
);
const deployerFundingAuthorization = readJson(
  "ops/mainnet0/chain2050-role-authority-single-transaction-signing-authorization-v1.json",
);
const fundingRequest = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.json",
);
const fundingReceipt = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-receipt-evidence-v1.json",
);
const appendRequest = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-request-evidence-v1.json",
);
const appendReceipt = readJson(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.json",
);
const buyVoidActivation = readJson(
  "ops/mainnet0/buy-void-production-activation-evidence-v1.json",
);
const productionSelector = readJson(
  "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json",
);

assert.equal(
  registry.marker,
  "VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1",
);
assert.equal(registry.version, 1);
assert.equal(
  registry.status,
  "KNOWN_REPOSITORY_EVIDENCE_LINEAGES_BOUND_GLOBAL_CENSUS_HOLD",
);
assert.deepEqual(registry.source_snapshot, {
  execution_epoch: 1,
  chain_id: 2050,
  final_block_number: "37392",
  final_block_hash:
    "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
  frozen_nonce_census_sha256:
    "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70",
});
assert.equal(registry.lineages.length, 8);

const byId = new Map(registry.lineages.map((row) => [row.id, row]));
assert.equal(byId.size, 8);

const nonceByAddress = new Map(
  nonceCandidate.accounts.map((row) => [
    row.address,
    row.frozen_final_nonce,
  ]),
);

const deploy = byId.get("role_authority_deployment");
assert(deploy);
assert.equal(deploy.signer_address, deployment.signer_address);
assert.equal(deploy.transaction_nonce, deployment.nonce);
assert.equal(deploy.signed_transaction_hash, deployment.signed_transaction_hash);
assert.equal(
  deploy.signed_artifact_sha256,
  deployment.signed_transaction_file_sha256,
);
assert.equal(deploy.signed_artifact_digest_kind, "file_sha256");
assert.equal(deployment.chain_id, "2050");
assert.equal(
  deploy.included_epoch1_block,
  deploymentCheckpoint.deployment_block_number,
);
assert.equal(
  deploymentCheckpoint.signed_transaction_hash,
  deploy.signed_transaction_hash,
);

const confirmedDelivery = byId.get(
  "private_chain2050_confirmed_buy_void_delivery",
);
assert(confirmedDelivery);
assert.equal(confirmedDelivery.signer_address, null);
assert.equal(confirmedDelivery.transaction_nonce, null);
assert.equal(confirmedDelivery.frozen_final_nonce, null);
assert.equal(
  confirmedDelivery.signed_transaction_hash,
  productionSelector.checkpoint_promotion_plan.delivery_transaction_hash,
);
assert.equal(
  confirmedDelivery.included_epoch1_block,
  String(productionSelector.checkpoint_promotion_plan.delivery_block_number),
);
assert.equal(
  productionSelector.marker,
  "VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1",
);
assert.equal(productionSelector.source_only, true);

const buyDeployment = byId.get("buy_void_fulfillment_deployment");
assert(buyDeployment);
assert.equal(buyDeployment.signer_address, null);
assert.equal(buyDeployment.transaction_nonce, null);
assert.equal(buyDeployment.frozen_final_nonce, null);
assert.equal(
  buyDeployment.signed_transaction_hash,
  buyVoidActivation.deployment.transaction_hash,
);
assert.equal(
  buyDeployment.included_epoch1_block,
  buyVoidActivation.deployment.block_number,
);
assert.equal(buyVoidActivation.deployment.receipt_status, "1");

const buyTreasurySend = byId.get("buy_void_treasury_send_to_ops");
assert(buyTreasurySend);
assert.equal(buyTreasurySend.signer_address, null);
assert.equal(buyTreasurySend.transaction_nonce, null);
assert.equal(buyTreasurySend.frozen_final_nonce, null);
assert.equal(
  buyTreasurySend.signed_transaction_hash,
  buyVoidActivation.inventory_funding.send_to_ops.transaction_hash,
);
assert.equal(
  buyTreasurySend.included_epoch1_block,
  buyVoidActivation.inventory_funding.send_to_ops.block_number,
);
assert.equal(
  buyVoidActivation.inventory_funding.send_to_ops.receipt_status,
  "1",
);

const buyOpsSpend = byId.get("buy_void_ops_spend_fulfillment");
assert(buyOpsSpend);
assert.equal(buyOpsSpend.signer_address, null);
assert.equal(buyOpsSpend.transaction_nonce, null);
assert.equal(buyOpsSpend.frozen_final_nonce, null);
assert.equal(
  buyOpsSpend.signed_transaction_hash,
  buyVoidActivation.inventory_funding.ops_spend.transaction_hash,
);
assert.equal(
  buyOpsSpend.included_epoch1_block,
  buyVoidActivation.inventory_funding.ops_spend.block_number,
);
assert.equal(buyVoidActivation.inventory_funding.ops_spend.receipt_status, "1");
assert.equal(buyVoidActivation.marker, "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1");
assert.equal(buyVoidActivation.chain_id, "2050");

const deployerFundingLineage = byId.get("role_authority_deployer_gas_funding");
assert(deployerFundingLineage);
assert.equal(
  deployerFundingLineage.signer_address,
  deployerFunding.funding_source,
);
assert.equal(deployerFundingLineage.transaction_nonce, null);
assert.equal(
  deployerFundingLineage.signed_transaction_hash,
  deployerFunding.funding_transaction_hash,
);
assert.equal(deployerFundingLineage.signed_artifact_sha256, null);
assert.equal(
  deployerFundingLineage.signed_artifact_digest_kind,
  "not_published_in_repository_evidence",
);
assert.equal(deployerFunding.funding_receipt_status, "1");
assert.equal(deployerFunding.chain_id, "2050");
assert.equal(
  deployerFundingLineage.included_epoch1_block,
  deployerFunding.funding_block_number,
);
assert.equal(
  deployerFundingAuthorization.funding_transaction_hash,
  deployerFundingLineage.signed_transaction_hash,
);
assert.equal(
  deployerFundingAuthorization.fresh_pre_sign_observation_block_number,
  deployerFundingLineage.included_epoch1_block,
);

const funding = byId.get("sovereign_owner_gas_funding");
assert(funding);
assert.equal(funding.signer_address, fundingRequest.source.address);
assert.equal(funding.transaction_nonce, fundingRequest.transaction.nonce);
assert.equal(
  funding.signed_transaction_hash,
  fundingReceipt.signed_transaction_hash,
);
assert.equal(
  funding.signed_artifact_sha256,
  fundingReceipt.signed_serialized_sha256,
);
assert.equal(funding.signed_artifact_digest_kind, "serialized_sha256");
assert.equal(fundingRequest.transaction.chain_id, "2050");
assert.equal(funding.included_epoch1_block, fundingReceipt.receipt.block_number);

const append = byId.get("sovereign_genesis_registry_append");
assert(append);
assert.equal(append.signer_address, appendRequest.transaction.signer_address);
assert.equal(append.transaction_nonce, appendRequest.transaction.nonce);
assert.equal(append.signed_transaction_hash, appendReceipt.signed_transaction_hash);
assert.equal(append.signed_artifact_sha256, null);
assert.equal(
  append.signed_artifact_digest_kind,
  "not_published_in_repository_evidence",
);
assert.equal(appendRequest.transaction.chain_id, "2050");
assert.equal(append.included_epoch1_block, appendReceipt.receipt.block_number);

const discoveredSignedHashes = new Set();
for (const path of jsonFilesUnder("ops/mainnet0")) {
  const value = readJson(path);
  collectSignedTransactionHashes(value, discoveredSignedHashes);
}
assert.deepEqual(
  [...discoveredSignedHashes].sort(),
  registry.lineages.map((row) => row.signed_transaction_hash).sort(),
  "ops/mainnet0 signed_transaction_hash set diverges from registry",
);

const hashes = new Set();
const inclusionOnlyLineages = new Set([
  "private_chain2050_confirmed_buy_void_delivery",
  "buy_void_fulfillment_deployment",
  "buy_void_treasury_send_to_ops",
  "buy_void_ops_spend_fulfillment",
]);

for (const row of registry.lineages) {
  if (row.signer_address === null) {
    assert.equal(inclusionOnlyLineages.has(row.id), true, row.id);
    assert.equal(row.transaction_nonce, null, row.id);
    assert.equal(row.frozen_final_nonce, null, row.id);
  } else {
    assert.match(row.signer_address, /^0x[0-9a-f]{40}$/);
    assert.match(row.frozen_final_nonce, /^(?:0|[1-9][0-9]*)$/);
    assert.equal(
      nonceByAddress.get(row.signer_address),
      row.frozen_final_nonce,
      row.id + ": frozen nonce mismatch",
    );
    if (row.transaction_nonce !== null) {
      assert.match(row.transaction_nonce, /^(?:0|[1-9][0-9]*)$/);
      assert(
        BigInt(row.transaction_nonce) < BigInt(row.frozen_final_nonce),
        row.id + ": transaction is not stale under frozen nonce continuity",
      );
    } else {
      assert.equal(row.id, "role_authority_deployer_gas_funding");
      assert(BigInt(row.frozen_final_nonce) > 0n);
      assert.equal(deployerFunding.funding_receipt_status, "1");
      assert.equal(deployerFunding.funding_source, row.signer_address);
    }
  }

  assert.match(row.signed_transaction_hash, /^0x[0-9a-f]{64}$/);
  assert.match(row.included_epoch1_block, /^(?:0|[1-9][0-9]*)$/);
  assert.equal(hashes.has(row.signed_transaction_hash), false);
  hashes.add(row.signed_transaction_hash);
  assert(
    BigInt(row.included_epoch1_block) <=
      BigInt(registry.source_snapshot.final_block_number),
    row.id + ": transaction lies after the frozen snapshot",
  );
  assert.equal(row.stale_under_exact_nonce_continuity, true);
  assert(Array.isArray(row.evidence) && row.evidence.length >= 1);
}

assert.equal(
  sha256(canonical(registry.lineages)),
  registry.lineage_set_sha256,
);
assert.equal(
  registry.lineage_set_sha256,
  "d52fe6dd0d10b9bb9d0407786b6a2a5e0c1cc816332be9d26704e962f76651c5",
);

assert.deepEqual(registry.interpretation, {
  known_repository_evidence_lineage_count: 8,
  all_known_repository_lineages_included_by_epoch1_freeze: true,
  all_known_repository_lineages_stale_under_exact_nonce_continuity: true,
  repository_evidence_is_exhaustive_signed_artifact_census: false,
  off_repo_signed_artifact_census_required: true,
  pending_legacy_signed_transaction_census_complete: false,
  privileged_signer_nonce_or_key_replay_fence_proven: false,
  cross_epoch_replay_protection_proven: false,
  migration_authorized: false,
  public_activation_authorized: false,
});

assert.deepEqual(registry.authority, {
  source_only: true,
  filesystem_scan: false,
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  token_movement: false,
  funds_movement: false,
});

console.log("VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1_GREEN");
console.log("known_repository_evidence_lineage_count=8");
console.log("deployer_gas_funding_exact_nonce_published=false");
console.log("deployer_gas_funding_stale_by_mined_pre_freeze_signer_continuity=true");
console.log("ops_mainnet0_reviewed_signed_transaction_hash_locations_exhaustive=true");
console.log("malformed_signed_transaction_hash_fields_rejected=true");
console.log("funding_transaction_hash_schema_and_path_allowlist_enforced=true");
console.log("funding_transaction_hash_reviewed_schema_count=3");
console.log("funding_transaction_hash_reviewed_location_count=3");
console.log("buy_void_transaction_hash_reviewed_location_count=3");
console.log("delivery_transaction_hash_reviewed_location_count=1");
console.log("unknown_funding_transaction_hash_schema_or_path_rejected=true");
console.log("unreviewed_transaction_hash_like_fields_rejected=true");
console.log("reviewed_null_transaction_hash_placeholders_fail_if_populated=true");
console.log("reviewed_null_transaction_hash_placeholder_schema_count=2");
console.log("exact_unsigned_transaction_hash_excluded_with_shape_validation=true");
console.log("successor_only_transaction_hash_excluded_with_shape_validation=true");
console.log("all_known_repository_lineages_stale_under_exact_nonce_continuity=true");
console.log("repository_evidence_is_exhaustive_signed_artifact_census=false");
console.log("off_repo_signed_artifact_census_required=true");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
