# WC/VOID market vault compiled identity acceptance v1

Marker: `VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1`

Status: canonical source identity packet for `WCVoidMarketVaultV2`. This gate
accepts deterministic compiler output only. It does not deploy the vault, select
or use a signer, call Chain-2050 RPC, fund inventory, activate WC/VOID, activate
the presale, or move funds.

## Accepted source generation

The accepted compiler evidence was produced from exact source commit:

```text
9309c9fff7e2e53de92977585897c678933d64b9
```

The accepted contract source hash is:

```text
2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925
```

The contract is:

```text
contracts/mainnet/WCVoidMarketVaultV2.sol
```

The compiler profile remains:

```text
solc=0.8.24+commit.e11b9ed9
evmVersion=paris
optimizer.enabled=false
optimizer.runs=200
viaIR=false
metadata.appendCBOR=true
metadata.useLiteralContent=true
metadata.bytecodeHash=ipfs
```

## Original compiler evidence

The accepted identity came from the corrected exact-head compiler run:

```text
workflow_run_id=36150784375
workflow_run_number=4
workflow_job_id=108125074194
artifact_id=10871757418
artifact_zip_sha256=7675b346213bd9384c0680f2ef8f95d04ed6054597be1ca0864093ea404a663a
```

The original identity ID was:

```text
voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045
```

Both independent compiler environments reproduced the same output.

## Canonical committed payloads

Rather than checking a 57 KB CI packet into the source tree, the repository
commits exactly the deployment-relevant compiler material:

- creation bytecode:
  `ops/mainnet0/wc-void-market-vault-v2-creation-bytecode.hex`
- unpatched runtime template:
  `ops/mainnet0/wc-void-market-vault-v2-runtime-template.hex`
- provenance + immutable layout:
  `ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json`

Exact accepted identities:

```text
creation_bytecode_bytes=9441
creation_bytecode_sha256=84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540

runtime_template_bytes=8342
runtime_template_sha256=99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e

immutable_layout_sha256=61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b
```

The acceptance proof recomputes these hashes from the committed payloads. The
full compiler source maps and other non-deployment fields remain traceable to
the original Actions artifact but do not need to be duplicated in the repo.

## Immutable deployment bindings

The runtime template exposes exactly:

```text
token
launchController
settlementExecutor
closeoutController
coupledLaunchId
```

The committed manifest retains every exact 32-byte immutable patch offset.

The required constructor order is:

```text
constructor(
  void_token,
  launch_controller,
  settlement_executor,
  closeout_controller,
  coupled_launch_id
)
```

A later deployment attestation must patch these exact values into the accepted
runtime template and compare the reconstructed bytes to live `eth_getCode`.

## Production candidate effect

This gate closes exactly one readiness item:

```text
market_vault_compiled_identity_committed=true
```

It also binds:

```text
market_vault_compiled_identity_id=voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045
market_vault_creation_bytecode_sha256=84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540
market_vault_runtime_template_sha256=99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e
market_vault_immutable_layout_sha256=61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b
```

The production candidate still remains HOLD on:

- final role identities;
- deployed Chain-2050 vault address;
- reconstructed live runtime verification;
- independent deployment verification;
- exact 10,000,000-VOID funding;
- live inventory-lock proof;
- independent WC settlement-adapter review;
- live WC ledger persistence/custody;
- participant opening claim policy;
- bounded canary; and
- coupled presale + WC/VOID activation.

## Authority boundary

This acceptance packet grants no deployment or value-bearing authority.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_compiled_identity_acceptance_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
