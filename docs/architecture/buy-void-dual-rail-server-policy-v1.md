# Buy VOID dual-rail server policy contract v1

Marker: `VOID_BUY_VOID_DUAL_RAIL_SERVER_POLICY_CONTRACT_V1`

Status: source-only reference contract and migration boundary. It is not mounted
into the production saga runtime.

## Purpose

The public presale is intended to accept USDC payments on exactly two source
chains:

- **Base mainnet**, EVM chain ID `8453`;
- **Ethereum mainnet**, EVM chain ID `1`.

Existing lower-level payment verification can normalize both `base` and
`ethereum`, but the current canonical saga server policy is configured through
one payment-chain environment value and emits `allowed_chains: [paymentChain]`.
That shape can configure either rail, but not both rails simultaneously.

This contract specifies and executable-proves the required successor without
modifying the frozen runtime/economic authority path.

## Complete-set rule

A public dual-rail claim is truthful only when both complete rail
configurations are valid in one policy generation.

Each rail must independently bind:

- fixed source-chain name;
- fixed EVM chain ID;
- USDC contract address;
- presale receive address;
- server-controlled RPC identity;
- finality-adapter identity;
- minimum confirmation/finality threshold; and
- the finalized reference block used by the current observation generation.

Missing or invalid configuration for either rail returns:

```text
DUAL_RAIL_POLICY_HOLD
```

The contract never silently narrows an advertised Base-and-Ethereum presale to
one rail.

## Exact environment shape

### Base mainnet

```text
VOID_BUY_VOID_DUAL_RAIL_BASE_USDC_CONTRACT
VOID_BUY_VOID_DUAL_RAIL_BASE_RECEIVE_ADDRESS
VOID_BUY_VOID_DUAL_RAIL_BASE_RPC_IDENTITY
VOID_BUY_VOID_DUAL_RAIL_BASE_FINALITY_ADAPTER_ID
VOID_BUY_VOID_DUAL_RAIL_BASE_MIN_CONFIRMATIONS
VOID_BUY_VOID_DUAL_RAIL_BASE_FINALIZED_REFERENCE_BLOCK
```

### Ethereum mainnet

```text
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_USDC_CONTRACT
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RECEIVE_ADDRESS
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_RPC_IDENTITY
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALITY_ADAPTER_ID
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_MIN_CONFIRMATIONS
VOID_BUY_VOID_DUAL_RAIL_ETHEREUM_FINALIZED_REFERENCE_BLOCK
```

The contract accepts no caller-selected third rail and always emits the
canonical order:

```text
base
ethereum
```

## Legacy single-chain migration

The current single-chain configuration names are not silently combined with the
new shape. If any of these are present, the V1 successor returns a migration
HOLD:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS
```

This prevents an operator from believing the service is dual-rail while an old
single-chain value still controls one part of the live policy.

A later runtime integration must deliberately remove or translate the legacy
shape under a reviewed migration step. This reference contract performs no
environment mutation.

## Stable policy versus live observation

The contract deliberately separates stable policy identity from dynamic chain
head/finality observations.

The stable fingerprint binds, for both rails:

- source chain and fixed chain ID;
- USDC contract;
- receive address;
- RPC identity;
- finality-adapter identity;
- minimum confirmation rule;
- canonical presale economics; and
- exact rail order.

Changing either finalized reference block does **not** change the stable policy
fingerprint. It changes the observation fingerprint.

This prevents normal chain advancement from appearing to replace the configured
payment policy while still making mixed-generation evidence detectable.

## Source-payment finality admission

`evaluateBuyVoidDualRailPaymentFinalityV1()` consumes a closed observation:

```text
source_chain
evm_chain_id
transaction_hash
log_index
receipt_block_number
observed_finalized_reference_block
confirmations_observed
finality_adapter_id
```

Admission requires:

1. the source chain is exactly Base or Ethereum;
2. the chain ID matches that rail;
3. the finality-adapter ID matches that rail;
4. the observed finalized reference equals the policy observation generation;
5. the receipt block is not above the finalized reference;
6. the stated confirmation count exactly equals
   `reference - receipt + 1`; and
7. the rail-specific minimum is met.

A Base observation cannot satisfy Ethereum policy, and an Ethereum observation
cannot satisfy Base policy.

Successful admission derives:

```text
voidpay1:<canonical-source-chain>:<transaction-hash>:<log-index>
```

Input alias `eth` canonicalizes to `ethereum`, but the emitted identity always
uses `ethereum`.

## Presale economics

The contract fixes the already reviewed economics:

- finite presale maximum: **10,000,000 VOID**;
- fixed rate: **2 VOID per 1 USDC**, equivalent to `$0.50` per VOID;
- accepted source asset: USDC;
- exact payment required;
- one payment may produce at most one fulfillment;
- no hidden minimum; and
- no hidden per-buyer throttle below remaining inventory.

The contract does not calculate or mutate remaining inventory. V510 requires
finite presale inventory and payment-keyed fulfillment uniqueness to become
Chain-2050 state before local economic history can be treated as disposable.

## Public summary

The public summary includes:

- advertised chains;
- chain IDs;
- minimum thresholds;
- stable and observation fingerprints;
- fixed presale cap/rate; and
- exact-payment/one-use policy.

It does not expose USDC addresses, receive addresses, RPC identities, or
finality-adapter identities directly. Those values remain bound by the stable
fingerprint and can be reviewed through a separately authorized configuration
surface.

## Chain-2050 and DataNet boundary

This contract proves only source-chain policy composition and deterministic
admission of an already supplied finality observation.

It does not create:

- a Chain-2050 payment-keyed fulfillment anchor;
- finite Chain-2050 presale inventory;
- a Chain-2050 DataNet content commitment;
- source-chain RPC truth;
- source-chain fork-choice or finality authority;
- DataNet byte availability; or
- delivery signing or broadcast authority.

The target end-to-end flow remains:

```text
Base/Ethereum finality adapter
        ↓
rail-isolated payment admission
        ↓
canonical payment identity
        ↓
Chain-2050 one-use fulfillment + finite inventory transition
        ↓
DataNet retrieval/repair of any referenced off-chain bytes
```

Chain-2050 is the anchor of finalized VOID-side truth where the chain actually
records the fact. DataNet owns availability of referenced bytes. Neither this
policy object nor a local receipt may override finalized chain state.

## Machine-readable artifacts

The lane contains:

- executable policy module:
  `scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs`;
- adversarial proof:
  `scripts/prove_void_buy_void_dual_rail_server_policy_contract_v1.mjs`;
- Draft 2020-12 JSON Schema:
  `schemas/buy-void-dual-rail-server-policy-v1.schema.json`;
- deterministic example fixture:
  `fixtures/economic/buy-void-dual-rail-server-policy-v1.example.json`;
- this architecture note; and
- a Node 22/24/26 focused workflow.

The fixture uses synthetic non-production addresses and identities.

## Executable proof boundary

The proof includes more than 100 distinct cases across:

- complete dual-rail configuration;
- canonical order independent of environment insertion order;
- every legacy single-chain environment variable;
- every required Base and Ethereum value missing individually;
- invalid addresses;
- invalid RPC and finality-adapter identities;
- malformed, zero, leading-zero, fractional, negative, and excessive
  confirmation thresholds;
- malformed finalized references;
- stable-field fingerprint mutation;
- dynamic-observation fingerprint separation;
- public-summary redaction;
- closed policy, rail, finality, fingerprint, summary, economics, and authority
  objects;
- Base and Ethereum positive finality admission;
- `eth` alias canonicalization;
- wrong-chain, wrong-adapter, mixed-generation, confirmation mismatch,
  insufficient-finality, malformed-hash, malformed-index, and malformed-block
  adversaries;
- cross-rail isolation;
- schema and fixture consistency;
- documentation markers; and
- immutable-action workflow topology.

## Authority boundary

This contract has:

```text
no source-chain RPC
no finality authority
no Chain-2050 mutation
no filesystem access
no credential access
no wallet access
no signer
no transaction construction
no broadcast
no inventory funding
no public presale activation
no money movement
```

It is a source/proof/schema/fixture/docs/CI prerequisite only. Runtime
integration, production configuration, credential binding, finality-adapter
execution, Chain-2050 state-transition source, inventory funding, ready/merge,
deployment, and public activation remain separate gates.
