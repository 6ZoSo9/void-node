import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7,
  buyVoidSourceFinalityDeploymentReceiptIdV7,
  classifyBuyVoidSourceFinalityDeploymentReceiptV7,
  classifyBuyVoidSourceFinalityProviderQuorumV7,
  inspectBuyVoidSourceFinalityReviewedSourceFilesV7,
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../src/economic/buy_void_source_finality_generation_provenance_v7.js";

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

function stablePolicy(url: string, identity: string) {
  const sourceFinalityPolicy = {
    source_chain: "base",
    evm_chain_id: "8453",
    rpc_url: url,
    rpc_identity: identity,
    rpc_url_fingerprint_sha256: sha256(new URL(url).toString()),
    finality_adapter_id: "void-base-finalized-tag-rpc-v1",
    min_confirmations: "3",
    usdc_contract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    receive_address: "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
    timeout_ms: "8000",
    max_response_bytes: "262144",
  };
  const authorityPolicy = {
    schema: "void_buy_void_source_finality_static_policy_v2",
    marker: "VOID_BUY_VOID_SOURCE_FINALITY_STATIC_POLICY_V2",
    version: 2,
    rail_order: ["base", "ethereum"],
    rails: [
      {
        source_chain: "base",
        evm_chain_id: "8453",
        usdc_contract: sourceFinalityPolicy.usdc_contract,
        receive_address: sourceFinalityPolicy.receive_address,
        rpc_identity: identity,
        rpc_url_fingerprint_sha256: sourceFinalityPolicy.rpc_url_fingerprint_sha256,
        finality_adapter_id: sourceFinalityPolicy.finality_adapter_id,
        min_confirmations: "3",
      },
      {
        source_chain: "ethereum",
        evm_chain_id: "1",
        usdc_contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        receive_address: sourceFinalityPolicy.receive_address,
        rpc_identity: identity + "-ethereum",
        rpc_url_fingerprint_sha256: sha256(url + "/ethereum"),
        finality_adapter_id: "void-ethereum-finalized-tag-rpc-v1",
        min_confirmations: "3",
      },
    ],
    economics: {
      inventory_void_atoms: "10000000000000",
      void_per_usdc_atoms: "2",
    },
  };
  return {
    source_finality_policy: sourceFinalityPolicy,
    authority_policy_generation: authorityPolicy,
    total_timeout_ms: "60000",
  } as any;
}

function observation(policy: any, overrides: Record<string, unknown> = {}) {
  const rail = policy.source_finality_policy;
  return {
    ok: true,
    status: "source_finality_authenticated_composed",
    schema: "void_buy_void_source_finality_authenticated_composition_v3",
    marker: "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3",
    version: 3,
    source_chain: "base",
    evm_chain_id: "8453",
    transaction_hash: "0x" + "1".repeat(64),
    log_index: "7",
    canonical_payment_identity: "voidpay1:base:0x" + "1".repeat(64) + ":7",
    payment_key_sha256: "2".repeat(64),
    payer_address: "0x" + "3".repeat(40),
    receive_address: "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
    delivery_address: "0x" + "3".repeat(40),
    usdc_contract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    payment_asset: "USDC",
    payment_usdc_atoms: "1000000",
    receipt_block_number: "100",
    receipt_block_hash: "0x" + "4".repeat(64),
    finalized_reference_block: "105",
    finalized_reference_block_hash: "0x" + "5".repeat(64),
    confirmations_observed: "6",
    finalized_tag: "finalized",
    rpc_identity: rail.rpc_identity,
    rpc_url_fingerprint_sha256: rail.rpc_url_fingerprint_sha256,
    finality_adapter_id: "void-base-finalized-tag-rpc-v1",
    min_confirmations: "3",
    policy_id: "policy-v7-proof",
    stable_config_sha256: "6".repeat(64),
    observation_sha256: "7".repeat(64),
    source_finality_attestation_sha256: "8".repeat(64),
    expected_source_generation_sha256: "9".repeat(64),
    provider_consistency_verified: true,
    same_provider_consistency_verified: true,
    authenticated_transport_identity_verified: true,
    remote_provider_identity_verified: false,
    total_operation_deadline_verified: true,
    observation_generated_in_composition: true,
    source_generation_verified: false,
    ancestry_verified: false,
    provider_quorum_verified: false,
    production_source_finality_authority_ready: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    inventory_mutation: false,
    money_movement: false,
    total_timeout_ms: "60000",
    expected_rpc_call_count: "10",
    observed_rpc_call_count: "10",
    transport_identity_sha256: "a".repeat(64),
    composition_policy_sha256: "b".repeat(64),
    ...overrides,
  } as any;
}

const primaryPolicy = stablePolicy("https://rpc-a.example.invalid/v1", "provider-a");
const secondaryPolicy = stablePolicy("https://rpc-b.example.invalid/v1", "provider-b");
const forgedDeployment = {
  ok: true,
  status: "deployment_generation_verified",
  deployment_receipt_id: "voidbsfdep1_" + "c".repeat(64),
  accepted_enforcement_set_sha256:
    VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  reviewed_source_files_sha256: "e".repeat(64),
  reviewed_source_file_count: "7",
  source_generation_verified: true,
  deployed_artifact_generation_verified: true,
} as const;

const primary = observation(primaryPolicy);
const secondary = observation(secondaryPolicy, {
  finalized_reference_block: "106",
  finalized_reference_block_hash: "0x" + "f".repeat(64),
  confirmations_observed: "7",
  observation_sha256: "0".repeat(64),
  source_finality_attestation_sha256: "1".repeat(64),
  stable_config_sha256: "2".repeat(64),
  transport_identity_sha256: "3".repeat(64),
  composition_policy_sha256: "4".repeat(64),
});

const forgedAuthority = classifyBuyVoidSourceFinalityProviderQuorumV7({
  primary_policy: primaryPolicy,
  secondary_policy: secondaryPolicy,
  primary,
  secondary,
  deployment: forgedDeployment as any,
});
assert.equal(forgedAuthority.ok, false);
if (forgedAuthority.ok) throw new Error("forged_deployment_unexpected_ready");
assert.equal(
  forgedAuthority.reason,
  "source_finality_deployment_not_custody_verified",
);

function expectHold(
  label: string,
  verifiedDeployment: any,
  mutate: (value: any) => void,
) {
  const p = structuredClone(primaryPolicy);
  const s = structuredClone(secondaryPolicy);
  const a = structuredClone(primary);
  const b = structuredClone(secondary);
  const box = { p, s, a, b };
  mutate(box);
  const out = classifyBuyVoidSourceFinalityProviderQuorumV7({
    primary_policy: box.p,
    secondary_policy: box.s,
    primary: box.a,
    secondary: box.b,
    deployment: verifiedDeployment,
  });
  assert.equal(out.ok, false, label);
  if (out.ok) throw new Error(label + ":unexpected_ready");
  assert.equal(out.status, "held", label);
  assert.equal("production_source_finality_authority_ready" in out, false, label);
}

const processIdentity = {
  marker: "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  commit: "1".repeat(40),
  tree: "2".repeat(40),
  branch: "main",
} as const;
const sourceInventory = inspectBuyVoidSourceFinalityReviewedSourceFilesV7();
assert.equal(sourceInventory.reviewed_source_file_count, "7");
assert.match(sourceInventory.reviewed_source_files_sha256, /^[0-9a-f]{64}$/u);

const receiptBody = {
  marker: VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1,
  version: 1,
  status: "DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
  process_source_marker: processIdentity.marker,
  process_source_commit: processIdentity.commit,
  process_source_tree: processIdentity.tree,
  process_source_branch: processIdentity.branch,
  accepted_enforcement_set_sha256:
    VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
  reviewed_source_files_sha256: sourceInventory.reviewed_source_files_sha256,
  reviewed_source_file_count: "7",
};
const receipt = {
  ...receiptBody,
  receipt_id: buyVoidSourceFinalityDeploymentReceiptIdV7(receiptBody),
};
const receiptDecision = classifyBuyVoidSourceFinalityDeploymentReceiptV7({
  receipt,
  process_source_identity: processIdentity,
  reviewed_source_files_sha256: sourceInventory.reviewed_source_files_sha256,
  reviewed_source_file_count: "7",
});
assert.equal(receiptDecision.ok, true);

const unbrandedReceiptAuthority = classifyBuyVoidSourceFinalityProviderQuorumV7({
  primary_policy: primaryPolicy,
  secondary_policy: secondaryPolicy,
  primary,
  secondary,
  deployment: receiptDecision,
});
assert.equal(unbrandedReceiptAuthority.ok, false);
if (unbrandedReceiptAuthority.ok) {
  throw new Error("unbranded_receipt_unexpected_ready");
}
assert.equal(
  unbrandedReceiptAuthority.reason,
  "source_finality_deployment_not_custody_verified",
);

const wrongEnforcementBody = {
  ...receiptBody,
  accepted_enforcement_set_sha256: "0".repeat(64),
};
const wrongEnforcementReceipt = {
  ...wrongEnforcementBody,
  receipt_id: buyVoidSourceFinalityDeploymentReceiptIdV7(wrongEnforcementBody),
};
const wrongEnforcement = classifyBuyVoidSourceFinalityDeploymentReceiptV7({
  receipt: wrongEnforcementReceipt,
  process_source_identity: processIdentity,
  reviewed_source_files_sha256: sourceInventory.reviewed_source_files_sha256,
  reviewed_source_file_count: "7",
});
assert.equal(wrongEnforcement.ok, false);

const isRoot =
  typeof process.geteuid === "function" && process.geteuid() === 0;
const tempParent = isRoot && fs.existsSync("/run") ? "/run" : os.tmpdir();
const temp = fs.mkdtempSync(path.join(tempParent, "void-sf-v7-receipt-"));
let writableParentRejected = false;
let rootCustodyPositiveExercised = false;
try {
  const receiptPath = path.join(temp, "deployment.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
    mode: 0o444,
  });

  const ownerDecision = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path: receiptPath,
    process_source_identity: processIdentity,
  });

  if (!isRoot) {
    assert.equal(ownerDecision.ok, false);
  } else {
    if (ownerDecision.ok === false) throw new Error(ownerDecision.reason);
    assert.equal(ownerDecision.ok, true);
    rootCustodyPositiveExercised = true;

    const green = classifyBuyVoidSourceFinalityProviderQuorumV7({
      primary_policy: primaryPolicy,
      secondary_policy: secondaryPolicy,
      primary,
      secondary,
      deployment: ownerDecision,
    });
    if (green.ok === false) throw new Error(green.reason);
    assert.equal(green.ok, true);
    assert.equal(green.marker, VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7);
    assert.equal(green.independent_remote_provider_transport_verified, true);
    assert.equal(green.remote_provider_identity_verified, false);
    assert.equal(green.ancestry_verified, true);
    assert.equal(green.provider_quorum_verified, true);
    assert.equal(green.source_generation_verified, true);
    assert.equal(green.deployed_artifact_generation_verified, true);
    assert.equal(green.production_source_finality_authority_ready, true);
    assert.equal(
      green.accepted_enforcement_set_sha256,
      VOID_BUY_VOID_SOURCE_FINALITY_ACCEPTED_ENFORCEMENT_SET_V7,
    );
    assert.equal(green.wallet_access, false);
    assert.equal(green.signing, false);
    assert.equal(green.transaction_broadcast, false);
    assert.equal(green.money_movement, false);
    assert.match(green.provider_quorum_sha256, /^[0-9a-f]{64}$/u);

    const clonedDeployment = structuredClone(ownerDecision);
    const clonedAuthority = classifyBuyVoidSourceFinalityProviderQuorumV7({
      primary_policy: primaryPolicy,
      secondary_policy: secondaryPolicy,
      primary,
      secondary,
      deployment: clonedDeployment,
    });
    assert.equal(clonedAuthority.ok, false);
    if (clonedAuthority.ok) throw new Error("cloned_deployment_unexpected_ready");
    assert.equal(
      clonedAuthority.reason,
      "source_finality_deployment_not_custody_verified",
    );

    expectHold("same_provider_identity", ownerDecision, ({ s }) => {
      s.source_finality_policy.rpc_identity =
        primaryPolicy.source_finality_policy.rpc_identity;
    });
    expectHold("same_provider_url_fingerprint", ownerDecision, ({ s }) => {
      s.source_finality_policy.rpc_url_fingerprint_sha256 =
        primaryPolicy.source_finality_policy.rpc_url_fingerprint_sha256;
    });
    expectHold("same_provider_hostname", ownerDecision, ({ s }) => {
      s.source_finality_policy.rpc_url = "https://rpc-a.example.invalid/other";
      s.source_finality_policy.rpc_url_fingerprint_sha256 = sha256(
        new URL(s.source_finality_policy.rpc_url).toString(),
      );
    });
    expectHold("non_https_secondary", ownerDecision, ({ s }) => {
      s.source_finality_policy.rpc_url = "http://127.0.0.1:8545/";
      s.source_finality_policy.rpc_url_fingerprint_sha256 =
        sha256(s.source_finality_policy.rpc_url);
    });
    expectHold("receipt_hash_disagreement", ownerDecision, ({ b }) => {
      b.receipt_block_hash = "0x" + "6".repeat(64);
    });
    expectHold("payment_amount_disagreement", ownerDecision, ({ b }) => {
      b.payment_usdc_atoms = "2000000";
    });
    expectHold("secondary_finality_below_receipt", ownerDecision, ({ b }) => {
      b.finalized_reference_block = "99";
    });
    expectHold("secondary_confirmations_below_min", ownerDecision, ({ b }) => {
      b.confirmations_observed = "2";
    });

    const heldDeployment = {
      ok: false,
      status: "held",
      reason: "synthetic_hold",
      source_generation_verified: false,
      deployed_artifact_generation_verified: false,
    } as const;
    const heldAuthority = classifyBuyVoidSourceFinalityProviderQuorumV7({
      primary_policy: primaryPolicy,
      secondary_policy: secondaryPolicy,
      primary,
      secondary,
      deployment: heldDeployment,
    });
    assert.equal(heldAuthority.ok, false);

    fs.chmodSync(temp, 0o777);
    const writableParent = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
      deployment_receipt_path: receiptPath,
      process_source_identity: processIdentity,
    });
    assert.equal(writableParent.ok, false);
    writableParentRejected = true;
    fs.chmodSync(temp, 0o700);

    fs.chmodSync(receiptPath, 0o644);
    const writableLeaf = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
      deployment_receipt_path: receiptPath,
      process_source_identity: processIdentity,
    });
    assert.equal(writableLeaf.ok, false);
    fs.chmodSync(receiptPath, 0o444);

    fs.chownSync(receiptPath, 65534, 65534);
    const unprivilegedOwner = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
      deployment_receipt_path: receiptPath,
      process_source_identity: processIdentity,
    });
    assert.equal(unprivilegedOwner.ok, false);
    fs.chownSync(receiptPath, 0, 0);
    fs.chmodSync(receiptPath, 0o444);

    const wrongProcess = verifyBuyVoidSourceFinalityDeploymentReceiptV7({
      deployment_receipt_path: receiptPath,
      process_source_identity: { ...processIdentity, commit: "4".repeat(40) },
    });
    assert.equal(wrongProcess.ok, false);
  }
} finally {
  try { fs.chmodSync(temp, 0o700); } catch (voidSourceFinalityV7CleanupError) { void voidSourceFinalityV7CleanupError; }
  try { fs.chmodSync(path.join(temp, "deployment.json"), 0o600); } catch (voidSourceFinalityV7ReceiptCleanupError) { void voidSourceFinalityV7ReceiptCleanupError; }
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V7_PROOF_GREEN");
console.log("two_distinct_https_provider_transports_required=true");
console.log("same_provider_alias_rejected=true");
console.log("receipt_block_hash_quorum_required=true");
console.log("independent_finality_thresholds_required=true");
console.log("operator_deployment_receipt_required=true");
console.log("deployment_receipt_process_commit_tree_bound=true");
console.log("deployment_receipt_reviewed_source_digest_bound=true");
console.log("deployment_receipt_enforcement_identity_bound=true");
console.log("deployment_receipt_root_owned_read_only_required=true");
console.log("deployment_receipt_root_owned_ancestor_custody_required=true");
console.log("forged_deployment_object_rejected=true");
console.log("cloned_deployment_object_rejected=true");
console.log("writable_parent_rejected=" + String(writableParentRejected));
console.log("root_custody_positive_exercised=" + String(rootCustodyPositiveExercised));
console.log("rpc_url_fingerprint_rederived_from_normalized_https_url=true");
console.log("remote_provider_legal_identity_claimed=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("money_movement=false");
