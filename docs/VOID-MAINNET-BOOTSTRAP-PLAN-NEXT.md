# VOID Mainnet Bootstrap PLAN – Next Steps Checklist

Version: v1 (stub phase)
Branch: feat/mainnet-core-20251120

## 0. Current status – STUB, NOT READY

Right now the VOID mainnet bootstrap PLAN is intentionally not ready:

- The live config file (config/void-mainnet-bootstrap-mainnet.live.json) exists but:
  - Uses placeholder roles (0x0000..., 0x1111..., etc.).
  - Has validators = 1 with validator0 mostly TODO.
- The Solidity script (script/VoidMainnetBootstrapMainnet.s.sol):
  - Reads and parses the JSON.
  - Logs chainId, roles, contracts, and validator0.
  - Then reverts on purpose with a “stub only” error.
- The PLAN scripts:
  - ops/void-mainnet-bootstrap-mainnet-plan.sh:
    - If MAINNET_FORK_URL is unset, it skips forge simulation and prints that the PLAN is not ready.
  - ops/void-mainnet-bootstrap-plan-health.sh:
    - Runs the PLAN script, reads ops/out/void-mainnet-bootstrap-plan.prom,
      and reports PLAN_OK = 0.
  - ops/void-mainnet-bootstrap-plan-exporter.sh:
    - Publishes void_mainnet_bootstrap_plan_ready and related gauges into
      node_exporter textfile → Prometheus.

Prometheus view right now:

- void_mainnet_bootstrap_plan_ready = 0
- void:mainnet_bootstrap_plan:ready:last_5m = 0

Alert:

- VoidMainnetBootstrapPlanNotReady is firing as an info-level alert and its description explicitly says this is EXPECTED while the PLAN is a stub.

Nothing is broken. This is the designed stub state.

## 1. Invariants that must never be broken

1) No secrets in git.

- config/void-mainnet-bootstrap-mainnet.live.json stays gitignored.
- Live mainnet keys, mnemonics, LUKS images, seed dumps, etc. never go into this repo.

2) PLAN scripts are PLAN-only.

- ops/void-mainnet-bootstrap-mainnet-plan.sh and ops/void-mainnet-bootstrap-plan-health.sh:
  - Must never broadcast transactions.
  - Must be safe to run repeatedly against anvil forks or read-only RPC endpoints.

3) PLAN_OK is a gate, not a toy.

- PLAN_OK == 1 only when:
  - The live JSON has real roles, contracts, and validator stakes.
  - The Solidity script no longer has the stub revert and successfully simulates the bootstrap sequence.
  - The Prometheus exporter has been updated and void_mainnet_bootstrap_plan_ready stays 1.

Until those are true, PLAN_OK must stay 0.

## 2. Conditions required before PLAN_OK is allowed to be 1

We only flip PLAN_OK to 1 when all of this is true:

1) Final roles and key plan are decided.

- AdminGate owner, UpdateGate owner, ConfigGate owner.
- TreasuryOwner, OpsTreasuryOwner, RewardEngineOwner.
- ValidatorSetOwner and (if used) deployer.
- For each:
  - Storage and usage plan (hardware wallet / LUKS / vault) is written down outside this repo.

2) Live JSON fully wired (offline, gitignored).

- network and chainId match the real VOID mainnet.
- .roles.* all real addresses, no placeholders.
- .contracts.* all real deployed contract addresses on VOID mainnet.
- .validators contains the actual validator set, with:
  - Reward addresses.
  - Consensus keys.
  - Stake amounts matching the final tokenomics design.

3) Solidity bootstrap script is de-stubbed.

- VoidMainnetBootstrapMainnet:
  - Still reads and validates the JSON.
  - No longer reverts with “stub only”.
  - Simulates the real bootstrap sequence against a fork:
    - Deploys or verifies contracts.
    - Checks ownership and role wiring.
    - Asserts premine → Treasury → OpsTreasury → RewardEngine flows.
    - Asserts validator set config.
  - Fails loudly if anything mismatches.

4) Fork simulation is enabled and healthy.

- MAINNET_FORK_URL is set to a safe, forkable RPC.
- Running:

    cd ~/dev/void-node
    export MAINNET_FORK_URL="https://<your-mainnet-node-or-fork>"
    ./ops/void-mainnet-bootstrap-mainnet-plan.sh \
      config/void-mainnet-bootstrap-mainnet.live.json

  must:
  - Finish without revert.
  - Produce PLAN_OK = 1 in ops/out/void-mainnet-bootstrap-plan.prom.

5) Exporter and Prometheus agree.

- After:

    ./ops/void-mainnet-bootstrap-plan-exporter.sh

  we must see:

- void_mainnet_bootstrap_plan_ready == 1
- void:mainnet_bootstrap_plan:ready:last_5m == 1

The VoidMainnetBootstrapPlanNotReady alert should resolve and stay resolved.

## 3. Operational runbook when we are close to real mainnet

When getting ready for actual mainnet bootstrap:

1) Prepare the live JSON offline.

- On a machine with the proper key and LUKS setup:
  - Fill config/void-mainnet-bootstrap-mainnet.live.json with real data.
- Keep it encrypted and out of any untrusted backup systems.

2) Dry-run the PLAN against a mainnet fork.

Commands:

- Set MAINNET_FORK_URL to a mainnet RPC/fork.
- Run:

    cd ~/dev/void-node
    ./ops/void-mainnet-bootstrap-mainnet-plan.sh \
      config/void-mainnet-bootstrap-mainnet.live.json
    ./ops/void-mainnet-bootstrap-plan-health.sh
    ./ops/void-mainnet-bootstrap-plan-exporter.sh

Expect:

- PLAN_OK = 1 in the health output.
- No Solidity revert.
- Logs showing correct roles, contracts, and validators.

3) Check Prometheus.

- void_mainnet_bootstrap_plan_ready
- void:mainnet_bootstrap_plan:ready:last_5m

Both should be 1 and stable.

4) Treat regressions as blockers.

- After PLAN_OK reaches 1 with real wiring, any drop back to 0 is a real warning.
- No live-broadcast bootstrap until:
  - PLAN_OK == 1
  - Mainnet pillars are green
  - Safeboot path is green
  - Devnet/agent pipelines are healthy

## 4. What to do right now (stub phase)

In the current phase:

- Do not set MAINNET_FORK_URL yet.
- Do not remove the stub revert in VoidMainnetBootstrapMainnet.
- Let PLAN_OK stay 0.
- Let void_mainnet_bootstrap_plan_ready stay 0.
- Treat the VoidMainnetBootstrapPlanNotReady alert as informational only.

This file exists so future us does not have to rediscover what “PLAN not ready yet” really means.
