# Authenticated paid-work disabled production activation configuration schema v1

This lane defines the closed JSON Schema for one future reviewed activation-configuration candidate. It closes only the `activation_configuration_schema` blocker emitted by the activation-readiness decision merged in PR #908.

It does not create an activation configuration instance and it does not activate the runtime.

## Candidate boundary

Every conforming candidate remains disabled and unauthorized. The schema requires:

- VOID Mainnet-0 and chain ID `2050`;
- provenance binding to PR #899, the PR #902 repair, and the PR #908 readiness decision;
- digests for the independently composed prerequisite evidence and readiness decision;
- separately reviewed references for trusted-context metadata, credential metadata, bounded replay, service design, rollback, activation confirmation, and live-canary scope;
- metadata-only references with `contains_secret_material=false`;
- `enabled=false`, `activation_authorized=false`, and the exact desired state `disabled_pending_explicit_activation_execution`;
- no materialized listener, service, persistence, payment execution, work dispatch, Work Credit write, wallet or signer access, or fund movement;
- a separate activation-execution lane.

The schema uses closed object shapes throughout. Unknown keys fail validation, including a token, credential value, private key, authorization header, widened authority, or unreviewed artifact reference.

## Artifact references are not artifacts

The schema describes the reference envelope that a future configuration instance must carry. It does not create or validate the referenced artifacts themselves. Each reference must later bind a separately reviewed artifact by identifier, schema identifier, SHA-256 digest, and media type.

In particular, the credential reference is metadata only. A credential, bearer token, private key, signer, mnemonic, or secret value must never be embedded in the configuration instance.

## Deliberately unresolved blockers

After this schema lands, the activation-readiness result must remain `HOLD`. These artifacts remain separately required:

1. activation configuration instance;
2. trusted-context reference metadata;
3. credential reference metadata;
4. bounded replay snapshot;
5. service unit design;
6. rollback plan;
7. activation-execution confirmation;
8. live-canary scope.

The proof uses synthetic in-memory candidates only. No tracked or private production configuration instance is written.

## Verification

```bash
node --check scripts/prove_authenticated_paid_work_runtime_disabled_production_activation_configuration_schema_v1.mjs
node -e 'JSON.parse(require("node:fs").readFileSync("schemas/authenticated-paid-work-runtime-disabled-production-activation-configuration-v1.schema.json", "utf8"))'
node scripts/prove_authenticated_paid_work_runtime_disabled_production_activation_configuration_schema_v1.mjs
```

## Authority boundary

This source lane performs no deployment, installation, configuration write, credential or token read, service creation or restart, listener creation, payment execution, work dispatch, Work Credit write, wallet or signer access, transaction construction or broadcast, VOID settlement, or fund movement.
