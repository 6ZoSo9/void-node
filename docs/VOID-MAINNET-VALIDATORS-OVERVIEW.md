# VOID Mainnet Validators Overview (Draft v1)

This document describes how validators fit into VOID mainnet economics and ops.
It is a non-secret, public-facing overview. Keys and live config stay in
separate, locked paths (LUKS / hardware wallets / .live.json).

Related docs:

- docs/VOID-MAINNET-TOKENOMICS.md
- docs/VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md
- config/void-mainnet-bootstrap-mainnet.live.json
- script/VoidMainnetBootstrapMainnet.s.sol

---

## 1. Role Of Validators

Validators do three things:

1) Propose and validate blocks (keep the chain live).
2) Lock VOID stake so they have skin in the game.
3) Earn VOID emissions and rewards for honest work.

The network is permissionless at the user level (anyone can deploy contracts
and send txs), but validator set changes go through on-chain logic and the
governance gates (AdminGate / ConfigGate / UpdateGate) we already wired.

---

## 2. Chain And Economics (Summary)

- Chain ID: 2050
- Token: VOID (18 decimals)
- MAX_SUPPLY: 666,666,666 VOID
- PREMINE:    333,333,333 VOID (VoidTreasury at genesis)
- EMISSIONS:  333,333,333 VOID over 100 years, 4 eras

Validators lock VOID into ValidatorSet and receive rewards via RewardEngine.
RewardEngine uses VOID emissions and any extra funding the DAO may add later.

Rough target (not a promise): validator APR in a 5% to 15% band, depending on
how much supply is staked and what emissions schedule is active.

---

## 3. Genesis Validator (validator0)

Validator0 is the first entry in ValidatorSet at genesis. Details live in:

- docs/VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md
- config/void-mainnet-bootstrap-mainnet.live.json

Key points:

- stake: 1,000,000 VOID (locked)
- reward address: a safe address (hardware wallet or multisig)
- consensus key: a dedicated 32-byte key used only for node signing

Validator0 is not a god key. It is just "the first validator" and will be
diluted as more validators join and stake.

---

## 4. High-Level Lifecycle For A Validator

A validator goes through four phases:

1) Acquire VOID
   - Buy from the market or receive via future DAO / programmatic grants.

2) Prepare keys and node
   - Generate consensus key (signing key for the node).
   - Prepare a reward address (hardware wallet or multisig).
   - Run a VOID node with correct chainId and consensus key.
   - Hook the node into metrics (Prometheus / Grafana) so uptime is visible.

3) Join the validator set
   - Lock VOID stake into ValidatorSet via on-chain join flow.
   - Provide:
     - reward address
     - consensus key
     - stake amount
   - Wait for the join transaction to be mined and ValidatorSet to show the
     validator as ACTIVE.

4) Operate and maintain
   - Keep the node online, synced, and healthy.
   - Watch emissions and rewards via RewardEngine metrics.
   - Respect upgrade and config changes via AdminGate / ConfigGate.

Exit (leaving the validator set) will be handled by a defined on-chain exit
flow with an unbonding period. Details will live in a separate doc once the
exact parameters are finalized.

---

## 5. From Validator0 To Many Validators

At launch:

- Validator0 keeps the chain live and safe.
- Governance (AdminGate / UpdateGate / ConfigGate) is wired to mainnet keys
  stored on LUKS / hardware.

After launch, we expect:

- Additional validators to join via a public guide and scripts.
- Staking to spread across multiple operators.
- RewardEngine and ValidatorSet to be tuned by on-chain governance over time.

The long-term goal is a healthy validator set with:

- Diverse operators and geographies.
- Enough stake distributed so no single validator can dominate.
- Clear, transparent rules for emissions, slashing (if added later), and exits.

---

## 6. Open Items And TODOs

The following pieces are intentionally left for later, AFTER mainnet bootstrap
is fully locked:

1) Public "How to run a VOID validator" guide
   - Hardware / bandwidth / disk recommendations.
   - Step-by-step node install and systemd units.
   - Metrics and alerting expectations.

2) Validator join / exit scripts
   - Scripts under ops/ for:
     - validator join (on-chain)
     - validator exit (on-chain with unbonding)
   - CI / Prometheus checks that ensure the validator set is sane.

3) Slashing and penalties (if we introduce them)
   - Rules for downtime and misbehavior.
   - How proof-of-fault is submitted and enforced.

4) Obelisk / UI integration
   - Obelisk Wallet showing:
     - staked VOID
     - validator status
     - rewards over time
   - Simple flows to:
     - delegate stake (if we support delegation)
     - manage validator config

This document will be updated as we finalize these pieces and wire them into
the mainnet pillars and planning checks.

