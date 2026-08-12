# VOID Purpose-Vault Allocation V1

Marker: `VOID_PREMINE_PURPOSE_VAULT_TARGET_V1`

This source-only target replaces refill-driven operational funding with fully
provisioned, purpose-segregated vaults whose execution authority is narrower
than their balances. It does not treat a bare hot-wallet key as unrestricted
authority over a funded vault.

## Exact target

| Custody purpose | Target VOID |
| --- | ---: |
| Core `VoidTreasury` reserve | 308,207,333 |
| `PresaleInventoryVault` | 10,000,000 |
| `BTCVoidMarketVault` | 10,000,000 |
| `OpsTreasury` | 5,000,000 |
| Previously distributed or still-unreconciled balance | 126,000 |
| **Total premine** | **333,333,333** |

The transition basis is the last repository-verified snapshot of 332,207,333
VOID in `VoidTreasury` and 1,000,000 VOID in `OpsTreasury`. Reaching the target
would require three separately reviewed movements: 10,000,000 VOID to the
presale inventory vault, 10,000,000 VOID to the BTC/VOID market vault, and a
4,000,000 VOID OpsTreasury top-up. The resulting core balance would be
308,207,333 VOID. The existing 126,000 VOID difference must be reconciled before
any live transfer plan is eligible for approval.

## Purpose boundaries

`PresaleInventoryVault` is the complete finite Buy VOID inventory. It may serve
only the 10,000,000 VOID, $0.50-per-VOID, buy-only presale under verified
payment, duplicate protection, exact buyer binding, append-only allocation,
and terminal fulfillment receipt rules. It is not a trading wallet. Formal
presale closeout permanently disables new intake and fulfillment; the presale
wallet is never reused as the BTC/VOID market wallet.

`BTCVoidMarketVault` is separate post-presale native VOID inventory for exactly
one official market pair: native BTC/native Chain-2050 VOID. It has no USDC,
USDT, wrapped-BTC, fiat-oracle, bridge-custody, leverage, lending, or unsecured
credit authority. Its operating capability is limited to reviewed native
cross-chain atomic-settlement and reserve-accounting contracts.

`OpsTreasury` is the funded network-native operating reserve. It is separate
from presale inventory, market inventory, native BTC market reserves, and the
LLC's off-chain business cash. Market BTC is not automatically swept into
operations.

The core `VoidTreasury` remains the long-term reserve and administrative source
for separately reviewed allocations. A source plan, pull request, or merge does
not activate a vault or authorize a transfer.

## Funding and activation gates

The snapshot above is a transition basis, not live balance evidence. Immediately
before any transfer plan is constructed, current Chain-2050 balances must be
reconciled and the unexplained 126,000 VOID difference must be resolved. Each
transfer amount is the verified target minus the verified current balance of
that exact final vault; an operator must not blindly resend the historical
target amount.

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

No wallet, signer, transaction, treasury transfer, or fund movement is authorized
by this document. Contract deployment, address binding, signer policy, bytecode
review, transaction construction, signing, broadcast, and post-state evidence
remain separate gates under ZoSo's explicit authority.

`PROTECT THE CORE`.
