#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "./void-wc-void-coupled-opening-v1.mjs";
import {
  reconcileSharedMarketPostDiscoveryStateV2,
} from "./void-shared-market-post-discovery-state-v2.mjs";

export const VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2 =
  "VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2";

export const VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_AUTHORITY_V2 =
  Object.freeze({
    source_regeneration_plan_only: true,
    canonical_source_read: true,
    candidate_update: false,
    classifier_update: false,
    runtime_mutation: false,
    rpc_call: false,
    network_call: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    role_authorization: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORRECTION_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json";
const CANDIDATE_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const PRESALE_REL =
  "src/economic/buy_void_source_finality_authority_v2.ts";

const OLD_LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const EXPECTED_NEW_LAUNCH =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const EXPECTED_NEW_VAULT_BYTES32 =
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const IDENTITY_ID =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const CREATION_SHA =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const RUNTIME_SHA =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const IMMUTABLE_SHA =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return "{" +
      Object.keys(value)
        .sort(compareText)
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}";
  }
  fail("regeneration_canonical_json_invalid");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function digest(value) {
  return "sha256:" + sha256Text(canonicalJson(value));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sourceModelHash(digit) {
  return "sha256:" + String(digit).repeat(64);
}

function sourceModelCommitment(launchId, participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: sourceModelHash("0"),
    coupled_launch_id: launchId,
    participant_id: sourceModelHash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function sourceModelDebit(launchId, commitment, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitment.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: sourceModelHash("0"),
    commitment_id: commitment.commitment_id,
    coupled_launch_id: launchId,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

function deriveSharedSourceModelV2(launchId) {
  const first = sourceModelCommitment(
    launchId,
    "1",
    "wc-opening-alpha",
    "250",
  );
  const second = sourceModelCommitment(
    launchId,
    "2",
    "wc-opening-beta",
    "750",
  );
  const firstDebit = sourceModelDebit(
    launchId,
    first,
    250,
    1790344000001,
  );
  const secondDebit = sourceModelDebit(
    launchId,
    second,
    750,
    1790344000002,
  );
  return reconcileSharedMarketPostDiscoveryStateV2({
    coupled_launch_id: launchId,
    commitments: [first, second],
    ledger_debits: [secondDebit, firstDebit],
  });
}

function sharedCandidateSummaryV2(state) {
  return Object.freeze({
    profile: "canonical_source_model_fixture_v2",
    source_model_fixture: true,
    runtime_or_launch_evidence: false,
    coupled_launch_id: state.coupled_launch_id,
    marker: state.marker,
    schema: state.schema,
    reconciliation_id: state.reconciliation_id,
    wc_opening_state_id: state.wc_opening_state_id,
    chain_id: state.chain_id,
    network_identity: state.network_identity,
    execution_epoch: state.execution_epoch,
    void_token: state.void_token,
    void_token_decimals: state.void_token_decimals,
    wc_void_phase: state.market_models.WC_VOID.phase,
    btc_void_phase: state.market_models.BTC_VOID.phase,
    eth_void_phase: state.market_models.ETH_VOID.phase,
    wc_void_settled_quote_reserve_units:
      state.market_models.WC_VOID.settled_quote_reserve_units,
    total_planned_void_inventory_atoms:
      state.total_planned_void_inventory_atoms,
    wc_opening_participant_allocated_void_atoms:
      state.wc_opening_participant_allocated_void_atoms,
    wc_post_opening_retained_void_reserve_atoms:
      state.wc_post_opening_retained_void_reserve_atoms,
    unopened_post_presale_planned_void_inventory_atoms:
      state.unopened_post_presale_planned_void_inventory_atoms,
    modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms:
      state.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms,
    shared_post_discovery_model_reconciled:
      state.shared_post_discovery_model_reconciled,
    legacy_v1_six_decimal_void_atoms_authoritative:
      state.legacy_v1_six_decimal_void_atoms_authoritative,
    all_markets_share_one_presale_closeout:
      state.all_markets_share_one_presale_closeout,
    wc_void_uses_coupled_launch_id:
      state.wc_void_uses_coupled_launch_id,
    btc_void_remains_post_presale:
      state.btc_void_remains_post_presale,
    eth_void_remains_post_presale:
      state.eth_void_remains_post_presale,
    exact_30m_planned_inventory_conservation:
      state.exact_30m_planned_inventory_conservation,
    quote_reserve_custody_verified:
      state.quote_reserve_custody_verified,
    void_reserve_custody_verified:
      state.void_reserve_custody_verified,
    market_activation_authority:
      state.market_activation_authority,
    public_presale_activation_authority:
      state.public_presale_activation_authority,
    inventory_funding_authority:
      state.inventory_funding_authority,
    funds_movement_authority:
      state.funds_movement_authority,
  });
}

function assertCorrection(correction) {
  if (
    correction?.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2" ||
    correction?.status !==
      "COMPILED_IDENTITY_V1_BYTECODE_SUPERSEDED_DEPLOYMENT_HOLD" ||
    correction?.accepted_identity?.identity_id !== IDENTITY_ID ||
    correction?.canonical_compiler_artifacts?.creation_bytecode_sha256 !==
      CREATION_SHA ||
    correction?.canonical_compiler_artifacts?.runtime_template_sha256 !==
      RUNTIME_SHA ||
    correction?.canonical_compiler_artifacts?.immutable_layout_sha256 !==
      IMMUTABLE_SHA ||
    correction?.coupled_launch_effect?.superseded_coupled_launch_id !==
      OLD_LAUNCH ||
    correction?.coupled_launch_effect?.corrected_coupled_launch_id !==
      EXPECTED_NEW_LAUNCH ||
    correction?.coupled_launch_effect?.corrected_vault_bytes32 !==
      EXPECTED_NEW_VAULT_BYTES32 ||
    correction?.coupled_launch_effect?.coupled_launch_regeneration_required !==
      true ||
    correction?.decision?.deployment_authorized !== false
  ) {
    fail("regeneration_correction_binding_invalid");
  }
}

function assertCandidateBaseline(candidate) {
  if (
    candidate?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    candidate?.version !== 1 ||
    candidate?.chain_id !== 2050 ||
    candidate?.execution_epoch !== 2 ||
    candidate?.presale_wc_void_coupled_launch_required !== true ||
    candidate?.shared_post_discovery_reconciliation?.coupled_launch_id !==
      OLD_LAUNCH
  ) {
    fail("regeneration_candidate_baseline_invalid");
  }
}

function assertPresaleSource(source) {
  for (const required of [
    'marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1"',
    'canonical_presale_max_void: "10000000"',
    'rate_void_units_numerator: "2"',
    'rate_void_units_denominator: "1"',
  ]) {
    if (!source.includes(required)) {
      fail("regeneration_presale_policy_invalid");
    }
  }
}

function buildCorrectedCommitment(candidate, correction) {
  const opening = candidate.wc_void_opening;
  return Object.freeze({
    schema: "void.presale-wc-void-current-deployment-commitment.v1",
    version: 1,
    chain_id: 2050,
    presale: Object.freeze({
      policy_marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
      canonical_presale_max_void: "10000000",
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
    }),
    wc_void: Object.freeze({
      pair: "WC_VOID",
      protocol_void_inventory_atoms: opening.protocol_void_inventory_atoms,
      opening_sale_tranche_void_atoms:
        opening.opening_sale_tranche_void_atoms,
      post_opening_void_reserve_atoms:
        opening.post_opening_void_reserve_atoms,
      protocol_wc_seed_units: opening.protocol_wc_seed_units,
      fixed_conversion: opening.fixed_conversion,
      fixed_opening_price: opening.fixed_opening_price,
      opening_price_source: opening.opening_price_source,
      opening_allocation_policy: opening.opening_allocation_policy,
    }),
    market_vault: Object.freeze({
      contract_name: "WCVoidMarketVaultV2",
      compiled_identity_id: correction.accepted_identity.identity_id,
      creation_bytecode_sha256:
        correction.canonical_compiler_artifacts.creation_bytecode_sha256,
      runtime_template_sha256:
        correction.canonical_compiler_artifacts.runtime_template_sha256,
      immutable_layout_sha256:
        correction.canonical_compiler_artifacts.immutable_layout_sha256,
    }),
    launch_order: Object.freeze({
      presale_wc_void_simultaneous_launch: true,
      presale_launch_requires_wc_void_activation_ready: true,
      wc_void_launch_requires_presale_activation_ready: true,
    }),
  });
}

export function deriveVoidWcVoidCoupledLaunchRegenerationV2() {
  const correction = readJson(CORRECTION_REL);
  const candidate = readJson(CANDIDATE_REL);
  const presaleSource = readText(PRESALE_REL);

  assertCorrection(correction);
  assertCandidateBaseline(candidate);
  assertPresaleSource(presaleSource);

  const currentState = deriveSharedSourceModelV2(OLD_LAUNCH);
  const currentSummary = sharedCandidateSummaryV2(currentState);
  if (
    canonicalJson(currentSummary) !==
      canonicalJson(candidate.shared_post_discovery_reconciliation)
  ) {
    fail("regeneration_current_generation_rederivation_mismatch");
  }

  const commitment = buildCorrectedCommitment(candidate, correction);
  const correctedLaunchId = digest(commitment);
  const correctedVaultBytes32 =
    "0x" + correctedLaunchId.slice("sha256:".length);

  if (
    correctedLaunchId !== EXPECTED_NEW_LAUNCH ||
    correctedVaultBytes32 !== EXPECTED_NEW_VAULT_BYTES32
  ) {
    fail("regeneration_corrected_launch_identity_mismatch");
  }

  const correctedState = deriveSharedSourceModelV2(correctedLaunchId);
  const correctedSummary = sharedCandidateSummaryV2(correctedState);

  if (
    correctedSummary.coupled_launch_id !== correctedLaunchId ||
    correctedSummary.reconciliation_id === currentSummary.reconciliation_id ||
    correctedSummary.wc_opening_state_id === currentSummary.wc_opening_state_id
  ) {
    fail("regeneration_corrected_shared_state_invalid");
  }

  const body = Object.freeze({
    marker: VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2,
    version: 2,
    status: "CORRECTED_COUPLED_LAUNCH_GENERATION_DERIVED_NOT_APPLIED",
    superseded_generation: Object.freeze({
      coupled_launch_id: OLD_LAUNCH,
      reconciliation_id: currentSummary.reconciliation_id,
      wc_opening_state_id: currentSummary.wc_opening_state_id,
    }),
    corrected_generation: Object.freeze({
      coupled_launch_id: correctedLaunchId,
      vault_bytes32_id: correctedVaultBytes32,
      reconciliation_id: correctedSummary.reconciliation_id,
      wc_opening_state_id: correctedSummary.wc_opening_state_id,
      shared_post_discovery_reconciliation: correctedSummary,
    }),
    corrected_market_vault_identity: Object.freeze({
      compiled_identity_id: IDENTITY_ID,
      creation_bytecode_sha256: CREATION_SHA,
      runtime_template_sha256: RUNTIME_SHA,
      immutable_layout_sha256: IMMUTABLE_SHA,
    }),
    candidate_application: Object.freeze({
      canonical_candidate_file: CANDIDATE_REL,
      application_performed: false,
      classifier_update_performed: false,
      signer_domain_update_performed: false,
    }),
    authority: VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_AUTHORITY_V2,
    next_gate:
      "pin_corrected_generation_then_atomically_update_all_coupled_launch_dependencies",
  });

  return Object.freeze({
    ...body,
    regeneration_id: "voidwclrg2_" + sha256Text(canonicalJson(body)),
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = deriveVoidWcVoidCoupledLaunchRegenerationV2();
  console.log(VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2);
  console.log("status=" + result.status);
  console.log("regeneration_id=" + result.regeneration_id);
  console.log(
    "superseded_coupled_launch_id=" +
      result.superseded_generation.coupled_launch_id,
  );
  console.log(
    "corrected_coupled_launch_id=" +
      result.corrected_generation.coupled_launch_id,
  );
  console.log(
    "corrected_vault_bytes32_id=" +
      result.corrected_generation.vault_bytes32_id,
  );
  console.log(
    "corrected_wc_opening_state_id=" +
      result.corrected_generation.wc_opening_state_id,
  );
  console.log(
    "corrected_reconciliation_id=" +
      result.corrected_generation.reconciliation_id,
  );
  console.log("candidate_application_performed=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("deployment=false");
  console.log("funds_movement=false");
}
