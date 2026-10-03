import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Wallet } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  buyLaunchLiveActivationReceiptIdV1,
  buyLaunchLiveActivationTypedDataV1,
  classifyBuyLaunchGateV1,
  classifyBuyLaunchLiveActivationLeaseV1,
  readBuyLaunchGateV1,
  readBuyLaunchLiveActivationV1,
  readBuyLaunchSourceGateV1,
  verifyBuyLaunchLiveActivationSignatureV1,
  verifyBuyLaunchLiveActivationSovereignSignatureV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";
import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

const production = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const coupled = JSON.parse(
  fs.readFileSync("ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json", "utf8"),
);
const successor = JSON.parse(
  fs.readFileSync("ops/mainnet0/economic-evm-successor-migration-candidate-v1.json", "utf8"),
);

const currentSource = classifyBuyLaunchGateV1({ production, coupled, successor });
assert.equal(currentSource.ready, false);
assert.equal(currentSource.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.deepEqual(readBuyLaunchSourceGateV1(), currentSource);

const currentAdmission = readBuyLaunchGateV1({});
assert.equal(currentAdmission.ready, false);
assert.equal(currentAdmission.source_ready, false);
assert.equal(currentAdmission.live_activation_ready, false);
assert.equal(currentAdmission.live_activation_receipt_id, null);
assert.equal(currentAdmission.live_activation_signer, null);

const readyProduction = structuredClone(production);
Object.assign(readyProduction, {
  status: "source_ready",
  coupled_activation_ready: true,
  bounded_canary_green: true,
  wc_ledger_persistence_verified: true,
  quote_reserve_custody_verified: true,
  participant_opening_claim_policy_ready: true,
  duplicate_replay_protection_proven: true,
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
  market_vault_address: "0x1111111111111111111111111111111111111111",
  market_vault_runtime_code_sha256: "1".repeat(64),
});

const readyCoupled = structuredClone(coupled);
readyCoupled.status = "SOURCE_READY";
for (const key of Object.keys(readyCoupled.gates)) readyCoupled.gates[key] = true;

const currentSuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(successor);
assert.equal(currentSuccessorDecision.ok, false);
assert.equal(currentSuccessorDecision.status, "HOLD");

const readySuccessor = structuredClone(successor);
readySuccessor.status = "SOURCE_READY";
readySuccessor.public_verification.successor_state_root_public_void_anchor_ready = true;
readySuccessor.public_verification.public_balance_receipt_code_verification_ready = true;
const readySuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(readySuccessor);
assert.equal(readySuccessorDecision.ok, true);
assert.equal(readySuccessorDecision.status, "SOURCE_READY");

const canonicalReady = classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate: readyProduction,
  coupled_candidate: readyCoupled,
  successor_migration_candidate: readySuccessor,
});
assert.equal(canonicalReady.ok, true);
assert.equal(canonicalReady.status, "SOURCE_READY");
assert.equal(canonicalReady.marker, VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1);

const sourceReady = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor: readySuccessor,
});
assert.equal(sourceReady.ready, true);
assert.equal(sourceReady.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.equal(sourceReady.composition_id, canonicalReady.composition_id);

// The historical false-positive class: every sampled top-level gate can be true
// while a nested reviewed policy binding has drifted. Canonical composition must
// reject it before the public-intake gate sees SOURCE_READY.
const nestedPolicyDrift = structuredClone(readyCoupled);
nestedPolicyDrift.opening_concentration_sybil_policy_contract
  .runtime_enforcement_verified = true;
for (const key of Object.keys(nestedPolicyDrift.gates)) {
  assert.equal(nestedPolicyDrift.gates[key], true);
}
const canonicalNestedDrift = classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate: readyProduction,
  coupled_candidate: nestedPolicyDrift,
  successor_migration_candidate: readySuccessor,
});
assert.equal(canonicalNestedDrift.ok, false);
assert.equal(canonicalNestedDrift.status, "HOLD");
assert.match(
  canonicalNestedDrift.reason,
  /opening_concentration_sybil_policy_contract_mismatch:runtime_enforcement_verified/,
);
assert.equal(
  classifyBuyLaunchGateV1({
    production: readyProduction,
    coupled: nestedPolicyDrift,
    successor: readySuccessor,
  }).ready,
  false,
);

// SOURCE_READY alone is explicitly not live activation authority.
const withoutLiveEvidence = readBuyLaunchLiveActivationV1(sourceReady, {});
assert.equal(withoutLiveEvidence.ready, false);
assert.equal(
  withoutLiveEvidence.reason,
  "live_coupled_activation_evidence_not_ready",
);

const syntheticActivationWallet = new Wallet(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticSovereignWallet = new Wallet(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-live-"));
try {
  fs.chmodSync(tmp, 0o700);
  const receiptPath = path.join(tmp, "activation.json");
  const nowMs = 1791014400000;
  const activationGeneration = "0x" + "b".repeat(64);
  const receiptBody = {
    activated_at_ms: nowMs,
    activation_generation: activationGeneration,
    activation_nonce: "0x" + "a".repeat(64),
    activation_signer: syntheticActivationWallet.address.toLowerCase(),
    sovereign_signer: syntheticSovereignWallet.address.toLowerCase(),
    buy_void_private_runtime_active: true,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    expires_at_ms: nowMs + 120_000,
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
    public_buy_request_intake_authorized: true,
    public_presale_active: true,
    runtime_or_launch_evidence: true,
    same_launch_ceremony: true,
    source_composition_id: sourceReady.composition_id,
    source_ready_only: false,
    status: "COUPLED_PUBLIC_LAUNCH_ACTIVE",
    version: 1,
    wc_void_market_active: true,
  };
  const unsignedReceipt = {
    ...receiptBody,
    activation_receipt_id:
      buyLaunchLiveActivationReceiptIdV1(receiptBody),
  };
  const typed = buyLaunchLiveActivationTypedDataV1(unsignedReceipt);
  const activationSignature =
    await syntheticActivationWallet.signTypedData(
      typed.domain,
      typed.types,
      typed.value,
    );
  const sovereignSignature =
    await syntheticSovereignWallet.signTypedData(
      typed.domain,
      typed.types,
      typed.value,
    );
  const receipt = {
    ...unsignedReceipt,
    activation_signature: activationSignature,
    sovereign_signature: sovereignSignature,
  };

  const syntheticSignature =
    verifyBuyLaunchLiveActivationSignatureV1(
      receipt,
      syntheticActivationWallet.address,
    );
  assert.equal(syntheticSignature.verified, true);
  assert.equal(
    syntheticSignature.recovered_signer,
    syntheticActivationWallet.address.toLowerCase(),
  );
  assert.equal(
    verifyBuyLaunchLiveActivationSignatureV1(
      receipt,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    ).verified,
    false,
  );
  const syntheticSovereignSignature =
    verifyBuyLaunchLiveActivationSovereignSignatureV1(
      receipt,
      syntheticSovereignWallet.address,
    );
  assert.equal(syntheticSovereignSignature.verified, true);
  assert.equal(
    syntheticSovereignSignature.recovered_signer,
    syntheticSovereignWallet.address.toLowerCase(),
  );
  assert.equal(
    verifyBuyLaunchLiveActivationSovereignSignatureV1(
      receipt,
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
    ).verified,
    false,
  );

  const receiptBytes = Buffer.from(
    JSON.stringify(receipt, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(receiptPath, receiptBytes, { mode: 0o600, flag: "wx" });
  const receiptSha256 =
    crypto.createHash("sha256").update(receiptBytes).digest("hex");
  const confirmation =
    "activate-coupled-public-buy-v1:" +
    receipt.activation_generation +
    ":" +
    receipt.activation_receipt_id +
    ":" +
    receiptSha256;
  const liveEnv = {
    VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH: receiptPath,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256: receiptSha256,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_GENERATION: activationGeneration,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM: confirmation,
  };

  // A self-created, content-addressed receipt is not production authority.
  // Even with valid EIP-712 structure and matching file/env bindings it must
  // remain closed unless signed by the fixed launch-controller identity.
  const live = readBuyLaunchLiveActivationV1(
    sourceReady,
    liveEnv,
    nowMs + 1,
  );
  assert.equal(live.ready, false);
  assert.equal(live.activation_signer, null);

  const liveLease = classifyBuyLaunchLiveActivationLeaseV1(
    receipt,
    activationGeneration,
    nowMs + 1,
  );
  assert.equal(liveLease.ready, true);

  // The same otherwise-valid signed receipt is no longer live after expiry.
  assert.equal(
    classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      activationGeneration,
      receipt.expires_at_ms,
    ).ready,
    false,
  );

  // Deactivation or a newer ceremony advances the external generation.
  assert.equal(
    classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      "0x" + "c".repeat(64),
      nowMs + 1,
    ).ready,
    false,
  );

  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, {
      ...liveEnv,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM: "",
    }, nowMs + 1).ready,
    false,
  );
  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, {
      ...liveEnv,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256: "0".repeat(64),
    }, nowMs + 1).ready,
    false,
  );
  assert.equal(
    readBuyLaunchLiveActivationV1(
      { ...sourceReady, composition_id: "sha256:" + "0".repeat(64) },
      liveEnv,
      nowMs + 1,
    ).ready,
    false,
  );

  fs.chmodSync(receiptPath, 0o644);
  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, liveEnv, nowMs + 1).ready,
    false,
  );
  fs.chmodSync(receiptPath, 0o600);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

for (const mutate of [
  (p, _c, _s) => { p.status = "hold"; },
  (p, _c, _s) => { p.coupled_activation_ready = false; },
  (_p, c, _s) => { c.gates.bounded_canary_green = false; },
  (_p, c, _s) => {
    c.shared_post_discovery_reconciliation.coupled_launch_id =
      "sha256:" + "0".repeat(64);
  },
  (_p, c, _s) => { c.wc_void_opening.protocol_void_inventory_atoms = "1"; },
  (p, _c, _s) => { p.authority.market_activation = true; },
  (_p, c, _s) => { delete c.authority.funds_movement; },
  (_p, _c, s) => {
    s.public_verification.successor_state_root_public_void_anchor_ready = false;
  },
]) {
  const p = structuredClone(readyProduction);
  const c = structuredClone(readyCoupled);
  const s = structuredClone(readySuccessor);
  mutate(p, c, s);
  assert.equal(
    classifyBuyLaunchGateV1({
      production: p,
      coupled: c,
      successor: s,
    }).ready,
    false,
  );
}

const gateSource = fs.readFileSync(
  "src/economic/buy_void_coupled_launch_gate_v1.mjs",
  "utf8",
);
assert.match(gateSource, /classifyVoidWcVoidCoupledLaunchReadinessV1/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_GENERATION/);
assert.match(gateSource, /expires_at_ms/);
assert.match(gateSource, /LIVE_ACTIVATION_MAX_LEASE_MS/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM/);
assert.match(gateSource, /readBuyLaunchLiveActivationV1/);
assert.match(gateSource, /classifyBuyLaunchLiveActivationLeaseV1/);
assert.doesNotMatch(gateSource, /testOnlyReadBuyLaunchLiveActivationV1/);
assert.match(gateSource, /verifyTypedData/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1/);
assert.match(gateSource, /verifyBuyLaunchLiveActivationSovereignSignatureV1/);

console.log("VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN");
console.log("current_canonical_source_ready=false");
console.log("coupled_launch_id=" + VOID_BUY_COUPLED_LAUNCH_ID_V1);
console.log("canonical_coupled_launch_classifier_required=true");
console.log("nested_policy_false_positive_blocked=true");
console.log("source_ready_alone_can_open_intake=false");
console.log("live_coupled_activation_receipt_required=true");
console.log("live_receipt_digest_binding_required=true");
console.log("live_activation_lease_expiry_required=true");
console.log("live_activation_generation_match_required=true");
console.log("stale_live_activation_receipt_replay=false");
console.log("launch_controller_eip712_signature_required=true");
console.log("sovereign_eip712_cosignature_required=true");
console.log("fixed_launch_controller=" + VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1);
console.log("fixed_sovereign_cosigner=" + VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1);
console.log("explicit_operator_confirmation_required=true");
console.log("self_authored_receipt_cannot_open_intake=true");
console.log("synthetic_live_receipt_fixture_is_not_production_evidence=true");
console.log("funds_movement=false");
