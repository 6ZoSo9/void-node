# Authenticated paid-work disabled production rollback plan v1

This lane defines and semantically proves the separately reviewed `rollback_plan` artifact required by the activation-readiness decision. It closes only the `rollback_plan` blocker. After publication, the activation-readiness result remains `HOLD` with seven blockers.

The artifact is a source-only plan. It does not execute rollback, activate or configure the runtime, create or restart a service, open a listener, or access a credential.

## Fail-closed contract

The plan binds VOID Mainnet-0, chain ID `2050`, the PR #899 prerequisite merge, the PR #902 workflow repair, the PR #908 readiness decision, the PR #917 configuration-schema merge, and the exact clean-main commit captured by the collision scan.

It defines five objective trigger classes:

1. activation-preflight divergence;
2. authentication-boundary failure;
3. listener or service-health failure;
4. economic-safety failure; and
5. an explicitly authorized operator emergency stop.

The ordered response first binds explicit authority and all separately reviewed inputs, then denies new paid-work ingress before any service-state change. It restores disabled activation intent, stops the reviewed runtime unit, detaches only the credential reference without reading secret material, quarantines uncertain economic state, verifies the complete disabled boundary, emits a non-secret receipt, and requires fresh readiness and activation review.

Every step has objective success evidence and a fail-closed response. Missing authority, a missing or mismatched reviewed artifact, uncertain in-flight economic state, incomplete disabled-state evidence, or receipt failure forbids a completion claim and forbids reactivation.

## Deliberately unresolved dependencies

This plan does not invent the configuration, credential lifecycle, service unit, or canary mechanisms. Its future execution is forbidden until the separately reviewed artifacts it names exist and match their bound identifiers and digests. The remaining blockers are:

1. activation configuration instance;
2. trusted-context reference metadata;
3. credential reference metadata;
4. bounded replay snapshot;
5. service unit design;
6. activation-execution confirmation; and
7. live-canary scope.

The plan is compatible with the PR #917 configuration reference envelope: `artifact_type=rollback_plan`, `media_type=application/json`, `contains_secret_material=false`, and `separately_reviewed=true`. A future configuration instance must bind the reviewed plan file by its exact SHA-256 digest.

## Verification

```bash
node --check scripts/prove_authenticated_paid_work_runtime_disabled_production_rollback_plan_v1.mjs
node scripts/prove_authenticated_paid_work_runtime_disabled_production_rollback_plan_v1.mjs
```

The proof validates the exact closed schema and artifact, ordered rollback semantics, negative authority-widening cases, documentation and workflow bindings, and secret-pattern absence.

## Authority boundary

Publication performs no deployment, installation, configuration write, credential or token read, service creation or restart, listener creation, payment execution, work dispatch, Work Credit write, wallet or signer access, transaction construction or broadcast, settlement, or fund movement. A separate operator-confirmed execution lane is required, and this artifact cannot authorize automatic rollback or reactivation.
