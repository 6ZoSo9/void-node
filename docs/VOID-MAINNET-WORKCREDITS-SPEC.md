# VOID Mainnet — WorkCredits (WC) Spec

This is the canonical high-level spec for WorkCredits (WC) on VOID mainnet.
Code, configs, and monitoring should line up with this document.

---

## 1. Roles

- **VOID**: scarce governance + staking token with fixed max supply and emissions.
- **WorkCredits (WC)**: flexible, earnable credits for useful work:
  - Validator / node work
  - Relayer / agent / job-queue work
  - Future: AI jobs, NullFeed infra, data jobs, etc.

VOID is the scarce asset. WC is the work unit. WC is minted by protocol logic,
not pre-mined like VOID.

---

## 2. On-chain pieces

### 2.1 WorkCreditsToken

- ERC20, 18 decimals.
- Name: "Work Credits".
- Symbol: "WC".
- Mint/burn controlled only by protocol contracts (RewardEngine or a dedicated
  minter). No random EOA mints.
- WC total supply is determined by work emissions, not by a fixed cap.

### 2.2 WorkCreditsPoolV1 (WC/VOID AMM)

- Dedicated AMM pool between VOID and WC.
- Holds:
  - reserveVOID
  - reserveWC
- Used for:
  - Swapping WC -> VOID (workers realizing value).
  - Swapping VOID -> WC (users buying credits up front).
- Swap fees can be partially routed back to VoidTreasury / OpsTreasury.

### 2.3 Treasury / Ops / RewardEngine

- VoidTreasury holds the premine VOID (as per mainnet tokenomics).
- OpsTreasury is the operational bucket for rewards and funding.
- RewardEngine:
  - Mints WC to workers according to emission rules.
  - May coordinate with the pool for incentives, but cannot mint VOID.

One-time rule:

- A single 10,000,000 VOID seed is used to fund the WC/VOID pool.
- That seed comes from Treasury and/or OpsTreasury.
- The pool receives VOID and a matching WC amount; this sets the initial price.
- VOID is never "printed", only moved from existing holdings.

---

## 3. Mainnet config + monitoring

### 3.1 Live config JSON

File: config/void-mainnet-workcredits.live.json

Fields:

- chainId: must be 2050 on mainnet.
- workCreditsToken: mainnet WorkCreditsToken address (non-zero).
- workCreditsPool: mainnet WorkCreditsPoolV1 address (non-zero).

While either address is zero:

- The WorkCredits pillar is considered a stub.
- Monitoring should show "not healthy yet" for this pillar.

### 3.2 Textfile exporter

Script: ops/void-mainnet-workcredits-exporter.sh

It sets gauges:

- void_mainnet_workcredits_spec_present
- void_mainnet_workcredits_spec_nonempty
- void_mainnet_workcredits_health

Rules:

- spec_present = 1 if the JSON config file exists.
- spec_nonempty = 1 if both addresses are non-zero.
- health = 1 only if spec_present = 1 and spec_nonempty = 1.

Prometheus recording rule:

- void:mainnet_workcredits:health:last_5m is a 5-minute view of the health
  gauge, used for dashboards and future gates.

Current expected state before WC is deployed:

- spec_present = 1
- spec_nonempty = 0
- health = 0
- void:mainnet_workcredits:health:last_5m = 0

Once WC is deployed and config is updated:

- spec_present = 1
- spec_nonempty = 1
- health = 1
- 5m view eventually becomes 1.

---

## 4. Invariants (to be enforced later)

Config invariants:

- chainId must equal 2050.
- workCreditsToken and workCreditsPool must be non-zero and have code.
- Addresses must match what bootstrap / plan scripts expect.

Token invariants:

- decimals() == 18.
- Mint/burn rights belong only to protocol contracts or gate-controlled owners.
- No arbitrary EOA with unlimited mint power.

Pool invariants:

- After seeding, reserveVOID > 0 and reserveWC > 0.
- Exactly 10,000,000 VOID is used as the initial seed.
- Pool accounting shows those reserves actually held by the pool.
- Swaps respect the chosen AMM invariant.

Monitoring invariants (future):

- void_mainnet_workcredits_health == 1 when config and on-chain state match.
- Additional exporters can later check:
  - Pool reserves above zero.
  - Price sanity.
  - No obvious stuck state.

---

## 5. Obelisk / UI expectations (short)

Obelisk Wallet must treat WC as first-class:

- Wallet:
  - Show balances for VOID and WC.
  - Toggle relayer on/off.
  - Button: "Collect pending WC" (claims from RewardEngine / jobs).

- Trading View:
  - WC/VOID price view.
  - Simple swap form (VOID <-> WC via WorkCreditsPoolV1).
  - Show fee and rough slippage.

- Other tabs (NullFeed, NFTs, Dashboard) may use WC for:
  - AI/agent jobs
  - Future NFTs / avatars
  - Channel / feature upgrades

Detailed UI flows will live in separate Obelisk/NullFeed docs; this file is the
on-chain spec the UI depends on.

---

## 6. Status

Right now:

- Config JSON exists but uses zero addresses (stub).
- Exporter and health-all script are wired.
- Prometheus shows void:mainnet_workcredits:health:last_5m = 0.

Later:

- Deploy WorkCreditsToken + WorkCreditsPoolV1 on devnet.
- Design and test the 10M VOID seed and AMM behavior.
- Deploy real WC contracts on mainnet and update the live JSON.
- Only then consider gating pillars on the WorkCredits health signals.
