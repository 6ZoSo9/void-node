# WC/VOID market vault deployment preparation v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1`

Status: source-only deployment preparation. No RPC, nonce lookup, fee lookup,
wallet or credential access, transaction construction, signing, broadcast,
deployment, Chain-2050 mutation, inventory funding, market activation, presale
activation, WC mutation, or funds movement is authorized.

## Accepted compiler identity

This gate consumes only the accepted `WCVoidMarketVaultV2` compiler identity:

- identity ID:
  `voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045`;
- source commit:
  `9309c9fff7e2e53de92977585897c678933d64b9`;
- creation bytecode SHA-256:
  `84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540`;
- runtime template SHA-256:
  `99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e`; and
- immutable layout SHA-256:
  `61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b`.

The tool rereads and hashes the accepted creation bytecode before it will prepare
any constructor payload.

## Canonical network binding

The only accepted network/token binding is:

```text
chain_id=2050
void_token=0x470075B85352Eb86F7d089FB9ba88945f12AAd94
```

A different token fails closed.

## Explicit constructor roles

The constructor requires:

```text
constructor(
  void_token,
  launch_controller,
  settlement_executor,
  closeout_controller,
  coupled_launch_id
)
```

The coupled launch ID is now deterministically committed from the canonical
presale + WC/VOID launch economics and the accepted V2 vault identity:

```text
coupled_launch_id=0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
```

The canonical checked-in preparation still leaves the three production role
bindings unresolved:

```text
launch_controller=null
settlement_executor=null
closeout_controller=null
```

The deployment preparation therefore remains `HOLD`.

No role address or launch ID is inferred from operator identity, a wallet,
presale configuration, governance prose, or historical test configuration.

## Separation rules

For a source-ready constructor proposal:

- all three role addresses must be explicit nonzero Ethereum addresses;
- all three role addresses must be distinct;
- `settlement_executor != closeout_controller` is mandatory so V2 recovery
  retains a real second approval authority;
- no role address may equal the native VOID token address; and
- the coupled launch ID must equal the exact canonical content-addressed value
  `0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83`.

These checks are source-preparation rules. They do not claim those proposed
addresses are the correct final production authorities; final role attestation
remains a separate gate.

## Deterministic deployment payload

Once all bindings are explicit, the tool deterministically ABI-encodes the five
static constructor words and concatenates them to the accepted creation
bytecode.

The resulting source record can expose:

- exact constructor arguments;
- deployment-data byte length; and
- deployment-data SHA-256.

It still leaves:

```text
deployer_address=null
deployment_nonce=null
predicted_contract_address=null
fee_observation=null
unsigned_eip1559_transaction=null
```

Those values require a later read-only Chain-2050/deployer observation gate.

## Production readiness effect

The production candidate now truthfully records:

```text
market_vault_deployment_preparation_implemented=true
market_vault_coupled_launch_commitment_committed=true
market_vault_role_binding_proposal_implemented=true
market_vault_final_role_bindings_attested=false
market_vault_coupled_launch_id=0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
```

Therefore the production-readiness classifier remains HOLD on:

- final role binding attestation;
- deployed address/runtime;
- independent deployment verification;
- funding and live inventory lock;
- remaining WC settlement/opening gates;
- bounded canary; and
- coupled public activation.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployment_preparation_v1.mjs
```

No value-bearing action follows from this gate.
