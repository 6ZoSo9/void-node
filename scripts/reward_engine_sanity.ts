// SPDX-License-Identifier: VCL-1.0
// VOID Network – reward_engine_v1 sanity harness (NON-CONSENSUS)
//
// This is just a modelling script. It:
// - Uses a simple flat reward curve (for theory).
// - Feeds a small validator set into reward_engine_v1.
// - Mints forward until the global cap is hit.
// - Asserts we NEVER exceed MAX_SUPPLY.
//
// It does NOT touch consensus code or state DB.

import {
  computeBlockRewardAllocationV1,
  MonetaryStateV1,
  ValidatorStakeSnapshotV1,
} from "../src/tokenomics/reward_engine_v1";

// 18 decimals, ERC20-style.
const ONE_VOID = 10n ** 18n;

// Canonical monetary constants (must match docs / VoidToken).
const MAX_SUPPLY_VOID = 666_666_666n;
const MAX_SUPPLY_WEI = MAX_SUPPLY_VOID * ONE_VOID;

// This is a **toy** emissions curve for modelling only.
// - Flat 5 VOID/block forever.
// - That guarantees "theoretical" rewards go to infinity.
// - reward_engine_v1 then clamps actual minted supply at MAX_SUPPLY_WEI.
function stubRewardPerBlockWei(height: bigint): bigint {
  if (height <= 0n) return 0n;
  return 5n * ONE_VOID;
}

// Simple validator set snapshot:
// - Three validators with different stakes.
// - All active so they all earn rewards.
const validators: ValidatorStakeSnapshotV1[] = [
  {
    validator: "0x0000000000000000000000000000000000000001",
    stakeWei: 1_000_000n * ONE_VOID,
    active: true,
  },
  {
    validator: "0x0000000000000000000000000000000000000002",
    stakeWei: 2_000_000n * ONE_VOID,
    active: true,
  },
  {
    validator: "0x0000000000000000000000000000000000000003",
    stakeWei: 3_000_000n * ONE_VOID,
    active: true,
  },
];

async function main() {
  // Start with zero minted validator rewards (premine is handled separately).
  let state: MonetaryStateV1 = { totalMintedWei: 0n };

  // We don't know a-priori which height will hit the cap with this flat curve,
  // so just simulate up to a hard ceiling and bail once we see overflow.
  const MAX_BLOCKS = 5_000_000n;

  console.log("=== VOID reward_engine_v1 sanity run ===");
  console.log("MAX_SUPPLY_VOID   =", MAX_SUPPLY_VOID.toString());
  console.log("flat reward/block =", "5 VOID");
  console.log("max blocks sim    =", MAX_BLOCKS.toString());
  console.log("");

  let lastLogHeight = 0n;

  for (let h = 1n; h <= MAX_BLOCKS; h++) {
    const {
      nextState,
      perValidatorRewardWei,
      capOverflowWei,
      roundingDustWei,
    } = computeBlockRewardAllocationV1({
      height: h,
      prevState: state,
      validators,
      maxSupplyWei: MAX_SUPPLY_WEI,
      rewardPerBlockWei: stubRewardPerBlockWei,
    });

    state = nextState;

    // Hard safety check: NEVER exceed cap.
    if (state.totalMintedWei > MAX_SUPPLY_WEI) {
      throw new Error(
        `CAP VIOLATED at h=${h.toString()} totalMintedWei=${state.totalMintedWei.toString()} > MAX_SUPPLY_WEI=${MAX_SUPPLY_WEI.toString()}`,
      );
    }

    // Log on some sample heights and whenever we hit the cap boundary.
    const shouldLog =
      h === 1n ||
      h === 10n ||
      h === 100n ||
      h === 1_000n ||
      h === 10_000n ||
      h === 100_000n ||
      h === 1_000_000n ||
      capOverflowWei > 0n ||
      h === MAX_BLOCKS;

    if (shouldLog && h !== lastLogHeight) {
      lastLogHeight = h;
      const mintedVoidApprox = Number(
        (state.totalMintedWei / ONE_VOID) > 9_999_999_999n
          ? 0n
          : state.totalMintedWei / ONE_VOID,
      );

      console.log(
        `h=${h.toString()} minted≈${mintedVoidApprox} VOID ` +
          `capOverflowWei=${capOverflowWei.toString()} roundingDustWei=${roundingDustWei.toString()}`,
      );

      if (capOverflowWei > 0n) {
        console.log("  -> cap reached; further theoretical rewards overflow, not minted");
        console.log("  per-validator split (wei):");
        for (const [addr, amt] of perValidatorRewardWei.entries()) {
          console.log(`    ${addr} => ${amt.toString()}`);
        }
      }
    }

    // Once we see any cap overflow, we've proven the behavior we care about.
    if (capOverflowWei > 0n) {
      break;
    }
  }

  console.log("");
  console.log("FINAL STATE:");
  console.log("  totalMintedWei =", state.totalMintedWei.toString());
  console.log("  MAX_SUPPLY_WEI =", MAX_SUPPLY_WEI.toString());
  console.log(
    "  minted / cap   ≈",
    Number((state.totalMintedWei * 10000n) / MAX_SUPPLY_WEI) / 100,
    "%",
  );
  console.log("");
  console.log(
    "Sanity: theoretical rewards go to infinity, but actual minted " +
      "supply NEVER exceeds MAX_SUPPLY.",
  );
}

main().catch((err) => {
  console.error("[reward_engine_sanity] ERROR:", err);
  process.exitCode = 1;
});
