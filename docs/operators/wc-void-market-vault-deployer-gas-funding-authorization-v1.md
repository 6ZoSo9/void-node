# WC/VOID vault deployer gas funding authorization v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_AUTHORIZATION_V1`

Status: exact source-selection and unsigned-construction authorization granted; signing/broadcast remain separately gated.

This gate exists after the exact funding request has been frozen and before any
private-key access, signing, broadcast, Chain-2050 mutation, or funds movement.

## Exact request

Funding request:

```text
voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148
```

Exact proposed scope:

```text
chain_id=2050
source=0xc884f631c3881b8b672bfcbf019c856146cd7f73
destination=0x907ea7d0d57f5631219674BDF666A7e929613074
nonce=1
value_wei=6669126000000000
gas_limit=21000
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
maximum_source_liability_wei=6732126000000000
```

The standard Anvil prefunded development account is not used.

## Proposed authorization identity

If the exact request above is explicitly approved, the content-addressed
authorization ID will be:

```text
voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392
```

That ID binds:

- the exact funding request ID;
- source and destination;
- value;
- source nonce;
- transfer gas limit;
- EIP-1559 fee caps;
- maximum source liability;
- one maximum submission attempt;
- automatic retry disabled;
- replacement transaction disabled; and
- unrelated funds movement disabled.

## Canonical checked-in state

The exact request has now been explicitly authorized for source selection and
unsigned transaction construction only:

```text
status=authorized_exact_single_funding_transaction
authorization_id=voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392
authorization_source=interactive_sovereign_authorization
source_selection_authorized=true
native_gas_funding_authority_expansion_authorized=true
unsigned_transaction_construction_authorized=true
transaction_signing_authorized=false
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
maximum_submission_attempts=1
automatic_retry=false
replacement_transaction_authorized=false
```

This authorization does not access a private key and does not move funds.

## Exact authority granted

This exact authorization enables only:

1. selection of the reviewed Buy VOID fulfillment wallet as the one funding
   source for this request;
2. expansion of that wallet's authority to send this exact native-gas amount to
   the dedicated WC/VOID vault deployer;
3. construction of the exact unsigned EIP-1559 transfer; and
4. one later submission attempt, but only after a separate signing/broadcast
   authorization.

It does **not** by itself authorize private-key access, signing, broadcast,
Chain-2050 write, or funds movement.

## Unsigned transaction construction

The source tool now constructs the exact unsigned funding transaction because
the canonical authorization validates the exact content-addressed authorization
ID.

The resulting artifact still retains:

```text
private_key_access_authorized=false
transaction_signing_authorized=false
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
automatic_retry=false
replacement_transaction_authorized=false
maximum_submission_attempts=1
```

## Required execution before signing

Before any signing request can be considered, the source wallet and destination
must be re-observed on Chain-2050 to prove:

- source pending nonce is still exactly `1`;
- source balance still covers the maximum liability;
- destination balance has not already received the requested funding;
- fee conditions remain within the authorized caps; and
- the unsigned transaction hash matches the exact authorized request.

A separate exact signing/broadcast authorization is then required.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployer_gas_funding_authorization_v1.mjs
```
