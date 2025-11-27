# VOID Network – Mainnet Genesis Plan (v1)

This document is the **operational playbook** for building and launching
VOID mainnet genesis (chainId 2050) in a way that matches our locked specs:

- `docs/VOID-TOKENOMICS-SPEC-V1.md`
- `docs/VOID-EMISSIONS-SCHEDULE.md`
- `docs/VOID-EMISSIONS-PARAMS-V1.json`
- `docs/VOID-MONETARY-SPEC-V1.md`
- `docs/VOID-MAINNET-GENESIS-SPEC-V1.md`
- `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
- `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`
- `docs/VOID-MAINNET-KEYS-PLAN.md`
- `docs/VOID-MAINNET-ALLOCATION-SPEC.md`

The goal is a **repeatable, auditable path** from these specs to a concrete
genesis manifest and genesis JSON that any third party can re-derive.

---

## 1. High-level constraints (recap)

From the locked tokenomics + monetary specs:

- `MAX_SUPPLY_VOID`      = **666,666,666 VOID**
- `PREMINE_VOID`         = **333,333,333 VOID**
- `EMISSIONS_TOTAL_VOID` = **333,333,333 VOID**

For **genesis v1**:

1. The **entire premine** (333,333,333 VOID) sits in **VoidTreasury** only.
2. No validators receive any premine at genesis.
3. All long-term validator rewards come from **emissions**, via:
   - `RewardEngine` (emissions budget + validator claims)
   - `ValidatorSet` (voting power / active set)
4. On-chain balances at height 0 must satisfy:

   - `totalSupply(0) = PREMINE_VOID`
   - `totalMinted(0) = PREMINE_VOID`
   - No other addresses hold VOID at height 0 except the treasury
     and any explicitly documented special cases in
     `VOID-MAINNET-ALLOCATION-SPEC.md` (which **must not** include
     direct validator balances).

5. All constants and allocations used during genesis build must be
   **consistent with the Prometheus spec health gauge**:

   - `void_mainnet_tokenomics_spec_health == 1`
   - `void:mainnet_tokenomics:spec_health:last_5m == 1`

---

## 2. Required inputs

Before building the genesis manifest, we must lock down the following files
and treat them as **source of truth**:

1. **Tokenomics + emissions**

   - `docs/VOID-TOKENOMICS-SPEC-V1.md`
   - `docs/VOID-EMISSIONS-SCHEDULE.md`
   - `docs/VOID-EMISSIONS-PARAMS-V1.json`
   - `docs/VOID-MONETARY-SPEC-V1.md`
   - `docs/VOID-EMISSIONS-SANITY-2025-11-14.txt` (sanity notes)

2. **Genesis layout**

   - `docs/VOID-MAINNET-GENESIS-SPEC-V1.md`
   - `docs/VOID-MAINNET-ALLOCATION-SPEC.md`

3. **Validators + rewards**

   - `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
   - `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`

4. **Keys and addresses**

   - `docs/VOID-MAINNET-KEYS-PLAN.md` (treasury, admin, UpdateGate,
     ConfigGate, master keys, etc.)

5. **Contracts & ABIs**

   - `contracts/mainnet/VoidToken.sol`
   - `contracts/mainnet/VoidTreasury.sol`
   - `contracts/mainnet/OpsTreasury.sol`
   - `contracts/mainnet/RewardEngine.sol`
   - `contracts/mainnet/ValidatorSet.sol`
   - `contracts/mainnet/IRewardEngineLike.sol`
   - `contracts/mainnet/IValidatorSetLike.sol`

All of the above must be **green in CI** (Foundry tests passing) before we
attempt a real genesis build.

---

## 3. Concrete genesis shape (what we’re building)

At a high level, genesis for chainId 2050 must contain:

1. **Chain metadata**

   - `chainId`: `2050`
   - Human label: `VOID-MAINNET`
   - Initial block height: `0`
   - Genesis timestamp: ISO8601 UTC (`TBD` at launch time)

2. **System contracts + code**

   Deployed (or “predeployed”) at the addresses chosen in
   `VOID-MAINNET-KEYS-PLAN.md` and `VOID-MAINNET-GENESIS-SPEC-V1.md`:

   - `VoidToken` (main ERC-20, symbol `VOID`, 18 decimals)
   - `VoidTreasury`
   - `OpsTreasury`
   - `RewardEngine`
   - `ValidatorSet`
   - Any minimal gate or registry contracts we consider **core** for mainnet v1
     (e.g. `UpdateGate`, `ConfigGate`) — these must be explicitly listed
     in the genesis spec.

3. **Balances and supply**

   - `VoidToken` totalSupply at genesis: `PREMINE_VOID` (scaled to 18 decimals).
   - `VoidTreasury` balance: full premine.
   - No other addresses should hold VOID except for any explicitly documented
     special-case allocations (if we ever decide to carve out something like an
     immediate liquidity pool or migration pool — those must be documented
     line-by-line in `VOID-MAINNET-ALLOCATION-SPEC.md` and still respect the
     “no direct validator premine” rule).

4. **Validator set**

   - A concrete list of validators and their voting powers, written into
     the `ValidatorSet` contract’s storage at height 0.
   - This must match the logical spec in `VOID-VALIDATOR-SET-SPEC-V1.md`
     and be consistent with the addresses in `VOID-MAINNET-KEYS-PLAN.md`.

5. **Reward engine**

   - `RewardEngine` must be initialized with:
     - `emissionsBudget = EMISSIONS_TOTAL_VOID` (scaled to 18 decimals)
     - `admin` address as per keys plan
     - `validatorSet` address
   - No emissions are pulled at genesis; `totalPulled == 0`.

---

## 4. Genesis build pipeline (planned)

The recommended pipeline is:

1. **Freeze specs**

   - Tag the repo with a “spec freeze” tag, e.g.:

     - `ckpt-mainnet-spec-freeze-YYYYMMDD-HHMMSS`

   - Ensure all spec docs listed in section 2 are committed and pushed.

2. **Derive canonical JSON inputs**

   Write a deterministic script (e.g. `ops/void-mainnet-genesis-build.sh`)
   that:

   - Reads:
     - `docs/VOID-MAINNET-GENESIS-SPEC-V1.md`
     - `docs/VOID-MAINNET-ALLOCATION-SPEC.md`
     - `docs/VOID-MAINNET-KEYS-PLAN.md`
     - `docs/VOID-VALIDATOR-SET-SPEC-V1.md`
     - `docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`
   - Emits:
     - `ops/genesis/void-mainnet-addresses.json`
     - `ops/genesis/void-mainnet-balances.json`
     - `ops/genesis/void-mainnet-validators.json`
     - `ops/genesis/void-mainnet-reward-engine.json`

   These JSON files should be **pure data**, no logic.

3. **Construct genesis manifest**

   From the above JSON inputs, build a single manifest:

   - `ops/genesis/void-mainnet-genesis-manifest.json`

   This manifest should include:

   - `chainId`
   - `genesisTime`
   - `tokenomics` block (copy of constants)
   - `contracts` with code hashes + addresses
   - `balances` mapping (token balances)
   - `validators` (addresses + powers)
   - `rewardEngine` config (budget, admin, links)

4. **Generate client-specific genesis file**

   Finally, transform the manifest into whatever format `void-node` expects
   for its genesis import, e.g.:

   - `ops/genesis/void-mainnet-genesis-voidnode.json`

   `void-node` should be able to **verify** that this JSON is consistent with
   the manifest (and ideally with the raw spec docs), or at minimum record the
   manifest hash in node logs / metrics.

---

## 5. Pre-launch checks

Before we launch VOID mainnet, we must pass these checks:

1. **Spec health**

   - `void_mainnet_tokenomics_spec_health == 1`
   - `void:mainnet_tokenomics:spec_health:last_5m == 1`

2. **Genesis manifest sanity**

   - Total premine equals `PREMINE_VOID`.
   - Emissions budget in `RewardEngine` equals `EMISSIONS_TOTAL_VOID`.
   - Sum of balances equals `PREMINE_VOID`.
   - No direct validator balances in the premine.

3. **Validator set sanity**

   - `totalPower() > 0`
   - `getActiveValidators().length > 0`
   - `totalPower()` equals the sum of `getVotingPower(v)` over
     `getValidators()`.

4. **Key plan consistency**

   - All addresses in the manifest match `VOID-MAINNET-KEYS-PLAN.md`.
   - Premine address is the **cold VoidTreasury** address from the keys plan.
   - Admin / gate addresses match the plan.

5. **Reproducibility**

   - At least one independent re-run of the genesis build script (on a second
     machine or clean environment) must produce the **same manifest hash**.

---

## 6. Launch sequence (high level)

1. **Finalize tag**

   - Create a final release tag, e.g.:

     - `void-mainnet-genesis-v1`

   - This tag references the exact commit (code + docs) used to build the
     manifest.

2. **Distribute manifest & binaries**

   - Publish:
     - `void-node` binary (or installation instructions).
     - `void-mainnet-genesis-manifest.json`
     - `void-mainnet-genesis-voidnode.json`
   - Optionally, publish a **human-readable report** summarizing:
     - premine
     - validator set
     - reward engine config
     - key roles

3. **Validator bring-up**

   - Validators initialize their nodes with the published genesis JSON.
   - Validators verify:
     - manifest hash
     - chainId = 2050
     - their own validator address and expected voting power

4. **Genesis block**

   - At the configured genesis time, validators start their nodes.
   - Network begins producing blocks.
   - Monitoring immediately checks:
     - heads advancing
     - txroot/header3/seals health
     - mainnet_core / lastmile / tokenomics SLOs
     - reward engine and validator set metrics (once integrated)

---

## 7. Post-launch guardrails

Once mainnet is live:

1. Keep the **genesis manifest immutable**. Any changes must be treated as a
   fork with a new chainId (not applicable for normal upgrades).

2. Future changes to tokenomics, validator sets, or reward logic must:

   - Respect the total supply cap and emissions budget.
   - Preserve the rule: **premine does not go directly to validators**.
   - Go through the UpdateGate / ConfigGate process, with proper
     monitoring and rollback plans.

3. All production incidents related to monetary policy, validator rewards,
   or generator bugs must refer back to:

   - `VOID-MONETARY-SPEC-V1.md`
   - `VOID-TOKENOMICS-SPEC-V1.md`
   - `VOID-MAINNET-GENESIS-SPEC-V1.md`
   - `VOID-VALIDATOR-SET-SPEC-V1.md`
   - `VOID-VALIDATOR-REWARD-INTEGRATION-V1.md`
   - `VOID-MAINNET-KEYS-PLAN.md`
   - `VOID-MAINNET-GENESIS-PLAN.md` (this file)

as the canonical design and operational intent for mainnet genesis v1.

