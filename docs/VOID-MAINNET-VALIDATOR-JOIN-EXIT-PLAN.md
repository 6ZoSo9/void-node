# VOID Mainnet Validator Join / Exit Plan (Draft v1)

This doc describes the *intended* on-chain flow for validators to join and exit
the VOID mainnet validator set. It is planning / design only. The actual
parameters live in contracts + config, and this doc should track those once
they are finalized.

Related docs:

- docs/VOID-MAINNET-TOKENOMICS.md
- docs/VOID-MAINNET-VALIDATORS-OVERVIEW.md
- docs/VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md
- config/void-mainnet-bootstrap-mainnet.live.json
- contracts/mainnet/ValidatorSet.sol
- contracts/mainnet/RewardEngine.sol

---

## 1. Goals

- Simple story for validators:
  - Lock VOID stake
  - Run a node
  - Get paid in VOID
- Clear join/exit rules:
  - No surprises when entering or leaving
  - Predictable unbonding and reward timing
- Metrics-friendly:
  - Easy to expose validator count, stake, and health to Prometheus

---

## 2. Validator Roles / Contracts

Core pieces involved in validator lifecycle:

- **VoidToken**: ERC20-like VOID token
- **ValidatorSet**: responsible for:
  - keeping track of active validators
  - storing stakes and consensus keys
- **RewardEngine**:
  - pulls emissions and reward funds from VoidTreasury / OpsTreasury
  - distributes rewards to validators based on stake and participation
- **AdminGate / ConfigGate / UpdateGate**:
  - control who can change ValidatorSet and RewardEngine parameters

High-level: users lock VOID into ValidatorSet and receive rewards via
RewardEngine.

---

## 3. Join Flow (Concept)

This section describes the expected join flow for a new validator `V`.

**Inputs required from V:**

- `stakeAmount`: amount of VOID to lock (>= minStake)
- `rewardAddress`: address where rewards will be sent
- `consensusKey`: key used by the validator node for signing

**Intended steps (happy path):**

1) V obtains VOID
   - via market or programmatic grant (not specified here).

2) V prepares keys
   - Generate consensus key (just for block signing).
   - Choose a reward address (hardware wallet or multisig).

3) V runs a VOID node
   - Node is configured with:
     - chainId = 2050
     - consensusKey
     - RPC / P2P ports
   - Node appears healthy in metrics (head, txroot, seals, etc.).

4) V calls `ValidatorSet.join(...)`
   - Sends a transaction locking `stakeAmount` VOID.
   - Provides:
     - `rewardAddress`
     - `consensusKey`
     - any other required metadata.

5) ValidatorSet updates state
   - Records:
     - validator ID / index
     - stake amount
     - reward address
     - consensus key
     - status = ACTIVE (once fully joined).

6) RewardEngine picks up V
   - On the next reward cycle, V is included in distribution math.
   - Rewards accrue to `rewardAddress`.

**Constraints / configuration (to be finalized):**

- `minStake`:
  - Example shape: 50,000 VOID or 100,000 VOID
  - Will be set via ConfigGate.

- `maxValidators`:
  - Example shape: soft cap (e.g. 100) with room to grow.

- `cooldownBeforeRewards`:
  - Optional: number of blocks / epochs before a new validator starts earning.
  - Initially can be zero for simplicity.

These values must be kept in sync between:

- contracts (ValidatorSet, RewardEngine)
- config JSON
- docs (this file, + overview + tokenomics)

---

## 4. Exit Flow (Concept)

Exit flow is symmetric: validator decides to stop validating and unlock stake.

**High-level requirements:**

- Exit is *not* instant:
  - there is an unbonding period to protect the network.
- During unbonding:
  - stake is locked
  - validator is not considered active for rewards
- After unbonding:
  - stake becomes withdrawable to the validator’s address

**Intended steps (happy path):**

1) Validator calls `ValidatorSet.requestExit(...)`
   - Signals intent to leave.
   - Transitions status from ACTIVE -> EXITING.
   - Records `exitRequestedAt` (block or timestamp).

2) Unbonding period
   - Configurable parameter (e.g. 7 days, 14 days, or N blocks).
   - During this time:
     - stake cannot be withdrawn
     - validator should stop participating as an active signer

3) Completion
   - After unbonding period:
     - validator calls `ValidatorSet.completeExit(...)`
     - ValidatorSet checks that required time/blocks have elapsed
     - stake is released back to the validator (withdrawal call)

4) Post-exit state
   - Validator status becomes EXITED.
   - Any residual reward accounting is settled.
   - Validator can later re-join by going through the join flow again.

**Parameters to finalize:**

- `unbondingPeriod`
  - Example shapes:
    - time-based (e.g. 7 days)
    - block-based (e.g. N blocks at 2s each)

- `earlyExitPenalty` (optional, default OFF)
  - If we introduce this, document exact behavior:
    - how much is slashed
    - who receives slashed funds (Treasury)

---

## 5. Slashing / Penalties (Future)

Slashing is deliberately out of scope for mainnet bootstrap v1.

We may add a future mechanism for:

- severe misbehavior:
  - double-signing
  - long-term downtime
- proof-based submissions:
  - some contract or off-chain logic submits evidence

If / when slashing is added:

- this doc must be updated with:
  - what behaviors are slashable
  - how detection works
  - exact penalty math

---

## 6. Metrics And Health (Planning)

We intend to expose validator-related statistics via Prometheus:

Examples:

- `void_mainnet_validators_total`
- `void_mainnet_validators_active`
- `void_mainnet_validators_total_stake`
- `void_mainnet_validators_pillar_health`

Planning notes:

- A dedicated `ops/void-mainnet-validators-health-all.sh` script may be used
  to:
  - query on-chain ValidatorSet state (via JSON-RPC)
  - emit a textfile with gauges for node_exporter
  - enforce planning constraints:
    - at least 1 active validator (validator0)
    - no duplicate consensus keys
    - total stake >= some minimum

- Prometheus recording rules / alerts can then gate CI and pre-push hooks.

---

## 7. TODOs

Before real mainnet broadcast we must:

1) Lock concrete parameters
   - minStake
   - maxValidators (soft cap)
   - unbondingPeriod
   - rewards cadence (RewardEngine)

2) Implement / verify full join / exit flows in contracts
   - make sure tests cover:
     - join with exact minStake
     - join with large stake
     - exit + unbonding
     - multiple validators joining / exiting

3) Add ops scripts
   - `ops/void-mainnet-validator-join-plan.sh` (PLAN-only, no broadcast)
   - `ops/void-mainnet-validator-join.sh` (real mainnet path, gated heavily)
   - `ops/void-mainnet-validator-exit-plan.sh`
   - `ops/void-mainnet-validator-exit.sh`

4) Wire metrics + alerts
   - textfile exporter for validator stats
   - Prometheus recording rules + alerts
   - hooks into:
     - planning health
     - mainnet pillars
     - pre-push guard scripts

This document is the planning anchor; code, config, and metrics should
cross-reference it so we can audit the validator lifecycle at any time.
