// SPDX-License-Identifier: VCL-1.0

/**
 * VOID Network – Validator rewards helper (v1, non-consensus)
 *
 * Pure helper for splitting base block reward + tx fees between
 * proposer / treasury / burn, using bigint (wei-style).
 *
 * NOTE: This module is NON-CONSENSUS. It does not mutate state and is
 * safe to import from modelling code or future consensus wiring.
 */

export interface RewardSplitConfig {
  proposerBps: number; // basis points (1% = 100 bps)
  treasuryBps: number;
  burnBps: number;
}

export interface ValidatorRewardInput {
  blockNumber: bigint;
  baseReward: bigint; // emissions-based block reward (in wei)
  txFees: bigint;     // total collected tx fees for the block (in wei)
}

export interface ValidatorRewardOutput {
  blockNumber: bigint;
  baseReward: bigint;
  txFees: bigint;
  proposerReward: bigint;
  treasuryReward: bigint;
  burned: bigint;
  remainder: bigint; // rounding leftovers (stay in protocol bucket / treasury)
}

// 10_000 bps = 100%
const BPS_DENOMINATOR = 10_000n;

/**
 * Default split (v1, can be tuned later in ConfigGate / params):
 * - 90% to proposer
 * - 10% to protocol treasury
 * - 0% burn
 */
export const DEFAULT_REWARD_SPLIT: RewardSplitConfig = {
  proposerBps: 9000,
  treasuryBps: 1000,
  burnBps: 0,
};

function toBigIntBps(value: number): bigint {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`invalid bps: ${value}`);
  }
  return BigInt(value);
}

/**
 * Compute how a single block's reward should be split between
 * proposer / treasury / burn, given:
 * - baseReward (from emissions_v1)
 * - txFees (collected in this block)
 *
 * This does not know about balances or state – it's just math.
 */
export function computeValidatorRewards(
  input: ValidatorRewardInput,
  cfg: RewardSplitConfig = DEFAULT_REWARD_SPLIT,
): ValidatorRewardOutput {
  const total: bigint = input.baseReward + input.txFees;

  if (total === 0n) {
    return {
      blockNumber: input.blockNumber,
      baseReward: input.baseReward,
      txFees: input.txFees,
      proposerReward: 0n,
      treasuryReward: 0n,
      burned: 0n,
      remainder: 0n,
    };
  }

  const proposerBps = toBigIntBps(cfg.proposerBps);
  const treasuryBps = toBigIntBps(cfg.treasuryBps);
  const burnBps = toBigIntBps(cfg.burnBps);

  const totalBps = proposerBps + treasuryBps + burnBps;
  if (totalBps > BPS_DENOMINATOR) {
    throw new Error("reward split bps exceed 100%");
  }

  const proposerReward =
    (total * proposerBps) / BPS_DENOMINATOR;
  const treasuryReward =
    (total * treasuryBps) / BPS_DENOMINATOR;
  const burned =
    (total * burnBps) / BPS_DENOMINATOR;

  const distributed = proposerReward + treasuryReward + burned;
  const remainder = total - distributed;

  return {
    blockNumber: input.blockNumber,
    baseReward: input.baseReward,
    txFees: input.txFees,
    proposerReward,
    treasuryReward,
    burned,
    remainder,
  };
}
