# VOID Mainnet Bootstrap RUNBOOK

This document describes how to rehearse and then execute the VOID mainnet bootstrap.
It is intentionally conservative: every stage must be green before moving to real
mainnet keys or live broadcasts.

The flow is:

1. **Dev bootstrap on anvil (chainId 2050)** using throwaway keys
2. **Health-all verification** for wiring, tokenomics, and state snapshot
3. **Plan** mainnet bootstrap with hardware-wallet keys and LUKS USB
4. **Dry-run** the exact JSON + script combo against an anvil fork
5. **Live mainnet bootstrap** (one-shot) only when all gates are green

---

## Step N: Dev bootstrap health-all verification (anvil rehearsal)

Before finalizing any VOID mainnet bootstrap plan, run the dev bootstrap health-all
script against a local anvil chain with chainId 2050:

    cd ~/dev/void-node
    ./ops/void-mainnet-dev-bootstrap-full.sh        # dev bootstrap on anvil
    ./ops/void-mainnet-dev-bootstrap-health-all.sh  # verify wiring + tokenomics + state snapshot

This script performs:

- Core wiring + tokenomics sanity checks
- Emissions budget equality checks
- Gate wiring sanity (AdminGate / ConfigGate / ValidatorSet / RewardEngine / EmissionsController)
- Writes a canonical state file:

    config/void-mainnet-bootstrap-dev.state.json

It must end with:

    RESULT: DEV BOOTSTRAP HEALTH-ALL OK (verify-core + state snapshot)

and produce a state file that matches the locked VOID tokenomics:

- premineWei         = 333333333000000000000000000
- totalSupplyWei     = 333333333000000000000000000
- emissionsBudgetWei = 333333333000000000000000000
- maxSupplyWei       = 666666666000000000000000000

If these checks fail, do **not** proceed to any real mainnet bootstrap. Fix the dev
bootstrap, re-run on anvil, and only move on once this health-all step is green.
