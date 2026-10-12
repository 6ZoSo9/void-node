# Buy VOID fulfillment deployment attestation v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1`

Status: source-only deployment attestation verifier plus a loopback, read-only
Chain-2050 observer. This lane performs no deployment, signing, broadcast,
inventory funding, runtime enablement, or public activation.

## Source prerequisites

The gate requires the accepted compiler identity:

```text
identity_id=voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566
artifact=ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json
```

The compiler identity contains the exact creation bytecode, unpatched runtime
template, and compiler-derived immutable reference locations for:

- `token`;
- `fulfiller`; and
- `predecessor`.

## Exact creation transaction proof

A deployment observation is accepted only if the observed Chain-2050 creation
transaction input is exactly:

```text
accepted creation bytecode
+
ABI.encode(void_token, fulfiller, predecessor)
```

The transaction must:

- be on Chain 2050;
- have `to = null` / contract creation;
- have zero native value;
- match the supplied deployment transaction hash; and
- derive the observed contract address from the exact deployer + nonce through
  the Ethereum CREATE-address rule.

The successful receipt must bind the same transaction hash and contract
address.

## Exact deployed runtime proof

The verifier copies the accepted unpatched runtime template and patches every
compiler-derived immutable reference with the exact 32-byte ABI word for its
address.

It then requires byte-for-byte equality with observed `eth_getCode`.

The verifier also recomputes SHA-256 and Ethereum Keccak-256 over the observed
runtime instead of trusting declared code hashes.

## Contract view proof

At one fixed observation block the observer reads:

```text
voidToken()
fulfiller()
predecessor()
maxInventoryAtoms()
totalFulfilledAtoms()
remainingInventoryAtoms()
```

The attestation requires:

- `voidToken()` equals the verified production candidate token;
- `fulfiller()` equals the canonical credential-bound fulfillment wallet;
- `predecessor()` equals the accepted predecessor policy;
- `maxInventoryAtoms() = 10,000,000 × 10^18`;
- `totalFulfilledAtoms() <= maxInventoryAtoms`; and
- `totalFulfilledAtoms() + remainingInventoryAtoms() = maxInventoryAtoms`.

## Finality / reorg boundary

The observer first reads one current Chain-2050 block number and its block hash.
All code and view calls are pinned to that exact block tag.

After all calls it re-reads:

- the exact observation block; and
- the deployment receipt.

The block hash and deployment receipt block binding must be unchanged.

The deployment receipt must also satisfy the production candidate's minimum
confirmation count.

## Read-only RPC authority

The observer allows only:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getTransactionByHash
eth_getTransactionReceipt
eth_getCode
eth_call
```

The RPC URL must be loopback HTTP.

The observer contains no send/sign/unlock/admin/debug RPC authority.

## Production candidate binding

The production wrapper first runs the already-merged payment-keyed production
configuration verifier.

Only a GREEN candidate with both runtime gates still disabled may drive the
observer:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
```

The observer derives its contract, VOID token, fulfillment wallet, RPC endpoint,
and minimum confirmation policy from that verified candidate. This prevents an
ad-hoc operator policy from attesting an arbitrary deployment.

## Predecessor policy

Version 1 accepts only a genesis fulfillment contract:

```text
predecessor=0x0000000000000000000000000000000000000000
```

This is deliberate.

The repository currently has no separately accepted predecessor compiler/deploy
identity. A nonzero predecessor therefore holds at:

```text
deployment_attestation_nonzero_predecessor_identity_not_accepted_v1
```

rather than trusting an arbitrary historical contract merely because it answers
the expected interface.

A future successor deployment must first accept and bind the predecessor
identity/lineage explicitly.

## Successful boundary

A successful v1 attestation means:

```text
production_configuration_verified=true
deployment_attested=true
predecessor_lineage_attested=true
genesis_predecessor=true
inventory_funding_verified=false
runtime_activation_authorized=false
public_activation_authorized=false
```

It does not prove that the fulfillment contract holds any VOID.

## Current activation truth

This PR advances only source-readiness truth:

- compiled fulfillment identity accepted;
- deployment attestation verifier source ready;
- read-only observer source ready; and
- production candidate binding source ready.

The activation contract still keeps:

```text
production_payment_keyed_configuration_verified=false
deployment_attestation_verified=false
inventory_funding_verified=false
payment_keyed_runtime_activation_ready=false
public_buy_void_activation_ready=false
```

The current parent blocker therefore remains actual production configuration
verification.

After a real dormant production candidate is captured and verified, the same
candidate can be used for the read-only Chain-2050 attestation.

## Next successful-live gate

After an exact live deployment attestation is GREEN, the next separate gate is
presale inventory funding attestation and explicit activation authorization.

No funds movement authority is introduced here.
