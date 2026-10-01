# WC/VOID market-vault live deployment observation preflight v1

Marker:
`VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_V1`

Status: read-only live Chain-2050 observation before any separately authorized
market-vault deployment or inventory funding operation.

A green observation does **not** construct a transaction, choose gas-limit or
fee policy, sign, broadcast, deploy, fund inventory, transfer VOID, activate
WC/VOID, activate the public presale, or move funds.

## Input qualification

The preflight consumes exact pretty-serialized bytes from a current-generation:

`VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1`

The caller also supplies an independent SHA-256 of those bytes.

Before any RPC call, the preflight requires:

- qualification marker/version/status;
- qualification source HEAD == preflight repository HEAD;
- qualification source tree == current HEAD tree;
- canonical GitHub origin;
- reviewed main anchor ancestry;
- exact current qualification-tool Git blob and filesystem bytes;
- exact reviewed qualification dependency Git blobs and file SHA-256s;
- rederived content-addressed `qualification_id`;
- current coupled-launch identity;
- canonical Epoch-2 VOID token;
- canonical settlement executor and Sovereign closeout controller;
- a fresh nonzero launch-controller address distinct from every other role and
  the VOID token;
- accepted `WCVoidMarketVaultV2` compiled identity;
- reviewed `ethers` package-runtime lineage;
- exact deployment-data SHA-256;
- exact constructor role/launch binding; and
- the original qualification authority object.

The preflight does not re-run the #2241 control signature/evidence ceremony.
A new current-generation qualification must be generated first.

## Operator selections

The operator explicitly supplies:

- deployer address; and
- inventory-source address.

These values are recorded as observation subjects only:

```text
deployer_selection_authorized=false
inventory_source_selection_authorized=false
```

The preflight does not read any key or credential associated with either
address.

## RPC boundary

Only an explicit loopback HTTP endpoint is accepted:

- `127.0.0.1`; or
- `::1`.

No HTTPS, remote hostname, URL credentials, query string, or fragment is
accepted.

Allowed RPC methods are exactly:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getTransactionCount
eth_getBalance
eth_gasPrice
eth_estimateGas
eth_call
```

No send/sign/admin/personal/debug RPC method exists in this lane.

## Coherent observation

The preflight:

1. verifies Chain ID 2050;
2. fixes one current block number/hash/timestamp;
3. reads deployer nonce at the fixed block;
4. reads pending deployer nonce;
5. reads deployer native balance at the fixed block;
6. reads current gas-price observation;
7. calls `eth_estimateGas` for the **exact qualification deployment data** at
   the fixed block;
8. calls canonical VOID `balanceOf(inventorySource)` at the same fixed block;
9. re-reads pending nonce; and
10. re-reads the exact fixed block and requires identical hash/number/timestamp.

The pending nonce must remain stable across the observation.

## Balance observations

The established WC/VOID opening inventory is:

```text
10,000,000 VOID
10000000000000000000000000 token atoms
```

The receipt records whether the observed inventory-source balance covers that
amount.

For deployer native balance, the preflight computes only:

```text
bare_estimated_deployment_cost_wei =
  eth_estimateGas * eth_gasPrice
```

and records whether the observed deployer balance covers that bare estimate.

This is not a gas-limit policy and not a fee policy. No multiplier, max fee,
priority fee, transaction type, nonce reservation, or transaction envelope is
selected here.

## Receipt

A coherent observation is content-addressed as:

`voidwcmvldop1_<sha256(canonical receipt material)>`

and records:

- repository HEAD/tree/preflight-tool identity;
- exact qualification ID/file SHA/source generation;
- deployer/inventory-source observation subjects;
- RPC URL fingerprint and method census;
- fixed block number/hash/timestamp;
- latest and pending deployer nonce;
- deployer native balance;
- gas-price observation;
- exact deployment-data gas estimate;
- bare estimated deployment cost;
- canonical VOID inventory-source balance;
- exact opening inventory requirement; and
- read-only sufficiency booleans.

A balance shortfall is an observation, not authority to fund it.

## Private CLI custody

The qualification input must be:

- an absolute path outside the repository;
- a direct regular file;
- non-symlink, single-link and owner-controlled;
- private against group/other access; and
- descriptor-bound with `O_NOFOLLOW` and stable identity while read.

Output is create-only private JSON outside the repository.

Example:

```bash
node tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs \
  --qualification /absolute/current-qualification.json \
  --expected-qualification-sha256 <64hex> \
  --deployer 0x... \
  --inventory-source 0x... \
  --rpc http://127.0.0.1:8545/ \
  --output /absolute/live-observation-preflight.json
```

## Authority boundary

```text
qualification_reexecution=false
deployer_selection_authorized=false
inventory_source_selection_authorized=false
gas_limit_policy_selected=false
fee_policy_selected=false
transaction_envelope_construction=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
deployment=false
chain2050_write=false
inventory_funding=false
token_transfer=false
market_activation=false
public_presale_activation=false
automatic_retry=false
funds_movement=false
```

The next gate, even after a sufficient observation, is a separately reviewed
gas-limit/fee/nonce-use/deployment authority decision.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_live_deployment_observation_preflight_v1.mjs
```
