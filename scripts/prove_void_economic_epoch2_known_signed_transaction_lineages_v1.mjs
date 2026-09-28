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
  [
    "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1",
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
  context = { rootMarker: undefined, path: "$" },
) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectSignedTransactionHashes(
        value[index],
        out,
        {
          rootMarker: context.rootMarker,
          path: context.path + "[" + index + "]",
        },
      );
    }
    return;
  }
  if (!value || typeof value !== "object") return;

  let rootMarker = context.rootMarker;
  if (context.path === "$" && rootMarker === undefined) {
    const markerDescriptor =
      Object.getOwnPropertyDescriptor(value, "marker");
    rootMarker =
      markerDescriptor &&
      Object.hasOwn(markerDescriptor, "value") &&
      typeof markerDescriptor.value === "string"
        ? markerDescriptor.value
        : null;
  }
  const marker = rootMarker ?? null;

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
      { rootMarker: marker, path: childPath },
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
        marker: "NESTED_MARKER_MUST_NOT_OVERRIDE_ROOT",
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
      marker: "UNREVIEWED_ROOT_SCHEMA",
      transaction_proof: {
        marker: "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
        transaction_hash: "0x" + "2".repeat(64),
      },
    },
    new Set(),
  ),
  /unreviewed_transaction_hash_like_field:UNREVIEWED_ROOT_SCHEMA:\$\.transaction_proof\.transaction_hash/,
);

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
const recoveryContractSource = fs.readFileSync(
  "tools/void-private-chain2050-economic-recovery-contract-v1.mjs",
  "utf8",
);
const crossRecoveryFulfillmentSource = fs.readFileSync(
  "ops/mainnet0/buy-void-fulfillment-10246-live.md",
  "utf8",
);
const legacyCrossRecoveryCloseoutSource = fs.readFileSync(
  "ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh",
  "utf8",
);
const premineAllocation = readJson(
  "ops/mainnet/mainnet0-premine-allocation.current.json",
);
const opsTreasurySeedSource = fs.readFileSync(
  "ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md",
  "utf8",
);
const wcToVoidSettlementReceipt = readJson(
  "docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json",
);
const wcDevnetStatusSource = fs.readFileSync(
  "ops/mainnet0/participant-wc-to-void.current.md",
  "utf8",
);

function recoveryIncidentSequenceFromSource(source) {
  const blockMatch = source.match(
    /transaction_block_numbers:\s*Object\.freeze\(\[([^\]]+)\]\)/,
  );
  const hashMatch = source.match(
    /transaction_hashes:\s*Object\.freeze\(\[([\s\S]*?)\]\)/,
  );
  assert(blockMatch, "recovery block sequence source binding missing");
  assert(hashMatch, "recovery hash sequence source binding missing");
  const blocks = [...blockMatch[1].matchAll(/\b(\d+)\b/g)]
    .map((match) => match[1]);
  const hashes = [...hashMatch[1].matchAll(/"(0x[0-9a-f]{64})"/g)]
    .map((match) => match[1]);
  assert.deepEqual(blocks, ["37368", "37369", "37370", "37371"]);
  assert.deepEqual(hashes, [
    "0x756da9088b49c9d447ef75822fc16fdf3969855eb65720f7569667aca28d8f00",
    "0x5830900dec5a9cd92d070ba8a542d6072aacb44af5a68b7a22ef3dc9312f7693",
    "0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6",
    "0xcc0ed5b5cd0bb0076bab9100a7cf31b8e07488986f55d7cd87ade60bcaac9e15",
  ]);
  return Object.freeze(blocks.map((block, index) =>
    Object.freeze({ block, hash: hashes[index] })
  ));
}
const recoveryIncidentSequence =
  recoveryIncidentSequenceFromSource(recoveryContractSource);

function crossRecovery10246HashesFromMarkdown(source) {
  assert.match(source, /artifact: VOID_BUY_VOID_FULFILLMENT_10246_LIVE_V1/);
  assert.match(source, /result: fulfilled/);
  assert.match(source, /chain_id: 2050/);
  for (const status of [
    "base_send_status: true",
    "base_spend_status: true",
    "eth_send_status: true",
    "eth_spend_status: true",
  ]) {
    assert.ok(source.includes(status), status);
  }
  const hashes = [...source.matchAll(
    /^(?:- )?(?:sendToOps_tx|spend_tx): (0x[0-9a-f]{64})$/gm,
  )].map((match) => match[1]);
  assert.deepEqual(hashes, [
    "0x853314073dde64e393985952b03651dcf56dace22921db6d5de8fec86efdb9b3",
    "0xa9976ddf2f32ff69dab187cb6860cef8f74a3e7d6853b37f5210bfef77cf6d8d",
    "0x6c506f2a89148056c7799751c7e7237496d38781a3ab71f716a8ddf4445286f3",
    "0xafeef64e72dea6bb1370eea364e20b4d70cd3833740999201707fd7257d40c7f",
  ]);
  return new Set(hashes);
}
const crossRecoveryHashes =
  crossRecovery10246HashesFromMarkdown(crossRecoveryFulfillmentSource);
assert.equal(crossRecoveryHashes.size, 4);
assert.equal(premineAllocation.marker, "VOID_MAINNET0_PREMINE_ALLOCATION_CURRENT_V1");
assert.equal(premineAllocation.chain_id, 2050);
assert.equal(
  premineAllocation.historical_buy_void_reconciliation.classification,
  "cross_recovery_owner_test_canary_history_not_current_chain_custody",
);
assert.equal(
  premineAllocation.historical_buy_void_reconciliation
    .canonical_retained_history_contains_listed_external_delivery_txs,
  false,
);
const guardedCrossRecovery =
  premineAllocation.historical_buy_void_reconciliation.artifacts.find(
    (row) => row.family === "guarded_102_46_void_test",
  );
assert(guardedCrossRecovery);
assert.equal(guardedCrossRecovery.historical_delivery_proven, true);
assert.equal(guardedCrossRecovery.owner_test_canary, true);
assert.equal(guardedCrossRecovery.disposition, "SUPERSEDED_BY_RECOVERY");
assert.equal(
  guardedCrossRecovery.present_in_current_canonical_retained_history,
  false,
);

function legacyCrossRecoveryHashFromCloseout(source) {
  assert.match(source, /VOID_TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"/);
  assert.match(source, /VOID_WEI="2500000000000000000000"/);
  const match = source.match(
    /VOID_TX="(0x[0-9a-f]{64})"/,
  );
  assert(match, "legacy cross-recovery VOID_TX missing");
  assert.equal(
    match[1],
    "0x00d0015ed13739fb14300ebfa7681ca61c5fac37451a70b65895f16a92dc8416",
  );
  return match[1];
}
const legacyCrossRecoveryHash =
  legacyCrossRecoveryHashFromCloseout(legacyCrossRecoveryCloseoutSource);
const legacyCrossRecovery =
  premineAllocation.historical_buy_void_reconciliation.artifacts.find(
    (row) => row.family === "legacy_25_usdc_2500_void_test",
  );
assert(legacyCrossRecovery);
assert.equal(legacyCrossRecovery.historical_delivery_proven, true);
assert.equal(legacyCrossRecovery.owner_test_canary, true);
assert.equal(legacyCrossRecovery.disposition, "SUPERSEDED_BY_RECOVERY");
assert.equal(legacyCrossRecovery.present_in_current_canonical_retained_history, false);

function opsTreasurySeedHashFromMarkdown(source) {
  assert.match(source, /^status: live_execution_green$/m);
  assert.match(source, /^chain_id: 2050$/m);
  assert.match(source, /^signer_match: true$/m);
  assert.match(
    source,
    /^required_signer_address: 0x4E77786f32D41E40E7CEF28389068d6F31F1d6A2$/m,
  );
  const match = source.match(/^tx_hash: (0x[0-9a-f]{64})$/m);
  assert(match, "ops treasury seed transaction hash missing");
  assert.equal(
    match[1],
    "0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2",
  );
  return match[1];
}
const opsTreasurySeedHash =
  opsTreasurySeedHashFromMarkdown(opsTreasurySeedSource);

function wcToVoidSettlementHashFromReceipt(receipt) {
  assert.equal(receipt.marker, "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1");
  assert.equal(receipt.public_receipt, true);
  assert.equal(receipt.chain_id, "2050");
  assert.equal(receipt.receipt_status_success, true);
  assert.equal(receipt.money_movement_performed, true);
  assert.match(receipt.tx_hash, /^0x[0-9a-f]{64}$/);
  assert.equal(
    receipt.tx_hash,
    "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717",
  );
  return receipt.tx_hash;
}
const wcToVoidSettlementHash =
  wcToVoidSettlementHashFromReceipt(wcToVoidSettlementReceipt);

function wcDevnetHashesFromStatus(source) {
  assert.match(source, /^# Participant WC -> VOID historical devnet status$/m);
  assert.match(source, /^scope: Precision_local_8545_devnet_only$/m);
  assert.match(source, /^real_wallet_used: false$/m);
  assert.match(source, /^- mutation_scope: Precision local 8545 devnet only$/m);
  assert.match(source, /^- chain_mutation: local_anvil_only$/m);
  const wallet = source.match(/^temp_wallet: (0x[0-9A-Fa-f]{40})$/m);
  const approve = source.match(/^approve_tx_hash: (0x[0-9a-f]{64})$/m);
  const swap = source.match(/^swap_tx_hash: (0x[0-9a-f]{64})$/m);
  assert(wallet && approve && swap, "WC devnet status transaction identity missing");
  assert.equal(
    wallet[1].toLowerCase(),
    "0xc98e49110ff9b0fc88bae6aa1425959b517972c3",
  );
  assert.equal(
    approve[1],
    "0x9dad40018a6e93a924ace9ada261b6213ba52311139c30da4f605ea6d93e9a9f",
  );
  assert.equal(
    swap[1],
    "0x6d26e2e0f9cc5fc4e4e1a28362e1f999daec84d3e96135d442ac7dab445129e8",
  );
  return Object.freeze({
    signer: wallet[1].toLowerCase(),
    hashes: Object.freeze([approve[1], swap[1]]),
  });
}
const wcDevnet = wcDevnetHashesFromStatus(wcDevnetStatusSource);

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
assert.equal(registry.lineages.length, 20);

const byId = new Map(registry.lineages.map((row) => [row.id, row]));
assert.equal(byId.size, 20);

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

for (const [id, block, hash] of [
  [
    "private_chain2050_recovery_sequence_block_37368",
    "37368",
    "0x756da9088b49c9d447ef75822fc16fdf3969855eb65720f7569667aca28d8f00",
  ],
  [
    "private_chain2050_recovery_sequence_block_37369",
    "37369",
    "0x5830900dec5a9cd92d070ba8a542d6072aacb44af5a68b7a22ef3dc9312f7693",
  ],
  [
    "private_chain2050_recovery_sequence_block_37371",
    "37371",
    "0xcc0ed5b5cd0bb0076bab9100a7cf31b8e07488986f55d7cd87ade60bcaac9e15",
  ],
]) {
  const row = byId.get(id);
  assert(row, id);
  assert.equal(row.signer_address, null);
  assert.equal(row.transaction_nonce, null);
  assert.equal(row.frozen_final_nonce, null);
  assert.equal(row.signed_transaction_hash, hash);
  assert.equal(row.included_epoch1_block, block);
  assert.equal(
    row.evidence.includes(
      "tools/void-private-chain2050-economic-recovery-contract-v1.mjs",
    ),
    true,
  );
}

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
assert.deepEqual(
  recoveryIncidentSequence,
  [
    { block: "37368", hash: "0x756da9088b49c9d447ef75822fc16fdf3969855eb65720f7569667aca28d8f00" },
    { block: "37369", hash: "0x5830900dec5a9cd92d070ba8a542d6072aacb44af5a68b7a22ef3dc9312f7693" },
    { block: "37370", hash: confirmedDelivery.signed_transaction_hash },
    { block: "37371", hash: "0xcc0ed5b5cd0bb0076bab9100a7cf31b8e07488986f55d7cd87ade60bcaac9e15" },
  ],
);

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

const opsTreasurySeed = byId.get("legacy_ops_treasury_seed_live");
assert(opsTreasurySeed);
assert.equal(
  opsTreasurySeed.signer_address,
  "0x4e77786f32d41e40e7cef28389068d6f31f1d6a2",
);
assert.equal(opsTreasurySeed.transaction_nonce, null);
assert.equal(opsTreasurySeed.signed_transaction_hash, opsTreasurySeedHash);
assert.equal(opsTreasurySeed.frozen_final_nonce, "9");
assert.equal(opsTreasurySeed.included_epoch1_block, null);
assert.equal(opsTreasurySeed.stale_under_exact_nonce_continuity, false);
assert.equal(opsTreasurySeed.present_in_current_canonical_retained_history, null);
assert.equal(
  opsTreasurySeed.historical_disposition,
  "REVIEWED_CHAIN2050_HISTORY_RETENTION_OR_NONCE_STALENESS_UNPROVEN",
);
assert.equal(opsTreasurySeed.replay_staleness_proven, false);
assert.equal(
  nonceByAddress.get(opsTreasurySeed.signer_address),
  opsTreasurySeed.frozen_final_nonce,
);
assert.equal(
  opsTreasurySeed.evidence.includes(
    "ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md",
  ),
  true,
);

const wcToVoidSettlement = byId.get("legacy_wc_to_void_first_settlement");
assert(wcToVoidSettlement);
assert.equal(wcToVoidSettlement.signer_address, null);
assert.equal(wcToVoidSettlement.transaction_nonce, null);
assert.equal(
  wcToVoidSettlement.signed_transaction_hash,
  wcToVoidSettlementHash,
);
assert.equal(wcToVoidSettlement.frozen_final_nonce, null);
assert.equal(wcToVoidSettlement.included_epoch1_block, null);
assert.equal(wcToVoidSettlement.stale_under_exact_nonce_continuity, false);
assert.equal(wcToVoidSettlement.present_in_current_canonical_retained_history, null);
assert.equal(
  wcToVoidSettlement.historical_disposition,
  "REVIEWED_CHAIN2050_HISTORY_RETENTION_OR_NONCE_STALENESS_UNPROVEN",
);
assert.equal(wcToVoidSettlement.replay_staleness_proven, false);
assert.equal(
  wcToVoidSettlement.evidence.includes(
    "docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json",
  ),
  true,
);

for (const [id, hash] of [
  ["wc_devnet_temp_wallet_approve", wcDevnet.hashes[0]],
  ["wc_devnet_temp_wallet_swap", wcDevnet.hashes[1]],
]) {
  const row = byId.get(id);
  assert(row, id);
  assert.equal(row.signer_address, wcDevnet.signer);
  assert.equal(row.transaction_nonce, null);
  assert.equal(row.signed_transaction_hash, hash);
  assert.equal(row.frozen_final_nonce, null);
  assert.equal(row.included_epoch1_block, null);
  assert.equal(row.stale_under_exact_nonce_continuity, false);
  assert.equal(row.present_in_current_canonical_retained_history, null);
  assert.equal(
    row.historical_disposition,
    "LOCAL_DEVNET_CHAIN2050_TEST_RETENTION_OR_NONCE_STALENESS_UNPROVEN",
  );
  assert.equal(row.replay_staleness_proven, false);
  assert.equal(
    row.evidence.includes("ops/mainnet0/participant-wc-to-void.current.md"),
    true,
  );
}

const registryPath =
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json";
const discoveredSignedHashes = new Set();
for (const path of jsonFilesUnder("ops/mainnet0")) {
  if (path === registryPath) continue;
  const value = readJson(path);
  collectSignedTransactionHashes(value, discoveredSignedHashes);
}
assert.equal(
  discoveredSignedHashes.size,
  8,
  "independent ops/mainnet0 JSON evidence must contribute exactly eight hashes",
);

const recoveryHashes = new Set(
  recoveryIncidentSequence.map((row) => row.hash),
);
assert.equal(recoveryHashes.size, 4);
const recoveryOverlap = [...recoveryHashes].filter((hash) =>
  discoveredSignedHashes.has(hash)
);
assert.deepEqual(
  recoveryOverlap,
  [
    "0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6",
  ],
);

assert.deepEqual(
  [...crossRecoveryHashes].filter((hash) =>
    discoveredSignedHashes.has(hash) || recoveryHashes.has(hash)
  ),
  [],
);
const discoveredKnownHashes = new Set([
  ...discoveredSignedHashes,
  ...recoveryHashes,
  ...crossRecoveryHashes,
  legacyCrossRecoveryHash,
  opsTreasurySeedHash,
  wcToVoidSettlementHash,
  ...wcDevnet.hashes,
]);
assert.equal(discoveredKnownHashes.size, 20);
assert.deepEqual(
  [...discoveredKnownHashes].sort(),
  registry.lineages.map((row) => row.signed_transaction_hash).sort(),
  "independent reviewed repository evidence diverges from registry",
);

const hashes = new Set();
const supersededCrossRecoveryLineages = new Set([
  "cross_recovery_guarded_10246_base_send_to_ops",
  "cross_recovery_guarded_10246_base_spend",
  "cross_recovery_guarded_10246_ethereum_send_to_ops",
  "cross_recovery_guarded_10246_ethereum_spend",
  "cross_recovery_legacy_25_usdc_2500_void_delivery",
]);
const reviewedStalenessUnprovenLineages = new Set([
  "legacy_ops_treasury_seed_live",
  "legacy_wc_to_void_first_settlement",
]);
const localDevnetStalenessUnprovenLineages = new Set([
  "wc_devnet_temp_wallet_approve",
  "wc_devnet_temp_wallet_swap",
]);
const inclusionOnlyLineages = new Set([
  "private_chain2050_recovery_sequence_block_37368",
  "private_chain2050_recovery_sequence_block_37369",
  "private_chain2050_confirmed_buy_void_delivery",
  "private_chain2050_recovery_sequence_block_37371",
  "buy_void_fulfillment_deployment",
  "buy_void_treasury_send_to_ops",
  "buy_void_ops_spend_fulfillment",
]);

for (const row of registry.lineages) {
  if (supersededCrossRecoveryLineages.has(row.id)) {
    assert.equal(row.signer_address, null, row.id);
    assert.equal(row.transaction_nonce, null, row.id);
    assert.equal(row.frozen_final_nonce, null, row.id);
    assert.equal(row.included_epoch1_block, null, row.id);
    assert.equal(row.stale_under_exact_nonce_continuity, false, row.id);
    assert.equal(row.present_in_current_canonical_retained_history, false, row.id);
    assert.equal(row.historical_disposition, "SUPERSEDED_BY_RECOVERY", row.id);
    assert.equal(row.replay_staleness_proven, false, row.id);
    if (row.id === "cross_recovery_legacy_25_usdc_2500_void_delivery") {
      assert.equal(
        row.signed_transaction_hash,
        legacyCrossRecoveryHash,
      );
      assert.equal(
        row.evidence.includes(
          "ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh",
        ),
        true,
      );
    }
  } else if (localDevnetStalenessUnprovenLineages.has(row.id)) {
    assert.match(row.signer_address, /^0x[0-9a-f]{40}$/, row.id);
    assert.equal(row.transaction_nonce, null, row.id);
    assert.equal(row.frozen_final_nonce, null, row.id);
    assert.equal(row.included_epoch1_block, null, row.id);
    assert.equal(row.stale_under_exact_nonce_continuity, false, row.id);
    assert.equal(row.present_in_current_canonical_retained_history, null, row.id);
    assert.equal(
      row.historical_disposition,
      "LOCAL_DEVNET_CHAIN2050_TEST_RETENTION_OR_NONCE_STALENESS_UNPROVEN",
      row.id,
    );
    assert.equal(row.replay_staleness_proven, false, row.id);
  } else if (reviewedStalenessUnprovenLineages.has(row.id)) {
    assert.equal(row.transaction_nonce, null, row.id);
    assert.equal(row.included_epoch1_block, null, row.id);
    assert.equal(row.stale_under_exact_nonce_continuity, false, row.id);
    assert.equal(row.present_in_current_canonical_retained_history, null, row.id);
    assert.equal(
      row.historical_disposition,
      "REVIEWED_CHAIN2050_HISTORY_RETENTION_OR_NONCE_STALENESS_UNPROVEN",
      row.id,
    );
    assert.equal(row.replay_staleness_proven, false, row.id);
    if (row.signer_address === null) {
      assert.equal(row.frozen_final_nonce, null, row.id);
    } else {
      assert.match(row.signer_address, /^0x[0-9a-f]{40}$/);
      assert.match(row.frozen_final_nonce, /^(?:0|[1-9][0-9]*)$/);
      assert.equal(
        nonceByAddress.get(row.signer_address),
        row.frozen_final_nonce,
        row.id + ": frozen nonce mismatch",
      );
    }
  } else if (row.signer_address === null) {
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
  assert.equal(hashes.has(row.signed_transaction_hash), false);
  hashes.add(row.signed_transaction_hash);
  if (
    !supersededCrossRecoveryLineages.has(row.id) &&
    !reviewedStalenessUnprovenLineages.has(row.id) &&
    !localDevnetStalenessUnprovenLineages.has(row.id)
  ) {
    assert.match(row.included_epoch1_block, /^(?:0|[1-9][0-9]*)$/);
    assert(
      BigInt(row.included_epoch1_block) <=
        BigInt(registry.source_snapshot.final_block_number),
      row.id + ": transaction lies after the frozen snapshot",
    );
    assert.equal(row.stale_under_exact_nonce_continuity, true);
  }
  assert(Array.isArray(row.evidence) && row.evidence.length >= 1);
}

assert.equal(
  sha256(canonical(registry.lineages)),
  registry.lineage_set_sha256,
);
assert.equal(
  registry.lineage_set_sha256,
  "84c3b99115d6dbc9f5ec909c190a1c69e7e692d8123c241f66dac79e66a5741d",
);

assert.deepEqual(registry.interpretation, {
  known_repository_evidence_lineage_count: 20,
  all_known_repository_lineages_included_by_epoch1_freeze: false,
  all_known_repository_lineages_stale_under_exact_nonce_continuity: false,
  all_retained_epoch1_lineages_stale_under_exact_nonce_continuity: true,
  superseded_cross_recovery_lineage_count: 5,
  superseded_cross_recovery_present_in_current_canonical_retained_history: false,
  superseded_cross_recovery_replay_staleness_proven: false,
  reviewed_chain2050_staleness_unproven_lineage_count: 2,
  local_devnet_test_lineage_count: 2,
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
console.log("known_repository_evidence_lineage_count=20");
console.log("recovery_contract_transaction_sequence_bound=true");
console.log("recovery_contract_additional_lineage_count=3");
console.log("deployer_gas_funding_exact_nonce_published=false");
console.log("deployer_gas_funding_stale_by_mined_pre_freeze_signer_continuity=true");
console.log("ops_mainnet0_reviewed_signed_transaction_hash_locations_exhaustive=true");
console.log("registry_excluded_from_independent_evidence_sweep=true");
console.log("independent_ops_mainnet0_hash_count=8");
console.log("recovery_contract_hash_count=4");
console.log("recovery_json_overlap_count=1");
console.log("superseded_cross_recovery_lineage_count=5");
console.log("superseded_cross_recovery_replay_staleness_proven=false");
console.log("legacy_25_usdc_2500_void_cross_recovery_hash_bound=true");
console.log("ops_treasury_seed_reviewed_hash_bound=true");
console.log("wc_to_void_first_settlement_reviewed_hash_bound=true");
console.log("reviewed_chain2050_staleness_unproven_lineage_count=2");
console.log("local_devnet_test_lineage_count=2");
console.log("wc_devnet_temp_wallet_hashes_bound=true");
console.log("all_retained_epoch1_lineages_stale_under_exact_nonce_continuity=true");
console.log("independent_union_hash_count=20");
console.log("recovery_contract_reviewed_signed_transaction_hash_locations_exhaustive=true");
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
console.log("document_root_marker_immutable_during_hash_classification=true");
console.log("all_known_repository_lineages_stale_under_exact_nonce_continuity=false");
console.log("repository_evidence_is_exhaustive_signed_artifact_census=false");
console.log("off_repo_signed_artifact_census_required=true");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
