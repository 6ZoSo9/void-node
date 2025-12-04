# VOID Network — Work Credits Mainnet Wiring (Bootstrap Spec)

This doc defines how the Work Credits (WC) stack is **logically wired on mainnet**:
who owns it, who can mint, how the LLP gets its 10M VOID seed, and how relayers
fit into the AdminGate / RewardEngine / Treasury story.

It does *not* change economics (see `docs/work-credits-plan.md` for that) — this is
the wiring plan that `VoidMainnetBootstrapMainnet.s.sol` and
`config/void-mainnet-bootstrap-mainnet.live.json` will eventually follow.

---

## 0. Contracts in play (mainnet set)

- `VoidToken` (core): native VOID, premine + emissions.
- `VoidEmissionsController` (core): emission eras / budgets.
- `VoidTreasury` (core): holds premine, sends to OpsTreasury / others.
- `OpsTreasury` (core): spends premine under admin control.
- `RewardEngine` (core): tracks validator / job rewards and emits VOID.

WC stack:

- `WorkCreditsToken` (mainnet):
  - ERC-20 style WC token.
  - `governance` address.
  - `minter` address (trusted minter contract only).
- `WorkCreditsMinter` (mainnet):
  - Holds **WC issuance policy**.
  - Has `admin` and `rewardEngine` roles.
- `UptimeVaultLLP` (mainnet):
  - WC/VOID pool (LLP).
  - Holds `voidToken` and `workCreditsToken`.
  - Has `governance` (lpTreasury) and `feeBps`.
- `WorkCreditsRelayerHelper` (mainnet):
  - Sits in front of `UptimeVaultLLP`.
  - Knows:
    - `voidToken`
    - `wcToken`
    - `vault` (LLP)
    - `admin`
    - `relayer`
    - `relayerFeeBps`
  - Implements:
    - `swapWcForVoidDirect(...)`
    - `swapWcForVoidViaRelayer(...)`

All of these are **mainnet contracts**; dev/test versions are separate.

---

## 1. Ownership / Roles (who controls what)

### 1.1 High-level principles

1. VOID-side power stays under the **existing governance**:
   - AdminGate + ConfigGate + ValidatorSet + RewardEngine.
2. WC is **soft fuel**, but:
   - Cannot be printed arbitrarily.
   - Only RewardEngine-controlled flows can mint (through WorkCreditsMinter).
3. LLP and relayers are **infrastructure**, not personal bags:
   - LLP is protocol-owned (lpTreasury).
   - Relayers are managed under an Ops/admin role, not random EOAs.

### 1.2 Concrete role mapping (target)

At mainnet bootstrap, we want:

- `WorkCreditsToken.governance` → a **WC governance admin** subject to AdminGate
  (either directly or via an intermediate owner controlled by AdminGate).
- `WorkCreditsToken.minter` → **WorkCreditsMinter** contract.

- `WorkCreditsMinter.admin` → a **config/admin** role under AdminGate.
- `WorkCreditsMinter.rewardEngine` → the **mainnet RewardEngine** contract.

- `UptimeVaultLLP.governance` → **lpTreasury** (protocol-owned LP controller),
  itself ultimately controlled by AdminGate / ConfigGate.
- `UptimeVaultLLP.voidToken` → mainnet `VoidToken`.
- `UptimeVaultLLP.workCreditsToken` → mainnet `WorkCreditsToken`.

- `WorkCreditsRelayerHelper.admin` → **relayerAdmin** (Ops-level control; AdminGate-guarded).
- `WorkCreditsRelayerHelper.relayer` → **relayer EOA/contract** that actually sends txs.
- `WorkCreditsRelayerHelper.relayerFeeBps` → initial fee (e.g. 200 = 2%), set by `admin`.

The exact concrete addresses (for `wcGovernance`, `lpTreasury`, `relayerAdmin`, relayer EOAs)
will live in:

- `config/void-mainnet-bootstrap-mainnet.live.json`
- `/mnt/voidkey/meta/mainnet-roles-mapping.txt`

This doc just defines the **relationships**.

---

## 2. 10M VOID split — how it actually moves on mainnet

From `docs/work-credits-plan.md`:

- Total dedicated to WC plumbing: **10,000,000 VOID**.
- Split:
  - **9,800,000 VOID** → LLP (`UptimeVaultLLP`) as protocol-owned liquidity.
  - **200,000 VOID** → relayer accounts (gas working capital).

### 2.1 Source of the 10M VOID

- All premine lives in `VoidTreasury` at bootstrap.
- `VoidTreasury` will:
  - Send a **single 10M VOID** transfer to **lpTreasury** (or split between
    `lpTreasury` + `relayerFund` depending on how we shape contracts).
  - From there, lpTreasury / OpsTreasury will seed LLP and relayer balances
    via explicit calls.

The master rule:

> No silent drains from Treasury. Every move of VOID goes through explicit,
> admin-approved calls in `VoidMainnetBootstrapMainnet.s.sol` and/or
> governance-gated functions on Treasury / OpsTreasury / lpTreasury.

### 2.2 LLP seeding path

Logical steps we will bake into the bootstrap script:

1. Ensure `VoidToken`, `VoidTreasury`, `OpsTreasury`, `RewardEngine` exist and are wired.
2. Deploy `WorkCreditsToken` with:
   - `governance = wcGovernance` (address from LIVE JSON).
3. Deploy `WorkCreditsMinter` with:
   - `wcToken = WorkCreditsToken`.
   - `admin = wcMinterAdmin` (address from LIVE JSON).
4. Call `WorkCreditsToken.setMinter(address(WorkCreditsMinter))`.
5. On `WorkCreditsMinter`, set:
   - `rewardEngine = RewardEngine` (mainnet contract).

6. Deploy `UptimeVaultLLP` with:
   - `voidToken = VoidToken`.
   - `workCreditsToken = WorkCreditsToken`.
   - `governance = lpTreasury`.

7. Move **9.8M VOID** from `VoidTreasury` → `lpTreasury` (or directly to LLP, depending on
   final API). Then:

   - `lpTreasury` calls `VoidToken.approve(UptimeVaultLLP, 9.8M)`.
   - `wcGovernance` / `WorkCreditsMinter` bootstrap a matching WC amount
     (e.g. 9.8M WC) to `lpTreasury`:
       - RewardEngine or a setup helper calls `WorkCreditsMinter.award(...)`.
   - `lpTreasury` calls `WorkCreditsToken.approve(UptimeVaultLLP, wcSeedAmount)`.
   - `UptimeVaultLLP.seedLockedLiquidity(9.8M VOID, wcSeedAmount)`.

8. LLP is now live with 9.8M VOID plus matching WC; swaps & fees on.

### 2.3 Relayer seed path

Remaining **200,000 VOID** is allocated to one or more relayer accounts:

- Option A: send 200k VOID from `VoidTreasury` → `OpsTreasury`, then OpsTreasury
  → relayer accounts under an admin-only function.
- Option B: single dedicated `RelayerFund` contract that:
  - Receives 200k VOID from Treasury.
  - Has admin-only withdraw/transfer functions for known relayer EOAs.

Regardless of exact shape:

- **No automatic mint or drip**: once the 200k is sent out, that’s it.
- Any future top-up must be a deliberate governance action.

---

## 3. Relayer helper wiring (mainnet)

`WorkCreditsRelayerHelper` is a stateless-ish contract that enforces two paths:

- Direct path: caller uses their own WC and pays gas in their own VOID.
- Relayer path: configured relayer pays gas in VOID, charges user in WC.

Mainnet bootstrap will:

1. Deploy `WorkCreditsRelayerHelper` with constructor args:

   - `_admin    = relayerAdmin`
   - `_relayer  = relayerEOA` (or relayer manager contract)
   - `_voidToken = address(VoidToken)`
   - `_wcToken   = address(WorkCreditsToken)`
   - `_vault     = address(UptimeVaultLLP)`

2. From `relayerAdmin` (bootstrap or subsequent governance):

   - Optionally adjust `relayer` to the real relayer cluster address.
   - Set `relayerFeeBps` to an initial value (e.g. 200 = 2%).

3. (Off-chain / app level):
   - Relayer infra listens for user requests (signed messages).
   - Uses helper’s `swapWcForVoidViaRelayer(...)` for gasless flows,
     and `swapWcForVoidDirect(...)` for “pay with your own VOID” mode.

The helper itself **does not** mint, does not move Treasury funds, and does not
touch AdminGate / ConfigGate — it just mediates between WC users and the LLP.

---

## 4. Safety & Governance constraints

These are the hard design constraints we must obey when we wire this into
`VoidMainnetBootstrapMainnet.s.sol`:

1. **No new backdoors into Treasury**
   - All VOID that reaches LLP and relayers must come from explicit,
     auditable calls.
   - No hidden “top-up from Treasury” logic in WC/LLP/Relayer contracts.

2. **WC mint authority goes through RewardEngine**
   - Only RewardEngine-authorized calls into `WorkCreditsMinter` can mint WC.
   - No random extra minters, no “operator mints” for buddies.

3. **LLP governed by lpTreasury, not personal keys**
   - `UptimeVaultLLP.governance` must be a role that is controlled through
     AdminGate/ConfigGate processes, not a throwaway EOA.

4. **Relayer admin is replaceable**
   - `WorkCreditsRelayerHelper.admin` must be rotatable via governance.
   - `relayer` address is *not* hard-coded forever; we can swap infra providers.

5. **Monitoring & gating**
   - `void:work_credits:health_v3:last_5m` MUST be 1.
   - `void:relayers:health:last_5m` MUST be 1.
   - `void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m` MUST be 1.
   - `./ops/void-work-credits-health-all.sh` must pass as a pre-push / pre-broadcast gate.

If any of these are red, mainnet broadcast is blocked.

---

## 5. Implementation order (for future work)

When we come back to actually wiring this into mainnet, the steps are:

1. **Update docs & JSON (plan phase)**
   - Ensure LIVE JSON has entries for:
     - `wcGovernance`
     - `wcMinterAdmin`
     - `lpTreasury`
     - `relayerAdmin`
     - One or more `relayer` addresses.
   - Ensure `/mnt/voidkey/meta/mainnet-roles-mapping.txt` knows about these roles.

2. **Extend `VoidMainnetBootstrapMainnet.s.sol` (plan only)**
   - Add a **plan()** / dry-run path that prints the WC wiring steps and
     expected addresses/amounts, without broadcasting.

3. **Implement real wiring**
   - In `run()`, after core mainnet contracts are live:
     - Deploy WorkCreditsToken, WorkCreditsMinter, UptimeVaultLLP, RelayerHelper.
     - Move 10M VOID from Treasury → LLP + relayer accounts as per this spec.
     - Ensure RewardEngine → WorkCreditsMinter link is set.

4. **Re-run all health gates**
   - `forge test`
   - `./ops/void-mainnet-planning-health-all.sh`
   - `./ops/void-work-credits-health-all.sh`
   - Composite mainnet pillars + keys + AI + WC + relayers health.

Once all of those are green, we treat WC wiring as “mainnet-ready”.

