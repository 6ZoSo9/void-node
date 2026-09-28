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
packet_id=voidwcvcia1_cf17de1bb774c1c06f2f396063458c9b3a879a9022ffd73a611edafdee14d202
packet_json_sha256=2cd5aee4c73539d2050636bfb2851ea55f4bda41ce71cefaa1b9b1b5806e15ae
packet_json_bytes=47785
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
Keccak-256 directly, using the repository's locked `ethers.keccak256`
dependency for the Ethereum digest.

```text
creation_bytecode_bytes=10404
creation_bytecode_sha256=9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af
creation_bytecode_keccak256=0xc6ac291ad2557039055c8baf79d2ba085d4ecaffe8e474d5d932602a2fae4b1c

runtime_template_bytes=9295
runtime_template_sha256=421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409
runtime_template_keccak256=0xf5850c03e88aa44017c1894784c23d1359ddcdd13acbebee64ae9e5b17cb713c

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
