# WC/VOID market vault deployer observer v1

Marker: `VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1`

Status: source-ready read-only observation gate.

This gate exists after exact vault-role authorization and before any unsigned
deployment transaction is prepared.

## Dedicated deployer policy

The WC/VOID vault deployment payer must be a fresh dedicated EOA.

The observer explicitly rejects reuse of:

- the previous Buy VOID fulfillment deployer
  `0x2b4d94ce678ec0bc17924b83236b714339c70b9d`;
- the WC/VOID launch controller;
- the WC/VOID settlement executor;
- the WC/VOID closeout controller;
- the native VOID token;
- canonical treasury/admin/validator contracts; and
- known privileged/named Mainnet-0 EOAs.

The dedicated deployer has now been generated offline on Nimo and is recorded
only by public evidence:

```text
deployer_address=0x907ea7d0D57F5631219674BDF666A7e929613074
public_identity_sha256=7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac
```

Its private key remains offline on Nimo. The observer does not access it.

## RPC boundary

Only loopback HTTP is accepted.

Read-only methods:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getTransactionCount
eth_getBalance
eth_maxPriorityFeePerGas
eth_getCode
eth_estimateGas
```

No mutation method is present.

## Exact deployment payload

The observer rebuilds the contract deployment data from:

- the accepted WCVoidMarketVaultV2 compiler identity;
- the accepted creation bytecode; and
- the exact authorized constructor bindings.

The SHA-256 must match the deterministic deployment-preparation record before
gas estimation is accepted.

## Observation

For one explicit deployer address, the observer records:

- Chain ID 2050;
- fixed observation block/hash;
- EOA code absence;
- latest nonce;
- pending nonce;
- pending-transaction presence;
- pending nonce revalidation;
- native gas balance;
- base fee;
- suggested priority fee;
- fee-cap sufficiency;
- exact creation-data gas estimate;
- padded deployment gas limit;
- maximum bounded deployment cost;
- balance sufficiency; and
- deterministic CREATE address from deployer + pending nonce.

The observation block hash and base fee are reread after the gas estimate. Any
drift fails closed.

## Authority boundary

This gate does not authorize or perform:

```text
credential/private-key access
wallet/signer access
transaction construction
transaction signing
transaction broadcast
deployment
Chain-2050 mutation
deployer funding
inventory funding
market activation
public presale activation
WC mutation
funds movement
```

The next gate after a successful observation is review of the exact evidence,
followed by a separate authorization for either bounded deployer gas funding or
unsigned transaction construction.

## Production candidate

After live read-only observation:

```text
market_vault_deployer_observer_implemented=true
market_vault_deployer_generation_evidence_committed=true
market_vault_deployer_generation_evidence_path=ops/mainnet0/wc-void-market-vault-deployer-offline-generation-evidence-v1.json
market_vault_deployer_public_identity_sha256=7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac
market_vault_deployer_address=0x907ea7d0D57F5631219674BDF666A7e929613074
market_vault_deployer_observation_verified=true
market_vault_deployer_pending_nonce=0
market_vault_predicted_contract_address=0x210b006e39a78d02330ae648262025d8fa22e9f0
market_vault_deployment_gas_estimate=1852535
market_vault_proposed_deployment_gas_limit=2223042
market_vault_deployer_balance_wei=0
market_vault_proposed_max_deployment_cost_wei=6669126000000000
market_vault_deployer_balance_sufficient=false
market_vault_fee_caps_sufficient=true
```

The observation is valid and the fee envelope is sufficient. Production
readiness remains HOLD only because the dedicated deployer has zero native gas
balance. The next deployment-side gate is a separate, bounded deployer-gas
funding authorization followed by a fresh re-observation.

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_deployment_observer_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
