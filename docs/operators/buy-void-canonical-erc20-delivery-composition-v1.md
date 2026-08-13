# Buy VOID canonical ERC-20 delivery composition v1

Marker: `VOID_BUY_VOID_CANONICAL_ERC20_DELIVERY_COMPOSITION_V1`

## Decision

The canonical Buy VOID parent runtime must align presale fulfillment with the
canonical Mainnet-0 premine asset: `VoidToken` on Chain 2050.

This source change does **not** activate fulfillment, fund a wallet, sign or
broadcast a transaction, restart a service, or move VOID.

## Evidence that required the correction

The live premine reconciliation proved that the entire current
333,333,333-VOID supply is `VoidToken` custody:

- `VoidTreasury`: 333,207,333 VOID;
- validator upgrade-track staking: 126,000 VOID;
- unreconciled current supply: 0 VOID.

The configured Buy VOID fulfillment wallet separately held about 2 native
Chain-2050 units and 0 `VoidToken`. Its native delivery limit and inventory
reservation limit were both 2 VOID in the six-decimal fulfillment-unit domain.
That is consistent with a bounded native canary, not custody of the
10,000,000-VOID presale inventory.

Repository source already contains two delivery families:

1. `buy_void_delivery_sign_broadcast_adapter_v1.ts`, which constructs an ERC-20
   `VoidToken.transfer(...)` transaction with transaction value zero; and
2. `buy_void_native_delivery_sign_broadcast_adapter_v1.ts`, which sends native
   Chain-2050 value.

Before this correction, `buy_void_runtime_integration_v1.ts` parent-mounted the
native delivery, native receipt, and native execution runtimes. It also mounted
the generic bounded orchestrator, whose default execution dependency is the
native execution runtime.

## Canonical parent composition

The canonical parent now imports the existing ERC-20
`buy_void_delivery_runtime_integration_v1.ts`.

The parent does not mount:

- native delivery runtime;
- native delivery receipt runtime;
- native execution runtime;
- bounded auto-fulfillment orchestrator runtime; or
- opaque prepared-transaction execution runtime.

Those source modules remain in the repository for focused canary, rehearsal,
reconciliation, and compatibility proofs. Removing them from the canonical
parent does not delete or silently rewrite their individual contracts.

The canonical ERC-20 delivery runtime remains:

- loopback-only;
- disabled by default;
- server-policy controlled;
- prepared-attempt bound;
- exact-confirmation gated;
- submission-guard protected;
- raw-signed-transaction non-persisting; and
- incapable of receiving caller-supplied private keys, mnemonics, signers, or
  RPC URLs.

## Deliberate funding HOLD

This change is an asset-alignment correction, not a claim that the complete
automatic presale path is ready to receive the 10,000,000-VOID inventory.

Two server-controlled bridges remain missing from the canonical automatic saga:

1. an ERC-20 transaction-preparation bridge that binds the canonical
   `VoidToken` contract, recipient, amount, nonce, and fee policy before opaque
   custody/signing; and
2. an ERC-20 receipt-reconciliation bridge that verifies the confirmed
   `VoidToken.Transfer` delivery before terminal closeout.

The existing saga preparation documentation and implementation are
native-value-specific. The existing native receipt reconciler is likewise
native-delivery-specific. Therefore the parent status reports:

- `erc20_transaction_preparation_bridge_ready: false`;
- `erc20_receipt_reconciliation_bridge_ready: false`; and
- `presale_inventory_funding_ready: false`.

The separate 2-VOID native canary limit is not widened by this change.

## Authority boundary

No live service configuration is changed here. No production environment
variable, wallet credential, private key, signer, broadcaster, transaction,
treasury balance, presale inventory balance, validator stake, BTC reserve, or
runtime process is mutated.

Funding the presale inventory remains a later separately reviewed value-bearing
gate after the ERC-20 preparation and receipt bridges are exact-green.

`PROTECT THE CORE`
