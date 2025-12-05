# WorkCredits Backlog & Milestones (devnet → mainnet)

_Last updated: 2025-12-05 (local dev)_

This file tracks what’s done and what’s left for Work Credits (WC) across:

- On-chain contracts (token, pool, relayer)
- Relayer service
- Obelisk Wallet UI (wallet tab, trading tab, WC actions)
- Monitoring / mainnet wiring

---

## 0. Status Snapshot (NOW)

**Done:**

- **Contracts**
  - `contracts/workcredits/WorkCreditsRelayerTypes.sol`
  - `contracts/workcredits/WorkCreditsQuoteLib.sol`
  - `contracts/workcredits/WorkCreditsRelayerQuoteHelper.sol`
  - `contracts/workcredits/WorkCreditsRelayerV1.sol`
  - Tests in `test/workcredits/*.t.sol` all **PASS** via:
    - `ops/void-workcredits-contracts-smoke.sh`
- **Relayer client + dev HTTP**
  - Dev stub `wc-relayer-dev` on `127.0.0.1:4311` with `/health` + `/api/wc-relayer/v1/*`.
  - `src/workcredits_relayer_client.ts` + smoke script:
    - `ops/void-wc-obelisk-wallet-all-demos.sh` step `[1/6] wc-relayer client smoke`.
  - EIP-712 typed data + submit flow wired (SIMULATED tx hashes).
- **Obelisk Wallet: WC schema / API / actions**
  - `src/obelisk_wallet_workcredits_schema.ts`
  - `src/obelisk_wallet_workcredits_api.ts`
  - Actions demo:
    - `src/obelisk_wallet_workcredits_actions_demo.ts`
    - `ops/void-wc-obelisk-wallet-actions-demo.sh`
  - Supports intents (dev stub): `SEND_VOID`, `SEND_WC`, `COLLECT_PENDING_WC`.
- **Obelisk Wallet: WC wallet tab model**
  - Interface: `src/obelisk_wallet_workcredits_tab_model.ts`
  - Dev impl + demo:
    - `src/obelisk_wallet_workcredits_tab_model_dev.ts`
    - `src/obelisk_wallet_workcredits_tab_model_demo.ts`
    - `ops/void-wc-obelisk-wallet-tab-demo.sh`
- **Obelisk Wallet: WC trading tab model**
  - Interface: `src/obelisk_wallet_workcredits_trading_tab_model.ts`
  - Dev impl + demo:
    - `src/obelisk_wallet_workcredits_trading_tab_model_dev.ts`
    - `src/obelisk_wallet_workcredits_trading_tab_model_demo.ts`
    - `ops/void-wc-obelisk-wallet-trading-tab-demo.sh`
- **UI overview + all-demos runner**
  - `docs/OBELISK-WORKCREDITS-UI-OVERVIEW.md`
  - `ops/void-wc-obelisk-wallet-all-demos.sh` runs:
    1. wc-relayer client smoke
    2. wallet API smoke
    3. wallet demo
    4. actions demo
    5. wallet tab demo
    6. trading tab demo

**Current mode:**  
Everything is still in **DEV_STUB** land. Math is deterministic and local; no real WC token, no real LLP pool, no real on-chain relayer yet.

---

## 1. Phase WC-α: On-chain primitives (devnet-only) 

Goal: have a real on-chain WC stack on **devnet** while keeping mainnet untouched.

### 1.1 WorkCreditsToken (ERC20)

- [ ] Implement `WorkCreditsToken.sol` (likely under `contracts/workcredits/` or `contracts/mainnet/workcredits/`):
  - 18 decimals ERC20.
  - Minting restricted to a **controller** (dev script / RewardEngine on devnet).
  - No arbitrary mint from EOAs.
- [ ] Add tests:
  - [ ] Basic ERC20 behavior (transfer, approve, transferFrom).
  - [ ] Mint access control (only controller).
  - [ ] No reentrancy / silly bugs.

### 1.2 UptimeVaultLLP (VOID/WC pool)

- [ ] Implement `UptimeVaultLLP.sol`:
  - [ ] Holds reserves of `VOID` and `WorkCreditsToken`.
  - [ ] LP token representing share of the pool.
  - [ ] Constant-product or similar AMM math that matches `WorkCreditsQuoteLib` expectations.
- [ ] Add tests:
  - [ ] Deposit / withdraw mint/burn LP correctly.
  - [ ] Swaps:
    - [ ] BUY_WC path (user trades VOID → WC).
    - [ ] SELL_WC path (user trades WC → VOID).
  - [ ] Safety guards:
    - [ ] Revert if trade is “too much of the pool” (align with QuoteLib revert).
    - [ ] Revert if slippage exceeds maxBps.

### 1.3 Devnet bootstrap script for WC stack

- [ ] Write a dedicated devnet bootstrap script, e.g.:
  - `script/WorkCreditsDevBootstrap.s.sol:WorkCreditsDevBootstrap`
- [ ] Responsibilities:
  - [ ] Deploy `WorkCreditsToken`, `UptimeVaultLLP`, `WorkCreditsRelayerQuoteHelper`, `WorkCreditsRelayerV1`.
  - [ ] Seed the pool with **dev-only** VOID + WC amounts.
  - [ ] Set relayer config:
    - [ ] Set verifying contract to `WorkCreditsRelayerV1`.
    - [ ] Wire it to `UptimeVaultLLP` + `WorkCreditsToken`.
- [ ] Write dev bootstrap state doc:
  - [ ] `docs/VOID-DEVNET-WORKCREDITS-STATE.json` (addresses + seed amounts).
- [ ] Add shell wrapper:
  - [ ] `ops/void-workcredits-dev-bootstrap.sh` (anvil/devnet only).

---

## 2. Phase WC-β: Wire Obelisk Wallet to real devnet WC

Goal: let the Obelisk Wallet **actually** talk to devnet WC contracts and pool when a flag is on.

### 2.1 Config & modes

- [ ] Extend `config/obelisk-workcredits-dev.json`:
  - [ ] Replace `"VoidToken": "0x..."`, `"WorkCreditsToken": "0x..."`, `"UptimeVaultLLP": "0x..."`, `"WorkCreditsRelayerV1": "0x..."` with real devnet addresses from bootstrap.
  - [ ] Add a mode flag:
    - [ ] `"mode": "STUB" | "DEVNET" | "MAINNET"` (or similar).
- [ ] Ensure **default** remains safe:
  - [ ] On fresh checkout, either:
    - Use `"STUB"` only, or
    - Require explicit `OBELISK_WC_MODE=DEVNET` env to talk to chain.

### 2.2 Wallet API & tab models: real path

- [ ] In `obelisk_wallet_workcredits_api.ts`:
  - [ ] Add a “real devnet” path that calls `workcredits_relayer_client` against devnet.
  - [ ] Keep the stub path for offline/CI and for no-config cases.
- [ ] In tab models:
  - [ ] `DevWorkCreditsWalletTabModel` remains pure stub.
  - [ ] Add a `RealWorkCreditsWalletTabModel` that:
    - [ ] Pulls balances from devnet (VOID + WC).
    - [ ] Uses real quote/submit for `SEND_VOID` / `SEND_WC` / `COLLECT_PENDING_WC`.
- [ ] In trading tab:
  - [ ] Add `RealWorkCreditsTradingTabModel` that:
    - [ ] Reads price/volume from either:
      - [ ] On-chain view functions, or
      - [ ] Relayer/LLP helper API.
    - [ ] Executes trades via real relayer calls.

### 2.3 Dev demos

- [ ] Extend `ops/void-wc-obelisk-wallet-all-demos.sh`:
  - [ ] Add toggles / env to run demos in:
    - [ ] STUB mode (current).
    - [ ] REAL_DEVNET mode (after bootstrap).
- [ ] Add CI-ish script:
  - [ ] `ops/void-wc-obelisk-wallet-ci-smoke.sh`:
    - [ ] Ensures devnet WC config is sane.
    - [ ] Runs a minimal quote + submit for each intent.

---

## 3. Phase WC-γ: Monitoring & SLOs

Goal: WC is first-class in the **metrics/pillars** story.

- [ ] Export Prometheus gauges for devnet & mainnet:
  - [ ] Pool reserves (VOID, WC).
  - [ ] WC price (VOID per WC).
  - [ ] 24h volume (approx).
  - [ ] Relayer health:
    - [ ] success rate
    - [ ] error counts
- [ ] Add recording rules / alerts:
  - [ ] “WC price stale” (no updates).
  - [ ] “WC relayer error rate too high”.
  - [ ] “WC pool imbalance” (one side near zero).
- [ ] Add dashboards:
  - [ ] Panels in “VOID — Command Center” or a dedicated WC dashboard.

---

## 4. Phase WC-δ: Mainnet design & seed wiring

Goal: lock the **real** economics and bootstrap flows.

- [ ] Confirm and document:
  - [ ] One-time 10M VOID seed for WC/VOID LLP from premine/Treasury.
  - [ ] How emissions / validator rewards interact with WC (if at all).
- [ ] Integrate WC into mainnet bootstrap plan:
  - [ ] `VoidMainnetBootstrapMainnet.s.sol` should:
    - [ ] Wire `WorkCreditsToken` and `UptimeVaultLLP` correctly.
    - [ ] Move initial VOID seed from `VoidTreasury` into LLP.
    - [ ] (If needed) pre-mint/lock some WC for validators/ops.
- [ ] Hook WC into mainnet pillars:
  - [ ] “WC mainnet health” gauge(s).
  - [ ] Pillar rule: mainnet not “green” unless WC stack is correctly wired and live.

---

## 5. Open Questions / Constraints

- [ ] Final authority model for **minting WC**:
  - Must be strictly controlled (RewardEngine / Treasury / Governance), **never** arbitrary.
- [ ] Guard rails for relayer:
  - Cannot steal VOID or WC.
  - Only operate within bounds of user signatures + slippage limits + LLP math.
- [ ] UX choices:
  - Default Obelisk Wallet mode for normies:
    - Likely “Gas via WC relayer” on by default, with clear toggles for:
      - direct VOID send
      - WC send
      - relayer on/off.

