# Authenticated paid-work production activation configuration schema v1

This lane defines and proves the first missing artifact named by the authenticated paid-work production activation-readiness HOLD decision: the activation configuration schema.

It does not create an activation configuration instance or activate the runtime.

## Exact runtime shape

The schema describes the exact four-key JSON object accepted by the installed runtime entrypoint:

- `marker` is the existing authenticated paid-work activation/persistence runtime configuration marker;
- `version` is exactly `1`;
- `enabled` is exactly `true`;
- `persistence_config` is the existing activation/persistence configuration object.

Top-level and persistence objects reject unknown keys. The configuration therefore cannot embed a credential, token, trusted-context payload, replay snapshot, service design, rollback command, confirmation, or canary authorization. Those remain separate reviewable artifacts.

## Persistence constraints

The persistence root must be an absolute normalized path with no empty, `.` or `..` segment. The schema preserves the installed runtime’s bounds:

- pointer bytes: `512` through `1,048,576`;
- generation-file bytes: `1,024` through `33,554,432`;
- generation count: `1` through `1,000,000`.

Exact orphan recovery is required for the production configuration shape. This retains the runtime’s fail-closed recovery path instead of allowing a future instance to silently disable it.

## Production binding

Schema annotations bind this contract to the disabled release and prerequisite chain already proven by PRs #899, #906, and #908:

- release `paid-work-runtime-disabled-v1-3b298bc1e313-64841279f90d`;
- packet `voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784` at `eaa41fdf76044c88eb9c078046bd370acb3ee457`;
- runtime source `3b298bc1e31365aec7a20d03c3f425e22fd2f949` with SHA-256 `3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7`;
- prerequisite merge `25db3a0b0ff802914ef40bacabcbbda3779866cd`;
- evidence-composition merge `a7fa57062f96995f222550ab6838b8bbea2e274f`;
- readiness-decision merge `8ce112d6b0eb594bf0e0e1715e4217a7e1379753`.

These annotations identify the production evidence chain. They are not instance values and do not widen the installed runtime’s accepted configuration keys.

## Readiness effect

This source lane satisfies only:

`activation_configuration_schema`

The readiness decision remains **HOLD** with eight requirements still outstanding:

1. activation configuration instance;
2. trusted-context reference metadata;
3. credential reference metadata;
4. bounded replay snapshot;
5. service unit design;
6. rollback plan;
7. activation-execution confirmation;
8. live-canary scope.

## Proof

Run:

```bash
node scripts/prove_authenticated_paid_work_production_activation_configuration_schema_v1.mjs
```

The proof parses the real schema, validates a bounded enabling configuration, rejects marker drift, disabled/null configuration, unknown or secret-bearing keys, relative and traversal paths, out-of-range persistence limits, and non-exact orphan recovery, then verifies the production bindings and non-authority boundary.

## Authority boundary

The schema is source text only. It does not create or write a configuration instance, read a credential or token, create reference metadata, deploy, create a service unit, restart a service, create a listener, mount the runtime, accept a quote, authorize or execute payment, construct or broadcast a transaction, dispatch work, issue a ticket, write Work Credits, access a wallet or signer, sign, settle VOID, or move funds.

A separate activation-execution lane remains required after all eight companion artifacts are independently defined and proven.
