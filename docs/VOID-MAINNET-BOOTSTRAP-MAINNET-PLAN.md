# VOID mainnet bootstrap PLAN (stub phase)

This doc covers the **PLAN-only** phase of the VOID mainnet bootstrap, using:

- `config/void-mainnet-bootstrap-mainnet.live.json` (LIVE mainnet config, no sentinels)
- PLAN scripts that **do not broadcast** any transactions yet
- Keys + roles verification against the LUKS-encrypted voidkey

At this stage:

- All contract addresses in the LIVE JSON are still `0x0000...0000`.
- We are only validating configuration, keys, and roles wiring.
- No VOID mainnet deployment has occurred yet.

## Prerequisites

- `voidkey` LUKS volume is mounted at `/mnt/voidkey`.
- Roles mapping file exists at `/mnt/voidkey/meta/mainnet-roles-mapping.txt`.
- LIVE config exists at `config/void-mainnet-bootstrap-mainnet.live.json`.
- Prometheus is running and scraping the node exporter textfile metrics used by the keys/plan exporters.

## Mainnet PLAN + keys checklist

To verify that the mainnet PLAN and keys pillar are healthy at this stub-only stage, run:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-plan-checklist.sh

This checklist will:

1. Run the mainnet bootstrap PLAN checklist:

    - Confirm `chainId(config) == 2050`.
    - Confirm `chainId(RPC) == 2050`.
    - Confirm all tracked core roles in the LIVE config are non-zero.
    - Summarize which CRITICAL contract addresses are still zero
      (expected in PLAN-only phase).

2. Verify that the roles mapping on `voidkey` matches the LIVE JSON:

    - `deployer`, `treasuryAdmin`, `opsTreasuryAdmin`, `validatorAdmin`,
      `adminGateOwner`, `updateGateOwner`, `configGateOwner`,
      `treasuryOwner`, `opsTreasuryOwner`, `rewardEngineOwner`,
      `validatorSetOwner`.

3. Run the mainnet keys health check:

    - Re-runs the roles verifier as a guardrail.
    - Confirms the exporter has set `void_mainnet_keys_roles_ok 1`.

4. Check the composite mainnet pillars + keys health via Prometheus:

    - Confirms `void:mainnet_pillars:health:last_5m == 1`.
    - Confirms `void:mainnet_pillars:health_with_keys:last_5m == 1`.

If everything is wired correctly, the checklist ends with:

    === [mainnet-plan checklist] RESULT: OK (PLAN + keys are healthy at stub-only stage) ===

This state must remain green before we ever enable the real mainnet bootstrap
`run()` path or broadcast transactions. Only after this PLAN+keys checklist is
stable do we move on to designing and rehearsing the **real mainnet bootstrap**
sequence.

## Stub-only guard

While we are still in the PLAN-only phase, all core contract addresses in the
LIVE JSON should remain `0x0000000000000000000000000000000000000000`. To check
that we have not accidentally populated any real addresses yet, run:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-plan-stub-guard.sh

By default this script:

- Reads `config/void-mainnet-bootstrap-mainnet.live.json`.
- Checks the following keys under `.contracts`:
  - `updateGate`, `adminGate`, `configGate`, `validatorSet`,
    `voidToken`, `premineVault`, `treasury`, `voidTreasury`,
    `opsTreasury`, `rewardEngine`.
- Logs `OK` if an entry is still zero, `WARN` if it is non-zero.

If you want to make non-zero addresses a hard error (for example in CI), run:

    REQUIRE_STUB_ZERO=1 ./ops/void-mainnet-plan-stub-guard.sh

Once we are ready to move beyond the stub-only phase and start filling in
real contract addresses, this guard should be treated as advisory (or run
without `REQUIRE_STUB_ZERO=1`) so that it reports which keys have been
populated instead of blocking the workflow.
