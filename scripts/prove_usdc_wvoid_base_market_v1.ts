import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildUsdcWvoidBaseMarketPlanV1,
  hashUsdcWvoidBaseMarketDocumentV1,
  verifyUsdcWvoidBaseMarketPlanV1,
} from "../src/economic/usdc_wvoid_base_market_v1.js";

type Mutable = Record<string, any>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectHold(label: string, operation: () => unknown): void {
  try {
    operation();
  } catch (error) {
    assert(error instanceof Error, `${label} must throw Error`);
    assert(error.message.startsWith("HOLD:"), `${label} must fail closed`);
    return;
  }
  throw new Error(`ASSERTION FAILED: ${label} did not fail closed`);
}

const sourcePath = resolve(
  "src/economic/usdc_wvoid_base_market_v1.ts",
);
const sourceText = readFileSync(sourcePath, "utf8");

assert(
  !sourceText.includes('from "./buy_void_') &&
    !sourceText.includes('from "../economic/buy_void_'),
  "market plan must not import Buy VOID modules",
);
assert(
  sourceText.includes('presale_status: "preserved"'),
  "presale must remain preserved",
);
assert(
  sourceText.includes("buy_void_source_changes: false"),
  "Buy VOID source changes must be denied",
);

const plan = buildUsdcWvoidBaseMarketPlanV1();
const verified = verifyUsdcWvoidBaseMarketPlanV1(plan);

assert(
  verified.relationship_to_presale.mode === "additive_independent_market",
  "market must be additive and independent",
);
assert(
  verified.relationship_to_presale.presale_status === "preserved",
  "presale must remain preserved",
);
assert(
  verified.relationship_to_presale.automatic_presale_retirement === false,
  "market must not automatically retire the presale",
);
assert(
  verified.relationship_to_presale.presale_funds_reuse === false,
  "presale funds must not be reused",
);
assert(
  verified.relationship_to_presale.presale_inventory_reuse === false,
  "presale inventory must not be reused",
);
assert(
  verified.canonical_assets.native_void.chain_id === 2050,
  "native VOID chain must remain canonical",
);
assert(
  verified.canonical_assets.wrapped_void.chain_id === 8453,
  "wVOID market representation must target Base mainnet",
);
assert(
  verified.canonical_assets.usdc.base_sepolia_chain_id === 84532,
  "first test network must bind Base Sepolia",
);
assert(
  verified.canonical_assets.usdc.base_mainnet_address ===
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "Base mainnet native USDC address must be exact",
);
assert(
  verified.canonical_assets.usdc.base_sepolia_address ===
    "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  "Base Sepolia USDC address must be exact",
);
assert(
  verified.conservation.required_invariant ===
    "wvoid_total_supply_lte_native_void_locked_for_redemption",
  "wrapped supply conservation invariant must be exact",
);
assert(
  verified.market.separate_market_liquidity_budget_required === true,
  "pool liquidity must use a separate explicit budget",
);
assert(
  Object.values(verified.authority).every((value) => value === false),
  "source-only plan must grant no operational authority",
);

const presaleRetirement = clone(plan) as Mutable;
presaleRetirement.relationship_to_presale.automatic_presale_retirement = true;
expectHold("automatic presale retirement", () =>
  verifyUsdcWvoidBaseMarketPlanV1(presaleRetirement),
);

const presaleFunds = clone(plan) as Mutable;
presaleFunds.relationship_to_presale.presale_funds_reuse = true;
expectHold("presale fund reuse", () =>
  verifyUsdcWvoidBaseMarketPlanV1(presaleFunds),
);

const deploymentAuthority = clone(plan) as Mutable;
deploymentAuthority.authority.deploy_contracts = true;
expectHold("deployment authority", () =>
  verifyUsdcWvoidBaseMarketPlanV1(deploymentAuthority),
);

const changedUsdc = clone(plan) as Mutable;
changedUsdc.canonical_assets.usdc.base_mainnet_address =
  "0x0000000000000000000000000000000000000001";
expectHold("changed Base USDC address", () =>
  verifyUsdcWvoidBaseMarketPlanV1(changedUsdc),
);

const selfConsistentForgery = clone(plan) as Mutable;
selfConsistentForgery.market.borrowing_forbidden = false;
const unsignedForgery = clone(selfConsistentForgery);
delete unsignedForgery.plan_sha256;
selfConsistentForgery.plan_sha256 =
  hashUsdcWvoidBaseMarketDocumentV1(unsignedForgery);
expectHold("self-consistent borrowing forgery", () =>
  verifyUsdcWvoidBaseMarketPlanV1(selfConsistentForgery),
);

console.log("presale_preserved=true");
console.log("buy_void_untouched=true");
console.log("separate_usdc_wvoid_market=true");
console.log("native_void_canonical_chain_2050=true");
console.log("base_mainnet_chain_id_exact=true");
console.log("base_sepolia_chain_id_exact=true");
console.log("base_usdc_addresses_exact=true");
console.log("wrapped_supply_conservation_required=true");
console.log("separate_liquidity_budget_required=true");
console.log("source_only_authority_denied=true");
console.log("VOID_USDC_WVOID_BASE_MARKET_V1_PROOF_GREEN");
