# WC/VOID market-vault current deployment requalification v1

Marker: `VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1`

Status: source-only requalification candidate. No RPC, key read, credential read,
transaction construction, signing, broadcast, deployment, inventory funding,
market/presale activation, or funds movement occurs.

## Why this gate exists

The September 25 WC/VOID deployment lineage was prepared against an older
accepted compiled identity. It never reached broadcast, and the current
accepted WCVoidMarketVaultV2 bytecode is materially different.

September 25 identity:

```text
compiled_identity_id=
  voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045
creation_bytecode_sha256=
  84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540
runtime_template_sha256=
  99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e
coupled_launch_id=
  0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
```

Current accepted identity:

```text
compiled_identity_id=
  voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a
creation_bytecode_sha256=
  9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af
runtime_template_sha256=
  421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409
immutable_layout_sha256=
  61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b
```

The Solidity source hash remained stable, but deployment bytecode did not.
Therefore the old constructor payload, predicted address, gas observation, and
any transaction-specific authorization derived from the old payload cannot be
reused.

## Current coupled launch commitment

The new commitment is derived from current checked-in source truth:

### Presale

From `VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V2`:

```text
policy_marker=VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1
canonical_presale_max_void=10000000
rate_void_units_numerator=2
rate_void_units_denominator=1
```

### WC/VOID opening

From the canonical coupled-successor candidate:

```text
pair=WC_VOID
protocol_void_inventory_atoms=10000000000000000000000000
opening_sale_tranche_void_atoms=5000000000000000000000000
post_opening_void_reserve_atoms=5000000000000000000000000
protocol_wc_seed_units=0
fixed_conversion=false
fixed_opening_price=false
opening_price_source=settled_wc_over_opening_sale_tranche
opening_allocation_policy=pro_rata_largest_remainder_v1
```

### Market vault

The commitment binds the exact current compiled identity, creation bytecode,
runtime template and immutable layout.

It also preserves the coupled launch ordering:

```text
presale_wc_void_simultaneous_launch=true
presale_launch_requires_wc_void_activation_ready=true
wc_void_launch_requires_presale_activation_ready=true
```

Canonical sorted JSON SHA-256 yields:

```text
0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

The verifier derives this value from current source files. The candidate does
not get to choose it.

## Historical dedicated-key continuity candidates

Two public identities from the abandoned September lineage are retained only as
continuity candidates:

```text
launch_controller_candidate=
  0x2f1e0005e865b772b268bd8c797bf3eaa901d97e

market_vault_deployer_candidate=
  0x907ea7d0d57f5631219674bdf666a7e929613074
```

The repository does **not** currently prove that either corresponding private
key remains available on Nimo. Therefore:

```text
current_key_continuity_verified=false
role_authorized=false
deployment_authorized=false
```

The historical public identity hashes are retained only so a later offline
Nimo continuity proof can demonstrate that the same key is still available
without exposing its private material.

This lane never reads a Nimo key.

## Current role candidates

### Settlement executor

The candidate is the current production Buy VOID fulfillment wallet:

```text
0xc884f631c3881b8b672bfcbf019c856146cd7f73
```

The verifier binds it to the current credential-binding source. That existing
Buy VOID authority does not authorize WC/VOID settlement:

```text
wc_void_authority_expansion_authorized=false
role_authorized=false
```

### Closeout controller

The candidate is the current Chain-2050 Sovereign owner:

```text
0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b
```

The verifier binds it to the current sovereign-genesis authorization evidence.
Existing Sovereign authority does not silently authorize the separate WC/VOID
closeout role:

```text
wc_void_authority_expansion_authorized=false
role_authorized=false
```

## Retired September material

The candidate explicitly records that the September material is historical and
non-reusable:

```text
launch_identity_reusable=false
deployment_payload_reusable=false
predicted_address_reusable=false
gas_observation_reusable=false
funding_or_signing_authority_reusable=false
```

No historical gas amount, nonce, fee envelope, unsigned transaction, signature,
or broadcast authorization is promoted into current source truth.

## Next gates

This candidate remains HOLD on exactly the following deployment-side work:

1. revalidate the launch-controller key continuity on Nimo;
2. revalidate the dedicated deployer key continuity on Nimo;
3. issue fresh exact role-binding authorization against the new coupled launch
   ID and current compiled identity;
4. construct a new source-only deployment payload from current creation
   bytecode and the newly authorized constructor bindings; and
5. perform a fresh read-only deployer nonce/fee/gas observation.

Only after those gates are reviewed can any separate funding, signing, or
broadcast authorization be considered.

## Source-generation binding

The verifier requires reviewed main
`b57d287977f43c41fbd24fc2c699b2d7cfff684d` to be an ancestor and pins exact
Git blob identities for:

- current compiled-identity acceptance;
- current presale economics source;
- current coupled-economic candidate;
- current Buy VOID fulfillment-wallet binding evidence; and
- current Sovereign owner authorization evidence.

A disjoint future `main` advance may be accepted only if those blobs remain
identical.

## Authority

```text
source_requalification_only=true
nimo_key_read=false
rpc_call=false
credential_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
deployment=false
chain2050_write=false
inventory_funding=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

A green proof means only that current deployment preparation has been
requalified to the correct source identity and that the old deployment lineage
cannot be reused.
