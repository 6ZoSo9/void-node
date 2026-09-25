# WC/VOID vault deployer gas exact signing request v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1`

Status: exact signing request frozen; explicit signing authorization pending.

This gate follows the GREEN live Precision pre-sign revalidation and binds that
fresh observation to the exact already-authorized unsigned gas-funding
transaction.

## Fresh revalidation evidence

Evidence ID:

```text
voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176
```

The evidence records:

- exact #1841 source head `76016abfea30c0622d6aadc9522ff2f7dcc812cf`;
- Precision observation JSON SHA-256
  `355bfcd9cb59086a0daabdfc5c832f714f40c9394b65c0d4e4972549a2d15b77`;
- source latest/pending nonce both exactly `1`;
- source balance `2000025200000189000 wei`, sufficient for the exact
  `6732126000000000 wei` maximum liability;
- destination balance and latest/pending nonce all zero;
- no code at source or destination;
- fee caps still sufficient;
- pending nonce revalidated; and
- observation block/hash revalidated.

No credential or private-key access occurred during that observation.

## Exact signing request

Signing request ID:

```text
voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d
```

Exact unsigned transaction:

```text
chain_id=2050
source=0xc884f631c3881b8b672bfcbf019c856146cd7f73
destination=0x907ea7d0d57F5631219674BDF666A7e929613074
nonce=1
value_wei=6669126000000000
gas_limit=21000
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9
unsigned_serialized_sha256=5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd
```

## Signer credential binding

The request binds the already-proven production fulfillment-wallet credential:

```text
credential_id=buy-void-native-fulfillment-wallet-v1
signer_address=0xc884f631c3881b8b672bfcbf019c856146cd7f73
credential_binding_evidence_id_sha256=20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495
wallet_address_fingerprint_sha256=68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498
```

This request reads only repository metadata for that credential binding. It does
not open the systemd credential or construct a wallet.

## Authority boundary

The checked-in request explicitly retains:

```text
private_key_access_authorized=false
transaction_signing_authorized=false
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
broadcast_authorization_separate_required=true
```

Therefore the request itself does not permit signing.

## Next gate

The next decision can authorize **one fixed-credential signature only** for the
exact unsigned transaction hash above.

Even after signing, broadcast/funds movement remain separately gated. The signed
transaction must first be decoded and independently verified, then freshly
revalidated before a separate single-broadcast authorization can exist.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployer_gas_exact_signing_request_v1.mjs
```
