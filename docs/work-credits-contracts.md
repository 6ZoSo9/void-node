# VOID Work Credits — Contracts (PLAN)

This document sketches the on-chain contracts for Work Credits (WC).
It is a PLAN-only design stub and does **not** imply any deployed code yet.

## Components overview

This section describes the intended contracts for Work Credits (WC) on VOID
mainnet. Nothing here is live yet; this is the design target for future work.

High-level goals:

- WC is earned by doing objectively valuable work for the network.
- VOID is the hard asset; WC is the “work layer” that can be converted to
  value (via VOID, NFTs, perks, etc.).
- A 10M VOID seed (as documented in `docs/work-credits-plan.md`) backs the
  initial WC plumbing via:
  - UptimeVault LLP (LLP) pool,
  - Relayer funding pool / budgets.

### Components

Planned on-chain components (names may change slightly when implemented):

1. **WorkCreditsToken** (ERC20-like token)
   - Symbol: `WC`
   - Purpose: represent work credits earned by:
     - Validators / uptime work,
     - Relayers / job execution,
     - Possibly other agent-based jobs in JobQueue.
   - Expected properties:
     - Mintable only by a trusted controller:
       - Either `RewardEngine`, or
       - A dedicated `WorkCreditsController` governed by `AdminGate`.
     - Burnable:
       - For spending in marketplaces (NFT avatars, NullFeed perks, etc.).
     - Transferability: **TBD** (design decision):
       - Option A: freely transferable (easier UX, more “token-like”).
       - Option B: partially restricted (e.g., non-transferable except via
         specific AMM/auction contracts).
   - Governance:
     - Mint/burn roles wired through `AdminGate` + `UpdateGate` so we can
       rotate controllers and enforce rate limits.

2. **UptimeVaultLLP** (LLP / seed VOID vault)

   - Holds the **9.8M VOID** LLP seed from the 10M plan.
   - Tracks “shares” representing:
     - Pro-rata claims on VOID backing,
     - Or indirect entitlement to WC emissions.
   - Expected behavior (PLAN):
     - Admin/owner configured via `lpTreasury` role and guarded by `AdminGate`.
     - Exposes methods to:
       - Fund the vault with VOID (initial 9.8M seed).
       - Optionally rebalance / top-up from `VoidTreasury` or `OpsTreasury`
         via governance.
     - Does *not* directly mint WC. Instead:
       - Acts as backing / accounting input to the WC controller.
       - May expose view functions used by off-chain schedulers to compute
         safe emission budgets.

3. **RelayerRegistry / RelayerVault**

   - Manages relayer identities and their funding for Work Credits-related work.
   - Uses the **200k VOID** relayer seed from the 10M plan.
   - Responsibilities:
     - Maintain a registry of approved relayers (by `relayerAdmin` role).
     - Track per-relayer:
       - VOID budget (for gas/subsidies),
       - WC earnings (via the controller / RewardEngine wiring).
     - Expose hooks for:
       - JobQueue / scheduler to mark completed work and trigger WC minting.
       - Potential slashing / penalties (future, PLAN only).
   - Governance:
     - `relayerAdmin` is controlled via roles mapping on `/mnt/voidkey` and
       ultimately by `AdminGate`/`UpdateGate`.
     - Add/remove relayers is a governed operation.

4. **WorkCreditsController** (optional, depending on how we wire RewardEngine)

   - Thin controller that sits between:
     - `RewardEngine` / JobQueue / schedulers, and
     - `WorkCreditsToken`, `UptimeVaultLLP`, and `RelayerRegistry`.
   - Responsibilities:
     - Implement policy for:
       - How many WC to mint for a given unit of work.
       - How LLP backing and relayer budgets constrain emissions.
     - Enforce:
       - Global WC emission caps (per era, per epoch).
       - Role checks and rate limiting.
   - Governance:
     - Owned by `wcGovernance` (mapped via `/mnt/voidkey`).
     - Upgradable/configurable via `AdminGate` + `UpdateGate`.

### Interactions with existing mainnet contracts

1. **RewardEngine**
   - Today: handles VOID emissions to validators based on stake/epochs.
   - PLAN: optionally extended or paralleled to:
     - Call into `WorkCreditsController` to mint WC when:
       - A validator produces valid blocks,
       - A relayer successfully processes jobs,
       - Other chain-level work is proven and recorded.

2. **VoidTreasury / OpsTreasury**
   - Provide:
     - Initial 10M VOID seed for WC plumbing (LLP + relayers).
     - Future top-ups for LLP/relayer pools via governance decisions.
   - Must *never* be directly callable by random contracts:
     - All flows go through governed, allowlisted contracts
       (UptimeVaultLLP, RelayerVault, WorkCreditsController).

3. **JobQueue / agents (future work)**
   - PLAN: introduce job receipts and metrics so agents that complete
     on-chain/off-chain jobs can earn WC as part of a unified system.
   - This will plug into `WorkCreditsController` via:
     - Verified receipts,
     - Emission policies, and
     - Safety checks enforced by `AdminGate`/`UpdateGate`.

### Security & invariants (PLAN)

Key invariants we want for the WC system:

- **I1**: Only governed controllers can mint/burn WC.
- **I2**: WC emission rates are bounded and auditable.
- **I3**: LLP VOID backing is transparent and trackable via events + Prometheus.
- **I4**: Relayer funding is never a blind faucet; every VOID/WC outflow is tied
  to recorded work or explicit governance decisions.
- **I5**: No single hot wallet can drain WC/VOID without going through the
  gates/treasuries + AdminGate policies.

These invariants will be enforced via:

- `AdminGate` / `UpdateGate` / `ConfigGate` wiring,
- Role mappings on `/mnt/voidkey`,
- Prometheus metrics + alerts (WC emissions, LLP balances, relayer budgets),
- Test suites in Foundry that assert invariants across eras.

### Status

- Contracts described here do **not** exist in the repo yet.
- `config/void-mainnet-bootstrap-mainnet.live.json` currently has:
  - WC-related roles and relayers set to `0x000...` (PLAN-only, no keys wired).
  - No `.contracts.*` entries for WC yet.
- Any future implementation MUST:
  - Keep `forge build` green at all times,
  - Only wire real addresses into LIVE JSON after:
    - Mainnet key ceremony is done, and
    - PLAN scripts + Prometheus pillars show green for at least 5m.

