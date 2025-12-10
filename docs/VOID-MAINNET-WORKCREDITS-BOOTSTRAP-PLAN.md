# VOID Mainnet — WorkCredits Bootstrap Plan (v0)

## 1. Scope

This document describes how WorkCredits will be brought online on VOID mainnet.

It is a plan / runbook, not an implementation:

- No on-chain broadcast yet.
- No addresses are final yet.
- All concrete values (addresses, amounts, tx hashes) will be captured in a future
  LIVE JSON + ceremony log when we are ready.

For now, this plan must stay in sync with:

- docs/VOID-MAINNET-WORKCREDITS-PILLAR.md
- docs/VOID-MAINNET-WORKCREDITS-UI.md
- docs/VOID-MAINNET-VALIDATOR-INCENTIVES.md
- config/void-mainnet-workcredits.live.json
- ops/void-mainnet-workcredits-exporter.sh
- ops/void-mainnet-workcredits-plan-exporter.sh

## 2. Design goals

1. Preserve VOID as the scarce base asset.
   - WorkCredits (WC) are an earnable, more fluid work token.
   - VOID remains governance / staking / deep economic backbone.

2. Make WC usable from day one:
   - Validators and relayers should be able to earn WC for real work.
   - Users should be able to see WC balances and trade WC↔VOID via the pool.

3. Keep bootstrap conservative and reversible:
   - One-time 10M VOID seed for the WC/VOID pool (as per high-level plan).
   - Seed must come from a Treasury-controlled path, not a hot wallet.
   - All steps must be replayable and independently verifiable.

4. Integrate cleanly with pillars:
   - WorkCredits pillar health and plan gauges must flip from stub to real.
   - Validators + WorkCredits must show up as a combined “pillars + validators + WC”
     health signal (we already have the stub metric wired).

## 3. Core contracts (expected mainnet set)

These are the WorkCredits-related contracts on mainnet:

- WorkCreditsToken (ERC20, 18 decimals)
  - Symbol: WC
  - Mint/burn role: owned by RewardEngine (or successor) via Admin/Config gates.
  - Transferable like a standard ERC20.

- WorkCreditsPoolV1 (AMM for WC↔VOID)
  - Holds reserves: VOID and WC.
  - Exposes swap interface for VOID↔WC.
  - Owned/controlled by Ops/Treasury roles, not an EOA.

Existing core contracts involved:

- VoidToken (VOID)
- VoidTreasury
- OpsTreasury
- RewardEngine
- AdminGate / ConfigGate / UpdateGate
- ValidatorSet (indirectly, via RewardEngine and incentives)

Exact contract names/types must match the final Solidity code in src/contracts.
This document only defines the intended relationships and flows.

## 4. High-level bootstrap phases

### Phase 0: Preconditions

- Mainnet core bootstrap is fully green (pillars with validators).
- Keys pillar and roles mapping are already healthy.
- WorkCredits pillar is still in stub mode:
  - config/void-mainnet-workcredits.live.json has zero addresses.
  - Exporter reports mode="stub" and token_zero="true", pool_zero="true".

### Phase 1: PLAN-only rehearsal (anvil / dev-style)

Run a PLAN-only rehearsal that:

- Deploys WorkCreditsToken.
- Deploys WorkCreditsPoolV1 with VOID+WC pairs.
- Wires RewardEngine as the authorized minter of WC.
- Wires Ops/Treasury as owners/controllers for the pool.

This rehearsal:

- Does not touch real mainnet.
- Uses chainId 2050 on a local fork/anvil.
- Writes a PLAN JSON (for example: config/void-mainnet-workcredits.plan.json)
  containing hypothetical addresses and wiring.
- Must pass an internal PLAN pillar / CI gate before any mainnet deployment.

### Phase 2: Define the real WORKCREDITS LIVE JSON

When the PLAN rehearsal is stable, prepare a LIVE JSON:

- config/void-mainnet-workcredits.live.json must be updated from stub to:

  {
    "chainId": 2050,
    "workCreditsToken": "0xWC_TOKEN_MAINNET_ADDRESS",
    "workCreditsPool":  "0xWC_POOL_MAINNET_ADDRESS"
  }

Rules:

1. chainId must remain 2050.
2. workCreditsToken must be non-zero and match the deployed WC token.
3. workCreditsPool must be non-zero and match the deployed WC/VOID pool.

This LIVE JSON is written only as part of the mainnet WorkCredits ceremony,
backed by human-readable logs and tags.

### Phase 3: One-time seed of 10M VOID into WorkCredits pool

- A one-time 10M VOID seed is moved from VoidTreasury to WorkCreditsPoolV1.
- This is done via Treasury/Config/UpdateGate-controlled calls, not from a
  personal wallet.

Conceptual path:

1. VoidTreasury authorizes a transfer of 10M VOID into WorkCreditsPoolV1.
2. WorkCreditsPoolV1 mints initial LP/shares, held under an Ops/Treasury role
   (not a personal key).
3. We record:
   - Tx hash
   - Block number
   - Pre- and post-reserves
   - Resulting initial WC↔VOID price.

Initially, the pool may start with 0 WC reserve until we finalize how WC is
distributed. That decision must be documented here before mainnet broadcast.

### Phase 4: Tie RewardEngine to WorkCreditsToken

- RewardEngine (or successor incentives contract) gains mint/burn authority on WC.
- All RewardEngine calls that mint WC:
  - Are driven by real work (validator participation, relayer jobs, etc.).
  - Obey the locked WorkCredits economic spec and emissions schedule.

For bootstrap:

- No random airdrops of WC.
- Only enable mint paths that correspond to real work.
- Document initial mint configuration:
  - Which roles can call RewardEngine methods that mint WC.
  - Any rate limits, caps, or ceilings.

### Phase 5: Flip WorkCredits pillar from stub to real

When all of this holds:

- config/void-mainnet-workcredits.live.json has non-zero addresses.
- WorkCreditsToken and WorkCreditsPoolV1 are deployed on mainnet.
- 10M VOID is seeded into the pool from Treasury.
- RewardEngine → WC wiring matches the intended design.

Then:

1. Update ops/void-mainnet-workcredits-exporter.sh to:
   - Read the LIVE JSON.
   - Confirm on-chain:
     - chainId is correct.
     - Token address has code and behaves like ERC20.
     - Pool address has code and behaves like the expected AMM.
     - Treasury/RewardEngine ownership matches expectations.
   - Set void_mainnet_workcredits_health to 1 only if all checks pass.
   - Change void_mainnet_workcredits_info labels to something like
     mode="real", reason="ok_mainnet".

2. Update the WorkCredits pillar doc to record that we are live on mainnet.

3. Optionally make WorkCredits part of hard-gating in:
   - ops/void-mainnet-pillars-preflight.sh
   - void-mainnet-pillars-rules.yml
   but only after the exporter has proven stable.

### Phase 6: Long-term operations

After mainnet is live and WC is real, maintain a RUNBOOK section here that covers:

- How to rotate pool ownership keys.
- How to adjust RewardEngine WC emission parameters via ConfigGate/UpdateGate.
- How to top up the pool if needed (from Treasury or accumulated fees).
- How to interpret WorkCredits-related Prometheus metrics and Grafana panels.

Any future upgrade to WorkCreditsPool (V2, fee changes, etc.) must:

- Preserve on-chain verifiability.
- Maintain a clear mapping from old to new pools.
- Update this document and the LIVE JSON accordingly.

## 5. Ceremony and tagging requirements

When the real WorkCredits mainnet bootstrap happens:

1. Create a dedicated tag such as:
   ckpt-mainnet-workcredits-bootstrap-live-YYYYMMDD-HHMMSS

   That tag must capture:
   - Exact Solidity code.
   - Final WorkCredits LIVE JSON.
   - Script versions (exporters, plan scripts).
   - Any changes to validator incentives and UI docs.

2. Add a ceremony log in docs/ that:
   - Lists each transaction hash and block number.
   - Lists contract addresses for WorkCreditsToken and WorkCreditsPoolV1.
   - Captures initial pool reserves and WC mint configuration.

3. Do not run WorkCredits mainnet deployment or Treasury seed unless:
   - Mainnet pillars+validators health is already green.
   - WorkCredits PLAN rehearsal has been run and verified.
   - Keys pillar and roles mapping remain healthy.
