# VOID RewardEngine — Devnet vs Mainnet Status (2025-12-11)

This file explains where RewardEngine actually stands on **devnet** vs **mainnet path** so Future-Me doesn’t get confused by stubs, DEADBEEF placeholders, and half-wired exporters.

---

## 1. Devnet RewardEngine — CURRENT STATUS

### 1.1 Devnet state JSON

Source:

- \`docs/VOID-DEVNET-PROTOCOL-STATE.json\`

Current top-level keys include:

- \`AdminGate\`
- \`AgentRegistry\`
- \`DatasetRegistry\`
- \`JobQueue\`
- \`ModelRegistry\`
- \`ReceiptRegistry\`
- \`RewardEngine\`
- \`chainId\`
- \`workCreditsPoolV1\`
- \`workCreditsRelayerV1\`
- \`workCreditsToken\`

The \`RewardEngine\` entry currently contains a **stub address**:

- \`RewardEngine.address = 0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF\`

This is a **pure placeholder**. It does **not** point to a real contract on devnet.

### 1.2 On-chain reality (devnet)

From the diag script:

- \`cast code(0xDEADBEEF...)\` → hex length = **0**
- Interpretation: **no bytecode** at that address on devnet.

So right now:

- There is **no actual RewardEngine contract on devnet**.
- Any devnet script or exporter that treats \`RewardEngine.address\` as “real” must handle the “no code” case.

### 1.3 Devnet RewardEngine metrics

We currently have:

- \`void:devnet_rewardengine_code:health:last_5m = 0\`
- The plan metric name I guessed in the ad-hoc diag (\`void:devnet_rewardengine_plan:health:last_5m\`) comes back as **NaN** with that exact query, which just means that particular recording rule name does not exist.

The **canonical** devnet RewardEngine health view is now:

- **Shell wrapper**: \`ops/void-devnet-rewardengine-health-all.sh\`
- **Makefile target**: \`make devnet-rewardengine-health\`

That wrapper:

- Knows what metric names to query for \*plan\* and \*code\*.
- Currently reports something equivalent to:
  - \`plan_5m = 1\`  (plan/econ OK at the “paper” level)
  - \`code_5m = 0\`  (no real RewardEngine deployed on devnet yet)
- Treats **code_5m == 0** as **non-fatal** for devnet (expected stub state).

Conclusion:

- Devnet RewardEngine is **intentionally a stub**, and the health wrapper explicitly understands that.

---

## 2. Mainnet RewardEngine — CURRENT STATUS

Mainnet path (not live mainnet, but the mainnet **plan** and contracts) is in a much more complete state.

### 2.1 Contracts & tests

- Core RewardEngine tests are green, including:
  - Emissions budget vs spec
  - Claim flow
  - Admin-only controls
  - “Pull emission caps at budget” behavior
- WorkCredits stack tests are green:
  - \`WorkCreditsToken\`
  - \`WorkCreditsPoolV1\` (WC/VOID pool math, slippage, etc.)
  - \`WorkCreditsRelayerV1\` and helpers
  - \`WorkCreditsMinter\` wiring with RewardEngine

So at the **forge/test level**, the RewardEngine + WorkCredits economics are coherent and consistent with the global VOID tokenomics spec.

### 2.2 Mainnet econ + pillars metrics

We also have the mainnet econ / plan gauge and pillars wiring:

- Econ params:
  - \`void_mainnet_rewardengine_econ_health          = 1\`
  - \`void_mainnet_rewardengine_econ_json_ok         = 1\`
  - \`void_mainnet_rewardengine_econ_self_consistent = 1\`
  - \`void:mainnet_rewardengine_econ:health:last_5m  = 1\`

- Composite view with pillars, validators, and WorkCredits PLAN:
  - \`void:mainnet_pillars_with_validators:health:last_5m                                   = 1\`
  - \`void:mainnet_rewardengine_econ:health:last_5m                                         = 1\`
  - \`void:mainnet_workcredits_plan:health:last_5m                                          = 1\`
  - \`void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m = 1\`

Interpretation:

- **RewardEngine econ params are locked and self-consistent**.
- **WorkCredits PLAN is healthy**.
- **Mainnet pillars + validators + RewardEngine econ + WorkCredits PLAN** all read healthy over a 5m window.
- Mainnet bootstrap health and pillars-preflight gates are using these gauges and are **green**.

This is the important part for mainnet: the economic logic we’re about to hard-wire into the chain is coherent and monitored.

---

## 3. Why devnet RewardEngine is allowed to be a stub (for now)

Devnet’s job:

- Exercise JobQueue, receipts, agents, WorkCredits pool, etc.
- Provide an environment for AI/agent demos and WorkCredits econ experiments.
- Not necessarily mirror every single mainnet contract 1:1 at all times.

Right now:

- Devnet can function without a real RewardEngine as long as:
  - WorkCredits stack is test-green.
  - Devnet jobs/receipts coverage and health are green.
  - RewardEngine econ **spec** is tested and monitored on the mainnet path.

So having:

- \`RewardEngine.address = 0xDEADBEEF...\` in devnet state,
- No code at that address,
- \`code_5m = 0\`,

…is acceptable in the short term, **provided** we:

1. Document it clearly (this file).
2. Make sure devnet health wrappers treat this as “stub but OK” instead of “hard failure”.
3. Eventually clean it up when we actually deploy a real RewardEngine on devnet.

---

## 4. Future plan: bringing devnet RewardEngine to reality

When we decide to wire a **real** RewardEngine on devnet, the high-level steps will be:

1. **Deploy RewardEngine on devnet**
   - Write a dedicated devnet deploy/bootstrap script (Forge) that:
     - Uses \`DEVNET_DEPLOYER_KEY\` and devnet VOID address.
     - Deploys RewardEngine with the current emissions/epoch params JSON.
     - Wires it to \`WorkCreditsMinter\` or equivalent so devnet can mint WC based on RewardEngine pulls.

2. **Update devnet protocol state**
   - Update \`docs/VOID-DEVNET-PROTOCOL-STATE.json\` to:
     - Replace the \`0xDEADBEEF...\` stub with the real \`RewardEngine.address\`.
     - Keep the same shape as mainnet/devnet state entries for other contracts.

3. **Wire metrics / exporters**
   - Make sure the devnet RewardEngine code exporter:
     - Reads the correct address from the devnet state file.
     - Verifies that \`cast code(addr)\` is non-zero.
     - Exposes a base gauge like \`void_devnet_rewardengine_code_health = 1\` when OK.
   - Add or fix the recording rules so that:
     - \`void:devnet_rewardengine_code:health:last_5m\` flips from 0 → 1 when code is real.
     - Optional: add a devnet econ/plan gauge similar to mainnet’s for consistency.

4. **Tighten devnet health wrapper**
   - Once a real RewardEngine is deployed on devnet and metrics are wired:
     - Update \`ops/void-devnet-rewardengine-health-all.sh\` to treat \`code_5m != 1\` as a **real failure**, not a “stub skip”.
     - Optionally pull this into broader devnet health/all gates.

---

## 5. TL;DR

- **Devnet RewardEngine is currently a stub:**
  - State JSON has a DEADBEEF placeholder.
  - There is no contract code at that address.
  - Devnet RewardEngine code health metric is 0.
  - This is documented and explicitly allowed for now.

- **Mainnet RewardEngine is “real” at the plan/spec level:**
  - Tests are passing.
  - Emissions and econ JSON are self-consistent.
  - WorkCredits + RewardEngine metrics are wired into the mainnet pillars/validators health path and are green.

- **Future work** (when we’re ready):
  - Deploy a real RewardEngine instance on devnet.
  - Update devnet state JSON.
  - Wire devnet code/econ metrics and tighten devnet RewardEngine health gating.

For now, treat devnet RewardEngine as a **non-gating stub** and rely on mainnet RewardEngine econ + WorkCredits PLAN as the source of truth for real economics.
