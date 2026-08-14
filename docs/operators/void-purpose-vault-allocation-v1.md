# VOID Purpose-Vault Allocation V1

Marker: `VOID_PREMINE_PURPOSE_VAULT_TARGET_V1`

This source-only target replaces refill-driven operational funding with fully
provisioned, purpose-segregated vaults whose execution authority is narrower
than their balances. It does not treat a bare hot-wallet key as unrestricted
authority over a funded vault.

## Current reconciled custody

Canonical Chain-2050 custody was reconciled at block `37371` against retained
`VoidToken.Transfer` history and live `balanceOf(...)` state. The retained log
scan had 259 transfer events, no log errors, and matched every current live
holder.

| Current custody | VOID |
| --- | ---: |
| Core `VoidTreasury` | 333,207,333 |
| Validator upgrade-track `UpgradeStaking` | 126,000 |
| `OpsTreasury` | 0 |
| Canonical frozen `ValidatorSet` | 0 |
| `EmissionsController` | 0 |
| `RewardEngine` | 0 |
| Configured Buy VOID fulfillment wallet | 0 |
| **Total current supply reconciled** | **333,333,333** |

The former 126,000 VOID unexplained bucket is now fully reconciled. The
historical bootstrap onboarding path funded 126 validators at 1,000 VOID each
through `VoidTreasury -> OpsTreasury -> candidate -> UpgradeStaking`. The live
upgrade-track staking contract at
`0x77DFEedD19A4741f299C902AD5bBe0DE917a9e59` holds exactly 126,000 VOID and its
retained transfer history matches that live balance.

That historical 1,000-VOID bootstrap amount is not the intended Mainnet-0
validator stake target. `docs/mainnet0/VALIDATOR_POLICY.md` locks the minimum
validator self-stake at 10,000 VOID. For the existing 126 bootstrap validators,
the aggregate validator stake target is therefore 1,260,000 VOID. Relative to
the current 126,000 VOID stake, the validator allocation is 1,134,000 VOID below
that target. This document records the target delta only; it does not authorize
or select a live top-up mechanism.

Machine-readable current custody and validator target arithmetic are pinned in
`ops/mainnet/mainnet0-premine-allocation.current.json`.

## Exact target

| Custody purpose | Target VOID |
| --- | ---: |
| Core `VoidTreasury` reserve | 307,073,333 |
| `PresaleInventoryVault` | 10,000,000 |
| `BTCVoidMarketVault` | 10,000,000 |
| `OpsTreasury` | 5,000,000 |
| Validator stake target: 126 × 10,000 VOID | 1,260,000 |
| **Total premine** | **333,333,333** |

Relative to the reconciled current custody, four future target deltas remain:
10,000,000 VOID for presale inventory, 10,000,000 VOID for BTC/VOID market
inventory, 5,000,000 VOID for OpsTreasury, and 1,134,000 VOID to bring the
existing 126-validator bootstrap stake allocation from 126,000 VOID to the
10,000-VOID-per-validator policy target. The combined future target delta is
26,134,000 VOID. If and only if the exact final vaults, staking/top-up mechanism,
and authorities are separately reviewed and approved, those deltas would come
from `VoidTreasury`, leaving the target core reserve at 307,073,333 VOID.

## Historical Buy VOID owner-test and recovery accounting

Historical Buy VOID execution artifacts are chronology evidence, not additional
current custody. The retained canonical Chain-2050 state already reconciles the
entire 333,333,333 VOID supply to `VoidTreasury` plus `UpgradeStaking`.

The owner confirmed on 2026-08-14 that the two historical fulfillment episodes
were VOID operator/test canaries, not third-party customer purchases:

1. **Legacy 25 USDC / 2,500 VOID test family**
   - the Ethereum USDC payment is proven;
   - the historical 2,500-VOID delivery is proven;
   - the owner classifies the episode as `SUPERSEDED_BY_RECOVERY`;
   - current customer liability is zero; and
   - no refund or current-canonical re-delivery is due.

2. **Guarded 102.46 VOID test family**
   - the Base 25.24-USDC payment for 50.48 VOID is proven;
   - the Ethereum 25.99-USDC payment for 51.98 VOID is proven;
   - both historical VOID deliveries are proven;
   - the owner classifies the episode as `SUPERSEDED_BY_RECOVERY`;
   - current customer liability is zero; and
   - no refund or current-canonical re-delivery is due.

The deduplicated historical external-delivery amount is 2,602.46 VOID. It is
retained as cross-recovery test history only. It contributes zero VOID to the
current supply equation and reserves zero current presale capacity. No automatic
re-fulfillment is authorized or required by these historical test records.

## Fresh presale liability and capacity evidence

A read-only operator packet captured at `2026-08-14T09:35:55Z` bound the
effective Buy VOID fulfillment-wallet public address, reread Chain-2050 at block
37371, and independently reproduced the runtime sale-state calculation from the
authoritative request/operator ledgers.

The packet proved:

| Current Buy VOID accounting | Value |
| --- | ---: |
| Gross presale inventory | 10,000,000 VOID |
| Current `payment_verified` reserved inventory | 2 VOID |
| Exact remaining uncommitted inventory | 9,999,998 VOID |
| Verified/raised USDC represented by that reservation | 1 USDC |
| Sold out | false |

The runtime sale state matches the authoritative ledgers exactly. The effective
fulfillment wallet `0xc884f631c3881b8b672bfcbf019c856146cd7f73`
was bound from the public systemd environment and held 0 VOID at the fixed
snapshot. Every named balance in the packet summed exactly to the
333,333,333-VOID total supply. The historical delivery receipts are absent from
the retained current Chain-2050 RPC, consistent with their superseded recovery
classification.

The packet and owner disposition together close issue #1267's accounting-evidence
boundary. They do not authorize a reservation write, fulfillment, funding,
transaction, or any other economic mutation.

## Purpose boundaries

`PresaleInventoryVault` is the complete finite Buy VOID inventory. It may serve
only the 10,000,000 VOID, $0.50-per-VOID, buy-only presale under verified
payment, duplicate protection, exact buyer binding, append-only allocation,
and terminal fulfillment receipt rules. Current uncommitted capacity is
9,999,998 VOID at the evidence snapshot above; it must be recomputed from
authoritative live state before any later value-bearing action. It is not a
trading wallet. Formal presale closeout permanently disables new intake and
fulfillment; the presale wallet is never reused as the BTC/VOID market wallet.

`BTCVoidMarketVault` is separate post-presale native VOID inventory for exactly
one official market pair: native BTC/native Chain-2050 VOID. It has no USDC,
USDT, wrapped-BTC, fiat-oracle, bridge-custody, leverage, lending, or unsecured
credit authority. Its operating capability is limited to reviewed native
cross-chain atomic-settlement and reserve-accounting contracts.

`OpsTreasury` is the funded network-native operating reserve. It is separate
from presale inventory, market inventory, native BTC market reserves, and the
LLC's off-chain business cash. Market BTC is not automatically swept into
operations.

The validator `UpgradeStaking` allocation is stake backing for the bootstrap
validator set. The current 126,000 VOID is reconciled live custody, but the
policy target for 126 validators is 1,260,000 VOID. Neither the current stake nor
the 1,134,000 VOID target shortfall is presale inventory, market inventory, or
an operating-wallet balance, and neither may be counted as free treasury
liquidity.

The core `VoidTreasury` remains the long-term reserve and administrative source
for separately reviewed allocations. A source plan, pull request, or merge does
not activate a vault or authorize a transfer.

## Funding and activation gates

The reconciled custody snapshot above is accounting evidence, not transfer
authority. Immediately before any transfer plan is constructed, current
Chain-2050 balances must be reread and compared with
`ops/mainnet/mainnet0-premine-allocation.current.json`. Each transfer amount is
the verified target minus the verified current balance of that exact final
vault or stake bucket; an operator must not blindly resend a historical target
amount.

Validator top-up is a separate value-bearing gate. Before any validator stake
movement, the exact target validators, destination staking contract or migration
path, per-validator resulting stake, withdrawal/recovery semantics, signer
policy, and post-state proof must be reviewed. This document does not assume
that sending 1,134,000 VOID directly to the current `UpgradeStaking` contract is
the correct implementation.

Funding becomes eligible only after the final vault identity, Chain-2050
binding, bytecode or implementation digest, signer policy, recovery path, and
execution restrictions are reviewed. A negligible canary transfer must produce
the expected post-state and receipt. After those gates pass, each vault is fully
funded to its verified target delta in one controlled funding event rather than
through a refill-driven operating schedule.

Funding does not activate use. Presale inventory remains unusable until Buy VOID
activation. BTC/VOID market inventory remains unusable until the presale is
formally closed, Buy VOID intake is permanently retired, and the market runtime
is separately approved. OpsTreasury use remains limited to separately approved
operating expenses. A funded balance is not authority for an operational signer
to invent another purpose.

## Authority boundary

No wallet, signer, transaction, treasury transfer, validator top-up, or fund
movement is authorized by this document. No reservation write or automatic
re-fulfillment is authorized either. Contract deployment, address binding,
signer policy, bytecode review, transaction construction, signing, broadcast,
and post-state evidence remain separate gates under ZoSo's explicit authority.

`PROTECT THE CORE`.
