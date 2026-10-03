import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_BUY_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED = "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR = "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

function read(relativePath) {
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("buy_launch_source_invalid");
  }
  return value;
}
function allFalse(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((entry) => entry === false)
  );
}
function allTrue(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((entry) => entry === true)
  );
}

function sourceOnlyAuthority(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.source_only === true &&
    Object.entries(value).every(
      ([key, entry]) => key === "source_only" ? entry === true : entry === false,
    )
  );
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
    allFalse(production.authority) &&
    coupled?.marker === "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" &&
    coupled.version === 1 &&
    coupled.status === "SOURCE_READY" &&
    coupled.chain_id === 2050 &&
    coupled.execution_epoch === 2 &&
    coupled.presale_wc_void_coupled_launch_required === true &&
    coupled.shared_post_discovery_reconciliation?.coupled_launch_id ===
      VOID_BUY_COUPLED_LAUNCH_ID_V1 &&
    allTrue(coupled.gates) &&
    allFalse(coupled.authority) &&
    production.protocol_void_inventory_atoms ===
      coupled.wc_void_opening?.protocol_void_inventory_atoms &&
    successor?.marker === "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1" &&
    successor.version === 1 &&
    successor.source_execution_layer?.chain_id === 2050 &&
    successor.successor_execution_layer?.execution_epoch === 2 &&
    sourceOnlyAuthority(successor.launch_authority);
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
