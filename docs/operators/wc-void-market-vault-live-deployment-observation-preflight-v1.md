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

Before any RPC call, the **production** preflight requires:

- local branch exactly `main`;
- a fixed, config-isolated, noninteractive
  `git ls-remote --heads https://github.com/6ZoSo9/void-node.git refs/heads/main`
  read whose exact SHA equals local HEAD;
- qualification marker/version/status;
- qualification source HEAD == preflight repository HEAD;
- qualification source tree == current HEAD tree;
- canonical GitHub origin, accepting the normal HTTPS/SSH checkout spellings
  for exactly `6ZoSo9/void-node` and normalizing them to
  `https://github.com/6ZoSo9/void-node.git`;
- reviewed main anchor ancestry;
- exact current qualification-tool Git blob and filesystem bytes;
- qualification marker/authority/dependency-manifest exports loaded only from a
  private temporary module containing the exact captured-HEAD qualification-tool
  bytes, never from a top-level mutable-worktree import;
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
Loading the exact qualification module only supplies the reviewed marker,
authority object, and dependency manifest used to verify the supplied receipt.
A new current-generation qualification must be generated first.

A dirty qualification-tool worktree fails before those bytes can execute, and
the proof carries an execution sentinel for that ordering. An off-owner or
otherwise noncanonical `remote.origin.url` also fails before any RPC transport
call. The proof exercises both GitHub's checkout URL without a
`.git` suffix and the canonical `.git` form, plus an off-owner rejection.

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

The production API does not accept a caller-supplied transport implementation.
Any own `transport` property fails before source admission or RPC. Production
always constructs the reviewed HTTP transport internally.

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

Production mode does not accept an arbitrary loopback Chain-2050 endpoint. It
reads the reviewed source selection
`ops/mainnet0/production-epoch2-rpc-target-v1.json`, requires
`PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY`, verifies the selected
URL fingerprint, and requires the caller's normalized RPC to match that selected
target exactly. The current selected target is
`http://127.0.0.1:18553/`. The retired Epoch-1 archive at `8545` and isolated
Epoch-2 proof endpoints at `18550`–`18552` therefore fail before any RPC
call. Test-only loopback fixtures retain ephemeral-port support and cannot emit a
production preflight.

The deployment estimate is not a bare legacy transaction shape. Its
`eth_estimateGas` transaction object explicitly binds `type: 0x2`,
`chainId: 0x802` (2050), contract creation (`to: null`), and the canonical
signed Epoch-2 access-list marker from
`VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1`: exactly one marker
entry at `0x0000000000000000000000000000000000002050` with storage key
`0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7`.
This is read-only estimation compatibility with the production validator domain;
it does not construct, sign, or authorize a transaction.

The fixed canonical GitHub `ls-remote` source-generation read is a separate
read-only external Git/TLS observation. `loopback_http_only` refers to
Chain-2050 JSON-RPC, not that canonical source read.

## Coherent observation

The preflight:

1. verifies Chain ID 2050;
2. fixes one current block number/hash/timestamp;
3. reads deployer nonce at the fixed block;
4. reads pending deployer nonce;
5. reads deployer native balance at the fixed block;
6. reads current gas-price observation;
7. calls `eth_estimateGas` for the **exact qualification deployment data**
   plus the exact signed Epoch-2 access-list marker at the fixed block;
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

A coherent **production** observation is content-addressed as:

`voidwcmvldop1_<sha256(canonical receipt material)>`

and records:

- repository HEAD/tree, branch `main`, canonical remote-main SHA, and
  preflight-tool identity;
- exact qualification ID/file SHA/source generation;
- deployer/inventory-source observation subjects;
- RPC URL fingerprint and method census;
- fixed block number/hash/timestamp;
- latest and pending deployer nonce;
- deployer native balance;
- gas-price observation;
- exact signed Epoch-2 access-list marker identity;
- exact deployment-data gas estimate;
- bare estimated deployment cost;
- canonical VOID inventory-source balance;
- exact opening inventory requirement; and
- read-only sufficiency booleans.

A balance shortfall is an observation, not authority to fund it.

## Test-only verification surface

Pre-merge CI cannot truthfully mint a production live-observation receipt from a
feature branch because production requires local `main` to equal canonical
remote `main`.

The proof therefore uses
`testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightV1(...)` to
exercise the same qualification and RPC semantics against a real ephemeral
`127.0.0.1` HTTP JSON-RPC server. Its output is permanently distinct:

```text
marker=VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_TEST_ONLY_V1
status=TEST_ONLY_LOOPBACK_OBSERVATION_SEMANTICS_GREEN
production_artifact_authorized=false
production_preflight_id_emitted=false
```

It emits neither the production marker/status nor a production
`voidwcmvldop1_...` identifier and is not used by the CLI. Separate proof
adversaries require the production API to HOLD on the PR feature branch before
RPC, reject caller transport injection, reject stale/feature canonical-main
identities, and reject off-owner Git origins.

## Private CLI custody

The qualification input must be:

- an absolute path outside the repository;
- a direct regular file;
- non-symlink, single-link and owner-controlled;
- private against group/other access; and
- descriptor-bound with `O_NOFOLLOW` and stable identity while read.

Output is create-only private JSON outside the repository.

On Linux the output parent is opened directly with
`O_DIRECTORY|O_NOFOLLOW` and its fd dev/inode is bound to the reviewed parent
pathname. The receipt is created through
`/proc/self/fd/<parent-fd>/<basename>`, then the file and that exact retained
directory are fsynced. Before success, the parent pathname and output pathname
must still resolve to the retained directory/file identities.

If the parent is renamed/replaced after admission, creation cannot be redirected
into the replacement directory. Any receipt created through the retained
original directory is removed through that same fd path, the retained directory
is fsynced, and the operation fails closed. The focused proof performs this
replacement deterministically in a temporary directory and requires both the
replacement and moved-original directories to contain no receipt afterward.

Example:

```bash
node tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs \
  --qualification /absolute/current-qualification.json \
  --expected-qualification-sha256 <64hex> \
  --deployer 0x... \
  --inventory-source 0x... \
  --rpc http://127.0.0.1:18553/ \
  --output /absolute/live-observation-preflight.json
```

## Authority boundary

```text
qualification_reexecution=false
canonical_production_epoch2_rpc_required=true
deployer_selection_authorized=false
inventory_source_selection_authorized=false
epoch2_signed_access_list_marker_required=true
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
