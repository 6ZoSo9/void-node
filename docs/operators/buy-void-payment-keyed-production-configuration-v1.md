# Buy VOID payment-keyed production activation configuration v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1`

Status: source-only activation contract and pure candidate verifier. No runtime
enablement, deployment, funding, credential access, RPC, signing, broadcast, or
public activation is performed.

## Why this gate exists

The payment-keyed Buy VOID source path is now complete and mounted as a dormant
operator child runtime, but source completeness is not production activation.

Four independent conditions remain:

1. production payment-keyed configuration values must be verified;
2. the exact Chain-2050 fulfillment-contract deployment must be attested;
3. the canonical predecessor lineage must be attested; and
4. presale VOID inventory funding must be separately authorized and proved.

None of those conditions substitutes for another.

## Candidate configuration verification

The pure verifier accepts an explicit candidate record only. It never reads
`process.env`.

The candidate must keep both payment-keyed runtime gates disabled:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
```

This means candidate verification cannot accidentally activate signing,
broadcast, receipt mutation, inventory consumption, or public closeout.

The candidate binds:

- runtime root directory;
- Chain-2050 loopback RPC;
- fulfillment-contract address shape;
- fulfillment wallet;
- reviewed VOID token address;
- gas and EIP-1559 fee bounds;
- receipt confirmation floor;
- canonical presale pool/economics;
- fixed credential-binding evidence ID; and
- systemd credential directory path.

The configured fulfillment wallet must exactly match the existing canonical
credential-binding evidence.

## Canonical presale economics

The verifier requires the existing canonical economics:

```text
pool_id=buy-void-presale-v1
inventory_policy_version=presale-v1
pool_capacity_void_units=10000000000000
max_reservation_void_units=10000000000000
rate_void_units_numerator=2
rate_void_units_denominator=1
```

The 6-decimal fulfillment-unit cap corresponds exactly to:

```text
10,000,000 VOID
10000000000000000000000000 token atoms
```

No lower public activation cap is accepted by this production candidate gate.

## Candidate verifier limitations

A candidate contract address is checked only as a nonzero address distinct from
the wallet and VOID token.

That is intentionally insufficient for activation.

A GREEN candidate therefore reports:

```text
fulfillment_contract_address_shape_verified_only=true
fulfillment_contract_deployment_attested=false
predecessor_lineage_attested=false
inventory_funding_verified=false
runtime_activation_authorized=false
public_activation_authorized=false
```

The next gate is exact deployment and lineage attestation.

## Deployment attestation requirements

The deployment gate must establish the exact Chain-2050
`BuyVoidPresaleFulfillmentV1` instance, including:

- contract address;
- creation-code identity;
- runtime-code identity;
- canonical VOID token address;
- canonical fulfiller wallet;
- canonical predecessor address;
- predecessor lineage;
- predecessor VOID-token equality;
- predecessor max-inventory equality;
- predecessor fulfilled total not exceeding the lifetime cap;
- `maxInventoryAtoms = 10,000,000 VOID`;
- `voidToken()` result;
- `totalFulfilledAtoms()` result; and
- `remainingInventoryAtoms()` result.

The contract source alone is not deployment proof.

## Funding remains separate

Even after deployment attestation, this contract keeps:

```text
presale_inventory_funding_ready=false
inventory_funding_verified=false
```

Funding requires separate authorization and evidence. No verifier in this lane
moves tokens or authorizes treasury action.

## Activation boundary

A production activation decision must eventually combine:

- verified dormant production configuration;
- canonical dual-rail source-payment policy;
- authenticated source finality;
- exact Chain-2050 fulfillment deployment attestation;
- exact predecessor lineage;
- canonical credential binding;
- confirmed inventory funding;
- coupled presale/WC native-gas reservation journal integration;
- one cross-lane nonce scheduler for the shared fulfillment/settlement EOA;
- explicit resolution of the public VOID-chain/private EVM execution-layer
  relationship;
- independent public verification of `VoidToken` balances, receipts, code, and
  finalized state;
- reviewed participant control and transfer-submission for delivered
  `VoidToken`;
- a participant native-gas acquisition or paymaster/executor model;
- defined native-gas currency supply/replenishment accounting;
- an explicit public micro-purchase gas-grief policy, using a disclosed minimum,
  batching/amortization, user-paid gas, or another bounded mechanism;
- payment-instruction/reservation TTL plus per-identity/global outstanding caps;
- deterministic reconciliation for source-chain payments observed after
  instruction expiry;
- fresh Chain-2050 fee-cap sufficiency at payment admission;
- terminal-receipt-finality-controlled gas-reservation release;
- full-presale native-gas capacity or a separately reviewed replenishment
  mechanism;
- a paid-but-unreservable customer-resolution/refund policy whose source-chain
  fees are separate from Chain-2050 gas;
- child runtime enable authorization;
- child apply enable authorization; and
- explicit public activation authorization.

Before activation, durable payment history must also reconcile against the
current payment-keyed identity tuple. The read-only source gate is
`src/economic/buy_void_payment_keyed_history_reconciliation_v1.ts`; it binds
fulfillment intents, inventory reservations, paid-unreservable obligations,
execution attempts, and saga-binding inputs without creating runtime authority.

The activation contract also names the current dormant production candidate and
the accepted production activation evidence artifact as prerequisite source
truth. Those references do not convert historical evidence into live activation
authority.

Until those later gates are independently GREEN, the payment-keyed runtime
remains mounted but disabled.

The configured `VoidToken` delivery inventory and the fulfiller's native
Chain-2050 gas balance are separate assets. No production document or runtime
may treat retained `VoidToken`, protocol fees, or remaining sale inventory as
automatic native-gas replenishment.
