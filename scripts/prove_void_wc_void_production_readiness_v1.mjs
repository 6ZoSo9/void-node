#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
  classifyVoidWcVoidProductionReadinessV1,
} from "../tools/void-wc-void-production-readiness-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const candidate = JSON.parse(
  read("ops/mainnet0/wc-void-production-candidate-v1.json"),
);

assert.equal(
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
  "VOID_WC_VOID_PRODUCTION_READINESS_V1",
);
assert.equal(
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1.source_classification_only,
  true,
);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
)) {
  if (key === "source_classification_only") continue;
  assert.equal(value, false, `authority.${key}`);
}

const held = classifyVoidWcVoidProductionReadinessV1(candidate);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "production_gates_incomplete");
assert.deepEqual(held.missing_gates, [
  "market_vault_address_required",
  "market_vault_runtime_code_sha256_required",
  "market_vault_independent_verification_required",
  "inventory_funding_required",
  "inventory_lock_proof_required",
  "opening_discovery_implementation_required",
  "wc_settlement_adapter_id_required",
  "wc_settlement_adapter_implementation_required",
  "wc_settlement_adapter_independent_review_required",
  "duplicate_replay_protection_required",
  "bounded_canary_required",
  "coupled_activation_ready_required",
]);
assert.equal(held.authority.market_activation, false);
assert.equal(held.authority.public_presale_activation, false);
assert.equal(held.authority.funds_movement, false);

function clone() {
  return JSON.parse(JSON.stringify(candidate));
}

for (const [label, mutate, reason] of [
  [
    "fixed conversion",
    (v) => {
      v.fixed_conversion = true;
    },
    "fixed_wc_void_price_authority_forbidden",
  ],
  [
    "fixed opening price",
    (v) => {
      v.fixed_opening_price = true;
    },
    "fixed_wc_void_price_authority_forbidden",
  ],
  [
    "nonzero protocol WC seed",
    (v) => {
      v.protocol_wc_seed_units = "1";
    },
    "protocol_wc_seed_must_be_zero",
  ],
  [
    "wrong VOID inventory",
    (v) => {
      v.protocol_void_inventory_atoms = "9999999999999999999999999";
    },
    "protocol_void_inventory_mismatch",
  ],
  [
    "wrong WC source",
    (v) => {
      v.wc_source_profile.source_domain = "erc20";
    },
    "wc_source_profile_mismatch",
  ],
  [
    "devnet relayer reuse",
    (v) => {
      v.legacy_devnet_relayer_reused = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
  [
    "default private key",
    (v) => {
      v.default_private_key_allowed = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
  [
    "default wallet",
    (v) => {
      v.default_wallet_allowed = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
]) {
  const value = clone();
  mutate(value);
  const decision = classifyVoidWcVoidProductionReadinessV1(value);
  assert.equal(decision.ok, false, label);
  assert.equal(decision.reason, reason, label);
}

const ready = clone();
Object.assign(ready, {
  status: "source_ready",
  market_vault_address: "0x1111111111111111111111111111111111111111",
  market_vault_runtime_code_sha256: "a".repeat(64),
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
  opening_discovery_implemented: true,
  wc_settlement_adapter_id: "void-wc-ledger-settlement-v1",
  wc_settlement_adapter_implemented: true,
  wc_settlement_adapter_independently_reviewed: true,
  duplicate_replay_protection_proven: true,
  bounded_canary_green: true,
  coupled_activation_ready: true,
});
const readyDecision = classifyVoidWcVoidProductionReadinessV1(ready);
assert.equal(readyDecision.ok, true);
assert.equal(readyDecision.status, "SOURCE_READY");
assert.equal(readyDecision.protocol_void_inventory_atoms, "10000000000000000000000000");
assert.equal(readyDecision.protocol_wc_seed_units, "0");
assert.equal(readyDecision.opening_price_source, "one_sided_market_discovery");
assert.equal(readyDecision.activation_authority, false);
assert.equal(readyDecision.funding_authority, false);
assert.equal(readyDecision.authority.market_activation, false);
assert.equal(readyDecision.authority.public_presale_activation, false);
assert.equal(readyDecision.authority.funds_movement, false);

const stillHeld = clone();
Object.assign(stillHeld, ready, { status: "hold" });
const statusHeld = classifyVoidWcVoidProductionReadinessV1(stillHeld);
assert.equal(statusHeld.ok, false);
assert.equal(statusHeld.reason, "source_ready_status_required");

const toolSource = read("tools/void-wc-void-production-readiness-v1.mjs");
assert.doesNotMatch(toolSource, /ANVIL_PK/);
assert.doesNotMatch(toolSource, /0xac0974bec39a17d36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80/i);
assert.doesNotMatch(toolSource, /100\s*WC\s*=\s*1\s*VOID/i);

const legacyRelayer = read("ops/wc-relayer-v1.cjs");
assert.match(legacyRelayer, /ANVIL_PK/);
assert.equal(candidate.legacy_devnet_relayer_reused, false);
assert.equal(candidate.default_private_key_allowed, false);
assert.equal(candidate.default_wallet_allowed, false);

console.log("VOID_WC_VOID_PRODUCTION_READINESS_V1_PROOF_GREEN");
console.log("candidate_status=HOLD");
console.log("market_vault_address_present=false");
console.log("inventory_funded=false");
console.log("opening_discovery_implemented=false");
console.log("wc_settlement_adapter_implemented=false");
console.log("legacy_devnet_relayer_reused=false");
console.log("fixed_wc_void_redemption=false");
console.log("protocol_wc_seed_units=0");
console.log("source_ready_classifier_proven=true");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
