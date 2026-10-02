#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  SELECTED_STATUS,
  loadProductionEpoch2RpcTargetV1,
} from "../tools/void-production-epoch2-rpc-target-v1.mjs";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  throw new Error("source_promotion_canonical_value_invalid");
}

const targetBytes = fs.readFileSync(
  "ops/mainnet0/production-epoch2-rpc-target-v1.json",
);
const target = JSON.parse(targetBytes.toString("utf8"));
const promotionBytes = fs.readFileSync(
  "ops/mainnet0/production-epoch2-rpc-target-promotion-v1.json",
);
const promotion = JSON.parse(promotionBytes.toString("utf8"));
const datanet = JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-registry-deployer-resolution-target-v1.json",
  "utf8",
));
const datanetSchema = JSON.parse(fs.readFileSync(
  "schemas/datanet-registry-deployer-resolution-target-v1.schema.json",
  "utf8",
));
const currentTruth = fs.readFileSync(
  "ops/mainnet/CURRENT_TRUTH.md",
  "utf8",
);
const checkedInAdmission = JSON.parse(fs.readFileSync(
  "ops/mainnet0/evidence/production-epoch2-rpc-selection-v1/promotion-apply-admission.json",
  "utf8",
));

assert.equal(
  sha256(targetBytes),
  "305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd",
);

const loaded = loadProductionEpoch2RpcTargetV1();
assert.equal(loaded.evaluation.status, SELECTED_STATUS);
assert.equal(loaded.evaluation.production_rpc_target_selected, true);
assert.equal(loaded.evaluation.rpc_url, "http://127.0.0.1:18553/");
assert.equal(loaded.evaluation.evidence_aware_selection_verified, true);
assert.equal(
  loaded.promotion.promotion_id,
  "voidpe2rpctprom1_754cf0701f226a8ac47375757a42aa5dc328110ac89346c699b05565813b382f",
);
assert.equal(
  loaded.promotion.promotion_admission_id,
  "voidpe2rpctapply1_f76ce9f3d147a6097910947e3a8735664ff81bea07d1940ebdb663102589b040",
);
assert.equal(
  loaded.promotion.promotion_admission_sha256,
  "ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5",
);
assert.equal(
  loaded.promotion.admitted_main_head,
  "ac352fe966c8737a8e143475d28f85f80c0a096f",
);
assert.equal(loaded.promotion.evidence_packet.checked_in_evidence_verified, true);
assert.equal(
  loaded.promotion.evidence_packet.exact_evidence_semantics_reexecuted,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.selected_candidate_recompiled_from_exact_evidence,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.promotion_admission_content_address_reverified,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.historical_source_trees_reverified,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.source_lineage_ancestry_reverified,
  true,
);
for (const sourceCommit of [
  checkedInAdmission.current_source.head,
  ...checkedInAdmission.source_lineage_ancestor_commits,
]) {
  assert.match(sourceCommit, /^[0-9a-f]{40}$/u);
  execFileSync(
    "git",
    ["merge-base", "--is-ancestor", sourceCommit, "HEAD"],
    { stdio: "ignore" },
  );
}
assert.equal(loaded.promotion.evidence_packet.checked_in_evidence_verified, true);
assert.equal(
  loaded.promotion.evidence_packet.activation_plan_sha256,
  "86128119c45197b04dd127986349c42c971a4287739864f44a50c0e6dc386a7f",
);
assert.equal(
  loaded.promotion.evidence_packet.activation_receipt_sha256,
  "1a9837b42bf20439d939f54ca8bd9c3a81d91d7a8cf83ddd54f58929fc2f5e13",
);
assert.equal(
  loaded.promotion.evidence_packet.runtime_observation_sha256,
  "cd1630a9742b49f55e6bfed2b4c0344e4b7a994307f8945f1e5404d2eb681d32",
);
assert.equal(
  loaded.promotion.evidence_packet.selected_candidate_sha256,
  "305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd",
);
assert.equal(
  loaded.promotion.evidence_packet.promotion_apply_admission_sha256,
  "ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5",
);

const promotionMaterial = structuredClone(promotion);
const promotionId = promotionMaterial.promotion_id;
delete promotionMaterial.promotion_id;
assert.equal(
  promotionId,
  "voidpe2rpctprom1_" +
    sha256(Buffer.from(canonical(promotionMaterial), "utf8")),
);
assert.equal(promotion.candidate.file_sha256, sha256(targetBytes));
assert.equal(
  promotion.candidate.activation_plan_id,
  target.selection.activation_plan_id,
);
assert.equal(
  promotion.candidate.activation_receipt_id,
  target.selection.activation_receipt_id,
);
assert.equal(
  promotion.candidate.activation_receipt_sha256,
  target.selection.activation_receipt_sha256,
);
assert.equal(
  promotion.candidate.runtime_observation_id,
  target.selection.runtime_observation_id,
);
assert.equal(
  promotion.candidate.runtime_observation_sha256,
  target.selection.runtime_observation_sha256,
);
assert.equal(promotion.admission.source_lineage_ancestor_current_main, true);
assert.equal(promotion.admission.canonical_target_write, false);
assert.equal(promotion.admission.repository_write, false);
assert.equal(promotion.admission.transaction_broadcast, false);
assert.equal(promotion.admission.migration_authorized, false);
assert.equal(promotion.admission.funds_movement, false);

for (const [key, value] of Object.entries(promotion.authority)) {
  if (key === "source_only") assert.equal(value, true, key);
  else assert.equal(value, false, key);
}

assert.equal(
  datanet.status,
  "PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY",
);
assert.equal(datanet.production_execution_layer.production_rpc_target_selected, true);
assert.equal(
  datanet.production_execution_layer.rpc_url,
  target.selection.rpc_url,
);
assert.equal(
  datanet.production_execution_layer.rpc_url_fingerprint_sha256,
  target.selection.rpc_url_fingerprint_sha256,
);
assert.equal(datanet.production_execution_layer.runtime_active_verified, true);
assert.equal(datanet.production_execution_layer.exact_genesis_bound, true);
assert.equal(
  datanet.production_execution_layer.production_validator_set_bound,
  true,
);
assert.equal(datanet.production_execution_layer.migration_authorized, false);
assert.equal(datanet.production_execution_layer.public_activation_authorized, false);

assert.equal(
  datanetSchema.properties.status.const,
  "PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY",
);
assert.equal(
  datanetSchema.properties.production_execution_layer
    .properties.production_rpc_target_selected.const,
  true,
);
assert.equal(
  datanetSchema.properties.production_execution_layer.properties.rpc_url.const,
  "http://127.0.0.1:18553/",
);

assert.match(
  currentTruth,
  /selected production Epoch-2 RPC is `http:\/\/127\.0\.0\.1:18553\/`/,
);
assert.doesNotMatch(
  currentTruth,
  /still unselected (`rpc_url=null`)/,
);

for (const forbidden of [
  "http://127.0.0.1:8545/",
  "http://127.0.0.1:18550/",
  "http://127.0.0.1:18551/",
  "http://127.0.0.1:18552/",
]) {
  assert.notEqual(target.selection.rpc_url, forbidden);
  assert.notEqual(datanet.production_execution_layer.rpc_url, forbidden);
}

assert.equal(target.authority.transaction_construction, false);
assert.equal(target.authority.transaction_signing, false);
assert.equal(target.authority.transaction_submission, false);
assert.equal(target.authority.transaction_broadcast, false);
assert.equal(target.authority.authoritative_chain2050_write, false);
assert.equal(target.authority.migration_authorized, false);
assert.equal(target.authority.public_presale_activation, false);
assert.equal(target.authority.funds_movement, false);

console.log("VOID_PRODUCTION_EPOCH2_RPC_CANONICAL_SELECTION_V1_PROOF_GREEN");
console.log("canonical_status=" + SELECTED_STATUS);
console.log("production_rpc_url=http://127.0.0.1:18553/");
console.log("candidate_sha256=" + sha256(targetBytes));
console.log("promotion_id=" + promotion.promotion_id);
console.log("promotion_admission_id=" + promotion.admission.promotion_admission_id);
console.log("promotion_admission_sha256=" + promotion.admission.receipt_sha256);
console.log("central_target_and_datanet_resolver_atomic=true");
console.log("evidence_aware_selection_verified=true");
console.log("exact_evidence_semantics_reexecuted=true");
console.log("selected_candidate_recompiled_from_exact_evidence=true");
console.log("promotion_admission_content_address_reverified=true");
console.log("checked_in_evidence_packet_verified=true");
console.log("checked_in_evidence_source_history_ancestor_current_head=true");
console.log("historical_epoch1_8545_forbidden=true");
console.log("isolated_18550_18551_18552_forbidden=true");
console.log("transaction_authorized=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
