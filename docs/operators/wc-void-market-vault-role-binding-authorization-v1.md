# WC/VOID market vault role-binding authorization v1

Marker: `VOID_WC_VOID_MARKET_VAULT_ROLE_BINDING_AUTHORIZATION_V1`

Status: exact role-binding authorization only.

This artifact records the Sovereign's explicit approval of the three reviewed
`WCVoidMarketVaultV2` constructor roles and the already-canonical coupled
launch ID. It does not authorize deployment or any value-bearing action.

## Authorized bindings

```text
void_token            = 0x470075b85352eb86f7d089fb9ba88945f12aad94
launch_controller     = 0x2f1e0005e865b772b268bd8c797bf3eaa901d97e
settlement_executor   = 0xc884f631c3881b8b672bfcbf019c856146cd7f73
closeout_controller   = 0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b
coupled_launch_id     = 0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
```

Authorization ID:

```text
voidwcvra1_8bd7a5dbb1f27b61fd236ee0588c1271cb86e719a7de8db0465a6070831b8b36
```

The ID is SHA-256 over canonical JSON for the authorization body with the ID
field omitted.

## Evidence

The authorization is bound to:

- the reviewed role proposal at exact source head
  `61b4057094bc181378656146e9c55753bb375c88`;
- fresh offline Nimo generation evidence for the dedicated launch controller;
- the existing production Buy VOID fulfillment-wallet credential binding for
  the settlement executor;
- current Chain-2050 Sovereign owner evidence for the closeout controller; and
- the accepted `WCVoidMarketVaultV2` compiled/deployment-preparation stack.

The original proposal remains a proposal artifact. This separate authorization
record is what promotes the three exact role bindings.

## Authorized authority expansion

The following are explicitly authorized:

```text
role_binding_authorized=true
launch_controller_role_authorized=true
settlement_executor_wc_void_authority_expansion_authorized=true
closeout_controller_wc_void_authority_expansion_authorized=true
```

The settlement executor's existing Buy VOID fulfillment authority is therefore
explicitly extended to WC/VOID market settlement for this vault role.

The Sovereign owner's existing authority is explicitly extended to the
WC/VOID terminal closeout-controller role.

## Not authorized

This authorization does **not** grant:

```text
deployment_authorized=false
deployer_selection_authorized=false
nonce_or_fee_observation_authorized=false
unsigned_transaction_construction_authorized=false
transaction_signing_authorized=false
transaction_broadcast_authorized=false
chain2050_write_authorized=false
inventory_funding_authorized=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

The fresh launch-controller private key remains offline on Nimo and is not
copied into the repository or Precision.

## Deployment preparation effect

The canonical deployment-preparation record now contains all five constructor
bindings and can deterministically produce the exact deployment data.

It remains held on:

- deployer selection;
- pending nonce observation;
- fee/gas observation;
- predicted contract address;
- unsigned EIP-1559 transaction review; and
- a later explicit deployment authorization.

## Production readiness effect

`market_vault_final_role_bindings_attested=true` is accepted only when the
production candidate also matches the exact authorization ID/path and exact
three controller addresses above.

Production still remains HOLD on deployed address/runtime, independent
deployment verification, inventory funding/lock, WC settlement/custody/opening
policy proof, bounded canary, and coupled activation.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_role_binding_authorization_v1.mjs
node scripts/prove_void_wc_void_market_vault_deployment_preparation_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
