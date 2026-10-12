#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1";

export const VOID_WC_VOID_COUPLED_LAUNCH_READINESS_AUTHORITY_V1 =
  Object.freeze({
    source_classification_only: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    migration_activation: false,
    funds_movement: false,
  });

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function hold(reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
    reason,
    ...extra,
    activation_authority: false,
    funding_authority: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_COUPLED_LAUNCH_READINESS_AUTHORITY_V1,
  });
}

export function classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate,
  coupled_candidate,
  successor_migration_candidate,
}) {
  let productionDecision;
  try {
    productionDecision =
      classifyVoidWcVoidProductionReadinessV1(production_candidate);
  } catch {
    return hold("production_readiness_classifier_failed");
  }
  if (
    productionDecision?.ok !== true ||
    productionDecision.status !== "SOURCE_READY"
  ) {
    return hold("production_readiness_not_source_ready", {
      production_status:
        typeof productionDecision?.status === "string"
          ? productionDecision.status
          : "UNKNOWN",
      production_reason:
        typeof productionDecision?.reason === "string"
          ? productionDecision.reason
          : null,
      production_missing_gates:
        Array.isArray(productionDecision?.missing_gates)
          ? Object.freeze([...productionDecision.missing_gates])
          : Object.freeze([]),
    });
  }

  let coupledDecision;
  try {
    coupledDecision =
      classifyVoidCoupledEconomicSuccessorGateV1(
        coupled_candidate,
        successor_migration_candidate,
      );
  } catch {
    return hold("coupled_readiness_classifier_failed");
  }
  if (
    coupledDecision?.ok !== true ||
    coupledDecision.status !== "SOURCE_READY"
  ) {
    return hold("coupled_readiness_not_source_ready", {
      production_status: "SOURCE_READY",
      coupled_status:
        typeof coupledDecision?.status === "string"
          ? coupledDecision.status
          : "UNKNOWN",
      coupled_reason:
        typeof coupledDecision?.reason === "string"
          ? coupledDecision.reason
          : null,
      coupled_missing_gates:
        Array.isArray(coupledDecision?.missing_gates)
          ? Object.freeze([...coupledDecision.missing_gates])
          : Object.freeze([]),
    });
  }

  if (
    productionDecision.chain_id !== 2050 ||
    productionDecision.pair !== "WC_VOID" ||
    coupledDecision.chain_id !== 2050 ||
    coupledDecision.execution_epoch !== 2 ||
    coupledDecision.presale_wc_void_coupled_launch_required !== true
  ) {
    return hold("coupled_launch_identity_mismatch");
  }
  if (
    productionDecision.protocol_void_inventory_atoms !==
    coupledDecision.protocol_void_inventory_atoms
  ) {
    return hold("coupled_launch_inventory_mismatch");
  }
  if (
    productionDecision.activation_authority !== false ||
    productionDecision.funding_authority !== false ||
    coupledDecision.market_activation_authorized !== false ||
    coupledDecision.public_presale_activation_authorized !== false ||
    coupledDecision.funds_movement_authorized !== false
  ) {
    return hold("source_ready_authority_mismatch");
  }

  const composition = Object.freeze({
    production_marker: productionDecision.marker,
    production_status: productionDecision.status,
    coupled_marker: coupledDecision.marker,
    coupled_status: coupledDecision.status,
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    market_vault_address: productionDecision.market_vault_address,
    market_vault_runtime_code_sha256:
      productionDecision.market_vault_runtime_code_sha256,
    market_vault_compiled_identity_id:
      productionDecision.market_vault_compiled_identity_id,
    wc_settlement_adapter_id:
      productionDecision.wc_settlement_adapter_id,
    protocol_void_inventory_atoms:
      productionDecision.protocol_void_inventory_atoms,
    production_opening_price_source:
      productionDecision.opening_price_source,
    coupled_opening_price_source:
      coupledDecision.opening_price_source,
    opening_allocation_policy:
      coupledDecision.opening_allocation_policy,
    opening_participant_provenance_eligibility_policy_id:
      coupledDecision.opening_participant_provenance_eligibility_policy_id,
    opening_concentration_sybil_policy_contract_id:
      coupledDecision.opening_concentration_sybil_policy_contract_id,
    opening_minimum_real_wc_depth_policy_contract_id:
      coupledDecision.opening_minimum_real_wc_depth_policy_contract_id,
    opening_nonproduction_wc_exclusion_policy_id:
      coupledDecision.opening_nonproduction_wc_exclusion_policy_id,
    reverse_void_to_wc_settlement_policy_id:
      coupledDecision.reverse_void_to_wc_settlement_policy_id,
    economic_intent_ttl_caps_policy_contract_id:
      coupledDecision.economic_intent_ttl_caps_policy_contract_id,
    system_sponsored_anti_grief_policy_contract_id:
      coupledDecision.system_sponsored_anti_grief_policy_contract_id,
    shared_post_discovery_reconciliation_id:
      coupledDecision.shared_post_discovery_reconciliation_id,
  });

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
    composition_id: digest(composition),
    ...composition,
    activation_authority: false,
    funding_authority: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_COUPLED_LAUNCH_READINESS_AUTHORITY_V1,
  });
}
