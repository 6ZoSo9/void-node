# VOID Mainnet Bootstrap PLAN — Runbook

This doc is for the PLAN phase of VOID mainnet bootstrap.

Goal: keep a `.live.json` config that is:
- Structurally sane (CONFIG_OK = 1)
- But kept at plan_health = 0 until we are truly ready to broadcast the real mainnet bootstrap.

---

## 1. Key scripts

### 1.1 Status (JSON + Prom view)

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-status.sh

Shows:

- chainId (config) (must be 2050)
- Roles: ZERO vs SET
- Contracts: ZERO vs SET
- validator0 fields
- Prometheus gauges if Prom is up

### 1.2 Exporter (writes local metrics file)

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-exporter.sh

Writes:

- ops/metrics/void_mainnet_bootstrap_plan.prom with:

    void_mainnet_bootstrap_plan_configured <0/1>
    void_mainnet_bootstrap_plan_health <0/1>

This is the source of truth for the textfile exporter.

### 1.3 Health-all (one-shot check)

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-health-all.sh

Does:

1. Runs the exporter (refresh metrics).
2. Shows status (JSON view).
3. Reads gauges from .prom.
4. Prints a summary:

- CONFIG_OK = 0 / 1
- STRUCT_OK = 0 / 1
- RESULT: NOT CONFIGURED / CONFIGURED BUT NOT READY / PLAN READY

This is the main CLI tool to sanity-check the PLAN.

### 1.4 PLAN view (read-only forge script)

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-view.sh

Runs (internally):

    forge script \
      script/VoidMainnetBootstrapPlanView.s.sol:VoidMainnetBootstrapPlanView \
      --sig "run(string)" config/void-mainnet-bootstrap-mainnet.live.json \
      --rpc-url http://127.0.0.1:8545

- No broadcast.
- Prints roles, contracts, validator0, and a structural health summary:

    CONFIG_OK : 1
    HEALTH_OK : 0/1
    RESULT: ...
    NOTE: This script is READ-ONLY (no broadcast, no deployments).

Use this to see the PLAN as forge sees it.

---

## 2. Prometheus integration

The PLAN gauges come from node_exporter’s textfile collector:

- Repo-side metrics file:
  - ops/metrics/void_mainnet_bootstrap_plan.prom
- Root textfile exporter:
  - /usr/local/bin/void-mainnet-bootstrap-plan-prom-exporter.sh
- Node exporter textfile path:
  - /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom

End-to-end refresh sequence:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-health-all.sh
    sudo /usr/local/bin/void-mainnet-bootstrap-plan-prom-exporter.sh

Then, in Prometheus, you should see:

- void_mainnet_bootstrap_plan_configured
- void_mainnet_bootstrap_plan_health

Recordings:

- void:mainnet_bootstrap_plan:configured:last_5m
- void:mainnet_bootstrap_plan:health:last_5m

---

## 3. Alert: VoidMainnetBootstrapPlanNotReady

Defined in:

- /etc/prometheus/rules.d/void-mainnet-plan-rules.yml
- /etc/prometheus/alerts/void-mainnet-bootstrap-plan.yml

Alert condition:

    void:mainnet_bootstrap_plan:configured:last_5m == 1
    and void:mainnet_bootstrap_plan:health:last_5m == 0
    for 600s

Labels:

- system = "void"
- pillar = "mainnet-plan"
- severity = "warning"

### What it means when this alert fires

It means:

- The PLAN config JSON is structurally sane and chainId = 2050.
- But one or more of:

  - roles.deployer
  - roles.treasuryAdmin
  - roles.opsTreasuryAdmin
  - roles.validatorAdmin
  - contracts.voidToken
  - contracts.premineVault
  - contracts.treasury
  - contracts.opsTreasury
  - contracts.rewardEngine
  - validator0.reward
  - validator0.consensusKey
  - validator0.stakeVOID (still TODO_SET_STAKE_VOID)

  are unset / TODO.

This is the expected state while we are still drafting the PLAN and have not wired real mainnet keys/addresses.

---

## 4. Moving from NOT READY -> READY (later)

Do not rush this. READY should only happen when:

- Real mainnet keys are generated and stored according to the VOID keys plan:

  - Premine/Treasury key used exactly once at genesis and then effectively retired.
  - AdminGate/UpdateGate signer sets backed up on LUKS-encrypted USB and/or hardware wallets.
  - Devnet/test keys are never reused on mainnet.

- The .live.json is edited offline and filled with:

  - Real addresses for:
    - roles.deployer
    - roles.treasuryAdmin
    - roles.opsTreasuryAdmin
    - roles.validatorAdmin
    - contracts.voidToken
    - contracts.premineVault
    - contracts.treasury
    - contracts.opsTreasury
    - contracts.rewardEngine
    - validator0.reward
  - A real validator0.consensusKey (bytes32)
  - A numeric validator0.stakeVOID matching the locked tokenomics and ValidatorSet design.

After editing the .live.json:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-health-all.sh
    sudo /usr/local/bin/void-mainnet-bootstrap-plan-prom-exporter.sh

You want:

- CONFIG_OK = 1
- STRUCT_OK = 1
- void:mainnet_bootstrap_plan:health:last_5m = 1
- Alert VoidMainnetBootstrapPlanNotReady to clear.

At that point, PLAN is structurally READY from the config’s perspective.

We still do not broadcast just because this turned green. Actual broadcast will be gated by:

- Keys/storage checks (LUKS, hardware wallets).
- Mainnet pillars health.
- A dedicated mainnet bootstrap PLAN-vs-LIVE script that simulates the whole flow before sending any tx.

---

## 5. Quick checklist when you see the alert

1. Run:

       cd ~/dev/void-node
       ./ops/void-mainnet-bootstrap-plan-health-all.sh
       ./ops/void-mainnet-bootstrap-plan-view.sh

2. Confirm:

   - chainId (config) : 2050
   - CONFIG_OK = 1

3. Inspect which fields are still ZERO / TODO:

   - Roles, contracts, validator0 in both scripts.

4. Decide if this is:

   - Expected (we are not ready to set real keys yet) -> leave as-is.
   - Transition (we are actively wiring real mainnet values) -> edit the .live.json offline and re-run the health scripts until HEALTH_OK = 1.

This alert is warning-level on purpose. It is a reminder that the PLAN is half-baked, not a production outage.

---

## 4. When is PLAN actually “READY”?

Right now, PLAN is intentionally **NOT READY**:

- `void_mainnet_bootstrap_plan_configured = 1`
- `void_mainnet_bootstrap_plan_health     = 0`

This is correct. We only flip `plan_health` to 1 when the **real live config** is filled in and cross-checked.

The JSON fields that MUST be **non-zero / non-TODO** before `plan_health` is allowed to be 1:

### 4.1 Roles (must be real mainnet keys)

These come from your **real mainnet key plan** (LUKS / hardware wallets), NOT dev keys:

- `.roles.deployer`
- `.roles.treasuryAdmin`
- `.roles.opsTreasuryAdmin`
- `.roles.validatorAdmin`

And the long-lived owners:

- `.roles.adminGateOwner`
- `.roles.updateGateOwner`
- `.roles.configGateOwner`
- `.roles.treasuryOwner`
- `.roles.opsTreasuryOwner`
- `.roles.rewardEngineOwner`
- `.roles.validatorSetOwner`

All of these:

- MUST be real mainnet addresses.
- MUST be derived from the correct hardware / LUKS-secured keys.
- MUST be double-checked offline before going into the `.live.json`.

### 4.2 Core contracts (must be deployed addresses, not zero)

These MUST match the **actual** mainnet deployments you plan to broadcast:

- `.contracts.updateGate`
- `.contracts.adminGate`
- `.contracts.configGate`
- `.contracts.validatorSet`
- `.contracts.voidToken`
- `.contracts.premineVault`
- `.contracts.treasury`
- `.contracts.voidTreasury`
- `.contracts.opsTreasury`
- `.contracts.rewardEngine`

All of these:

- MUST be non-zero.
- MUST come from the real deployment sequence (or pre-known addresses in a deterministic plan).
- MUST be cross-checked (e.g. via `cast` / explorer) before we ever consider the PLAN “ready”.

### 4.3 Validator 0 (bootstrap validator)

The first validator entry in config must be fully wired:

- `.validator0.reward`        — address that receives rewards
- `.validator0.consensusKey`  — consensus pubkey (correct length/format)
- `.validator0.stakeVOID`     — concrete numeric stake amount (NOT `"TODO_SET_STAKE_VOID"`)

For PLAN to be READY:

- `reward` MUST be non-zero and under your validator key plan.
- `consensusKey` MUST be real and match the key that will actually sign.
- `stakeVOID` MUST be a concrete integer amount that respects your tokenomics/validator rules.

### 4.4 Health rules for flipping plan_health → 1

Only when ALL of the following are true do we allow `plan_health = 1`:

1. **Config is structurally sane**  
   - `void_mainnet_bootstrap_plan_configured == 1`

2. **All roles above are non-zero and match your mainnet key plan**  
   - No placeholder ZERO addresses.
   - Keys stored safely (LUKS / hardware) according to the keys & treasury doc.

3. **All contracts above are non-zero and match the intended deployments**  
   - Addresses verified out-of-band.
   - Dev vs mainnet separation is clear.

4. **Validator 0 is fully configured**  
   - No zero reward address.
   - No zero consensusKey.
   - No `"TODO_*"` strings left.

5. **Forge PLAN rehearsal passes**  
   - `./ops/void-mainnet-bootstrap-plan-rehearse.sh` runs clean.
   - Logs show `CONFIG_OK: true`, `planReady: true` (once we wire that path).
   - No reverts parsing addresses / fields.

6. **Prometheus view matches**  
   - `void:mainnet_bootstrap_plan:configured:last_5m == 1`
   - `void:mainnet_bootstrap_plan:health:last_5m == 1`
   - Alert `VoidMainnetBootstrapPlanNotReady` is **NOT** firing.

Until ALL of this is true, we keep:

- `void_mainnet_bootstrap_plan_health = 0`
- PLAN status: **CONFIGURED BUT NOT READY**

This doc is the source of truth:  
if any of the above is not satisfied, mainnet PLAN is **not** ready, no matter what the dashboards say.
