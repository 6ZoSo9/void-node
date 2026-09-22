#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  createEmptyBuyVoidHistoryIndexV1,
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierTxIntentBindingV1,
  verifyBuyVoidHistoryCarrierTxIntentV1,
} from "../src/economic/buy_void_history_carrier_v1.js";

const ROOT = process.cwd();
const FILE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-production-history-carrier-attestation-v1.json",
);
const MARKER =
  "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_ATTESTATION_V1";
const EXPECTED_ATTESTATION_ID =
  "voidbvhca1_0b7f99cbbf4dfbd8c3673d8915350b1d972bf1579d3798a52ab052eb3acb3465";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non-canonical-number:" + String(value));
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("non-canonical-value:" + typeof value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expected].sort(),
    label,
  );
}

function git(args: string[]): string {
  return execFileSync("/usr/bin/git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const attestation = JSON.parse(
  fs.readFileSync(FILE, "utf8"),
) as Record<string, any>;

exactKeys(
  attestation,
  [
    "attestation_id",
    "authority",
    "carrier",
    "issue_number",
    "marker",
    "migration",
    "projection",
    "source",
    "version",
  ],
  "top-level attestation keys",
);

assert.equal(attestation.marker, MARKER);
assert.equal(attestation.version, 1);
assert.equal(attestation.issue_number, 1682);
assert.equal(
  attestation.attestation_id,
  EXPECTED_ATTESTATION_ID,
);

const {
  attestation_id: ignoredAttestationId,
  ...core
} = attestation;
assert.equal(
  "voidbvhca1_" + sha256(canonicalJson(core)),
  EXPECTED_ATTESTATION_ID,
  "attestation identity must be canonical-content derived",
);
void ignoredAttestationId;

const source = attestation.source as Record<string, any>;
assert.equal(source.source_pr, 1715);
assert.equal(
  source.source_merge_commit,
  "dddb9cb834a886c1842a46cb425e10069496381e",
);
assert.equal(
  source.observed_repo_head,
  "6117e62e24c7eff35a9c0108a1a458f6225f4954",
);
assert.equal(
  source.observed_repo_tree,
  "420743d69489278c5cce3f8080cb328438d8ad20",
);
assert.equal(source.node_version, "v22.23.2");

assert.equal(
  git(["rev-parse", source.observed_repo_head + "^{tree}"]),
  source.observed_repo_tree,
  "observed source tree mismatch",
);
execFileSync(
  "/usr/bin/git",
  [
    "merge-base",
    "--is-ancestor",
    source.source_merge_commit,
    source.observed_repo_head,
  ],
  {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
  },
);
execFileSync(
  "/usr/bin/git",
  [
    "merge-base",
    "--is-ancestor",
    source.observed_repo_head,
    "HEAD",
  ],
  {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
  },
);

const blobs = source.blobs as Record<string, string>;
const expectedBlobs: Record<string, string> = {
  "scripts/observe_buy_void_legacy_alias_carrier_genesis_precision_v1.ts":
    "9f25bf59744967710f556a0c55b218eb18c650da",
  "src/economic/buy_void_history_carrier_v1.ts":
    "ec8ab7b91293a126cfd0632517af542f21d3bc93",
  "src/economic/buy_void_legacy_alias_carrier_genesis_v1.ts":
    "29c9859606019a031840bd53ab8fc1aa8cb57b4e",
  "src/economic/buy_void_legacy_history_migration_apply_v1.ts":
    "ca33b5afec81435456dc1cd56f4b55c443237060",
  "src/economic/buy_void_legacy_history_migration_plan_v1.ts":
    "94b8377981ef2390efdfd0f9f426ea8766db6efd",
  "src/economic/buy_void_payment_history_projection_v1.ts":
    "d9abe2d601c27bdc76b6a945c293a50e9f7c6051",
  "src/storage/segmented_jsonl_durable_root_v1.ts":
    "0f7d07544e6e4cbc27ffd549d1489d0990575fd5",
  "src/storage/segmented_jsonl_materialized_authority_v1.ts":
    "68b21002aefba652d7150f2c766db06c3fd4433c",
  "src/storage/segmented_jsonl_v1.ts":
    "ae9916df7c6e1428812fd65fe13ce44780969617",
};
assert.deepEqual(blobs, expectedBlobs);
for (const [file, expectedBlob] of Object.entries(expectedBlobs)) {
  assert.equal(
    git(["rev-parse", source.observed_repo_head + ":" + file]),
    expectedBlob,
    "observed source blob mismatch: " + file,
  );
}

const migration = attestation.migration as Record<string, any>;
assert.equal(
  migration.migration_plan_sha256,
  "de939c9fcbdb9f5f39440c689912d3f637ec571913b5f4dd49c2f6d125061be6",
);
assert.equal(
  migration.migration_evidence_id,
  "ac7989d8200282092fdbcae7fab2fbb439b6aadfc37938eb3afa18b512b080a1",
);
assert.equal(
  migration.migration_pointer_id,
  "9729716b11e23e87a804ba07fb1b70bdc4f0d917b6b00f99dbb538e31a622167",
);
assert.equal(
  migration.segmented_durable_root_sha256,
  "eca28c154b89f2c93e2f56b3cb6d74e1305fb23122e0f2f73daeffee681685ac",
);
assert.equal(
  migration.record_sha256,
  "5bef498d6e14b1c716e14e5472e668ae4d4308d2595d5148e22cf11563131338",
);
assert.equal(migration.record_bytes, 1337);

const projection =
  attestation.projection as Record<string, any>;
assert.equal(
  projection.current_projection_fingerprint_sha256,
  "ec0084333d10eaf98ce5d2a7645da9f5dee6cd1c387a8cdb932d975023b4b7ae",
);
assert.equal(
  projection.predecessor_projection_fingerprint_sha256,
  "24f0efdf5b97444373ebf4b4b34506cbfaa1a179c4299d41c7eafa06eb111346",
);
assert.equal(
  projection.effective_payment_history_fingerprint_sha256,
  "219e1ccba72d344cca94d33f4c229749c609665e403463d5cd1252459ef27a50",
);
assert.equal(
  projection.effective_lifecycle_state,
  "inventory_consumed",
);
assert.notEqual(
  projection.current_projection_fingerprint_sha256,
  projection.effective_payment_history_fingerprint_sha256,
);

const carrier = attestation.carrier as Record<string, any>;
const verifiedRoot =
  verifyBuyVoidHistoryCarrierRootV1(
    carrier.carrier_root,
  );
const verifiedIntent =
  verifyBuyVoidHistoryCarrierTxIntentV1(
    carrier.tx_intent,
  );
const binding =
  verifyBuyVoidHistoryCarrierTxIntentBindingV1(
    verifiedIntent,
    verifiedRoot,
  );
assert.deepEqual(binding.carrier_root, verifiedRoot);
assert.deepEqual(binding.intent, verifiedIntent);

const emptyIndex = createEmptyBuyVoidHistoryIndexV1();
assert.equal(
  carrier.empty_index_root_sha256,
  emptyIndex.root_sha256,
);
assert.equal(
  verifiedRoot.carrier_generation,
  1,
);
assert.equal(
  verifiedRoot.previous_carrier_root_sha256,
  null,
);
assert.equal(
  verifiedRoot.pool_id,
  "buy-void-presale-v1",
);
assert.equal(
  verifiedRoot.active_segmented_durable_root_sha256,
  migration.segmented_durable_root_sha256,
);
assert.equal(
  verifiedRoot.active_segmented_store_generation,
  1,
);
assert.equal(
  verifiedRoot.payment_history_fingerprint_sha256,
  projection.effective_payment_history_fingerprint_sha256,
);
assert.equal(
  verifiedRoot.payment_index_root_sha256,
  "07a59cfe2f0374d52e138787c80a1ec2c1d257303adea0ad8e5692800b59748e",
);
assert.equal(verifiedRoot.committed_void_units, "2000000");
assert.equal(verifiedRoot.reservation_count, "1");
assert.equal(verifiedRoot.obligation_count, "0");
assert.equal(
  verifiedRoot.committing_record_kind,
  "reservation",
);
assert.equal(
  verifiedRoot.committing_record_void_units,
  "2000000",
);
assert.equal(
  verifiedRoot.carrier_root_sha256,
  "32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a",
);

assert.equal(
  verifiedIntent.tx_intent_sha256,
  "f9e5a2fb8224fb110cbe384bfccbab59e1e9646f02c2c0b751a3d2a7d1a76e93",
);
assert.equal(
  verifiedIntent.committing_record_locator
    .segmented_durable_root_sha256,
  migration.segmented_durable_root_sha256,
);
assert.equal(
  verifiedIntent.committing_record_locator.segment_id,
  0xffff_ffff,
);
assert.equal(
  verifiedIntent.committing_record_locator.segment_sha256,
  migration.record_sha256,
);
assert.equal(
  verifiedIntent.committing_record_locator.byte_offset,
  "0",
);
assert.equal(
  verifiedIntent.committing_record_locator.byte_length,
  migration.record_bytes,
);
assert.equal(
  verifiedIntent.committing_record_locator.record_sha256,
  migration.record_sha256,
);

const newPages = [
  ...(carrier.new_pages as Array<{
    sha256: string;
    bytes: number;
  }>),
].sort((left, right) =>
  left.sha256.localeCompare(right.sha256),
);
assert.deepEqual(
  verifiedIntent.new_page_digests,
  newPages.map((page) => page.sha256),
);
assert.deepEqual(newPages, [
  {
    sha256:
      "07a59cfe2f0374d52e138787c80a1ec2c1d257303adea0ad8e5692800b59748e",
    bytes: 248,
  },
]);
assert.equal(
  sha256(canonicalJson(newPages)),
  carrier.page_set_sha256,
);
assert.equal(
  carrier.page_set_sha256,
  "b99383b11f66c04e95d67894fad31f30d074c459f7a8857eccb569bf85ab8cb5",
);
assert.equal(
  carrier.attestation_plan_sha256,
  "ab0cbb3a7317e1ed24eeef7af77db5a4d38ffee417afaaa79ab9f8b5178a219e",
);

const authority =
  attestation.authority as Record<string, any>;
assert.deepEqual(authority, {
  carrier_root_publication: false,
  chain2050_write: false,
  credential_content_read: false,
  designated_host_observation_imported: true,
  filesystem_history_mutation: false,
  funds_movement: false,
  inventory_mutation: false,
  page_publication: false,
  rpc_call: false,
  runtime_activation: false,
  service_action: false,
  source_only_attestation: true,
  transaction_broadcast: false,
  transaction_signing: false,
  treasury_or_liquidity_action: false,
  wallet_or_signer_access: false,
});

console.log(
  "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_ATTESTATION_V1_PROOF_GREEN",
);
console.log(
  "attestation_id=" + attestation.attestation_id,
);
console.log(
  "carrier_root_sha256=" +
    verifiedRoot.carrier_root_sha256,
);
console.log(
  "payment_index_root_sha256=" +
    verifiedRoot.payment_index_root_sha256,
);
console.log(
  "effective_payment_history_fingerprint_sha256=" +
    verifiedRoot.payment_history_fingerprint_sha256,
);
console.log(
  "segmented_durable_root_sha256=" +
    verifiedRoot.active_segmented_durable_root_sha256,
);
console.log(
  "tx_intent_sha256=" +
    verifiedIntent.tx_intent_sha256,
);
console.log(
  "page_set_sha256=" + carrier.page_set_sha256,
);
console.log("page_publication=false");
console.log("carrier_root_publication=false");
console.log("runtime_activation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
