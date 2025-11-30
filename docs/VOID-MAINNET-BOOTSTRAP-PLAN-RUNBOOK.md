# VOID Mainnet — Bootstrap PLAN Runbook (PLAN-Only Phase)

This runbook is for the PLAN phase only:

- Fill config/void-mainnet-bootstrap-mainnet.live.json with real roles.
- Verify roles and invariants locally.
- Verify Prometheus PLAN metrics.
- Gate on void:mainnet_bootstrap_plan:health:last_5m.

It does not cover actually broadcasting the mainnet bootstrap. The live broadcast flow is a separate doc and script.

----------------------------------------------------------------------
0. Preconditions
----------------------------------------------------------------------

Before touching the live PLAN config:

- You have hardware wallets (or equivalent HSM) for:
  - roles.deployer
  - roles.treasuryAdmin
  - roles.opsTreasury
  - roles.updateGateAdmin
  - roles.configGateAdmin
  - roles.rewardAdmin
- You have read:
  - docs/void-mainnet-bootstrap-roles-and-keys.md
  - docs/VOID-MAINNET-KEYS-AND-TREASURY-PLAN.md (if present)
- You understand:
  - config/void-mainnet-bootstrap-mainnet.live.json must never be committed.
  - Only public 0x addresses go into the .live.json (no seeds, no private keys).

----------------------------------------------------------------------
1. Prepare config/void-mainnet-bootstrap-mainnet.live.json
----------------------------------------------------------------------

Start from the template:

- config/void-mainnet-bootstrap-mainnet.template.json

Create the live file outside git history:

- Copy the template to:
  - config/void-mainnet-bootstrap-mainnet.live.json

Fill in:

- chainId (must be 2050)
- roles.deployer
- roles.treasuryAdmin
- roles.opsTreasury
- roles.updateGateAdmin
- roles.configGateAdmin
- roles.rewardAdmin

Rules for each address:

- Must be 0x followed by 40 hex characters.
- Must not be 0x0000000000000000000000000000000000000000.
- No placeholders like 0xDEAD..., etc.

.gitignore already blocks *.live.json, but treat this file as sensitive and local-only.

----------------------------------------------------------------------
2. Roles sanity: PLAN roles dump
----------------------------------------------------------------------

From repo root:

  ./ops/void-mainnet-bootstrap-plan-roles-dump.sh

You should see:

- chainId=2050
- One line per core role, like:

  deployer        0x1234...abcd    ok
  treasuryAdmin   0x1234...abcd    ok
  ...

Status meanings:

- ok
  - Looks like a real 0x address (format-wise).
- zero
  - Still 0x0000...0000 placeholder.
  - PLAN must stay NOT_READY in this state.
- bad_format
  - Not a valid 0x plus 40 hex chars.
  - Fix the JSON before continuing.

Do not proceed until every core role shows status=ok.

----------------------------------------------------------------------
3. Local invariants: PLAN sim
----------------------------------------------------------------------

Once every core role is status=ok:

  ./ops/void-mainnet-bootstrap-plan-sim.sh

This checks:

- chainId == 2050
- All core roles are non-zero, valid addresses.

Current behavior patterns:

- While roles are placeholders or wrong:
  - Prints RESULT: NOT READY (bad_roles) and lists which roles are bad.
- Once everything is correct (future state):
  - Exits with code 0 and reports invariants pass.

Treat a non-zero exit code as PLAN NOT READY.

----------------------------------------------------------------------
4. PLAN metrics: exporter and Prometheus
----------------------------------------------------------------------

PLAN metrics:

- void_mainnet_bootstrap_plan_configured
- void_mainnet_bootstrap_plan_health
- void_mainnet_bootstrap_plan_health_info{reason="..."}
- Recording rule:
  - void:mainnet_bootstrap_plan:health:last_5m

Run the combined hammer:

  ./ops/void-mainnet-bootstrap-plan-all.sh

This will:

1. Run void-mainnet-bootstrap-plan-sim.sh.
2. Run void-mainnet-bootstrap-plan-health-all.sh.
3. Run void-mainnet-bootstrap-plan-status.sh.
4. Print a summary and gate on void:mainnet_bootstrap_plan:health:last_5m.

Expected states:

- Before real roles exist (current world):
  - plan_5m = 0
  - reason  = bad_roles
  - Final line: RESULT: NOT_OK (PLAN pillar NOT READY — expected until real keys exist).
- After PLAN is properly configured (future world):
  - plan_5m = 1
  - reason is a non-error value (for example ok).
  - Final line: RESULT: OK (PLAN pillar GREEN).

----------------------------------------------------------------------
5. Interaction with void-mainnet-health-all
----------------------------------------------------------------------

The aggregated mainnet hammer:

  ./ops/void-mainnet-health-all.sh

Checks:

- void:mainnet_overall:health:last_5m_v2
- void:mainnet_pillars:health:last_5m
- void:mainnet_lastmile:health:last_5m
- void_safeboot_overall_health
- void:mainnet_bootstrap_plan:health:last_5m

Design:

- devnet, mainnet-core, manifest, safeboot, and mainnet-lastmile are allowed to be fully green today.
- PLAN pillar is allowed to stay red (bad_roles) and cause mainnet-health-all to be NOT_OK on the PLAN gate.
- That is intentional until we are truly ready to bootstrap mainnet.

This runbook is for the moment when we decide to flip PLAN from red to green.

----------------------------------------------------------------------
6. When is PLAN allowed to be green?
----------------------------------------------------------------------

Only when all of these are true:

1. config/void-mainnet-bootstrap-mainnet.live.json exists locally (not in git).
2. ./ops/void-mainnet-bootstrap-plan-roles-dump.sh shows:
   - chainId=2050
   - status=ok for all core roles.
3. ./ops/void-mainnet-bootstrap-plan-sim.sh exits with code 0.
4. Prometheus shows:
   - void_mainnet_bootstrap_plan_configured = 1
   - void_mainnet_bootstrap_plan_health = 1
   - void:mainnet_bootstrap_plan:health:last_5m = 1
5. ./ops/void-mainnet-bootstrap-plan-all.sh summary shows:
   - plan_5m = 1
   - reason is non-error.

Until then, PLAN is supposed to be NOT READY.

----------------------------------------------------------------------
7. Broadcast phase (future doc)
----------------------------------------------------------------------

The real VOID mainnet bootstrap broadcast will:

- Use a separate script (for example ops/void-mainnet-bootstrap-mainnet-live.sh).
- Be run against the real VOID mainnet RPC.
- Use hardware wallets or remote signers only.
- Have its own Prometheus/textfile exporters and gating.

This PLAN runbook is not the broadcast doc. Do not run any broadcast against mainnet until that dedicated runbook exists and is followed step by step.

----------------------------------------------------------------------
8. Summary
----------------------------------------------------------------------

- Right now: PLAN pillar red with reason bad_roles is correct and safe.
- This runbook explains how to:
  - Fill the .live.json with real roles.
  - Verify them locally.
  - Turn PLAN metrics from red to green when we are ready.
- Actual mainnet broadcast is a later step with its own guarded pipeline.


## Roles and Keys Map

This section defines the conceptual key classes used in the LIVE mainnet bootstrap plan.
Concrete addresses are only filled into `config/void-mainnet-bootstrap-mainnet.live.json`
once real hardware wallets / devices have been prepared.

### Key Classes

- **Key A — Master Governance Key**
  - Extremely cold, hardware-only.
  - Controls:
    - `adminGateOwner`
    - `updateGateOwner`
    - `configGateOwner`
  - Purpose: ultimate control over core upgrades/config changes via AdminGate/UpdateGate/ConfigGate.

- **Key B — Treasury Master**
  - Cold hardware wallet.
  - Controls:
    - `treasuryOwner`
    - `treasuryAdmin`
  - Purpose: long-term custody and policy control over the main Treasury / VoidTreasury.

- **Key C — Ops / Rewards**
  - Hardware wallet, used more frequently than A/B but still protected.
  - Controls:
    - `opsTreasuryOwner`
    - `opsTreasuryAdmin`
    - `rewardEngineOwner`
  - Purpose: paying expenses, funding operations, and adjusting reward engine knobs.

- **Key D — Validator Admin**
  - Governance over validator set configuration.
  - Controls:
    - `validatorSetOwner`
    - `validatorAdmin`
  - Purpose: adding/removing validators, adjusting validator set policy.

- **Key E — Deployer (Bootstrap Ceremonial Key)**
  - Used only to broadcast the VOID mainnet bootstrap script on real mainnet.
  - Controls:
    - `deployer`
  - Purpose: run the one-shot bootstrap; key is effectively retired afterwards.

- **Key F — Validator0 Consensus Key**
  - Hot key used by the first validator node process (or HSM).
  - Controls:
    - `validator0.consensusKey`
  - Purpose: sign consensus messages / blocks for validator #0. Separate from all treasury/governance keys.

- **Key G — Validator0 Reward Wallet**
  - Wallet that receives validator0 rewards.
  - Controls:
    - `validator0.reward`
  - Purpose: collect validator0 rewards; can be a personal or dedicated validator-ops wallet.

### Mapping into LIVE Plan JSON

When preparing `config/void-mainnet-bootstrap-mainnet.live.json` for real mainnet:

- Roles:
  - `deployer`            → address of **Key E**
  - `treasuryAdmin`       → address of **Key B**
  - `opsTreasuryAdmin`    → address of **Key C**
  - `validatorAdmin`      → address of **Key D**
  - `adminGateOwner`      → address of **Key A**
  - `updateGateOwner`     → address of **Key A**
  - `configGateOwner`     → address of **Key A**
  - `treasuryOwner`       → address of **Key B**
  - `opsTreasuryOwner`    → address of **Key C**
  - `rewardEngineOwner`   → address of **Key C**
  - `validatorSetOwner`   → address of **Key D**

- Contracts (to be filled after on-chain deployments during bootstrap rehearsal / plan sim):
  - `voidToken`        → deployed VoidToken contract address
  - `premineVault`     → premine vault contract address
  - `treasury` / `voidTreasury` → main treasury contract address
  - `opsTreasury`      → ops treasury contract address
  - `rewardEngine`     → reward engine contract address

- Validator0:
  - `reward`           → address of **Key G**
  - `consensusKey`     → consensus key for validator0 (**Key F**, usually held by the node or an HSM)

The exporter and checklist will report `plan_health = 0` until all CRITICAL
roles, contracts, and validator0 fields are non-zero and consistent with this map.

## Plan Health Conditions & Checklist

The exporter exposes two gauges related to the VOID mainnet bootstrap plan:

- \`void_mainnet_bootstrap_plan_configured\`
- \`void_mainnet_bootstrap_plan_health\`

They have the following semantics:

- \`plan_configured = 1\` means:
  - \`config/void-mainnet-bootstrap-mainnet.live.json\` exists,
  - parses cleanly as JSON,
  - and matches the expected structural schema (sections, fields, types).

- \`plan_health = 1\` is **much stricter** and is only allowed when all
  CRITICAL fields for a real mainnet bootstrap are present and non-zero.
  Until then, \`plan_health\` **must remain 0**.

### Fields required for \`plan_health = 1\`

The structural checklist and exporter agree on at least the following
conditions before \`void_mainnet_bootstrap_plan_health\` may be set to 1:

1. **ChainId sanity**
   - \`chainId (config)\` must equal \`chainId (RPC)\`, and both must be 2050.

2. **Critical roles**
   - The following roles must be **non-zero** addresses in the LIVE config:
     - \`deployer\`
     - \`treasuryAdmin\`
     - \`opsTreasuryAdmin\`
     - \`validatorAdmin\`
   - Additional gate/owner roles should also be non-zero and consistent
     with the Roles and Keys Map:
     - \`adminGateOwner\`
     - \`updateGateOwner\`
     - \`configGateOwner\`
     - \`treasuryOwner\`
     - \`opsTreasuryOwner\`
     - \`rewardEngineOwner\`
     - \`validatorSetOwner\`

3. **Critical contracts**
   - The following contract addresses must be **non-zero** and correspond
     to deployed contracts on the target network:
     - \`voidToken\`
     - \`premineVault\`
     - \`treasury\` / \`voidTreasury\`
     - \`opsTreasury\`
     - \`rewardEngine\`

4. **Validator0 fields**
   - The initial validator entry must be fully specified:
     - \`validator0.reward\`       != \`0x0000000000000000000000000000000000000000\`
     - \`validator0.consensusKey\` != 0x00..00 (non-zero 32-byte key)
     - \`validator0.stakeVOID\` set to the intended stake (e.g. 1,000,000).

5. **Exporter / checklist agreement**
   - The local checklist script reports:
     - \`plan_structural_health (local) = 1\`
   - The exporter gauge \`void_mainnet_bootstrap_plan_health\` is set to 1
     only when the same structural checks pass.
   - The Prometheus recording rule:
     - \`void:mainnet_bootstrap_plan:health:last_5m == 1\`
     must hold before any "PLAN is ready" gates are considered green.

### Operator procedure before flipping \`plan_health\` to 1

When preparing for real mainnet:

1. Fill \`config/void-mainnet-bootstrap-mainnet.live.json\` with **real**
   hardware wallet addresses for all CRITICAL roles, contracts, and
   validator0 fields, following the Roles and Keys Map.

2. Run the checklist locally:
   - \`./ops/void-mainnet-bootstrap-plan-checklist.sh\`
   - Confirm:
     - no "missing/zero CRITICAL" entries are reported,
     - \`plan_structural_health (local) = 1\`.

3. Confirm exporter gauges and Prometheus views:
   - \`void_mainnet_bootstrap_plan_configured = 1\`
   - \`void_mainnet_bootstrap_plan_health = 1\`
   - \`void:mainnet_bootstrap_plan:health:last_5m = 1\`

4. Only after all of the above are true should any higher-level
   "mainnet overall" or "pillars" gates treat the bootstrap PLAN as ready.

Until this procedure is followed with real values, \`plan_health\` must
intentionally remain 0 so that the guards accurately reflect the fact
that there is no real mainnet bootstrap plan yet.

## Key Creation & Storage Plan (A–G)

This section describes **how** Key Classes A–G are created and stored in
the real world. Actual addresses for each key class are only written into
`config/void-mainnet-bootstrap-mainnet.live.json` when ready for mainnet.

### General rules

- All seed phrases for Keys A–G are created **offline**, written on paper
  or metal, and never stored in plaintext on any computer.
- Wherever possible, keys are generated directly on hardware devices
  (hardware wallet or HSM), not from software seed generators.
- For each key class, we decide:
  - Device type (hardware wallet / HSM / validator node key store).
  - Number of independent seed backups.
  - Where those backups live (home safe, safety deposit box, LUKS volume).
  - How often the key is used (rare / periodic / frequent).
  - What to do if the key is suspected compromised.

### Key A — Master Governance Key

- Purpose:
  - Owns `adminGateOwner`, `updateGateOwner`, `configGateOwner`.
  - Controls core upgrades and configuration changes.
- Creation:
  - Generated directly on a hardware wallet in **offline** mode.
  - No software wallet copies.
- Storage:
  - Seed phrase written on **two** metal backups.
  - One stored in a home safe; one in a separate, geographically distinct
    secure location (e.g., bank box).
  - No digital photos; no plaintext digital copies.
- Usage:
  - Only used for critical UpdateGate/AdminGate/ConfigGate actions.
  - Device normally powered off and stored; brought out only for
    carefully planned governance events.
- Compromise procedure:
  - If Key A is suspected compromised, use UpdateGate/AdminGate to rotate
    ownership to a freshly prepared Key A', then treat Key A as burned.

### Key B — Treasury Master

- Purpose:
  - Owns `treasuryOwner` and `treasuryAdmin`.
  - Controls the main Treasury / VoidTreasury.
- Creation:
  - Second hardware wallet, independent from Key A device.
- Storage:
  - Seed phrase on **two** physical backups (paper or metal).
  - Stored separately from Key A backups.
- Usage:
  - Very rare. Used to move large amounts or change Treasury policy.
- Compromise procedure:
  - Immediately move Treasury control to a new Key B' and migrate
    funds via controlled on-chain operations.

### Key C — Ops / Rewards

- Purpose:
  - Owns `opsTreasuryOwner`, `opsTreasuryAdmin`, and `rewardEngineOwner`.
  - Used for operational expenses and reward engine control.
- Creation:
  - Hardware wallet, potentially used more frequently than A/B.
- Storage:
  - Seed phrase on **two** backups:
    - One in a safe.
    - One encrypted inside a LUKS volume (e.g., on a sentinel USB),
      with the volume itself backed up.
- Usage:
  - Used periodically to pay expenses, adjust reward parameters, or top up
    validator rewards.
- Compromise procedure:
  - Drain OpsTreasury to a new Ops wallet.
  - Rotate `opsTreasuryOwner`, `opsTreasuryAdmin`, `rewardEngineOwner`
    to keys derived from the new wallet.

### Key D — Validator Admin

- Purpose:
  - Owns `validatorSetOwner` and `validatorAdmin`.
  - Adds/removes validators and adjusts validator configuration.
- Creation:
  - Hardware wallet, separate from Treasury and Governance devices.
- Storage:
  - Seed phrase on **two** backups, stored separately from A/B/C.
- Usage:
  - Used when validator topology changes (adding/removing validators,
    adjusting stakes).
- Compromise procedure:
  - Rotate validator admin roles to a new Key D' and update the validator
    set configuration via on-chain calls.

### Key E — Deployer (Bootstrap Ceremonial Key)

- Purpose:
  - Address used as `deployer` in the LIVE plan.
  - Broadcasts the VOID mainnet bootstrap script on real mainnet.
- Creation:
  - May be a dedicated hardware wallet or a sub-account on one of the
    existing hardware devices, but treated as **temporary**.
- Storage:
  - Seed phrase backed up once, for the duration of the bootstrap phase.
- Usage:
  - Used to send the bootstrap transactions only.
  - After bootstrap completes and state is verified, the key is **retired**.
- Compromise procedure:
  - If compromised before bootstrap, discard and choose a new deployer.
  - After bootstrap, deployer is not expected to retain any long-term power.

### Key F — Validator0 Consensus Key

- Purpose:
  - Used by the first validator node to sign consensus messages/blocks.
- Creation:
  - Generated by the validator software or an attached HSM.
  - Private key stays on the validator machine or HSM.
- Storage:
  - Encrypted on disk (if software-based) or inside HSM.
  - Optional: encrypted backup exported to a LUKS volume and stored offline.
- Usage:
  - Used continuously by the validator process.
- Compromise procedure:
  - Use Validator Admin (Key D) to remove or replace validator0 with a new
    validator entry bound to a fresh consensus key.

### Key G — Validator0 Reward Wallet

- Purpose:
  - Receives staking rewards for validator0.
- Creation:
  - Hardware or software wallet, depending on operator preference.
- Storage:
  - At least one physical seed backup.
- Usage:
  - Used periodically to consolidate or move rewards.
- Compromise procedure:
  - Stop using compromised address for new validator entries; move
    accumulated rewards to a safe wallet and update validator rewards
    configuration if necessary.

### Summary

Keys A–D are long-lived **governance and treasury** keys and must be treated
with maximum caution. Key E is short-lived and ceremonial. Keys F and G are
validator-facing and can be rotated using Validator Admin controls if needed.

The LIVE bootstrap plan should not be considered ready (\`plan_health = 1\`)
until the physical creation and storage steps above have been completed for
Keys A–G and the corresponding addresses have been filled into the LIVE
config JSON.
