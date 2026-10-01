# WC/VOID market-vault current role/deployment preflight v1

Marker: `VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1`

Status: source-only current-generation role/deployment preflight. The canonical
result is intentionally:

```text
HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED
```

This lane performs no credential/private-key read, wallet/signer use, RPC,
transaction construction/signing/broadcast, Chain-2050 write, contract
deployment, inventory funding, WC mutation, market/presale activation, or funds
movement.

## Why this preflight exists

The current WC/VOID production candidate still has no live market vault:

```text
market_vault_address=null
market_vault_runtime_code_sha256=null
market_vault_independently_verified=false
inventory_funded=false
inventory_lock_proven=false
```

The repository already has the reviewed V2 vault source, accepted dual-compiler
identity, and a read-only live runtime/deployment/inventory-lock attestation
mechanism. What is missing upstream is a **current** role/deployment package.

Historical Sep-25 branches contain an older role/deployment sequence, but those
branches are not current authority. They are roughly 1,600 commits behind the
current launch line and bind:

- historical coupled launch
  `0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83`;
- historical compiled identity
  `voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045`.

Those values must not be revived as production authority.

## Current launch identity

This preflight binds the canonical coupled candidate's current launch:

```text
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

Constructor bytes32 form:

```text
0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

The verifier derives the bytes32 form from the canonical `sha256:` launch ID
and requires exact equality.

## Current vault identity

The preflight binds the accepted current compiler packet:

```text
contract=WCVoidMarketVaultV2
identity_id=voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a
identity_json_sha256=fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b
contract_source_sha256=2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925
creation_bytecode_sha256=9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af
creation_bytecode_keccak256=0xc6ac291ad2557039055c8baf79d2ba085d4ecaffe8e474d5d932602a2fae4b1c
runtime_template_sha256=421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409
runtime_template_keccak256=0xf5850c03e88aa44017c1894784c23d1359ddcdd13acbebee64ae9e5b17cb713c
immutable_layout_sha256=61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b
```

The canonical Epoch-2 VOID token is:

`0x470075b85352eb86f7d089fb9ba88945f12aad94`

The verifier recomputes the current contract-source SHA-256 from exact
`HEAD:contracts/mainnet/WCVoidMarketVaultV2.sol` bytes.

## Current role candidates

### Settlement executor

Current public identity is re-derived from the existing Buy VOID production
credential-binding evidence:

`0xc884f631c3881b8b672bfcbf019c856146cd7f73`

The source evidence requires expected wallet == derived wallet and records no
transaction broadcast or inventory funding.

This proves the public identity exists and is bound to the current production
credential evidence. It does **not** grant that wallet WC/VOID settlement
authority for the current launch.

Therefore:

```text
public_identity_requalified=true
role_binding_authorized_for_current_launch=false
```

### Closeout controller

Current public identity is re-derived from the canonical Sovereign genesis
append authorization:

`0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`

The verifier requires the exact Sovereign authorization ID and
`identity_id=sovereign.zoso`.

This proves the current public Sovereign identity. It does **not** extend that
authorization to WC/VOID closeout authority.

Therefore:

```text
public_identity_requalified=true
role_binding_authorized_for_current_launch=false
```

### Launch controller

No current launch-controller control evidence exists on current `main`.

The historical Sep-25 address:

`0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`

is retained only as a negative historical reference and is explicitly bound to
the obsolete Sep-25 launch/compiler identities.

It remains:

```text
address=null
fresh_control_evidence_id=null
current_identity_requalified=false
role_binding_ready=false
historical_reference.current_authority=false
```

The old address cannot become current merely by copying it into the candidate.

## Constructor boundary

The V2 constructor shape is fixed:

```text
address voidToken
address launchController
address settlementExecutor
address closeoutController
bytes32 coupledLaunchId
```

But because launch-controller identity is unresolved, this preflight requires:

```text
constructor_arguments_ready=false
exact_creation_payload_ready=false
deployer_selected=false
nonce_observed=false
fee_observed=false
unsigned_transaction_ready=false
deployment_authorized=false
inventory_funding_authorized=false
```

No constructor payload is emitted.

## Git/source provenance

The preflight candidate binds reviewed main
`c4614c49d79a6111c2590518ea4dda7863b14042` and exact Git blobs for:

- current compiler acceptance packet;
- current coupled-economic candidate;
- current Sovereign public authorization;
- current Buy VOID production credential-binding evidence;
- `WCVoidMarketVaultV2.sol`; and
- the existing market-vault runtime attestation verifier.

The CLI reads those inputs from exact `HEAD:<path>` Git objects, not mutable
working-tree bytes, and requires the reviewed main generation to be an ancestor
of the running checkout.

## Next gate

Exactly one identity remains unresolved:

`fresh_launch_controller_public_control_requalification`

That later operation should produce fresh **public-only** evidence proving that
a launch-controller key remains under intended control and is bound to the
current coupled launch and current compiled vault identity.

It must not print or export the private key.

Only after that evidence is separately reviewed may a successor lane:

1. authorize exact current role bindings;
2. build exact constructor arguments / creation payload;
3. select a collision-free deployer;
4. separately authorize signing/broadcast;
5. deploy the exact reviewed vault;
6. fund exactly 10,000,000 VOID;
7. use the existing live attestation to prove runtime, roles, inventory and
   preactivation lock.

Downstream gates remain:

`#2223 -> #2199 -> #2200`

before final coupled/source readiness and later Buy VOID process/public
activation.

## Authority

```text
source_preflight_only=true
git_head_source_read=true
credential_read=false
private_key_access=false
wallet_or_signer_access=false
rpc_call=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
deployment=false
inventory_funding=false
market_activation=false
public_presale_activation=false
funds_movement=false
```
