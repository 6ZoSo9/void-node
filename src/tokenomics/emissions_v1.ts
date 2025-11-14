// VOID Network – Emissions & Validator Rewards (v1, node-side helper)
//
// This module encodes a simple emissions model that matches:
// - docs/VOID-EMISSIONS-SCHEDULE.md
// - docs/VOID-EMISSIONS-PARAMS-V1.json
//
// NOTE: This is a pure helper for now. It uses JS numbers (VOID units),
// good enough for reasoning and tests. Consensus-grade wiring can later
// swap to bigint/uint256-safe math at the state transition layer.

export interface EmissionsParams {
  // All amounts are in raw VOID units (not wei), for modelling only.
  maxSupplyVOID: number;
  premineVOID: number;
  remainingEmissionsVOID: number;

  // Reward schedule (geometric decay by era).
  initialRewardVOID: number;
  decayNumerator: number;
  decayDenominator: number;

  // Era length in blocks (mainnet target ~1 year at 1s blocks).
  eraLengthBlocks: number;
}

// Locked monetary constants for VOID mainnet (v1).
export const MAX_SUPPLY_VOID = 666_666_666;
export const PREMINE_VOID = 230_000_000;
export const REMAINING_EMISSIONS_VOID = MAX_SUPPLY_VOID - PREMINE_VOID;

// Default parameters matching docs/VOID-EMISSIONS-PARAMS-V1.json.
export const DEFAULT_EMISSIONS_PARAMS: EmissionsParams = {
  maxSupplyVOID: MAX_SUPPLY_VOID,
  premineVOID: PREMINE_VOID,
  remainingEmissionsVOID: REMAINING_EMISSIONS_VOID,
  initialRewardVOID: 1,      // 1 VOID per block at era 0 (model-level)
  decayNumerator: 97,        // 3% decay per era
  decayDenominator: 100,
  eraLengthBlocks: 31_536_000, // ~1 year of 1s blocks
};

// --- Core helpers ---

/**
 * Compute the era index for a given block height.
 *
 * era(h) = floor(h / eraLengthBlocks)
 */
export function eraIndex(
  height: number,
  params: EmissionsParams = DEFAULT_EMISSIONS_PARAMS,
): number {
  if (!Number.isFinite(height) || height < 0) {
    throw new Error("eraIndex: height must be a non-negative finite number");
  }
  const h = Math.floor(height);
  const len = params.eraLengthBlocks;
  if (!Number.isFinite(len) || len <= 0) {
    throw new Error("eraIndex: invalid eraLengthBlocks");
  }
  return Math.floor(h / len);
}

/**
 * Raw per-block reward in VOID units, ignoring the global supply cap.
 *
 * For era e:
 *   reward_e ≈ initialReward * (decayNumerator / decayDenominator)^e
 *
 * We apply the decay step-by-step to avoid pow() with fractions.
 */
export function rewardPerBlockRaw(
  height: number,
  params: EmissionsParams = DEFAULT_EMISSIONS_PARAMS,
): number {
  const e = eraIndex(height, params);
  let reward = params.initialRewardVOID;
  if (reward <= 0) return 0;

  for (let i = 0; i < e; i++) {
    reward = (reward * params.decayNumerator) / params.decayDenominator;
    if (reward <= 0) {
      reward = 0;
      break;
    }
  }

  // Clamp any tiny negative/NaN due to weird params.
  if (!Number.isFinite(reward) || reward < 0) return 0;
  return reward;
}

/**
 * Supply-safe reward: clamps the raw reward so we never exceed MAX_SUPPLY.
 *
 * totalSupply(h) = premine + totalMintedSoFar + rewardAtH
 * and we enforce totalSupply(h) <= maxSupply.
 */
export function rewardPerBlockWithCap(
  height: number,
  totalMintedSoFarVOID: number,
  params: EmissionsParams = DEFAULT_EMISSIONS_PARAMS,
): number {
  if (!Number.isFinite(totalMintedSoFarVOID) || totalMintedSoFarVOID < 0) {
    throw new Error("rewardPerBlockWithCap: invalid totalMintedSoFarVOID");
  }

  const cap = params.maxSupplyVOID;
  const premine = params.premineVOID;
  const raw = rewardPerBlockRaw(height, params);

  const mintedPlusThis = premine + totalMintedSoFarVOID + raw;
  if (mintedPlusThis <= cap) {
    return raw;
  }

  const remaining = cap - premine - totalMintedSoFarVOID;
  if (remaining <= 0) return 0;
  return remaining;
}

/**
 * Quick sanity helper: check that a given total supply is within the cap.
 */
export function isSupplyValid(
  totalSupplyVOID: number,
  params: EmissionsParams = DEFAULT_EMISSIONS_PARAMS,
): boolean {
  if (!Number.isFinite(totalSupplyVOID) || totalSupplyVOID < 0) return false;
  return totalSupplyVOID <= params.maxSupplyVOID;
}

/**
 * Tiny helper to approximate how much gets emitted over N blocks
 * under the current params, ignoring state machine details.
 *
 * This is a modelling tool, not consensus logic.
 */
export function simulateEmission(
  upToHeight: number,
  params: EmissionsParams = DEFAULT_EMISSIONS_PARAMS,
): { height: number; totalMintedVOID: number } {
  if (!Number.isFinite(upToHeight) || upToHeight < 0) {
    throw new Error("simulateEmission: upToHeight must be >= 0");
  }
  const hMax = Math.floor(upToHeight);
  let minted = 0;

  for (let h = 0; h <= hMax; h++) {
    const reward = rewardPerBlockWithCap(h, minted, params);
    minted += reward;
    if (!isSupplyValid(params.premineVOID + minted, params)) {
      // Defensive clamp; we should never hit this if rewardPerBlockWithCap is correct.
      minted = params.maxSupplyVOID - params.premineVOID;
      break;
    }
  }

  return { height: hMax, totalMintedVOID: minted };
}
