// SPDX-License-Identifier: VCL-1.0
// VOID Network – reward_engine_v1 (non-consensus helper)
//
// This module does NOT change consensus by itself. It is a pure helper that
// wires together:
//   - an emissions curve (rewardPerBlock)
//   - a monetary state tracker (totalMinted)
//   - a snapshot of the validator set + stakes
//
// The actual consensus code will call this with the canonical functions and
// write the results into the block / state DB.

export interface MonetaryStateV1 {
  /** Total validator rewards minted so far (in wei). */
  totalMintedWei: bigint;
}

export interface ValidatorStakeSnapshotV1 {
  /** Validator address (20-byte hex with 0x prefix). */
  validator: string;
  /** Effective stake used for reward weighting (in wei). */
  stakeWei: bigint;
  /** Only active validators receive rewards. */
  active: boolean;
}

export interface BlockRewardInputsV1 {
  /** Height of the block being sealed. */
  height: bigint;
  /** Monetary state before applying this block's rewards. */
  prevState: MonetaryStateV1;
  /** Snapshot of the validator set at this height. */
  validators: readonly ValidatorStakeSnapshotV1[];
  /** Maximum supply allowed by monetary policy (in wei). */
  maxSupplyWei: bigint;
  /**
   * Emissions function for this monetary policy.
   * MUST be pure and deterministic: same height => same reward.
   */
  rewardPerBlockWei: (height: bigint) => bigint;
}

export interface BlockRewardOutputsV1 {
  /** Monetary state after applying this block's rewards. */
  nextState: MonetaryStateV1;
  /**
   * Per-validator reward allocation (in wei).
   * Validators with zero reward may be omitted.
   */
  perValidatorRewardWei: Map<string, bigint>;
  /**
   * Portion of the theoretical reward that could not be minted because of the
   * global cap (MAX_SUPPLY). This should either be burned or accounted to a
   * "cap overflow" bucket.
   */
  capOverflowWei: bigint;
  /**
   * Rounding dust that could not be allocated after splitting by stake.
   * Typically very small compared to the block reward. Can be burned or sent
   * to a treasury sink.
   */
  roundingDustWei: bigint;
}

/**
 * Compute the validator reward split for a single block, subject to a global
 * max supply cap and a stake-weighted distribution.
 *
 * Notes:
 * - This is deliberately side-effect free.
 * - Callers are responsible for enforcing that `height` and `prevState` are
 *   consistent with chain state.
 */
export function computeBlockRewardAllocationV1(
  input: BlockRewardInputsV1,
): BlockRewardOutputsV1 {
  const {
    height,
    prevState,
    validators,
    maxSupplyWei,
    rewardPerBlockWei,
  } = input;

  if (height < 0n) {
    throw new Error("height must be non-negative");
  }

  if (prevState.totalMintedWei < 0n) {
    throw new Error("prevState.totalMintedWei must be non-negative");
  }

  if (maxSupplyWei <= 0n) {
    throw new Error("maxSupplyWei must be positive");
  }

  const theoreticalReward = rewardPerBlockWei(height);
  if (theoreticalReward < 0n) {
    throw new Error("rewardPerBlockWei must not return negative values");
  }

  // How much headroom is left under the global cap?
  const remainingUnderCap =
    maxSupplyWei > prevState.totalMintedWei
      ? maxSupplyWei - prevState.totalMintedWei
      : 0n;

  // Effective reward we are actually allowed to mint this block.
  const mintableReward =
    theoreticalReward <= remainingUnderCap ? theoreticalReward : remainingUnderCap;

  const capOverflowWei =
    theoreticalReward > mintableReward
      ? theoreticalReward - mintableReward
      : 0n;

  const activeValidators = validators.filter(
    (v) => v.active && v.stakeWei > 0n,
  );

  const perValidatorRewardWei = new Map<string, bigint>();

  // Nothing to mint or no one to pay: update state and bail.
  if (mintableReward === 0n || activeValidators.length === 0) {
    const nextState: MonetaryStateV1 = {
      totalMintedWei: prevState.totalMintedWei + mintableReward,
    };
    return {
      nextState,
      perValidatorRewardWei,
      capOverflowWei,
      roundingDustWei: 0n,
    };
  }

  // Sum stake for active validators.
  let totalStakeWei = 0n;
  for (const v of activeValidators) {
    totalStakeWei += v.stakeWei;
  }

  if (totalStakeWei === 0n) {
    // Defensive guard: shouldn't happen because we filtered stakeWei > 0n.
    const nextState: MonetaryStateV1 = {
      totalMintedWei: prevState.totalMintedWei + mintableReward,
    };
    return {
      nextState,
      perValidatorRewardWei,
      capOverflowWei,
      roundingDustWei: 0n,
    };
  }

  // Stake-weighted split with integer division; track rounding dust.
  let allocated = 0n;
  for (let i = 0; i < activeValidators.length; i++) {
    const v = activeValidators[i];

    // Last validator gets the remainder to keep sums exact.
    let share: bigint;
    if (i === activeValidators.length - 1) {
      share = mintableReward - allocated;
    } else {
      share = (mintableReward * v.stakeWei) / totalStakeWei;
    }

    if (share > 0n) {
      const prev = perValidatorRewardWei.get(v.validator) ?? 0n;
      perValidatorRewardWei.set(v.validator, prev + share);
      allocated += share;
    }
  }

  const roundingDustWei =
    allocated > mintableReward ? 0n : mintableReward - allocated;

  const nextState: MonetaryStateV1 = {
    totalMintedWei: prevState.totalMintedWei + mintableReward,
  };

  return {
    nextState,
    perValidatorRewardWei,
    capOverflowWei,
    roundingDustWei,
  };
}
