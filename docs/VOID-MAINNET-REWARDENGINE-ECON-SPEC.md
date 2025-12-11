# VOID Mainnet — RewardEngine Econ Spec (v1)

This document describes the RewardEngine econ parameters for VOID mainnet v1.

It is the human-readable counterpart of:

- config/void-mainnet-rewardengine-params.json
- test/RewardEngineEpochSpec.t.sol
- ops/void-mainnet-rewardengine-econ-*.sh
- Prometheus gauges:
  - void_mainnet_rewardengine_econ_json_ok
  - void_mainnet_rewardengine_econ_self_consistent
  - void_mainnet_rewardengine_econ_health
  - void:mainnet_rewardengine_econ:health:last_5m

The JSON file is the single source of truth; this doc explains intent and units.

---

## 1. High-level intent

- These parameters govern Work Credits (WC) emissions per epoch, not VOID emissions directly.
- RewardEngine v1 is responsible for:
  - Defining how many WC are emitted per epoch (based on a daily target).
  - Providing parameters for per-validator weighting:
    - stake
    - uptime
    - performance

VOID tokenomics (premine, Treasury, Ops, etc.) are handled separately in the mainnet tokenomics specs and contracts (VoidTreasury, OpsTreasury, RewardEngine, ValidatorSet, etc.).

---

## 2. Current JSON (v1)

File: config/void-mainnet-rewardengine-params.json

Raw content:

{
  "epochLengthBlocks": 3600,
  "epochsPerDay": 12,
  "wcDailyEmissionStart": "100000000000000000000000",
  "wcPerEpochStart": "8333333333333333333333",
  "wcEmissionDecayBpsPerYear": 500,
  "weightFormula": "sqrt(stake) * uptime * performance",
  "weightComponents": {
    "stake": "sqrt(staked VOID)",
    "uptime": "fraction of duties performed in epoch (0.0-1.0)",
    "performance": "0 or 1 (slashed vs healthy) in v1"
  },
  "notes": [
    "wcDailyEmissionStart is in 18-decimal units (100,000e18).",
    "wcPerEpochStart is floor(wcDailyEmissionStart / epochsPerDay) in 18-decimal units.",
    "wcEmissionDecayBpsPerYear = 500 means 5.00% annual decay (optional, off-chain controlled)."
  ]
}

---

## 3. Parameter breakdown

### 3.1 epochLengthBlocks

- Type: uint256
- Value: 3600
- Meaning: Number of blocks in a RewardEngine epoch.
- With a 2 second block time:
  - 3600 blocks * 2 seconds = 7200 seconds ≈ 2 hours
- So 1 epoch is approximately 2 hours.

### 3.2 epochsPerDay

- Type: uint256
- Value: 12
- Meaning: How many epochs are treated as one logical "day" for emission math.
- With 12 epochs per day and each epoch ≈ 2 hours:
  - 12 * 2 hours = 24 hours
- So 12 epochs ≈ 1 day.

### 3.3 wcDailyEmissionStart

- Type: stringified uint256 (18 decimals)
- Value: "100000000000000000000000"
- Meaning: Target daily Work Credits emission at network launch.
- Human-readable:
  - 100,000 WC per day (100_000e18 units).
- This sets the initial scale of WC emissions.

### 3.4 wcPerEpochStart

- Type: stringified uint256 (18 decimals)
- Value: "8333333333333333333333"
- Meaning: Work Credits emitted per epoch at network launch.
- Relationship:
  - Approximately floor(wcDailyEmissionStart / epochsPerDay).
  - 100,000e18 / 12 ≈ 8,333.333...e18.
- This is the WC emission per 2-hour epoch before per-validator weighting.

### 3.5 wcEmissionDecayBpsPerYear

- Type: uint256
- Value: 500
- Meaning: Annual decay rate for WC emissions, in basis points (bps).
- 500 bps = 5.00% per year.
- Intended behavior:
  - Over a year, the daily emission target can decay by up to 5%.
  - Implementation (on-chain or off-chain control) is deliberately flexible in v1.

### 3.6 weightFormula

- Type: string
- Value: "sqrt(stake) * uptime * performance"
- Meaning: Human-readable formula for computing per-validator weight:

  weight = sqrt(stake) * uptime * performance

Where:

- stake: amount of VOID staked by the validator.
- sqrt(stake): sub-linear scaling so whales do not dominate linearly.
- uptime: fraction of expected duties performed in the epoch (0.0–1.0).
- performance: 0 or 1 (slashed vs healthy) in v1.

This field is documentation for off-chain/on-chain logic. The exact implementation will live in the RewardEngine and/or associated off-chain workers.

### 3.7 weightComponents

- Type: object mapping component name to a descriptive string.
- Purpose: clarify the terms used in weightFormula.

Components:

- stake: "sqrt(staked VOID)"
- uptime: "fraction of duties performed in epoch (0.0-1.0)"
- performance: "0 or 1 (slashed vs healthy) in v1"

These are explanations, not enforced schema.

### 3.8 notes

- Type: array of strings.
- Purpose: encode human-readable notes that explain:
  - Units (18-decimal WC amounts).
  - Relationship between daily and per-epoch emissions.
  - Interpretation of the decay parameter.

We treat these notes as canonical commentary for how to read the numbers.

---

## 4. How this integrates into mainnet health

Today:

- test/RewardEngineEpochSpec.t.sol asserts:
  - The JSON file exists.
  - It is non-empty.
  - It is valid JSON (vm.parseJson does not revert).
- ops/void-mainnet-rewardengine-econ-*.sh:
  - Parse this JSON.
  - Emit Prometheus gauges:
    - void_mainnet_rewardengine_econ_json_ok
    - void_mainnet_rewardengine_econ_self_consistent
    - void_mainnet_rewardengine_econ_health
- Recording rules:
  - void:mainnet_rewardengine_econ:health:last_5m

The econ pillar is folded into composite health metrics such as:

- void_mainnet_pillars_with_validators_rewardengine_econ_health
- void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m

If the JSON breaks or the exporter detects inconsistency:

- void_mainnet_rewardengine_econ_health drops to 0.
- Composite econ/pillars/WorkCredits metrics go red.
- ops/void-mainnet-pillars-preflight.sh fails.

---

## 5. Forward plan (RewardEngine + WorkCredits)

This econ spec is v1 and intentionally simple. Next steps:

1) Wire RewardEngine to WorkCreditsMinter

- RewardEngine or a controller computes per-validator weights using:
  - stake
  - uptime
  - performance
- It then calls WorkCreditsMinter.award(...) to distribute WC:
  - Awards should sum to the per-epoch WC total, within reasonable rounding error.

2) Define a RUN pillar for RewardEngine/WC

- Add gauges such as:
  - void_mainnet_rewardengine_last_epoch
  - void_mainnet_rewardengine_wc_emitted_total
  - void_mainnet_workcredits_awards_last_1h
- Define a RUN health metric that captures:
  - Emissions are happening as expected over time.
  - Total WC emitted is consistent with the configured schedule and decay.

3) Versioning

- This document and the JSON together define RewardEngine Econ Spec v1.
- Any future changes must:
  - Update config/void-mainnet-rewardengine-params.json.
  - Update this doc with rationale and new values.
  - Rely on the exporter and pillars to validate consistency.

