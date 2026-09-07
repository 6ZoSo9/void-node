# Buy VOID SourceFinalityAuthorityV2 candidate

## Purpose

This source-only successor closes the policy-generation mismatch between the reviewed dual-rail reference in #1463 and the dynamic finalized-block observation in #1471.

The old V1 composition carries `finalized_reference_block` inside the admitted policy generation and rejects a later observation when the live finalized height differs. A real Base/Ethereum finalized head moves over time, so that shape would force policy churn merely because finality advanced.

`SourceFinalityAuthorityV2` separates stable policy from dynamic observation.

## Exact stack

This lane is stacked on the synchronized #1471 generation:

- repository `main`: `0cb5832f88eab7c9a1678328e546f2a307b71530`
- #1463 reviewed reference: `35ce04e34320be7ab5f7773066de7c6c6384b034`
- #1469 reviewed handoff: `16a269d3e1b0fba4635232cbb07905a9d1d2b451`
- #1470 reviewed hash-bound handoff: `b8962bec5480f214ffeaf4053bdfa45bf0e9c466`
- #1471 exact stacked base: `036c34a479d8dacbfd663fcb610adabbd0008428`

The new layer consumes one successful #1471 observation object. It does not accept a separately caller-composed payment object plus finality object.

## Stable policy

The dual-rail stable policy contains only:

- source chain and EVM chain ID;
- exact USDC contract;
- exact receive address;
- RPC identity;
- normalized RPC URL SHA-256 fingerprint;
- finality-adapter identity;
- minimum finality confirmations; and
- canonical presale economics.

It contains **no** `finalized_reference_block` and no finalized-reference hash.

Base and Ethereum RPC identities must be distinct. Their finality-adapter identities must also be distinct.

The stable policy digest therefore does not change merely because the finalized head advances.

## Dynamic observation

A successful #1471 observation contributes the moving facts:

- exact payment transaction and u32 log index;
- canonical payment identity and payment key;
- payer, receive/delivery addresses, USDC contract and exact amount;
- receipt block number and exact receipt-block hash;
- current finalized-reference number and exact hash;
- finalized-depth confirmation count;
- RPC identity and RPC URL fingerprint;
- finality-adapter identity;
- same-provider consistency evidence; and
- exact upstream source-generation pins.

The observation digest and the V2 finality-attestation digest change when the finalized-reference number/hash changes. The stable policy digest does not.

This removes the `payment_mixed_policy_observation_generation` architecture seam without weakening the observed hash binding.

## Current authority boundary

This candidate intentionally does **not** claim production source-finality authority yet.

The #1471 generation being consumed proves same-provider consistency and exact receipt/finalized hash binding, but V515 still identifies production gates not yet closed by that source. Every successful V2 candidate therefore carries hard false constants:

```text
authenticated_transport_identity_verified=false
total_operation_deadline_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

These are not caller-controlled booleans.

A later source-only successor must close authenticated transport provenance and the one-total-operation-deadline requirement before this object can become production source-finality authority. Ancestry/provider-quorum policy remains separately reviewed according to the selected production finality threat model.

## Economic boundary

The candidate preserves the canonical presale economics:

```text
inventory = 10,000,000 VOID
rate = 2 VOID / 1 USDC
price = $0.50 / VOID
exact payment required
no hidden minimum
no hidden per-buyer throttle below remaining inventory
one payment may not be reused
```

It does not reserve inventory, mutate Chain-2050, access a wallet or signer, construct/sign/broadcast a transaction, activate the presale, or move funds.

## DataNet boundary

This source-finality lane adds no DataNet dependency. Finalized source-payment truth and DataNet byte availability remain separate planes under the governing V510/V515 architecture.

## Verification contract

The focused proof covers:

- Base and Ethereum success;
- closed stable-policy rail order and economics;
- rejection of finalized-reference height/hash inside stable policy;
- dynamic finalized-reference movement without stable-policy churn;
- exact USDC/payment/address binding;
- transaction/log/receipt binding;
- receipt/finalized block-hash binding;
- RPC identity/fingerprint and finality-adapter binding;
- confirmation recomputation and threshold enforcement;
- u32 log-index admission;
- canonical payment-key determinism; and
- explicit negative authority for all unclosed V515 gates.

Publication and CI execute no live Base/Ethereum RPC.
