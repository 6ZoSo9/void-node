#!/usr/bin/env node
// Source-only E2 presale configuration qualification. Reads checked-in public
// JSON and constants; never reads a credential or contacts Chain 2050.
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
} from "../src/economic/buy_void_epoch2_credential_source_binding_v1.js";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";

const OLD_PATH = "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json";
const E2_PATH = "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const TARGET_PATH = "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const DEST_PATH = "ops/mainnet0/economic-epoch2-contract-holder-destination-manifest-v1.json";
const parse = (name: string): any => {
  const body = fs.readFileSync(name, "utf8");
  assert.ok(body.length >= 2 && body.length <= 65536, name + "_size_hold");
  return JSON.parse(body);
};
const old = parse(OLD_PATH);
const epoch2 = parse(E2_PATH);
const target = parse(TARGET_PATH);
const dest = parse(DEST_PATH);
const prior = old.candidate_configuration as Record<string, string>;
const forbidden = [
  "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID",
  "CREDENTIALS_DIRECTORY",
] as const;
const changes = new Set([
  "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID",
]);
const expectedKeys = [
  ...Object.keys(prior).filter(key => !forbidden.includes(key as any)),
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID",
].sort();
const chosen = dest.destinations.find(
  (x: any) => x.successor_label === "VoidEpoch2PresaleFulfillmentV1",
);
assert.equal(old.status, "dormant_candidate_verified_pending_activation_authorization");
assert.equal(target.selection.rpc_url, VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1);
assert.equal(target.selection.production_rpc_target_selected, true);
assert.equal(chosen.source_address.toLowerCase(),
  prior.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS);
assert.equal(chosen.legacy_authority_address.toLowerCase(),
  prior.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS);
assert.equal(chosen.legacy_authority_migrates, false);
assert.equal(chosen.successor_address, VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1);
assert.equal(chosen.successor_authority_address,
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1);

const keysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((key, i) => key === b[i]);

function sourceQualified(value: any): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.marker !== "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V1" ||
      value.version !== 1 ||
      value.status !== "EPOCH2_SOURCE_CANDIDATE_SIGNER_CREDENTIAL_AND_ACTIVATION_HOLD" ||
      value.canonical_chain_id !== 2050 || value.execution_epoch !== 2 ||
      value.epoch2_presale_contract !== VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
      value.epoch2_fulfiller_public_address !==
        VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 ||
      value.source_prior_candidate_path !== OLD_PATH ||
      value.selected_production_target_path !== TARGET_PATH) return false;
  const c = value.candidate_configuration;
  if (!c || typeof c !== "object" || Array.isArray(c) ||
      !keysEqual(Object.keys(c).sort(), expectedKeys)) return false;
  for (const key of expectedKeys) {
    if (typeof c[key] !== "string") return false;
    if (!changes.has(key) && c[key] !== prior[key]) return false;
  }
  if (c.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED !== "0" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED !== "0" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL !==
        VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS !==
        VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
      c.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS !==
        VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 ||
      c.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID !==
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1 ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI !== "0" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS !== "15000" ||
      c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT !== "320000") return false;
  const proof = value.signer_credential_state;
  if (!proof || typeof proof !== "object" || Array.isArray(proof) ||
      !keysEqual(Object.keys(proof).sort(), [
        "credential_path_selected",
        "epoch2_credential_binding_evidence_id",
        "legacy_wallet_credential_reuse_authorized",
        "private_key_material_read",
        "signer_offchain_control_proven",
        "systemd_credential_identity_proven",
      ])) return false;
  if (proof.epoch2_credential_binding_evidence_id !== null ||
      proof.signer_offchain_control_proven !== false ||
      proof.systemd_credential_identity_proven !== false ||
      proof.legacy_wallet_credential_reuse_authorized !== false ||
      proof.credential_path_selected !== false ||
      proof.private_key_material_read !== false) return false;
  const authority = value.authority;
  if (!authority || typeof authority !== "object" || Array.isArray(authority) ||
      authority.candidate_only !== true) return false;
  for (const [key, v] of Object.entries(authority)) {
    if (key !== "candidate_only" && v !== false) return false;
  }
  return Array.isArray(value.explicit_remaining_gates) &&
    value.explicit_remaining_gates.length >= 6 &&
    value.explicit_remaining_gates.includes(
      "independently_attest_systemd_credential_identity_and_active_signing_capability",
    );
}

assert.equal(sourceQualified(epoch2), true);
const bad = (name: string, f: (x: any) => void) => {
  const altered = structuredClone(epoch2);
  f(altered);
  assert.equal(sourceQualified(altered), false, name);
};
bad("legacy_rpc_does_not_reenter", x => {
  x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL =
    prior.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL;
});
bad("legacy_contract_does_not_reenter", x => {
  x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS =
    prior.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS;
});
bad("legacy_wallet_does_not_reenter", x => {
  x.candidate_configuration.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS =
    prior.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS;
});
bad("tampered_public_e2_source_binding", x => {
  x.candidate_configuration.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID =
    "f".repeat(64);
});
bad("missing_public_e2_source_binding", x => {
  delete x.candidate_configuration.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID;
});
bad("old_credential_binding_not_inherited", x => {
  x.candidate_configuration.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID =
    prior.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID;
});
bad("old_credential_directory_not_inherited", x => {
  x.candidate_configuration.CREDENTIALS_DIRECTORY =
    prior.CREDENTIALS_DIRECTORY;
});
bad("old_priority_fee_holds_when_zero_price", x => {
  x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI =
    prior.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI;
});
bad("intake_enable_forbidden", x => {
  x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED = "1";
});
bad("apply_enable_forbidden", x => {
  x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED = "1";
});
bad("false_signer_attestation_forbidden", x => {
  x.signer_credential_state.systemd_credential_identity_proven = true;
});
bad("credential_evidence_not_minted", x => {
  x.signer_credential_state.epoch2_credential_binding_evidence_id = "a".repeat(64);
});
bad("false_activation_authority_forbidden", x => {
  x.authority.public_presale_activation = true;
});
bad("candidate_key_injection_forbidden", x => {
  x.candidate_configuration.PRIVATE_KEY = "DO_NOT_ACCEPT";
});
assert.equal(
  Math.ceil(154388 * Number(epoch2.candidate_configuration
    .VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS) / 10000),
  231582,
);
assert.ok(231582 <= Number(epoch2.candidate_configuration
  .VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT));

console.log("VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V1_PROOF_GREEN");
console.log("exact_successor_rpc_contract_fulfiller=true");
console.log("epoch2_zero_priority_fee_source_bound=true");
console.log("historical_july_purchase_configuration_untouched=true");
console.log("old_credential_binding_and_path_excluded=true");
console.log("unknown_inputs_and_premature_activation_hold=true");
console.log("source_only=true");
console.log("runtime_credential_installed_verified=false");
console.log("customer_safe_to_pay=false");
