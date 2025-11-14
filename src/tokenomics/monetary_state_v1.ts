// NON-CONSENSUS helper for modelling monetary state in VOID.
//
// This does NOT run inside consensus yet. It is a pure helper we can later
// mirror in the consensus layer when wiring validator rewards into block
// production.
//
// Canonical constants (must match docs/VOID-EMISSIONS-SCHEDULE.md):
// - MAX_SUPPLY = 666,666,666 VOID
// - PREMINE   = 230,000,000 VOID
// - REMAINING = 436,666,666 VOID

export const VOID_DECIMALS = 18n;
export const VOID_UNIT = 10n ** VOID_DECIMALS;

export const MAX_SUPPLY_VOID = 666_666_666n;
export const PREMINE_VOID    = 230_000_000n;
export const REMAINING_VOID  = MAX_SUPPLY_VOID - PREMINE_VOID;

// In wei-style smallest units.
export const MAX_SUPPLY_WEI = MAX_SUPPLY_VOID * VOID_UNIT;
export const PREMINE_WEI    = PREMINE_VOID * VOID_UNIT;
export const REMAINING_WEI  = REMAINING_VOID * VOID_UNIT;

export interface MonetaryStateV1 {
  // Total minted EVER (including premine + all rewards), in wei-style units.
  totalMintedWei: bigint;
  // Height of the last block included in this state (0 at genesis).
  lastHeight: bigint;
}

// Create initial monetary state at genesis (only premine exists).
export function createGenesisMonetaryStateV1(): MonetaryStateV1 {
  return {
    totalMintedWei: PREMINE_WEI,
    lastHeight: 0n,
  };
}

export interface ApplyRewardResultV1 {
  state: MonetaryStateV1;
  // Reward actually applied for this block (wei units).
  rewardWei: bigint;
  // Validator payout(s) will be handled by higher-level logic. Here we just
  // model the monetary envelope.
}

/**
 * Apply a block reward at height `height` using a supplied reward function.
 *
 * This helper enforces:
 * - Monotonic height (no going backwards).
 * - totalMintedWei + rewardWei <= MAX_SUPPLY_WEI
 *
 * It does NOT know about validator addresses or fee logic. That is handled
 * by the consensus layer and/or higher-level tokenomics helpers.
 *
 * @param state  Current monetary state.
 * @param height Block height being applied (1-based).
 * @param rewardPerBlockWei Pure function height -> reward in wei.
 */
export function applyBlockRewardV1(
  state: MonetaryStateV1,
  height: bigint,
  rewardPerBlockWei: (height: bigint) => bigint,
): ApplyRewardResultV1 {
  if (height <= state.lastHeight) {
    throw new Error(
      `applyBlockRewardV1: non-monotonic height (got ${height}, last ${state.lastHeight})`,
    );
  }

  const rewardWei = rewardPerBlockWei(height);
  if (rewardWei < 0n) {
    throw new Error(`applyBlockRewardV1: negative reward at height ${height}`);
  }

  const nextTotalMinted = state.totalMintedWei + rewardWei;

  if (nextTotalMinted > MAX_SUPPLY_WEI) {
    // This would violate the monetary cap; in consensus, such a block
    // must be considered INVALID.
    throw new Error(
      `applyBlockRewardV1: cap breach at height ${height} (nextTotalMinted=${nextTotalMinted}, cap=${MAX_SUPPLY_WEI})`,
    );
  }

  const nextState: MonetaryStateV1 = {
    totalMintedWei: nextTotalMinted,
    lastHeight: height,
  };

  return {
    state: nextState,
    rewardWei,
  };
}

/**
 * Convenience helper: simulate applying rewards over a range of heights to
 * check shape / debug behaviour. This is NON-CONSENSUS and should only be
 * used in scripts or tests.
 */
export function simulateRangeV1(
  startHeight: bigint,
  endHeight: bigint,
  rewardPerBlockWei: (height: bigint) => bigint,
  initialState: MonetaryStateV1 = createGenesisMonetaryStateV1(),
): MonetaryStateV1 {
  if (endHeight < startHeight) {
    throw new Error(
      `simulateRangeV1: endHeight < startHeight (${endHeight} < ${startHeight})`,
    );
  }

  let state = { ...initialState };

  for (let h = startHeight; h <= endHeight; h++) {
    const height = BigInt(h); // ensure bigint loop semantics
    const { state: nextState } = applyBlockRewardV1(
      state,
      height,
      rewardPerBlockWei,
    );
    state = nextState;
  }

  return state;
}

/**
 * Quick sanity helper: compute the remaining capacity under the cap in wei.
 */
export function remainingCapacityWei(state: MonetaryStateV1): bigint {
  if (state.totalMintedWei > MAX_SUPPLY_WEI) {
    // This should never happen if we always use applyBlockRewardV1.
    return 0n;
  }
  return MAX_SUPPLY_WEI - state.totalMintedWei;
}
