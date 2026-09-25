# WC/VOID market vault compiler identity v1

Marker: `VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1`

Status: source-only deterministic compiler gate for `WCVoidMarketVaultV2`.
It performs no Chain-2050 RPC, deployment, credential access, signing,
broadcast, inventory funding, market activation, presale activation, or funds
movement.

## Fixed compiler profile

The exact profile is:

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

The Standard JSON input embeds the exact
`contracts/mainnet/WCVoidMarketVaultV2.sol` source and requests ABI, metadata,
storage layout, method identifiers, creation bytecode, deployed-runtime
template, source maps, link references, and immutable references.

## Independent reproduction

CI compiles the exact same Standard JSON input in two different environments:

1. native `ethereum/solc:0.8.24`; and
2. `solc-js 0.8.24` / Emscripten.

The gate rejects identical environment identities and requires exact agreement
on:

- creation bytecode;
- unpatched deployed-runtime template;
- ABI;
- metadata;
- storage layout;
- method identifiers;
- immutable layout; and
- creation/runtime source maps.

Compiler errors and link references fail closed.

## Immutable bindings

The runtime template must expose exactly five immutable source variables:

```text
token
launchController
settlementExecutor
closeoutController
coupledLaunchId
```

The compiler identity records the exact 32-byte patch offsets for those
immutables. A later deployment attestation can therefore reconstruct expected
runtime bytecode from reviewed constructor bindings instead of guessing where
Solidity placed them.

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

## CI artifact handoff

The focused workflow emits one non-secret artifact containing the exact reviewed
`identity.json`.

The artifact is retained only as compiler evidence. A green workflow does not
silently make that identity canonical.

The production candidate remains:

```text
market_vault_compiler_profile_locked=true
market_vault_dual_compiler_gate_implemented=true
market_vault_compiled_identity_committed=false
```

The next gate is to independently inspect that exact generated artifact and
commit an accepted identity packet. Only after that packet is canonical may
deployment preparation consume its creation/runtime identities.

## Authority boundary

The compiler tool has only two CLI commands:

- `input`: create the fixed Standard JSON compiler input;
- `review`: compare already-produced compiler outputs and create an identity.

The tool itself never runs a compiler and contains no RPC, wallet, signer,
transaction, deployment, funding, or activation authority.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_compiler_identity_v1.mjs
```
