# Buy VOID ERC-20 production configuration candidate binding v1

Marker: `VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1`

## Purpose

Bind the real reviewed Mainnet-0 Buy VOID delivery candidate to the production configuration verifier merged by PR #1312, without applying configuration or activating fulfillment.

This lane is deliberately source/proof-only. It converts the prior synthetic verifier fixture into one concrete repository-bound production candidate whose identities are checked against existing canonical deployment, premine-reconciliation, and credential-binding evidence.

## Exact candidate

The reviewed candidate is:

```text
VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=0
VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED=0
VOID_BUY_VOID_RUNTIME_DIR=/var/lib/void/buy-void/runtime-integration-v1
VOID_BUY_VOID_DELIVERY_CHAIN_ID=2050
VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS=0x470075B85352Eb86F7d089FB9ba88945f12AAd94
VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS=0xc884f631c3881b8b672bfcbf019c856146cd7f73
VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS=10000000000000
VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT=100000
VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI=3000000000
VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI=1000000000
VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL=http://127.0.0.1:8545/
VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS=12000
VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS=20000
VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS=3
VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS=5000
VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES=65536
VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID=20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495
```

## Repository evidence

The binding proof requires all of these checked-in truths to agree:

- `ops/mainnet/void-mainnet.deployed.json` identifies frozen Mainnet-0 Chain `2050`, source-of-truth node `Precision`, loopback RPC `http://127.0.0.1:8545`, and `VoidToken` `0x470075B85352Eb86F7d089FB9ba88945f12AAd94`.
- `ops/mainnet/mainnet0-premine-allocation.current.json` independently reports the same Chain-2050 token, 18 decimals, reconciled `333333333` VOID supply, zero unreconciled VOID, and the canonical Buy VOID fulfillment wallet.
- `src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts` binds fixed credential `buy-void-native-fulfillment-wallet-v1` to wallet `0xc884f631c3881b8b672bfcbf019c856146cd7f73` with evidence ID `20b5201b...51495`.

The source record binds the reviewed base commit and the Git blob identities of the two canonical JSON evidence files so later review can distinguish this exact evidence snapshot from future revisions.

## Deterministic fingerprints

The merged verifier must reproduce exactly:

```text
rpc_url_fingerprint_sha256=856a41e68ffe7136b6474cf092d3696a2619347734279f3e19c2047d8e986ba2
planner_policy_fingerprint_sha256=45902d888077b61b75d00164f5e98053ad5a32a0569d848ba680e72c03208846
configuration_fingerprint_sha256=9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992
```

Any drift in the token, wallet, RPC, amount ceiling, gas/fee policy, confirmation depth, transport bounds, runtime root, or credential evidence changes or invalidates the binding.

## Lifecycle boundary

This packet establishes only `repository_candidate_binding_ready=true`.

It intentionally preserves the existing parent activation truth while the candidate is under review:

```text
production_broad_delivery_configuration_verified=false
canonical_delivery_runtime_activation_ready=false
next_gate=production_broad_delivery_configuration_verification
```

After this exact candidate binding is independently reviewed and merged, promoting the parent source truth to consume the reviewed binding is a separate source lifecycle action. Applying the configuration to the live service and enabling dependency/runtime execution remain later operational authorization gates.

## Authority boundary

No process-environment read, live RPC, filesystem mutation, credential/private-key read, wallet access, signing, transaction broadcast, deployment, service restart, runtime activation, dependency-injection activation, inventory funding, validator/Work Credit mutation, treasury/liquidity action, or funds movement is performed or authorized by this packet.
