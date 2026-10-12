# WC/VOID market-vault runtime attestation v1

Marker: `VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1`

Status: source-only read-only runtime verifier. The hosted proof uses an injected
deterministic transport and does not contact production RPC.

## Purpose

WC/VOID production readiness currently keeps these live gates false:

```text
market_vault_address=null
market_vault_runtime_code_sha256=null
market_vault_independently_verified=false
inventory_funded=false
inventory_lock_proven=false
```

The corrected current compiled-identity binding packet already fixes the exact reviewed
creation/runtime bytecode and the immutable layout for
`WCVoidMarketVaultV2`.

This verifier supplies the missing read-only evidence path for a later real
Chain-2050 deployment.

## Inputs

The verifier requires:

- the canonical corrected current compiled-identity binding packet;
- exact market-vault address;
- exact deployment transaction hash and deployer;
- exact canonical Epoch-2 `VoidToken`
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- launch-controller, settlement-executor, closeout-controller, and
  coupled-launch identities;
- a positive confirmation requirement, capped at 1,000; and
- an injected RPC transport.

Only these RPC methods are allowed:

- `eth_chainId`;
- `eth_getTransactionReceipt`;
- `eth_blockNumber`;
- `eth_getBlockByNumber`;
- `eth_getCode`; and
- `eth_call`.

No send/signing RPC method exists in the source.

## Exact runtime reconstruction

The verifier first re-runs
`verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1`.

It then reconstructs the expected deployed runtime by copying the accepted
runtime template and patching the compiler-reviewed immutable references for:

- `token`;
- `launchController`;
- `settlementExecutor`;
- `closeoutController`; and
- `coupledLaunchId`.

Every immutable reference must be exactly 32 bytes, in bounds, and
non-overlapping.

The observed `eth_getCode` result at the stable head block must equal this
reconstructed runtime byte-for-byte. SHA-256 and Ethereum Keccak-256 are derived
from those exact reconstructed bytes.

## Deployment and stable-chain binding

The deployment receipt must prove:

- exact transaction hash;
- exact deployer;
- contract creation (`to=null`);
- exact vault address;
- success status; and
- positive deployment block number/hash.

The verifier independently reads that deployment block and requires the
canonical block hash to equal the receipt block hash.

It then selects one current head block, requires the configured finality depth,
performs every runtime/code/getter observation at that exact block tag, re-reads
the head block after all observations, and finally re-reads the deployment
receipt. A changed head hash, missing second receipt, or changed deployment
receipt fails closed.

## Immutable roles and inventory lock

At the stable head block, the verifier first requires the vault's immutable
`voidToken()` to equal the canonical Epoch-2 token address. It then requires
the token's observed runtime SHA-256 to equal the reviewed successor runtime:

`7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb`

Only after those checks can token balance contribute to inventory proof.

The verifier also requires exact getter equality for:

- `voidToken()`;
- `launchController()`;
- `settlementExecutor()`;
- `closeoutController()`; and
- `coupledLaunchId()`.

Opening inventory must be exactly:

`10,000,000 VOID = 10000000000000000000000000 atoms`

through three independent observations:

- contract constant `openingInventoryAtoms()`;
- vault `currentVoidReserveAtoms()`; and
- token `balanceOf(vault)`.

The pre-activation lock state must also be exact:

```text
activated=false
closing=false
closed=false
closeoutApproved=false
activatedAtBlock=0
settlementCount=0
lifetimeVoidOutAtoms=0
pendingCloseoutId=0x00..00
pendingSuccessorVault=0x00..00
```

A successful real invocation may therefore produce evidence with:

```text
deployment_attested=true
final_role_bindings_attested=true
deployed_runtime_code_observed=true
canonical_void_token_verified=true
canonical_void_token_runtime_verified=true
market_vault_independently_verified=true
inventory_funded=true
inventory_lock_proven=true
```

along with a content-addressed `voidwcmvre1_<sha256>` evidence ID.

## Deliberate current boundary

This PR does not invoke the verifier against a live Chain-2050 RPC and does not
change the production candidate.

The hosted proof uses a deterministic injected transport only. Therefore this
lane proves the **runtime-attestation mechanism**, not that a production vault
has already been deployed or funded.

## Authority boundary

The verifier supports read-only RPC inspection through an injected transport.
It performs no filesystem write, credential/private-key access, wallet/signing,
transaction construction/submission/broadcast, Chain-2050 write, inventory
funding/movement, market activation, presale activation, or funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_runtime_attestation_v1.mjs
```
