# VOID Mainnet — Bootstrap Phases & Gating (Draft)

This doc explains **how we think about VOID mainnet bootstrap in phases**, and how the existing
scripts + Prometheus gauges map onto those phases.

It is **documentation only**. It does not execute anything.

---

## 0. Vocabulary and gauges

We care about these signals:

- `void:mainnet_overall:health:last_5m_v2`
- `void:mainnet_pillars:health:last_5m`
- `void:mainnet_lastmile:health:last_5m`
- `void_safeboot_overall_health`

And specifically for bootstrap:

- `void_mainnet_bootstrap_plan_configured` (textfile exporter)
- `void_mainnet_bootstrap_plan_health` (textfile exporter)
- `void:mainnet_bootstrap_plan:configured:last_5m` (Prom recording)
- `void:mainnet_bootstrap_plan:health:last_5m` (Prom recording)

Interpretation:

- `configured = 1` means:
  - The live PLAN JSON exists and is syntactically sane.
  - ChainId matches 2050.
- `health = 1` means:
  - Critical roles, contracts, and validator0 fields are **non-zero / non-TODO**.
  - Rehearsal path says `planReady = true`.
  - Exporter STRUCT_OK = 1.

Right now, on 2050-11-29:

- `void:mainnet_bootstrap_plan:configured:last_5m = 1`
- `void:mainnet_bootstrap_plan:health:last_5m = 0`

i.e. PLAN is **configured but NOT READY** (by design).

---

## 1. Phase A — Dev bootstrap only (Anvil / sandbox)

**Goal:** Prove the wiring is correct in a throwaway environment.

Key pieces:

- `script/VoidMainnetBootstrapDev.s.sol`
- Shell harness:
  - `ops/void-mainnet-dev-bootstrap-full.sh`
- Metrics + tests:
  - Tokenomics invariants.
  - Treasury → OpsTreasury → RewardEngine flow.
  - Validator claim path, etc.

In this phase, **nothing touches the real mainnet**:

- ChainId is still a local Anvil 2050 sandbox.
- Keys and configs are dev-only.
- PLAN live config does not matter yet.

We already did this: dev bootstrap passes and is tagged.

---

## 2. Phase B — PLAN skeleton wired (current state)

**Goal:** Install a *real* PLAN JSON + health probes **without** filling real addresses.

Artifacts:

- Live PLAN config (template path):
  - `config/void-mainnet-bootstrap-mainnet.live.json`
- PLAN inspection scripts:
  - `ops/void-mainnet-bootstrap-plan-checklist.sh`
  - `ops/void-mainnet-bootstrap-plan-all.sh`
  - `ops/void-mainnet-bootstrap-plan-readiness.sh`
  - `ops/void-mainnet-bootstrap-plan-demo-rehearse.sh`
- PLAN exporter / metrics:
  - `ops/void-mainnet-bootstrap-plan-exporter.sh` (invoked inside health-all)
  - Textfile: `ops/metrics/void_mainnet_bootstrap_plan.prom`

State in this phase:

- PLAN JSON has:
  - ChainId 2050 set.
  - Fixed “owner-style” roles for AdminGate/UpdateGate/ConfigGate/Treasury/etc
    wired to canonical placeholder addresses.
  - **ZERO** for all sensitive roles/contracts/validator0 which will be filled later.
- The scripts show:
  - `CONFIG_OK  = 1`
  - `STRUCT_OK  = 0`
  - `planReady  = false`
- Prometheus confirms:
  - `void:mainnet_bootstrap_plan:configured:last_5m = 1`
  - `void:mainnet_bootstrap_plan:health:last_5m     = 0`

This is the **“skeleton installed, but not armed”** phase. That’s where we are now.

---

## 3. Phase C — PLAN READY (no broadcast yet)

**Goal:** Move the live PLAN JSON from “configured but not ready” to
“ready to use”, **without** actually deploying contracts yet.

This phase requires:

1. **Real addresses filled into the live PLAN config:**
   - `roles.deployer`
   - `roles.treasuryAdmin`, `roles.opsTreasuryAdmin`, `roles.validatorAdmin`
   - All `contracts.*` addresses:
     - `updateGate`, `adminGate`, `configGate`, `validatorSet`
     - `voidToken`, `premineVault`, `treasury`, `voidTreasury`, `opsTreasury`, `rewardEngine`
   - `validator0`:
     - `reward` (validator reward EOA)
     - `consensusKey` (bytes)
     - `stakeVOID` (raw quantity, e.g. `"1000000e18"`)

2. **Use a safe filling mechanism:**
   - Manual edit for first time.
   - Or helper:
     - `ops/void-mainnet-bootstrap-plan-fill-from-env.sh`
   - All values must come from the keys/devices plan:
     - LUKS sentinel.
     - Hardware wallet(s).
     - Paper backups for treasury key(s).

3. **Rehearsal & exporter must agree:**
   - `ops/void-mainnet-bootstrap-plan-all.sh` must show:
     - `rolesConfigured   : true`
     - `contractsConfigured: true`
     - `validatorConfigured: true`
     - `planReady         : true`
   - Exporter must show:
     - `CONFIG_OK  = 1`
     - `STRUCT_OK  = 1`
   - Prometheus must show:
     - `void:mainnet_bootstrap_plan:configured:last_5m = 1`
     - `void:mainnet_bootstrap_plan:health:last_5m     = 1`

**Important:** Even in Phase C, we still do **not** broadcast. This is a “PLAN is
ready and frozen for human review” state.

We will only flip to Phase C after:

- Keys plan is fully finalized and implemented.
- All signer addresses are known and double-checked.
- We are close enough to mainnet that freezing a real PLAN makes sense.

---

## 4. Phase D — Broadcast (mainnet bootstrap day)

**Goal:** Take a PLAN with `plan_health = 1`, and actually deploy it to real mainnet.

This phase uses:

- Real bootstrap script (e.g. `VoidMainnetBootstrapMainnet.s.sol`).
- A **PLAN-only** harness that:
  - Reads `config/void-mainnet-bootstrap-mainnet.live.json`.
  - Streams a human-readable plan summary (for humans).
  - Executes the series of transactions **once** against real mainnet RPC.
- Strict runbook steps, likely in:
  - `ops/README-mainnet-bootstrap-runbook.md`
  - Separate `*_mainnet-live.sh` script(s) with guardrails.

Expected safety rails:

- Dry-run / simulate against a fork first.
- Check the PLAN hash in:
  - On-chain logs.
  - Local Prometheus gauges.
- Only run from a machine with:
  - LUKS sentinel unlocked.
  - Hardware wallets connected.
  - No background experiments / dev processes interfering.

After a successful broadcast, health signals must show:

- Core pillars still green (devnet/mainnet-core/safeboot/tokenomics).
- New “post-bootstrap” gauges at 1, e.g.:
  - `void_mainnet_bootstrap_done == 1`
  - Future `void:mainnet_bootstrap_overall:health:last_5m == 1`.

---

## 5. Where we are today (2025-11-29)

Reality check right now:

- Devnet + mainnet-core + safeboot pillars:
  - `void:mainnet_overall:health:last_5m_v2 = 1`
  - `void:mainnet_pillars:health:last_5m     = 1`
  - `void_safeboot_overall_health           = 1`
- PLAN:
  - `void:mainnet_bootstrap_plan:configured:last_5m = 1`
  - `void:mainnet_bootstrap_plan:health:last_5m     = 0`
- Scripts:
  - `ops/void-mainnet-bootstrap-plan-all.sh` says:
    - CONFIG_OK  = 1
    - STRUCT_OK  = 0
    - RESULT: CONFIGURED BUT NOT READY

In other words:

- We are firmly in **Phase B: PLAN skeleton wired**, and that’s intentional.
- Nothing is armed with real keys.
- PLAN is visible to humans and to Prometheus, but **not** ready to be used for real deployments.

---

## 6. What must be true before we move to Phase C

Future checklist (not done yet):

1. LUKS + hardware wallet story finalized and practiced:
   - At least one successful “backup + restore” drill.
2. Real mainnet signer addresses chosen and documented in:
   - `ops/README-mainnet-keys-and-devices.md`
   - Any private offline docs you maintain outside the repo.
3. Live PLAN JSON filled (once we are ready), then:
   - `ops/void-mainnet-bootstrap-plan-all.sh`
   - `ops/void-mainnet-bootstrap-readiness.sh`
   show PLAN READY (STRUCT_OK=1, planReady=true).
4. `void:mainnet_bootstrap_plan:health:last_5m` == 1 for a sustained window.

Only after that will we let PLAN gating participate in any stricter SLOs for
“mainnet ready to go live”.

---

## 7. How Obelisk + validators tie into this

Separate but related docs:

- `ops/README-mainnet-keys-and-devices.md`
- `ops/README-mainnet-validator-quickstart.md`
- `ops/obelisk-validator-ux-checklist.sh`
- `ops/README-mainnet-node-install.md`

These answer **“How does a human validator get set up?”** and
**“What does a node install look like?”**.

This bootstrap phases doc answers:

- **“What are the phases from dev bootstrap to real mainnet broadcast?”**
- **“How do the PLAN scripts and gauges tell us which phase we are in?”**

As we get closer to mainnet, this file should be kept up to date with the
actual scripts, tags, and health signals we rely on for go/no-go decisions.
