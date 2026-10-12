import { createHash } from "node:crypto";

export const VOID_USDC_WVOID_BASE_MARKET_V1 =
  "VOID_USDC_WVOID_BASE_MARKET_V1" as const;
export const VOID_USDC_WVOID_BASE_MARKET_PLAN_SCHEMA_V1 =
  "void-usdc-wvoid-base-market-plan-v1" as const;

const HEX_40 = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

type RecordValue = Record<string, unknown>;

export type VoidUsdcWvoidBaseMarketPlanV1 = Readonly<{
  schema: typeof VOID_USDC_WVOID_BASE_MARKET_PLAN_SCHEMA_V1;
  marker: typeof VOID_USDC_WVOID_BASE_MARKET_V1;
  phase: "source_only_planning";
  relationship_to_presale: Readonly<{
    mode: "additive_independent_market";
    presale_status: "preserved";
    automatic_presale_retirement: false;
    buy_void_source_changes: false;
    presale_runtime_changes: false;
    fulfillment_wallet_changes: false;
    presale_inventory_reuse: false;
    presale_funds_reuse: false;
  }>;
  canonical_assets: Readonly<{
    native_void: Readonly<{
      chain_id: 2050;
      symbol: "VOID";
      decimals: 18;
      role: "canonical_native_asset";
    }>;
    wrapped_void: Readonly<{
      chain_id: 8453;
      symbol: "wVOID";
      decimals: 18;
      role: "base_market_representation";
      contract_address: null;
      deployment_required: true;
    }>;
    usdc: Readonly<{
      symbol: "USDC";
      decimals: 6;
      base_mainnet_chain_id: 8453;
      base_mainnet_address: string;
      base_sepolia_chain_id: 84532;
      base_sepolia_address: string;
    }>;
  }>;
  conservation: Readonly<{
    required_invariant: "wvoid_total_supply_lte_native_void_locked_for_redemption";
    mint_requires_finalized_native_lock: true;
    burn_required_before_native_release: true;
    one_lock_event_one_mint: true;
    one_burn_event_one_release: true;
    replay_rejected: true;
  }>;
  market: Readonly<{
    pair: "USDC/wVOID";
    venue_family: "uniswap_on_base";
    first_network: "base_sepolia";
    mainnet_network: "base_mainnet";
    fee_tier: null;
    initial_price: null;
    initial_liquidity_usdc: null;
    initial_liquidity_wvoid: null;
    separate_market_liquidity_budget_required: true;
    leverage_forbidden: true;
    borrowing_forbidden: true;
  }>;
  stages: readonly [
    "source_only_closed_plan",
    "wvoid_and_lock_redeem_local_proof",
    "base_sepolia_round_trip_canary",
    "independent_security_review",
    "explicit_base_mainnet_deployment_gate",
    "explicit_pool_creation_and_liquidity_gate",
    "separate_trade_void_surface",
  ];
  authority: Readonly<{
    deploy_contracts: false;
    create_pool: false;
    provide_liquidity: false;
    access_wallets: false;
    access_credentials: false;
    sign_transactions: false;
    broadcast_transactions: false;
    lock_native_void: false;
    mint_wvoid: false;
    burn_wvoid: false;
    release_native_void: false;
    move_funds: false;
    modify_buy_void: false;
  }>;
  plan_sha256: string;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function exactKeys(
  value: RecordValue,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(`${label} keys differ`);
  }
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value as RecordValue;
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) hold(`${label} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((entry, index) => jsonValue(entry, `${label}[${index}]`)),
    );
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      output[key] = jsonValue(source[key], `${label}.${key}`);
    }
    return Object.freeze(output);
  }
  hold(`${label} contains unsupported JSON data`);
}

export function canonicalUsdcWvoidBaseMarketJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashUsdcWvoidBaseMarketDocumentV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalUsdcWvoidBaseMarketJsonV1(value), "utf8")
    .digest("hex");
}

function unsignedPlan(): Omit<VoidUsdcWvoidBaseMarketPlanV1, "plan_sha256"> {
  return Object.freeze({
    schema: VOID_USDC_WVOID_BASE_MARKET_PLAN_SCHEMA_V1,
    marker: VOID_USDC_WVOID_BASE_MARKET_V1,
    phase: "source_only_planning",
    relationship_to_presale: Object.freeze({
      mode: "additive_independent_market",
      presale_status: "preserved",
      automatic_presale_retirement: false,
      buy_void_source_changes: false,
      presale_runtime_changes: false,
      fulfillment_wallet_changes: false,
      presale_inventory_reuse: false,
      presale_funds_reuse: false,
    }),
    canonical_assets: Object.freeze({
      native_void: Object.freeze({
        chain_id: 2050,
        symbol: "VOID",
        decimals: 18,
        role: "canonical_native_asset",
      }),
      wrapped_void: Object.freeze({
        chain_id: 8453,
        symbol: "wVOID",
        decimals: 18,
        role: "base_market_representation",
        contract_address: null,
        deployment_required: true,
      }),
      usdc: Object.freeze({
        symbol: "USDC",
        decimals: 6,
        base_mainnet_chain_id: 8453,
        base_mainnet_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        base_sepolia_chain_id: 84532,
        base_sepolia_address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
      }),
    }),
    conservation: Object.freeze({
      required_invariant:
        "wvoid_total_supply_lte_native_void_locked_for_redemption",
      mint_requires_finalized_native_lock: true,
      burn_required_before_native_release: true,
      one_lock_event_one_mint: true,
      one_burn_event_one_release: true,
      replay_rejected: true,
    }),
    market: Object.freeze({
      pair: "USDC/wVOID",
      venue_family: "uniswap_on_base",
      first_network: "base_sepolia",
      mainnet_network: "base_mainnet",
      fee_tier: null,
      initial_price: null,
      initial_liquidity_usdc: null,
      initial_liquidity_wvoid: null,
      separate_market_liquidity_budget_required: true,
      leverage_forbidden: true,
      borrowing_forbidden: true,
    }),
    stages: Object.freeze([
      "source_only_closed_plan",
      "wvoid_and_lock_redeem_local_proof",
      "base_sepolia_round_trip_canary",
      "independent_security_review",
      "explicit_base_mainnet_deployment_gate",
      "explicit_pool_creation_and_liquidity_gate",
      "separate_trade_void_surface",
    ] as const),
    authority: Object.freeze({
      deploy_contracts: false,
      create_pool: false,
      provide_liquidity: false,
      access_wallets: false,
      access_credentials: false,
      sign_transactions: false,
      broadcast_transactions: false,
      lock_native_void: false,
      mint_wvoid: false,
      burn_wvoid: false,
      release_native_void: false,
      move_funds: false,
      modify_buy_void: false,
    }),
  });
}

export function buildUsdcWvoidBaseMarketPlanV1(): VoidUsdcWvoidBaseMarketPlanV1 {
  const unsigned = unsignedPlan();
  return Object.freeze({
    ...unsigned,
    plan_sha256: hashUsdcWvoidBaseMarketDocumentV1(unsigned),
  });
}

export function verifyUsdcWvoidBaseMarketPlanV1(
  value: unknown,
): VoidUsdcWvoidBaseMarketPlanV1 {
  const source = record(value, "USDC/wVOID Base market plan");
  exactKeys(
    source,
    [
      "schema",
      "marker",
      "phase",
      "relationship_to_presale",
      "canonical_assets",
      "conservation",
      "market",
      "stages",
      "authority",
      "plan_sha256",
    ],
    "USDC/wVOID Base market plan",
  );

  const expected = buildUsdcWvoidBaseMarketPlanV1();
  const expectedJson = canonicalUsdcWvoidBaseMarketJsonV1(expected);
  const actualJson = canonicalUsdcWvoidBaseMarketJsonV1(source);
  if (actualJson !== expectedJson) {
    hold("USDC/wVOID Base market plan differs from the closed plan");
  }
  if (typeof source.plan_sha256 !== "string" || !SHA256.test(source.plan_sha256)) {
    hold("plan_sha256 must be lowercase SHA-256");
  }

  const unsigned = { ...source };
  delete unsigned.plan_sha256;
  if (hashUsdcWvoidBaseMarketDocumentV1(unsigned) !== source.plan_sha256) {
    hold("plan_sha256 does not match the plan body");
  }

  const expectedMainnet = expected.canonical_assets.usdc.base_mainnet_address;
  const expectedSepolia = expected.canonical_assets.usdc.base_sepolia_address;
  if (!HEX_40.test(expectedMainnet) || !HEX_40.test(expectedSepolia)) {
    hold("USDC addresses must be lowercase 20-byte EVM addresses");
  }

  return expected;
}
