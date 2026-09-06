# Buy VOID ERC-20 production configuration verifier v1

Marker: `VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1`

## Purpose

This is the source/proof-only verifier for explicit Buy VOID ERC-20 production configuration candidates.

The original lifecycle gate `production_broad_delivery_configuration_verification` is now closed by the reviewed candidate binding merged in PR #1313. The verifier remains canonical and reusable after that lifecycle promotion: it validates an explicit candidate without reading or mutating the live process environment and without depending on the parent still being in the pre-verification state.

A successful verifier result does **not** mean that configuration is installed, inventory is funded, a production credential has been read, or runtime activation is authorized.

## Candidate boundary

The input is a closed record containing only the reviewed Buy VOID delivery configuration keys. Every present value must be a non-empty canonical string with no surrounding whitespace. Unknown fields, missing required fields, and wrong-typed values fail closed.

The verifier requires:

- `VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=0`;
- `VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED=0`;
- an absolute non-root server-controlled `VOID_BUY_VOID_RUNTIME_DIR`;
- delivery chain exactly `2050`;
- a valid nonzero ERC-20 token address distinct from the fulfillment wallet;
- the fulfillment wallet to equal the checked-in canonical production credential-binding evidence;
- the exact credential-binding evidence ID required by the activation contract;
- `VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS=10000000000000`, the full 10,000,000 VOID presale capacity in the canonical six-decimal fulfillment-unit domain;
- explicit gas/fee caps and planner multipliers accepted by the canonical ERC-20 planner policy validator;
- a direct loopback HTTP RPC URL on `127.0.0.1` or `::1` with an explicit port and without credentials, query parameters, or fragments;
- canonical positive decimal receipt confirmations from 1 through 1000; and
- optional RPC timeout/response-size controls only within the existing planner bounds.

The verifier deliberately reuses `validateBuyVoidErc20TransactionPreparationPlannerPolicyV1()` rather than introducing a second gas, fee, address, or transport policy parser.

The parent-state compatibility check now verifies only the conditions that are material to safe reuse of this pure verifier:

```text
canonical_delivery_runtime_activation_configuration_contract_ready=true
canonical_delivery_runtime_activation_ready=false
production_configuration_applied=false
```

It no longer requires the obsolete pre-promotion lifecycle values `production_broad_delivery_configuration_verified=false` or `next_gate=production_broad_delivery_configuration_verification`.

## Deterministic evidence

A successful candidate emits:

- `configuration_fingerprint_sha256`;
- the canonical planner policy fingerprint;
- the RPC URL fingerprint;
- normalized token and fulfillment-wallet addresses;
- the exact full-presale delivery ceiling;
- receipt confirmation depth; and
- the credential-binding evidence ID.

Changing a valid token address, gas/fee limit, RPC configuration, or another fingerprinted policy value changes the configuration fingerprint. Explicit canonical RPC transport defaults fingerprint identically to omitted defaults.

The reviewed Mainnet-0 candidate bound by PR #1313 produces exactly:

```text
rpc_url_fingerprint_sha256=856a41e68ffe7136b6474cf092d3696a2619347734279f3e19c2047d8e986ba2
planner_policy_fingerprint_sha256=45902d888077b61b75d00164f5e98053ad5a32a0569d848ba680e72c03208846
configuration_fingerprint_sha256=9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992
```

The token address is content-bound, not silently inferred.

## Fail-closed cases

The executable proof rejects, among other cases:

- runtime or dependency injection already enabled;
- wrong chain ID;
- relative runtime root;
- fulfillment-wallet/evidence mismatch;
- wrong credential evidence ID;
- public delivery cap below or above the full presale capacity;
- zero or wallet-equal token address;
- HTTPS, DNS-localhost, LAN, credential-bearing, query-bearing, or no-port RPC URLs;
- gas multiplier below the planner floor;
- fee multiplier above the planner ceiling;
- priority fee above the max fee;
- oversized timeout/response limits;
- zero, non-canonical, or excessive confirmation depth;
- unknown fields, missing fields, numeric/coercible values, and whitespace-padded values; and
- parent lifecycle drift that would imply runtime activation or a configuration application already occurred.

## Current activation truth

The reviewed production candidate is now consumed by the parent activation contract:

```text
production_configuration_values_verified=true
production_credential_binding_ready=true
production_broad_delivery_configuration_verified=true
production_configuration_applied=false
canonical_delivery_runtime_activation_ready=false
finite_presale_cap_end_to_end_enforced=false
durable_history_creation_crash_recovery_ready=true
durable_history_external_anti_rollback_anchor_ready=true
current_parent_blocker=durable_history_full_presale_domain_not_ready
next_gate=durable_history_full_presale_domain
```

The verifier therefore closes no new lifecycle gate by itself. It preserves the exact candidate-validation mechanism used by the merged binding and proves that the reviewed candidate can still be recomputed deterministically while runtime and dependency injection remain disabled. The durable-history source lane now closes the reviewed interrupted-creation and coherent journal-subtree rollback gates with a recoverable pending transaction and separate committed-tail anchor authority. The pure configuration verifier remains separate from that storage boundary. Production execution is still disabled; the next parent gate is canonical delivery runtime activation.

Applying the candidate, enabling dependency/runtime composition, funding inventory, reading credentials, signing, broadcasting, and moving funds remain separate authorization gates.

## Authority boundary

Pure explicit-input validation only. No `process.env` read, filesystem read/write, credential read, wallet access, RPC call, signer use, transaction construction/submission/broadcast, runtime or service mutation, dependency-injection activation, inventory funding, validator/Work Credit mutation, treasury/liquidity action, or funds movement.
