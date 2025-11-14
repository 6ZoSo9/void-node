# VOID Network – Reward Engine Observability & Metrics (v1)

This document defines how we **watch** the VOID reward engine in production:

- Ensure `totalMinted` never exceeds `MAX_SUPPLY`.
- Ensure rewards are actually being paid to validators.
- Detect bugs, misconfig, or hostile forks quickly.

This is **non-consensus**: it describes metrics, exporters, and dashboards,
not protocol rules. The protocol rules live in:

- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-EMISSIONS-PARAMS-V1.json
- docs/VOID-VALIDATOR-REWARDS-V1.md
- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md

---

## 1. Core invariants to monitor

The reward engine (`reward_engine_v1` + helpers) must satisfy:

1. **Cap safety**

   - `totalMintedWei <= MAX_SUPPLY_WEI` at all times.
   - `capOverflowWei == 0` in healthy operation.
   - If `capOverflowWei > 0` ever appears, that is a **red alert**: node must
     refuse to advance or flip into safe/halted mode.

2. **Monotonicity**

   - `lastHeightRewarded` must be **monotonic increasing**.
   - `totalMintedWei` must be **monotonic increasing** (no negative deltas).

3. **Validator splits sum correctly**

   For each height `h`:

   - `sum_i validatorRewardWei[i] <= blockRewardWei(h)`
   - Any tiny remainder (`roundingDustWei`) must be **explicitly tracked** and
     bounded (e.g. never more than a few wei per block, and never growing
     without bound).

4. **Continuity vs. chain head**

   - We never skip heights: `lastHeightRewarded` should usually track
     `chainHeadNumber` (or a lag bounded by configuration).
   - If the lag grows beyond a threshold, we alert.

---

## 2. Proposed metrics (Prometheus-style)

These are **text-format exporters** we will eventually expose from `void-node`.
Names are indicative; exact names can be tuned as we wire them in.

### 2.1 Global reward engine state

Gauge-style (single series):

- `void_reward_total_minted_wei`
  - Total minted rewards to date (validators only), in wei.

- `void_reward_max_supply_wei`
  - Static MAX_SUPPLY in wei (666,666,666 * 1e18).

- `void_reward_last_height`
  - Highest block height for which rewards have been computed/applied.

- `void_reward_cap_overflow_wei`
  - Amount that *would* have exceeded the cap if not clamped. Must be 0 in
    healthy operation.

- `void_reward_rounding_dust_wei`
  - Accumulated rounding dust tracked by the engine.

- `void_reward_engine_health`
  - 1 = healthy, 0 = degraded, -1 = fatal bug detected.

### 2.2 Per-block sample (optional debug)

For a small sliding window (e.g. last 1024 heights), **optional** debug series:

- `void_reward_block_total_wei{height="H"}`
- `void_reward_block_dust_wei{height="H"}`
- `void_reward_block_overflow_wei{height="H"}`

These are primarily for short-term investigation and can be behind a feature
flag to avoid cardinality blow-ups.

### 2.3 Per-validator reward series

We avoid per-validator metrics for millions of validators. Instead:

- Core series:

  - `void_reward_validator_applied_wei_total`
    - Labels: `{validator="0x...", kind="base|bonus|penalty"}`

- Aggregate views via recording rules:

  - `void:reward:per_validator_1h`
  - `void:reward:top_n_validators`
  - `void:reward:total_1h`, etc.

We will derive these via Prometheus recording rules and dashboards rather than
exporting “raw per-block per-validator” time series.

---

## 3. Alerting invariants

These are **operational SLOs**, not consensus rules. Examples:

1. **Cap overflow**

   - Alert: `VoidRewardCapOverflow`
   - Condition:
     - `void_reward_cap_overflow_wei > 0` for more than 1 scrape.
   - Action:
     - Page operator.
     - Recommend SAFEBOOT / halt mode until investigated.

2. **Engine stuck vs head**

   - Alert: `VoidRewardEngineLagging`
   - Condition:
     - `void_head_number - void_reward_last_height > LAG_THRESHOLD` for > 2m.
   - This indicates blocks are sealing but rewards are not being computed.

3. **Health flag**

   - Alert: `VoidRewardEngineUnhealthy`
   - Condition:
     - `void_reward_engine_health != 1` for > 1m.

4. **Dust anomaly**

   - Alert: `VoidRewardDustGrowing`
   - Condition (example):
     - `increase(void_reward_rounding_dust_wei[1h]) > DUST_MAX_DELTA`.
   - If dust grows too fast, something is wrong with the splitting logic.

---

## 4. Integration phases

We integrate observability in **phases** to avoid breaking consensus:

### Phase 0 – Offline scripts (DONE)

- `scripts/emissions_sanity.ts`
- `scripts/reward_engine_sanity.ts`

These validate the math and cap behavior **offline**, outside of the node.

### Phase 1 – Non-consensus hooks in void-node

- Add a `reward_engine_v1` shim that can:
  - Read a synthetic `MonetaryState` snapshot.
  - Simulate a few heights.
  - Export Prometheus-style metrics at a path like:
    - `/__void/metrics/reward_engine_v1.prom`
- NO changes to block headers, state commitments, or consensus.

Goal: prove the metrics wiring before we touch actual chain state.

### Phase 2 – Shadow mode with real chain heights

- Wire the reward engine to the real chain head:
  - For each new sealed block, run the reward engine in **shadow mode**:
    - Compute would-be reward for that height.
    - Track totals and splits in memory / local store.
    - Export metrics, but do **not** mint or apply balances yet.
- Compare against offline scripts and invariants:
  - `totalMinted` monotonic.
  - No cap overflow.
  - Lag vs head bounded.

### Phase 3 – Consensus minting

Only after shadow mode is stable:

- Introduce consensus-visible fields:
  - e.g. `blockHeader.rewardRoot` or a “reward delta” commitment.
- Implement deterministic `rewardPerBlock` in consensus code.
- Use `ValidatorSet` + `VoidToken` + `AdminGate` wiring (as per existing docs)
  to apply minting and per-validator balances.
- Keep all existing metrics, and add **consensus cross-check**:
  - `void_reward_total_minted_wei` (engine) vs on-chain token supply deltas.

### Phase 4 – Long-term SRE hardening

- Add:
  - Uptime SLOs for reward engine exporters.
  - Grafana dashboards:
    - Supply vs cap.
    - Per-validator reward rates.
    - Engine lag vs head.
  - Runbook: “What to do if Reward Engine alerts fire.”

---

## 5. High-level guarantees

With this plan, VOID aims to guarantee:

- **Monetary safety**: total minted rewards never violate the 666,666,666 cap.
- **Transparency**: operators and the community can see:
  - How much has been minted.
  - How much each validator (or top N validators) has earned.
- **Debuggability**: if something goes wrong, we have enough metrics and
  invariants to diagnose quickly without guessing.

This doc is **v1** and is allowed to grow with more concrete metric names and
alert thresholds as we implement the exporters.
