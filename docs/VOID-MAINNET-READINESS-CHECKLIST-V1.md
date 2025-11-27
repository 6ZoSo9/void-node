# VOID Network – Mainnet Readiness Checklist (v1)

This checklist is the **gate** for VOID mainnet launch (chainId 2050).  
Mainnet must NOT launch until every item here is satisfied and verifiable.

It ties together:
- Monetary + tokenomics spec
- Validator set + reward engine
- Genesis spec + plan
- Keys plan
- Node / monitoring pillars (safeboot, devnet, mainnet-core, last-mile)

---

## 1. Pillars & Monitoring

**Goal:** All mainnet pillars are green and observable.

- [ ] `void_mainnet_core_health == 1`
- [ ] `void_mainnet_tokenomics_health == 1`
- [ ] `void:mainnet_lastmile:health:last_5m == 1`
- [ ] `void_mainnet_pillars_health == 1`
- [ ] Safeboot pillar:
  - [ ] `void_safeboot_overall_health` is present and non-NaN
  - [ ] `void:safeboot:overall` recording rule returns a single series
- [ ] Overall scalar:
  - [ ] `void:mainnet_overall:health:last_5m_v2 == 1`
- [ ] Prometheus:
  - [ ] Config passes `promtool check config`
  - [ ] All VOID jobs (`void-node`, `void-head`, txroot/header3/seals/proposer/agents/lastmile) are `up == 1`
- [ ] Grafana:
  - [ ] “VOID — Command Center” dashboard shows:
    - Green health panels for core, last-mile, tokenomics, pillars
    - Head advancing, drift ≈ 0, txroot/header3 matched

---

## 2. Monetary & Tokenomics

**Goal:** On-chain contracts, docs, and monitoring all agree on numbers.

- [ ] Tokenomics constants are locked and documented:
  - [ ] `MAX_SUPPLY = 666,666,666 VOID`
  - [ ] `PREMINE   = 333,333,333 VOID`
  - [ ] `EMISSIONS = 333,333,333 VOID` (4 eras: 177,777,777; 88,888,889; 44,444,444; 22,222,223)
- [ ] Docs aligned and committed:
  - [ ] `docs/VOID-TOKENOMICS-SPEC-V1.md`
  - [ ] `docs/VOID-EMISSIONS-SCHEDULE.md`
  - [ ] `docs/VOID-EMISSIONS-PARAMS-V1.json`
  - [ ] `docs/VOID-EMISSIONS-SANITY-2025-11-14.txt`
  - [ ] `docs/VOID-MONETARY-SPEC-V1.md`
- [ ] Foundry tests:
  - [ ] `test/VoidToken.t.sol` passes
  - [ ] `test/TokenomicsSpec.t.sol` passes
  - [ ] `test/mainnet/Treasury.t.sol` passes
  - [ ] `test/mainnet/RewardEngine.t.sol` passes
  - [ ] `test/mainnet/ValidatorSet.t.sol` passes
- [ ] Prometheus “spec health”:
  - [ ] `void_mainnet_tokenomics_spec_health == 1`
  - [ ] Emissions budget in RewardEngine matches EMISSIONS (within 1 wei of expected total)

---

## 3. Contracts Required for Mainnet v1

**Goal:** All required mainnet contracts exist, are tested, and their roles are clear.

Core monetary contracts:
- [ ] `VoidToken` (mainnet ERC-20)
- [ ] `VoidTreasury` (cold premine treasury)
- [ ] `OpsTreasury` (hot operational treasury)

Validator / rewards:
- [ ] `IValidatorSetLike`
- [ ] `ValidatorSet` (implements `IValidatorSetLike`)
- [ ] `IRewardEngineLike`
- [ ] `RewardEngine` (emissions budget + per-validator claims)

For each contract above:
- [ ] ABI and source paths are stable
- [ ] Admin / master key roles are documented in:
  - [ ] `docs/VOID-MAINNET-KEYS-PLAN.md`
- [ ] Tests cover:
  - [ ] Admin-only functions
  - [ ] Happy-path flows
  - [ ] Misuse / revert conditions
  - [ ] Budget caps (RewardEngine cannot exceed EMISSIONS)

---

## 4. Genesis Spec & Plan

**Goal:** Genesis data is fully specified and reproducible.

- [ ] `docs/VOID-MAINNET-GENESIS-SPEC.md` is up to date
- [ ] `docs/VOID-MAINNET-GENESIS-PLAN.md` is up to date
- [ ] Genesis includes:
  - [ ] Deployed `VoidToken` with:
    - [ ] PREMINE assigned to `VoidTreasury`
    - [ ] No direct validator allocation from premine
  - [ ] Deployed `VoidTreasury` & `OpsTreasury` with correct admins
  - [ ] Deployed `ValidatorSet` with:
    - [ ] Initial validator addresses
    - [ ] Initial voting powers
  - [ ] Deployed `RewardEngine` with:
    - [ ] `emissionsBudget == EMISSIONS`
    - [ ] `validatorSet` and `voidToken` wired correctly
- [ ] There is a **deterministic** genesis build path:
  - [ ] Script or tool that takes a config file and outputs:
    - [ ] Genesis JSON
    - [ ] Deployed addresses
    - [ ] Hashes / checksums
  - [ ] This path is documented in `docs/VOID-MAINNET-GENESIS-PLAN.md`

---

## 5. Validator Set & Rewards Integration

**Goal:** ValidatorSet + RewardEngine + docs + tests are all in sync.

Docs:
- [ ] `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
- [ ] `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`
- [ ] `docs/VOID-REWARD-FLOW-V1.md`
- [ ] `docs/VOID-VALIDATOR-ONBOARDING-V1.md`

Contracts & tests:
- [ ] `ValidatorSet` implements `IValidatorSetLike` exactly (signatures + semantics)
- [ ] `RewardEngine` uses:
  - [ ] `getActiveValidators()`
  - [ ] `getVotingPower(addr)`
  - [ ] `totalPower()`
- [ ] Tests assert:
  - [ ] totalPower == sum of per-validator powers
  - [ ] `getActiveValidators()` filters out zero-power validators
  - [ ] Reward shares are proportional to voting power
  - [ ] Emissions budget cannot be exceeded
  - [ ] Only admin can:
    - [ ] Pull emission
    - [ ] Change validator powers
    - [ ] Rotate admin

Monitoring expectations (to wire later when chain is live):
- [ ] Textfile or RPC-based exporter for:
  - [ ] `void_mainnet_validator_power_total`
  - [ ] `void_mainnet_reward_emissions_budget`
  - [ ] `void_mainnet_reward_emissions_pulled_total`
  - [ ] `void_mainnet_reward_emissions_claimed_total`

---

## 6. Keys & Security

**Goal:** Mainnet keys are fresh, safe, and not reused from devnet.

- [ ] `docs/VOID-MAINNET-KEYS-PLAN.md` is complete and reflects reality
- [ ] Devnet keys are **never** reused on mainnet
- [ ] For mainnet:
  - [ ] Treasury premine key is a fresh, never-used key
  - [ ] AdminGate / UpdateGate master keys are fresh
  - [ ] Keys are backed up to LUKS-encrypted offline media (and/or hardware wallets)
- [ ] Operational policy:
  - [ ] Clear rules for who can:
    - [ ] Spend from OpsTreasury
    - [ ] Rotate admin keys
    - [ ] Update ValidatorSet powers
- [ ] Emergency procedures:
  - [ ] Runbook for:
    - [ ] Premine key compromise
    - [ ] Validator key compromise
    - [ ] Admin key compromise

---

## 7. Node / Network Baseline

**Goal:** Node stack is stable and matches the specs used in all docs.

- [ ] Main proposer node:
  - [ ] Systemd unit present and enabled
  - [ ] Ports (HTTP / P2P) match docs
  - [ ] Proposer auto-loop exporter shows healthy tick rate
- [ ] Follower nodes:
  - [ ] Can sync from proposer
  - [ ] Drift ≈ 0 under normal conditions
- [ ] Safeboot node:
  - [ ] Boots from same data model
  - [ ] Exposes health exporters used by `void:safeboot:overall`
- [ ] Vector 7 / saveBlock guardrails are enabled and tested
- [ ] All relevant node/exporter health checks are captured in Prometheus alerts

---

## 8. Launch-Day Checklist (High-Level)

These steps must be executed in order at launch time (detailed runbook lives elsewhere):

- [ ] Final audit pass on contracts and tokenomics docs
- [ ] Final Prometheus / Grafana sanity checks (all VOID alerts green or acknowledged)
- [ ] Final key ceremony per `VOID-MAINNET-KEYS-PLAN.md`
- [ ] Run genesis build, capture hashes, and archive:
  - [ ] Config
  - [ ] Genesis JSON
  - [ ] Deployed addresses
- [ ] Start mainnet nodes according to the mainnet ops runbook
- [ ] Verify:
  - [ ] Heads advancing
  - [ ] Pillars green
  - [ ] No unexpected alerts
- [ ] Tag the repo with a `mainnet-launch-YYYYMMDD-HHMMSS` tag and archive configs.

---

## 9. Status Tracking

For each major area, track status at the time of launch prep:

- [ ] Monetary & tokenomics: _________
- [ ] Contracts & tests: _________
- [ ] Genesis spec & plan: _________
- [ ] Validator set & rewards: _________
- [ ] Keys & security: _________
- [ ] Node / network: _________
- [ ] Monitoring & alerts: _________
- [ ] External audit (if any): _________

This file should be updated as we approach mainnet and treated as the single-page
gatekeeper before we let VOID mainnet out into the world.
