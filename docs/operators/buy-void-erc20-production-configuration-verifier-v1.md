# Buy VOID ERC-20 production configuration verifier v1

Marker: `VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_VERIFIER_V1`

## Purpose

This is the source/proof-only implementation of the current Buy VOID activation gate:

`production_broad_delivery_configuration_verification`

It verifies an explicit production **candidate** configuration without reading or mutating the live process environment. A successful decision content-addresses the candidate so a later operator step can bind an exact reviewed configuration before any activation is considered.

A successful verifier result does **not** mean that configuration is installed, that the production token deployment has been independently attested, that inventory is funded, or that runtime activation is authorized.

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

The token address is therefore **content-bound**, not silently inferred. Independent deployment-identity/operator review can bind the exact candidate fingerprint before any later production apply or activation step.

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
- unknown fields, missing fields, numeric/coercible values, and whitespace-padded values.

## Current activation truth

This lane intentionally leaves the parent activation contract unchanged:

```text
production_broad_delivery_configuration_verified=false
canonical_delivery_runtime_activation_ready=false
next_gate=production_broad_delivery_configuration_verification
```

The verifier closes the **source mechanism** needed to evaluate an exact candidate. A later operator-evidence step must supply and review the real production candidate/fingerprint. Applying that candidate, enabling dependency/runtime composition, funding inventory, reading credentials, signing, broadcasting, and moving funds remain separate authorization gates.

## Authority boundary

Pure explicit-input validation only. No `process.env` read, filesystem read/write, credential read, wallet access, RPC call, signer use, transaction construction/submission/broadcast, runtime or service mutation, dependency-injection activation, inventory funding, validator/Work Credit mutation, treasury/liquidity action, or funds movement.
