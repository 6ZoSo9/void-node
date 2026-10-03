# WC/VOID market-vault gas census v1

Marker: `VOID_WC_VOID_MARKET_VAULT_GAS_CENSUS_V1`

Status: **measurement-only isolated test evidence**.

This lane measures the reviewed WC/VOID settlement path so the real coupled
launch-policy artifact tracked by #2364 can later choose sponsored-execution
budgets from evidence instead of proof fixtures or guesses.

It does not select any production TTL, outstanding-request cap,
per-identity gas budget, global gas budget, market parameter, or launch time.

## Exact source boundary

The census binds:

- `contracts/mainnet/WCVoidMarketVaultV2.sol`
  - Git blob `bd11190e2c22f58ac60918ecdf603f53427cadd0`
  - accepted compiled identity
    `voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a`
  - source SHA-256
    `2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925`;
- `contracts/epoch2/VoidEpoch2TokenV1.sol`
  - Git blob `7c4297aadbc17b6214b4dde1f1766523cb499923`
  - reviewed canonical Epoch-2 successor token semantics;
- vault compiler profile:
  - solc `0.8.24+commit.e11b9ed9`;
  - EVM `paris`;
  - optimizer disabled;
  - optimizer runs 200;
  - viaIR false;
- Foundry container tag already used by the existing vault adversarial suite:
  `ghcr.io/foundry-rs/foundry:v1.7.1`.

The hosted measurement also prints the resolved Docker image ID. A later pinned
gas result must bind that observed image identity and the exact tested Git head.

## Why the Epoch-2 token source is required

`settleVoid` calls the token twice through `balanceOf` and once through
`transfer`. Measuring the vault against a toy token would understate or distort
the real execution path.

The historical epoch-1 Solidity source is intentionally unavailable in the
current repository. The reviewed Epoch-2 successor token source is the current
canonical runtime design for the same token address and has separately reviewed
behavioral-equivalence evidence. The census therefore measures the intended
Epoch-2 launch path, not the retired Anvil implementation.

## Measurements

The Foundry harness contains two independent test contracts so each measurement
starts from its own test transaction after `setUp()`:

1. **first settlement / fresh recipient**
   - opening inventory is exactly 10,000,000 VOID;
   - `settlementCount` and `lifetimeVoidOutAtoms` begin at zero;
   - settlement ID is unused;
   - recipient balance begins at zero.

2. **subsequent settlement / fresh recipient**
   - `setUp()` first establishes one completed settlement;
   - the measured test begins with `settlementCount=1`;
   - a new settlement ID and fresh recipient are used.

The harness impersonates only public fixture addresses through the Foundry
`prank` cheatcode. It does not possess or read any production key.

## Gas definitions

`execution_gas` is returned by Foundry's `snapshotGasLastCall(...)` cheatcode
for the direct settlement-executor call into `WCVoidMarketVaultV2.settleVoid`.
The cheatcode reports the previous call from the callee perspective, excluding
the test contract's caller-side CALL envelope. The focused workflow disables
snapshot-file emission, so this remains an in-memory observation.

`intrinsic_gas` is calculated under the Paris transaction schedule as:

```text
21,000
+ 4  * zero calldata bytes
+ 16 * non-zero calldata bytes
```

No access list is assumed.

`measured_tx_gas = execution_gas + intrinsic_gas`.

For the exact observed calldata and source generation this gives the measured
transaction gas envelope without adding an arbitrary policy margin. #2364 must
choose any production safety margin separately after this evidence is pinned.

Both observations must remain below the existing signed-intent maximum:

```text
3,000,000 gas
```

That 3,000,000 value is an existing safety ceiling. Passing it does not make the
measured value a production sponsorship budget.

## Observed generation-1 measurement

The first hosted isolated Foundry measurement completed successfully against the
reviewed source generation at commit
`c607ee9fdcac8e9917a79471e1648ded2bfc1002` using resolved image:

`sha256:186542c36fbcb76ba9e7cbf6711dfed201218f40e762b77a6a2240f8aa6afadb`

Observed values:

- first settlement execution gas: `133515`
- first settlement intrinsic gas: `22452`
- first settlement measured transaction gas: `155967`
- subsequent settlement execution gas: `99303`
- subsequent settlement intrinsic gas: `22440`
- subsequent settlement measured transaction gas: `121743`

Both measured transaction values are below the existing `3,000,000` signed-intent
maximum. These numbers are measurement evidence only. They do not select a
production sponsored-gas budget, margin, TTL, cap, market parameter, or launch
time; those remain separate policy decisions.

## First-generation lifecycle

The first hosted run is observational. It emits:

- `settle_void_first_execution_gas`;
- `settle_void_first_intrinsic_gas`;
- `settle_void_first_measured_tx_gas`;
- `settle_void_subsequent_execution_gas`;
- `settle_void_subsequent_intrinsic_gas`;
- `settle_void_subsequent_measured_tx_gas`.

After those values are observed, a later commit in this same lane may pin the
exact measurement evidence. Any production safety margin or sponsored-gas
budget remains a separate #2364 policy decision. Until the measurement is
pinned, #2364 must not infer a production gas budget from this source alone.

## Authority

This lane is isolated compiler/test execution only.

It performs no production RPC call, service/runtime mutation, wallet/signer/
private-key access, WC mutation, transaction construction/signing/submission/
broadcast, Chain-2050 write, production deployment, inventory funding, market or
presale activation, token movement, liquidity/treasury action, or funds
movement.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_gas_census_v1.mjs
```
