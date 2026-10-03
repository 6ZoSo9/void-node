import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../../tools/void-economic-evm-successor-migration-v1.mjs";

export const VOID_BUY_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED = "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR = "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

const PRODUCTION_AUTHORITY_KEYS = Object.freeze([
  "funds_movement",
  "liquidity_movement",
  "market_activation",
  "public_presale_activation",
  "transaction_broadcast",
  "transaction_signing",
  "treasury_transfer",
  "wallet_or_signer_access",
]);
const COUPLED_GATE_KEYS = Object.freeze([
  "bounded_canary_green",
  "coupled_activation_ready",
  "economic_intent_ttl_and_caps_ready",
  "opening_claim_transfer_or_refund_binding_ready",
  "opening_commitment_window_policy_ready",
  "opening_concentration_and_sybil_limits_ready",
  "opening_minimum_real_wc_depth_policy_ready",
  "opening_nonproduction_wc_exclusion_ready",
  "opening_participant_provenance_and_eligibility_ready",
  "participant_post_purchase_voidtoken_control_ready",
  "public_quote_disclosure_ready",
  "quote_reserve_custody_verified",
  "reverse_void_to_wc_settlement_ready",
  "shared_post_discovery_model_reconciled",
  "system_sponsored_execution_anti_grief_ready",
  "wc_ledger_persistence_verified",
]);
const COUPLED_AUTHORITY_KEYS = Object.freeze([
  "chain2050_write",
  "funds_movement",
  "genesis_build",
  "inventory_funding",
  "liquidity_movement",
  "market_activation",
  "migration_activation",
  "private_key_access",
  "public_presale_activation",
  "runtime_mutation",
  "state_export",
  "transaction_broadcast",
  "transaction_construction",
  "transaction_signing",
  "wallet_or_signer_access",
]);
const SUCCESSOR_LAUNCH_AUTHORITY_KEYS = Object.freeze([
  "chain2050_write",
  "contract_deployment",
  "genesis_build",
  "money_movement",
  "private_key_access",
  "public_activation",
  "rpc_call",
  "source_only",
  "state_export",
  "token_movement",
  "transaction_broadcast",
  "transaction_construction",
  "transaction_signing",
  "wallet_access",
]);

function read(relativePath) {
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("buy_launch_source_invalid");
  }
  return value;
}
function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value, expected) {
  if (!object(value)) return false;
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}
function exactAllFalse(value, expected) {
  return (
    exactKeys(value, expected) &&
    expected.every((key) => value[key] === false)
  );
}
function exactAllTrue(value, expected) {
  return (
    exactKeys(value, expected) &&
    expected.every((key) => value[key] === true)
  );
}
function sourceOnlyAuthority(value) {
  return (
    exactKeys(value, SUCCESSOR_LAUNCH_AUTHORITY_KEYS) &&
    value.source_only === true &&
    SUCCESSOR_LAUNCH_AUTHORITY_KEYS.every(
      (key) => key === "source_only"
        ? value[key] === true
        : value[key] === false,
    )
  );
}
function successorSourceReady(value) {
  if (!sourceOnlyAuthority(value?.launch_authority)) return false;
  try {
    const decision = classifyVoidEconomicEvmSuccessorMigrationV1(value);
    return (
      decision?.ok === true &&
      decision.status === "SOURCE_READY" &&
      decision.migration_authorized === false &&
      decision.public_activation_authorized === false &&
      decision.money_movement_authorized === false
    );
  } catch {
    return false;
  }
}

export function classifyBuyLaunchGateV1({ production, coupled, successor }) {
  const ready =
    production?.marker === "VOID_WC_VOID_PRODUCTION_CANDIDATE_V1" &&
    production.version === 1 &&
    production.status === "source_ready" &&
    production.chain_id === 2050 &&
    production.pair === "WC_VOID" &&
    production.coupled_activation_ready === true &&
    production.bounded_canary_green === true &&
    production.wc_ledger_persistence_verified === true &&
    production.quote_reserve_custody_verified === true &&
    production.participant_opening_claim_policy_ready === true &&
    production.duplicate_replay_protection_proven === true &&
    production.market_vault_independently_verified === true &&
    production.inventory_funded === true &&
    production.inventory_lock_proven === true &&
    ADDRESS.test(String(production.market_vault_address || "")) &&
    SHA256.test(String(production.market_vault_runtime_code_sha256 || "")) &&
    exactAllFalse(production.authority, PRODUCTION_AUTHORITY_KEYS) &&
    coupled?.marker === "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" &&
    coupled.version === 1 &&
    coupled.status === "SOURCE_READY" &&
    coupled.chain_id === 2050 &&
    coupled.execution_epoch === 2 &&
    coupled.presale_wc_void_coupled_launch_required === true &&
    coupled.shared_post_discovery_reconciliation?.coupled_launch_id ===
      VOID_BUY_COUPLED_LAUNCH_ID_V1 &&
    exactAllTrue(coupled.gates, COUPLED_GATE_KEYS) &&
    exactAllFalse(coupled.authority, COUPLED_AUTHORITY_KEYS) &&
    production.protocol_void_inventory_atoms ===
      coupled.wc_void_opening?.protocol_void_inventory_atoms &&
    successor?.marker === "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1" &&
    successor.version === 1 &&
    successor.source_execution_layer?.chain_id === 2050 &&
    successor.successor_execution_layer?.execution_epoch === 2 &&
    sourceOnlyAuthority(successor.launch_authority) &&
    successorSourceReady(successor);
  return Object.freeze({
    ready,
    id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    reason: ready ? null : "canonical_coupled_launch_source_not_ready",
  });
}

export function readBuyLaunchGateV1() {
  try {
    return classifyBuyLaunchGateV1({
      production: read(PRODUCTION),
      coupled: read(COUPLED),
      successor: read(SUCCESSOR),
    });
  } catch (error) {
    void error;
    return Object.freeze({
      ready: false,
      id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
      reason: "canonical_coupled_launch_source_unavailable",
    });
  }
}
