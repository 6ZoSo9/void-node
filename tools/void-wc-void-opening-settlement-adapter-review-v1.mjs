#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_POLICY_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1 =
  "VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1";

export const EXPECTED = Object.freeze({
  packet_path:
    "ops/mainnet0/wc-void-opening-settlement-adapter-review-v1.json",
  review_id:
    "voidwcsar1_0e51724c2c8b8aee08e3da7a12dc78ae93179b6c9427ceca1915c26a114a972c",
  adapter_id: "void-wc-ledger-opening-settlement-v1",
  source_path: "tools/void-wc-void-coupled-opening-v1.mjs",
  source_git_blob_sha: "886feaef71a228b1e6f49f1106ae8ec2b34c404e",
  source_commit: "1a3a59dbc505edc2b5cc6f49c4d6228f3ae1a927",
  debit_schema: "void.wc-ledger-market-debit.v1",
  pair: "WC_VOID",
  source_domain: "void-work-credit-ledger",
  quote_asset_form: "ledger-credit",
  quote_unit: "wc",
  quote_decimals: 0,
  reason: "wc_void_opening_settlement_v1",
});

export const VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_AUTHORITY_V1 =
  Object.freeze({
    source_review_only: true,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

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
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  throw new Error("INVALID_CANONICAL_VALUE");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1,
    version: 1,
    reason,
    settlement_adapter_independently_reviewed: false,
    live_ledger_persistence_verified: false,
    quote_reserve_custody_verified: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_AUTHORITY_V1,
  });
}

export function verifyWcVoidOpeningSettlementAdapterReviewV1(input) {
  if (!plain(input)) return held("review_packet_object_required");

  const { review_id: reviewId, ...body } = input;
  if (
    typeof reviewId !== "string" ||
    reviewId !== "voidwcsar1_" + sha256Text(canonicalJson(body)) ||
    reviewId !== EXPECTED.review_id
  ) {
    return held("review_packet_id_invalid");
  }

  if (
    input.marker !==
      "VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_PACKET_V1" ||
    input.version !== 1 ||
    input.status !==
      "SOURCE_REVIEW_ACCEPTED_HELD_ON_LIVE_LEDGER_CUSTODY"
  ) {
    return held("review_packet_contract_mismatch");
  }

  const adapter = input.adapter;
  if (
    !plain(adapter) ||
    adapter.adapter_id !== EXPECTED.adapter_id ||
    adapter.source_path !== EXPECTED.source_path ||
    adapter.source_git_blob_sha !== EXPECTED.source_git_blob_sha ||
    adapter.source_commit !== EXPECTED.source_commit ||
    adapter.debit_schema !== EXPECTED.debit_schema ||
    adapter.pair !== EXPECTED.pair ||
    adapter.source_domain !== EXPECTED.source_domain ||
    adapter.quote_asset_form !== EXPECTED.quote_asset_form ||
    adapter.quote_unit !== EXPECTED.quote_unit ||
    adapter.quote_decimals !== EXPECTED.quote_decimals ||
    adapter.reason !== EXPECTED.reason ||
    adapter.opening_only !== true ||
    adapter.fixed_price !== false ||
    adapter.protocol_wc_seed_units !== "0"
  ) {
    return held("review_adapter_binding_mismatch");
  }

  if (
    VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 !== EXPECTED.adapter_id ||
    VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1 !== EXPECTED.debit_schema ||
    VOID_WC_VOID_OPENING_POLICY_V1.pair !== EXPECTED.pair ||
    VOID_WC_VOID_OPENING_POLICY_V1.source_domain !== EXPECTED.source_domain ||
    VOID_WC_VOID_OPENING_POLICY_V1.quote_asset_form !==
      EXPECTED.quote_asset_form ||
    VOID_WC_VOID_OPENING_POLICY_V1.quote_unit !== EXPECTED.quote_unit ||
    VOID_WC_VOID_OPENING_POLICY_V1.quote_decimals !== EXPECTED.quote_decimals ||
    VOID_WC_VOID_OPENING_POLICY_V1.protocol_wc_seed_units !== "0" ||
    VOID_WC_VOID_OPENING_POLICY_V1.fixed_conversion !== false ||
    VOID_WC_VOID_OPENING_POLICY_V1.fixed_opening_price !== false
  ) {
    return held("review_source_contract_drift");
  }

  const review = input.review;
  if (
    !plain(review) ||
    review.exact_debit_shape_required !== true ||
    review.content_addressed_settlement_id_required !== true ||
    review.coupled_launch_binding_required !== true ||
    review.commitment_binding_required !== true ||
    review.account_binding_required !== true ||
    review.amount_binding_required !== true ||
    review.delta_equals_negative_amount_required !== true ||
    review.positive_whole_wc_required !== true ||
    review.exact_commitment_settlement_bijection_required !== true ||
    review.duplicate_settlement_rejected !== true ||
    review.duplicate_commitment_settlement_rejected !== true ||
    review.settled_total_must_equal_committed_total !== true ||
    review.canonical_balance_debit_compatible !== true ||
    review.source_review_only !== true ||
    review.live_ledger_persistence_verified !== false ||
    review.quote_reserve_custody_verified !== false ||
    review.market_activation_authorized !== false ||
    review.public_presale_activation_authorized !== false ||
    review.funds_movement_authorized !== false
  ) {
    return held("review_semantics_mismatch");
  }

  const decision = input.decision;
  if (
    !plain(decision) ||
    decision.settlement_adapter_independently_reviewed !== true ||
    decision.production_candidate_binding_allowed !== true ||
    decision.next_gate !==
      "live_wc_ledger_persistence_and_quote_reserve_custody"
  ) {
    return held("review_decision_mismatch");
  }

  return Object.freeze({
    ok: true,
    status:
      "source_review_accepted_held_on_live_ledger_persistence_and_quote_reserve_custody",
    marker: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1,
    version: 1,
    review_id: EXPECTED.review_id,
    adapter_id: EXPECTED.adapter_id,
    source_path: EXPECTED.source_path,
    source_git_blob_sha: EXPECTED.source_git_blob_sha,
    source_commit: EXPECTED.source_commit,
    settlement_adapter_independently_reviewed: true,
    live_ledger_persistence_verified: false,
    quote_reserve_custody_verified: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    next_gate:
      "live_wc_ledger_persistence_and_quote_reserve_custody",
    authority:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_AUTHORITY_V1,
  });
}
