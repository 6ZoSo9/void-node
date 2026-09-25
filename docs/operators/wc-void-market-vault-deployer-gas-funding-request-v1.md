# WC/VOID vault deployer gas funding request v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_REQUEST_V1`

Status: exact request frozen, authorization pending.

This gate follows the verified deployer observation and a read-only census of
known non-default Chain-2050 EOAs.

## Deployment-side requirement

The dedicated WC/VOID vault deployer is:

```text
0x907ea7d0D57F5631219674BDF666A7e929613074
```

Its verified live observation established:

```text
pending_nonce=0
predicted_contract_address=0x210b006e39a78d02330ae648262025d8fa22e9f0
deployment_gas_estimate=1852535
proposed_deployment_gas_limit=2223042
max_fee_per_gas_wei=3000000000
required_deployer_balance_wei=6669126000000000
current_deployer_balance_wei=0
```

Therefore the deployer needs exactly the bounded maximum deployment-cost amount
before a deployment transaction can later be considered.

## Gas-source census

The corrected read-only census excluded the standard Anvil prefunded dev
account and reviewed the known non-default Chain-2050 EOAs.

Exactly one observed non-contract candidate covered the full bounded funding
liability:

```text
source=0xc884f631c3881b8b672bfcbf019c856146cd7f73
label=buy_void_fulfillment_wallet
balance_wei=2000025200000189000
pending_nonce=1
covers_max_source_liability=true
```

No source was automatically selected.

## Exact funding request

Request ID:

```text
voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148
```

Frozen proposed transaction fields:

```text
chain_id=2050
transaction_type=2
source=0xc884f631c3881b8b672bfcbf019c856146cd7f73
destination=0x907ea7d0d57F5631219674BDF666A7e929613074
source_pending_nonce=1
value_wei=6669126000000000
gas_limit=21000
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
data=0x
access_list=[]
maximum_source_liability_wei=6732126000000000
```

The maximum source liability is:

```text
value_wei + gas_limit * max_fee_per_gas_wei
= 6669126000000000 + 21000 * 3000000000
= 6732126000000000
```

## Authority expansion requiring explicit approval

The proposed source is already the production Buy VOID fulfillment wallet. Its
existing fulfillment/settlement roles do not automatically authorize sending
native gas to a deployment-only EOA.

Therefore this packet deliberately keeps:

```text
source_selected=false
native_gas_funding_authority_expansion_approved=false
unsigned_transaction_construction_authorized=false
transaction_signing_authorized=false
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
maximum_submission_attempts=0
automatic_retry=false
replacement_transaction_authorized=false
```

A repository merge alone does not grant this value-bearing authority.

## Why the unsigned transaction hash is still null

The request freezes the proposed source, destination, value, nonce, gas limit,
and fee limits, but does not yet promote the source into an authorized funding
role.

After explicit approval of this exact source/value envelope, the next gate may
construct the exact unsigned EIP-1559 transaction, compute its hash, revalidate
the live source nonce/balance and destination balance, and seek a separate
single-transaction signing/broadcast authorization.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployer_gas_funding_request_v1.mjs
```
