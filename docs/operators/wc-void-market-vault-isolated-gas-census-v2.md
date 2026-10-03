# WC/VOID market-vault isolated gas census v2

Marker: `VOID_WC_VOID_MARKET_VAULT_ISOLATED_GAS_CENSUS_V2`

Status: **replacement measurement-only evidence; generation 2 pinned**.

Issue: #2380. This lane replaces the policy-evidence interpretation of the
merged v1 gas census from #2368.

## Why v2 exists

The v1 workflow described its measurement as isolated but did not pass
`forge test --isolate`. It also calculated a separate intrinsic-gas term and
added it to `snapshotGasLastCall(...)`.

That is not an acceptable basis for #2364 production sponsorship policy.
Foundry isolation treats the isolated call as transaction/receipt gas, so v2
measures under actual `--isolate` execution and does not add intrinsic gas a
second time.

The v1 observations must not be used to select production gas budgets.

## Exact source boundary

V2 keeps the same reviewed execution sources and compiler profile:

- `contracts/mainnet/WCVoidMarketVaultV2.sol`
  - Git blob `bd11190e2c22f58ac60918ecdf603f53427cadd0`
  - accepted identity
    `voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a`
  - source SHA-256
    `2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925`;
- `contracts/epoch2/VoidEpoch2TokenV1.sol`
  - Git blob `7c4297aadbc17b6214b4dde1f1766523cb499923`;
- solc `0.8.24+commit.e11b9ed9`;
- EVM `paris`;
- optimizer disabled;
- optimizer-runs metadata `200`;
- viaIR false;
- Foundry image `ghcr.io/foundry-rs/foundry:v1.7.1`.

The workflow also prints the resolved image ID and tested Git head.

## Measurement semantics

The canonical hosted command MUST include:

```text
forge test ... --isolate --gas-report -vvvv
```

The test records `snapshotGasLastCall(...)` immediately after the direct
settlement-executor call to `WCVoidMarketVaultV2.settleVoid`.

Under the mandatory isolation boundary, v2 treats that observation as the
isolated transaction gas. It does not add intrinsic gas a second time and does
not compute a separate manual `21,000 + calldata` term.

Generation 2 emits:

- `settle_void_first_isolated_tx_gas`;
- `settle_void_subsequent_isolated_tx_gas`;
- each corresponding `signed_intent_max_gas`.

Both isolated observations must remain below the existing 3,000,000 signed
intent maximum. That maximum is a ceiling only, not a selected sponsorship
budget.

## Pinned generation-2 evidence

The first successful hosted v2 observation is now pinned:

- observation head: `1c56a9c0ec074ec198610864462634a66ce26722`;
- test SHA-256: `bcc5cf5d02a75e979ca201289fc55a951aed11dff8af497aee5f95846767729a`;
- Foundry image ID: `sha256:186542c36fbcb76ba9e7cbf6711dfed201218f40e762b77a6a2240f8aa6afadb`;
- first settlement / fresh recipient: `133515` gas;
- subsequent settlement / fresh recipient: `99303` gas.

The focused workflow re-runs the isolated measurement and requires those exact
values. The source proof also requires the observation head to remain an
ancestor and the current gas-test Git blob to equal the observed generation's
gas-test blob.

These are measurement inputs for #2364, not a selected sponsorship budget.

V2 does not select any production TTL, outstanding cap, per-intent gas limit,
per-identity/global gas budget, market parameter, opening time, presale
activation, or market activation.

## Authority

Source/compiler/test evidence only.

No production RPC, runtime/service mutation, wallet/signer/private-key access,
WC mutation, transaction construction/signing/submission/broadcast, Chain-2050
write, deployment, inventory funding, market/presale activation, token movement,
liquidity/treasury action, or funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_isolated_gas_census_v2.mjs
```
