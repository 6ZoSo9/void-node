import {
  MAX_SUPPLY_VOID,
  PREMINE_VOID,
  REMAINING_EMISSIONS_VOID,
  DEFAULT_EMISSIONS_PARAMS,
  eraIndex,
  rewardPerBlockRaw,
} from "../src/tokenomics/emissions_v1";

const p = DEFAULT_EMISSIONS_PARAMS;

// Approximate total emissions over N eras assuming constant reward per era.
function approximateTotalEmissionOverEras(eras: number): { eras: number; totalMintedVOID: number } {
  if (!Number.isFinite(eras) || eras < 0) {
    throw new Error("eras must be >= 0");
  }
  const eMax = Math.floor(eras);
  let total = 0;

  for (let e = 0; e < eMax; e++) {
    const reprHeight = e * p.eraLengthBlocks;
    const reward = rewardPerBlockRaw(reprHeight, p); // VOID per block in this era
    const eraEmission = reward * p.eraLengthBlocks;
    total += eraEmission;
  }

  return { eras: eMax, totalMintedVOID: total };
}

function main() {
  console.log("=== VOID Emissions Sanity Check (NON-CONSENSUS) ===");
  console.log("MAX_SUPPLY_VOID        =", MAX_SUPPLY_VOID);
  console.log("PREMINE_VOID           =", PREMINE_VOID);
  console.log("REMAINING_EMISSIONS    =", REMAINING_EMISSIONS_VOID);
  console.log("eraLengthBlocks        =", p.eraLengthBlocks);
  console.log("initialRewardVOID      =", p.initialRewardVOID);
  console.log("decayNumerator/Denom   =", p.decayNumerator, "/", p.decayDenominator);
  console.log("");

  const sampleHeights = [
    0,
    p.eraLengthBlocks - 1,
    p.eraLengthBlocks,
    5 * p.eraLengthBlocks,
    10 * p.eraLengthBlocks,
  ];

  console.log("Sample per-block rewards at various heights:");
  for (const h of sampleHeights) {
    const e = eraIndex(h, p);
    const r = rewardPerBlockRaw(h, p);
    console.log(`  height=${h.toString().padEnd(12)} era=${e.toString().padEnd(4)} reward=${r}`);
  }

  console.log("");
  const erasToCheck = 50; // ~50 years at 1-year eras; pure approximation.
  const approx = approximateTotalEmissionOverEras(erasToCheck);
  const totalSupplyApprox = PREMINE_VOID + approx.totalMintedVOID;

  console.log(`Approximate total minted over ${approx.eras} eras:`, approx.totalMintedVOID);
  console.log("Approximate total supply (premine + approx minted):", totalSupplyApprox);
  console.log("Within MAX_SUPPLY_VOID? ", totalSupplyApprox <= MAX_SUPPLY_VOID);
  console.log("");
  console.log("NOTE: This script is NON-CONSENSUS and for modelling/sanity only.");
}

main();
