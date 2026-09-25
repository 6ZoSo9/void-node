# WC/VOID vault deployer gas signing authorization v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_SIGNING_AUTHORIZATION_V1`

Status: exact one-signature authorization granted; broadcast remains separately gated.

## Exact signing request

```text
signing_request_id=voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d
fresh_pre_sign_revalidation_id=voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176
signer_address=0xc884f631c3881b8b672bfcbf019c856146cd7f73
credential_id=buy-void-native-fulfillment-wallet-v1
unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9
unsigned_serialized_sha256=5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd
```

## Proposed authorization identity

If the Sovereign explicitly authorizes one fixed-credential signature of that
exact unsigned transaction, the authorization ID is:

```text
voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f
```

The ID binds:

- exact signing request ID;
- exact fresh pre-sign revalidation ID;
- signer address;
- fixed production credential ID;
- production credential-binding evidence ID;
- exact unsigned transaction hash;
- exact unsigned serialized SHA-256;
- exactly one maximum signature;
- automatic retry disabled;
- broadcast unauthorized;
- funds movement unauthorized; and
- separate broadcast authorization required.

## Canonical checked-in state

The exact signing request is explicitly authorized for one fixed-credential
signature only:

```text
status=authorized_exact_single_signature
authorization_id=voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f
authorization_source=interactive_sovereign_authorization
credential_access_authorized=true
private_key_access_authorized=true
transaction_signing_authorized=true
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
maximum_signatures=1
automatic_retry=false
separate_broadcast_authorization_required=true
```

This authorization permits one signature only. It does not authorize
broadcast or funds movement.

## Authorized signing scope

This exact authorization enables only:

```text
credential_access_authorized=true
private_key_access_authorized=true
transaction_signing_authorized=true
maximum_signatures=1
```

It must still retain:

```text
transaction_broadcast_authorized=false
chain2050_write_authorized=false
funds_movement_authorized=false
automatic_retry=false
separate_broadcast_authorization_required=true
```

The signed transaction must then be independently decoded and verified against
the exact unsigned request. A fresh pre-broadcast observation and a separate
explicit broadcast authorization are required before any raw transaction may
be submitted.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployer_gas_signing_authorization_v1.mjs
```


## Sign-once execution wrapper

The authorized branch contains:

```text
tools/void-wc-void-market-vault-deployer-gas-fixed-credential-sign-once-v1.mjs
```

The wrapper:

- validates the exact signing authorization, signing request, fresh pre-sign
  evidence, and committed unsigned transaction;
- reserves a private single-use consumption record **before** credential read;
- accepts only the fixed systemd credential
  `buy-void-native-fulfillment-wallet-v1`;
- requires the credential to derive exactly to
  `0xc884f631c3881b8b672bfcbf019c856146cd7f73`;
- signs the exact authorized type-2 transaction once;
- independently decodes the signed transaction and checks every field plus the
  unsigned hash;
- writes the signed artifact mode `0600`; and
- contains no RPC or broadcast implementation.

The output remains held for independent signed-transaction verification.
