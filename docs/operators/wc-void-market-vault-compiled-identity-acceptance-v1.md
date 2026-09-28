# WC/VOID market vault compiled identity acceptance v1

Marker: `VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1`

Status: reviewed compiler-identity acceptance only. No Chain-2050 RPC,
deployment, role binding, inventory funding, signer access, transaction,
market/presale activation, or funds movement is performed or authorized.

## Accepted compiler evidence

The dual-compiler workflow run is:

```text
workflow_run_id=36464403015
workflow_job_id=109070717228
workflow_artifact_id=10988626461
workflow_artifact_zip_sha256=d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc
```

The generated `identity.json` was independently inspected and is bound by:

```text
identity_id=voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a
identity_json_sha256=fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b
identity_json_bytes=57245
source_commit=dba4a50b444dc5b1369d96fd63f5aa79f185e3e4
contract_source_sha256=2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925
```

The canonical accepted packet is:

`ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json`

Its raw binding is:

```text
packet_id=voidwcvcia1_ec8ebbc59aab8c6ad244592565f9debafda4c0c9bcf37f623bc5ea8bfebe2bad
packet_json_sha256=2273285d07459316df04e939310694842851c8801bea0a428cf1fb3afd3fe66a
packet_json_bytes=43952
```

The proof hashes these raw bytes before JSON parsing.

## Independent compiler identities

The accepted packet retains both distinct environments:

```text
native_solc_fingerprint=2b0b6820729fba9dab4a1127d75c30d3cf97636851555a5afd3b21a2ff89c2f9
solcjs_fingerprint=14655563b61e468ee7d54b58d379eaf4a9df4332128f082f73c802281896e559
```

Both compiled the exact Standard JSON profile with
`solc 0.8.24+commit.e11b9ed9`, Paris EVM, optimizer disabled, and exact
metadata settings.

## Deployment bytecode identity

The acceptance verifier does not merely trust declared bytecode hashes. It
decodes the packet's embedded bytecode and recomputes SHA-256 and Ethereum
Keccak-256.

```text
creation_bytecode_bytes=9441
creation_bytecode_sha256=84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540
creation_bytecode_keccak256=0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41

runtime_template_bytes=8342
runtime_template_sha256=99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e
runtime_template_keccak256=0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af

immutable_layout_sha256=61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b
```

The exact immutable reference sets for `token`, `launchController`,
`settlementExecutor`, `closeoutController`, and `coupledLaunchId` are
committed in the packet and rechecked by the acceptance verifier.

## Production candidate effect

The production candidate may now record:

`market_vault_compiled_identity_committed=true`

only together with the exact acceptance binding above.

This closes the compiled-identity gate only. The candidate remains `HOLD`
because the following are still absent:

- exact Chain-2050 market-vault address;
- deployment transaction/block attestation;
- final controller/executor role binding;
- reconstructed deployed-runtime observation;
- independent live vault verification;
- exact 10,000,000-VOID inventory funding;
- inventory-lock proof;
- WC settlement-adapter independent review;
- live WC-ledger persistence;
- quote-reserve custody;
- bounded canary; and
- coupled activation.

## Next gate

The next vault-specific gate is:

`exact_chain2050_market_vault_deployment_and_role_runtime_attestation`

That later step may use the accepted creation bytecode and immutable layout, but
this acceptance gate itself does not deploy anything.

## Authority

All value-bearing capabilities remain false:

- RPC/deployment;
- credential/wallet/signer access;
- transaction signing/broadcast;
- Chain-2050 mutation;
- inventory funding;
- liquidity movement;
- market/presale activation; and
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_compiled_identity_acceptance_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
