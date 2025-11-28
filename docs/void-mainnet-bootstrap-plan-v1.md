# VOID Mainnet Bootstrap Plan — v1 (PLAN-only, stub)

**Status (2025-11-28)**  
- Branch: `feat/mainnet-core-20251120`  
- Checkpoint tag: `ckpt-mainnet-bootstrap-plan-v1-20251128-173734`  
- Script is **PLAN-only** / **SIMULATION ONLY** and hard-reverts with:
  `VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast`
- Monitoring shows:
  - `void_mainnet_bootstrap_plan_ready = 0`
  - `void:mainnet_bootstrap_plan:ready:last_5m = 0`
- This is **intentional** until real addresses, tokenomics wiring, and validator stakes are locked.

---

## 1. Files involved

### Config

- `config/void-mainnet-bootstrap-mainnet.live.json`
  - This is the **LIVE** mainnet bootstrap config file.
  - It is **never committed** to git (guarded by .gitignore).
  - Current contents are a **stub**: placeholder addresses, TODO stake strings, etc.

**Example of what the script currently parses from `.live.json` (from logs):**

- `chainId = 2050`
- Roles:
  - `.roles.deployer          = 0x0000...0000` (stub)
  - `.roles.treasuryAdmin     = 0x0000...0000` (stub)
  - `.roles.opsTreasuryAdmin  = 0x0000...0000` (stub)
  - `.roles.validatorAdmin    = 0x0000...0000` (stub)
  - `.roles.adminGateOwner    = 0x1111...1111` (placeholder)
  - `.roles.updateGateOwner   = 0x2222...2222` (placeholder)
  - `.roles.configGateOwner   = 0x3333...3333` (placeholder)
  - `.roles.treasuryOwner     = 0x4444...4444` (placeholder)
  - `.roles.opsTreasuryOwner  = 0x5555...5555` (placeholder)
  - `.roles.rewardEngineOwner = 0x6666...6666` (placeholder)
  - `.roles.validatorSetOwner = 0x7777...7777` (placeholder)
- Contracts:
  - `.contracts.updateGate    = 0x0000...0000` (stub)
  - `.contracts.adminGate     = 0x0000...0000` (stub)
  - `.contracts.configGate    = 0x0000...0000` (stub)
  - `.contracts.validatorSet  = 0x0000...0000` (stub)
  - `.contracts.voidToken     = 0x0000...0000` (stub)
  - `.contracts.voidTreasury  = 0x0000...0000` (stub)
  - `.contracts.opsTreasury   = 0x0000...0000` (stub)
  - `.contracts.rewardEngine  = 0x0000...0000` (stub)
- Validator 0:
  - `.validator0.reward       = 0x0000...0000` (stub)
  - `.validator0.consensusKey = 0x0000...0000` (stub)
  - `.validator0.stakeVOID    = "TODO"` (string placeholder; not parsed yet)

### Scripts

- `ops/void-mainnet-bootstrap-plan.sh`
  - PLAN-only harness around `forge script` for `VoidMainnetBootstrapMainnet`.
  - Inputs:
    - `CONFIG_PATH = config/void-mainnet-bootstrap-mainnet.live.json`
    - `RPC_URL     = http://127.0.0.1:8545`
    - `OUT_DIR     = ops/out`
    - `PROM_FILE   = ops/out/void-mainnet-bootstrap-plan.prom`
  - Actions:
    1. Prints a **best-effort config summary** using `jq`:
       - network (if present), `chainId`, `treasury`, `opsTreasury`, `premine.total`, `validators`.
    2. Runs `forge script` in **simulation** (no broadcast) and traces:
       - Reads JSON.
       - Parses all role / contract / validator fields listed above.
       - Logs them via `console::log`.
    3. Script currently **reverts intentionally**:
       - `revert("stub only; implement real wiring before broadcast")`
    4. Writes `ops/out/void-mainnet-bootstrap-plan.prom` containing:
       - `void_mainnet_bootstrap_plan_ready`-related fields:
         - `PLAN_OK`      (0 for now)
         - `CHAIN_ID`     (2050)
         - `VALIDATORS`   (1)
         - `CONFIG_SHA`   (sha256 of the live config file)

- `ops/void-mainnet-bootstrap-plan-health.sh`
  - Wraps `...-plan.sh` and interprets the `.prom` file.
  - Prints:
    - `PLAN_OK`, `CHAIN_ID`, `VALIDATORS`, `CONFIG_SHA`.
  - Current result:
    - `RESULT: NOT READY (PLAN_OK==0)`
    - Text explicitly says this is **expected while stub is in place**.

- `ops/void-mainnet-bootstrap-plan-exporter.sh`
  - Runs the health script.
  - Copies `ops/out/void-mainnet-bootstrap-plan.prom` into the node_exporter textfile dir as:
    - `/var/lib/node_exporter/textfile/void_mainnet_bootstrap_plan.prom` (or similar path on this box).
  - Node exporter then exposes gauges named `void_mainnet_bootstrap_plan_*`.

---

## 2. Metrics

### Node exporter

From scraping `http://127.0.0.1:9100/metrics` you see:

- `void_mainnet_bootstrap_plan_ready 0`

(`0` because the script currently always reverts as a stub.)

### Prometheus

Queries already confirmed:

- Raw gauge:

  - `void_mainnet_bootstrap_plan_ready`
    - Returns `0`.

- 5m smoothed view:

  - `void:mainnet_bootstrap_plan:ready:last_5m`
    - Recording rule over the raw gauge.
    - Currently `0`.

**Intent:**  
- While PLAN is a stub: **observe only**; **do not gate pushes or mainnet health**.  
- After real addresses & stakes are wired and the stub revert is removed:
  - `void_mainnet_bootstrap_plan_ready` is expected to be `1`.
  - `void:mainnet_bootstrap_plan:ready:last_5m` should also track `1`.
  - We can then promote this into:
    - Pillars checks.
    - Pre-push gating.
    - A real alert: “Mainnet bootstrap plan no longer simulating cleanly”.

---

## 3. What this PLAN v1 guarantees (today)

1. **Config shape sanity**
   - The `.live.json` has all the expected fields:
     - `.chainId`, `.roles.*`, `.contracts.*`, `.validator0.*`.
   - Missing/renamed fields would break the script and be visible in logs/metrics.

2. **ChainId match**
   - Script compares:
     - `runtime chainId` (from RPC 8545, expected 2050)
     - `config chainId` (from `.live.json`)
   - Logs:
     - `runtime chainId : 2050`
     - `config  chainId : 2050`
     - `chainId sanity OK; parsed config view.`

3. **No accidental broadcast**
   - Forge script is simulation-only.
   - Even if broadcast flags accidentally sneak in later, the explicit **stub revert** guarantees failures until you consciously remove it.

4. **Visibility in monitoring**
   - Node exporter: `void_mainnet_bootstrap_plan_ready`.
   - Prometheus: both raw and smoothed metric.
   - Easy to put on dashboards and feed into future gating.

---

## 4. What is **NOT** done yet

This PLAN v1 does **NOT**:

- Deploy any contracts.
- Move any premine.
- Wire up real addresses for:
  - AdminGate, UpdateGate, ConfigGate.
  - VoidToken, VoidTreasury, OpsTreasury, RewardEngine.
  - ValidatorSet / ValidatorSet L1 ↔ mainnet linkage.
- Parse validator stake amounts (e.g., `.validator0.stakeVOID` numeric handling).
- Enforce `PLAN_OK==1` in:
  - Pillars.
  - Pre-push hooks.
  - Any mainnet health SLOs.

It is **only** a simulator + metrics harness.

---

## 5. Future TODOs (high level)

These are the steps needed to turn PLAN v1 into a **real** mainnet bootstrap plan:

1. **Lock role addresses for mainnet**
   - Real hardware-wallet-backed addresses for:
     - Deployer (short-lived hot)
     - AdminGateOwner (cold)
     - UpdateGateOwner (cold, multi-sig)
     - ConfigGateOwner (config/governance)
     - TreasuryAdmin / OpsTreasuryAdmin / ValidatorAdmin
     - TreasuryOwner / OpsTreasuryOwner / RewardEngineOwner / ValidatorSetOwner
   - Update `.live.json` accordingly.

2. **Lock contract addresses or deployment plan**
   - Decide whether `.contracts.*` are:
     - Pre-deployed (e.g., from a previous script run), or
     - To be created in the real bootstrap run (then `.live.json` might hold “expected” addresses or be patched after deployment).
   - Ensure `VoidToken`, `VoidTreasury`, `OpsTreasury`, `RewardEngine`, `ValidatorSet`, `AdminGate`, `UpdateGate`, `ConfigGate` all line up with our tokenomics + v99 freeze design.

3. **Wire validator stakes**
   - Decide numeric stake for validator0 (and any others).
   - Implement parsing of `validator0.stakeVOID` as a number.
   - Add invariants to the script:
     - Total validator stake ≤ emissions and consistent with RewardEngine schedule.
     - Validator reward address is a real cold wallet, not a hot key.

4. **Remove stub revert (when safe)**
   - Replace the “stub only” revert with:
     - Full dry-run path that **succeeds** when everything is consistent.
     - Strict internal sanity checks so any mismatch fails the PLAN.

5. **Flip PLAN_OK to 1 and gate on it**
   - Once (1)–(4) are done:
     - `void_mainnet_bootstrap_plan_ready` should be `1` during normal operation.
     - Wire this into:
       - A new `void-mainnet-bootstrap-plan-health` script (or extend pillars).
       - A Prometheus alert if it drops to `0`.
       - Pre-push gating (e.g., “don’t push if PLAN_OK==0 for the last 5m”).

6. **Document key-handling + LUKS / hardware requirements**
   - Tie this PLAN doc into:
     - Your existing keys & treasury plan.
     - LUKS/USB sentinel requirements.
     - Hardware-wallet flows for the real deployment day.

---

## 6. How to read this doc in the future

- When you see:
  - `void_mainnet_bootstrap_plan_ready = 0`
  - and logs like: `stub only; implement real wiring before broadcast`
- That means you are **still on PLAN v1**:
  - Safe.
  - Observable.
  - Not ready for live broadcast.

Once we move beyond v1, we should:

- Create a new doc (e.g. `void-mainnet-bootstrap-plan-v2.md`).
- Tag a new checkpoint.
- Update all references in ops scripts and monitoring to match.

