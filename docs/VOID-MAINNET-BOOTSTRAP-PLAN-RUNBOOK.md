# VOID — Mainnet Bootstrap PLAN Runbook (Draft v0)

Status: DRAFT (pre-mainnet)  
Scope: How to get the VOID mainnet bootstrap PLAN from "stub + placeholder roles" to "PLAN pillar GREEN and ready for live mainnet broadcast".

This doc is **PLAN-only**. It does **not** perform the real mainnet deploy; it just gets us to the point where:

- `config/void-mainnet-bootstrap-mainnet.live.json` is filled with real hardware-wallet roles.
- `./ops/void-mainnet-bootstrap-plan-sim.sh` passes all invariants.
- `void_mainnet_bootstrap_plan_health` and `void:mainnet_bootstrap_plan:health:last_5m` are `1`.
- `./ops/void-mainnet-bootstrap-plan-all.sh` reports PLAN pillar GREEN.

The actual live broadcast flow will be a separate, stricter runbook.

---

## 1. Preconditions

Before you touch the PLAN:

1. **Branch / repo**

   - You are on the mainnet core branch:

        git switch feat/mainnet-core-20251120
        git pull --ff-only

2. **Pillars already green**

   Run:

        ./ops/void-mainnet-health-all.sh

   You should see:

   - `void:mainnet_overall:health:last_5m_v2 = 1`
   - `void:mainnet_pillars:health:last_5m = 1`
   - `void:mainnet_lastmile:health:last_5m = 1`
   - `void_safeboot_overall_health = 1`

   At this stage it is fine / expected that:

   - `void:mainnet_bootstrap_plan:health:last_5m = 0`
   - reason = `bad_roles`

3. **Dev bootstrap harness is healthy**

   The dev bootstrap scripts should already be working and tagged (see existing
   docs + tags around `void-mainnet-dev-bootstrap-full.sh`).

---

## 2. Live PLAN config file

The main PLAN config for real mainnet is:

- `config/void-mainnet-bootstrap-mainnet.live.json`

Guardrails:

- `.gitignore` already ignores `*.live.json` and key artifacts.
- This file **must never be committed** in a public repo.
- Only edit it on a machine with your LUKS/USB key plan active.

High-level shape (simplified):

- `chainId`: must be `2050`.
- `roles`: all the key participants.
- `contracts`: premine, treasury, ops treasury, reward engine, etc.

At PLAN time, you must fill:

- `roles.deployer`
- `roles.treasuryAdmin`
- `roles.opsTreasury`
- `roles.updateGateAdmin`
- `roles.configGateAdmin`
- `roles.rewardAdmin`

All of these addresses **must** come from hardware wallets that match:

- `docs/void-mainnet-bootstrap-roles-and-keys.md`
- Your physical keys plan (LUKS USB, hardware wallets, backups, etc.).

---

## 3. PLAN sim invariants

Once you have a first draft of the live config:

1. Ensure anvil (or your PLAN RPC) is running on chainId 2050, or adjust the RPC in the scripts if you are simulating against a different URL.

2. Run PLAN sim:

        cd ~/dev/void-node
        ./ops/void-mainnet-bootstrap-plan-sim.sh

You should see something like:

- `OK: chainId == 2050`
- No `ERROR: one or more core roles are missing, zero, or placeholders`
- `RESULT: READY` (or equivalent OK line once we finalize wording)

If you still see:

- `RESULT: NOT READY (bad_roles)`

then:

- One or more roles are still `0x000...0`, a placeholder, or not aligned with the roles/keys doc.

Iterate until sim is fully happy.

---

## 4. PLAN health exporter + gauges

The PLAN exporter produces three key gauges (scraped by the Prometheus `node` job):

- `void_mainnet_bootstrap_plan_configured`
- `void_mainnet_bootstrap_plan_health`
- `void_mainnet_bootstrap_plan_health_info{reason="..."}`

And a smoothed view:

- `void:mainnet_bootstrap_plan:health:last_5m`

Interpretation:

- `configured = 1`  
  A live PLAN config exists and exporter can read it.

- `health = 1`  
  The exporter believes the PLAN is structurally sound (chainId/roles/shape sane).

- `health_info{reason="bad_roles"} = 1`  
  Roles are missing/placeholder/zero; PLAN is not considered ready.

- `void:mainnet_bootstrap_plan:health:last_5m = 1`  
  The 5m-smoothed view is green; we treat this as the gating scalar.

At the moment (pre-mainnet), we **expect**:

- `configured = 1`
- `health = 0`
- `reason = bad_roles`
- `health_5m = 0`

This is the safe "not ready" state.

---

## 5. PLAN all-in-one hammer

After roles are filled and sim looks good, use the aggregator:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-plan-all.sh

This runs:

1. `void-mainnet-bootstrap-plan-sim.sh`
2. `void-mainnet-bootstrap-plan-health-all.sh`
3. `void-mainnet-bootstrap-plan-status.sh`
4. Gating on `void:mainnet_bootstrap_plan:health:last_5m`.

Expected final healthy state:

- `sim_rc = 0`
- `health_rc = 0`
- `plan_5m = 1`
- `reason = ok` (or another non-error reason, depending on exporter wording)
- Final line:

    `[plan-all] RESULT: OK (PLAN pillar GREEN — sim invariants + health-all both passed)`

If `plan_5m = 0` and `reason = bad_roles`, you are still in pre-mainnet placeholder mode — which is fine until you actually have final keys.

---

## 6. Interaction with mainnet-health-all

`./ops/void-mainnet-health-all.sh` currently gates on:

- `void:mainnet_pillars:health:last_5m`
- `void:mainnet_lastmile:health:last_5m`
- `void:mainnet_bootstrap_plan:health:last_5m`

Before real mainnet keys exist:

- It is **expected** that `void:mainnet_bootstrap_plan:health:last_5m = 0`.
- The script will print something like:

    void:mainnet_bootstrap_plan:health:last_5m=0  
    [gate] plan_5m != 1 (got 0)  
    [mainnet-health-all] RESULT: NOT_OK (one or more gates failed)

We treat this as:

- Core/lastmile/safeboot pillars are green.
- PLAN pillar is deliberately NOT green.
- Pre-push hooks rely only on the non-PLAN pillars until we are ready.

Once real mainnet keys are chosen and the PLAN is locked:

- `void:mainnet_bootstrap_plan:health:last_5m` must be `1`.
- Only then do we treat `[mainnet-health-all] RESULT: OK` as a requirement before mainnet broadcast.

---

## 7. When is the PLAN “locked”?

We consider the PLAN **locked** when all of the following are true:

1. `config/void-mainnet-bootstrap-mainnet.live.json`:
   - Has final, hardware-backed addresses for all roles.
   - Has been reviewed against `docs/void-mainnet-bootstrap-roles-and-keys.md`.
   - Matches the physical key storage plan (LUKS, hardware wallets, backups).

2. Scripts:

   - `./ops/void-mainnet-bootstrap-plan-sim.sh` passes with no role errors.
   - `./ops/void-mainnet-bootstrap-plan-all.sh` reports PLAN pillar GREEN.

3. Metrics:

   - `void_mainnet_bootstrap_plan_configured = 1`
   - `void_mainnet_bootstrap_plan_health = 1`
   - `void:mainnet_bootstrap_plan:health:last_5m = 1`

4. Governance / ops:

   - At least one human-reviewed, human-signed out-of-band description of the PLAN exists (printed or on a secure device).
   - The team agrees we will not change the PLAN except via a deliberate new version (PLAN v1 → PLAN v2, etc.).

---

## 8. Next steps after PLAN is green

Once the PLAN pillar is green, the next phase (separate doc) is:

- `VOID — Mainnet Bootstrap LIVE Runbook (v0)`

That runbook will:

- Use the locked PLAN as input.
- Do a non-broadcast “dry-run” on a forked chain.
- Then guide the real broadcast to mainnet with hardware wallets.
- Emit additional metrics / textfile confirmations for “bootstrap finished”.

Until that doc exists and is approved, treat the PLAN as **simulation-only**. No live mainnet deploy should be attempted.

